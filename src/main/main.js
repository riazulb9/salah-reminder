'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, powerMonitor, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { Store, toKey } = require('./store');
const { Scheduler, PRAYERS } = require('./scheduler');
const { CITIES, detectCity } = require('./cities-data');

const ROOT = path.join(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'assets');

let store, scheduler, tray;
let promptWin = null, immersiveWin = null, settingsWin = null;
/* The last payload handed to each window. A renderer pulls this on load, so a
   push that arrives before its listener exists can no longer leave it blank. */
let promptPayload = null, immersivePayload = null;
/* True when the prompt was opened by hand from the tray rather than by the
   schedule. Answering a preview must not mark the waqt or cancel its real
   reminder — see the 'prayer:answer' handler. */
let promptPreview = false;
let immersiveTimer = null;
let activePrayer = null;      // the prayer the prompt / immersive screen is about

/* ------------------------------------------------------------ single instance */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openSettings());
}

app.setAppUserModelId('com.riazul.salahreminder');

/* --------------------------------------------------------------------- windows */

function baseWebPrefs() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    backgroundThrottling: false
  };
}

function openPrompt(prayer, state, opts) {
  activePrayer = prayer;
  promptPreview = !!(opts && opts.preview);
  promptPayload = payloadFor(prayer, state);

  if (promptWin && !promptWin.isDestroyed()) {
    promptWin.webContents.send('payload', promptPayload);
    showOnTop(promptWin);
    return;
  }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: 480,
    height: 812,
    x: Math.round((width - 480) / 2),
    y: Math.max(0, Math.round((height - 812) / 2)),
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    show: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: baseWebPrefs()
  });
  promptWin = win;
  win.loadFile(path.join(ROOT, 'src', 'renderer', 'prompt', 'index.html'));
  win.once('ready-to-show', () => {
    win.webContents.send('payload', promptPayload);
    showOnTop(win);
  });
  // only clear the reference if this is still the current window
  win.on('closed', () => { if (promptWin === win) promptWin = null; });
}

function showOnTop(win) {
  win.setAlwaysOnTop(true, 'screen-saver');
  win.show();
  win.focus();
}

function closePrompt() {
  if (promptWin && !promptWin.isDestroyed()) promptWin.close();
  promptWin = null;
}

function openImmersive(prayer, state) {
  closePrompt();
  activePrayer = prayer;
  immersivePayload = payloadFor(prayer, state);
  const display = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    ...display.bounds,
    frame: false,
    fullscreen: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    alwaysOnTop: true,
    backgroundColor: '#000000',
    webPreferences: baseWebPrefs()
  });
  immersiveWin = win;
  win.loadFile(path.join(ROOT, 'src', 'renderer', 'immersive', 'index.html'));
  win.once('ready-to-show', () => {
    win.webContents.send('payload', immersivePayload);
    win.setAlwaysOnTop(true, 'screen-saver');
    win.show();
    win.focus();
  });
  win.on('closed', () => {
    if (immersiveWin === win) immersiveWin = null;
    if (immersiveTimer) { clearTimeout(immersiveTimer); immersiveTimer = null; }
    if (activePrayer) scheduler.completeGoing(activePrayer.key);
    refreshTray();
  });

  const mins = store.settings.immersiveMinutes || 20;
  immersiveTimer = setTimeout(() => closeImmersive(), mins * 60 * 1000);
}

function closeImmersive() {
  if (immersiveWin && !immersiveWin.isDestroyed()) immersiveWin.close();
  immersiveWin = null;
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 760, height: 780,
    frame: false, transparent: true, resizable: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: baseWebPrefs()
  });
  settingsWin.loadFile(path.join(ROOT, 'src', 'renderer', 'settings', 'index.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
}

/* ------------------------------------------------------- scene artwork */

/* Each waqt can have several images: fajr-1.jpg, fajr-2.jpg and so on. They
   are counted at startup, so dropping another file into assets/scenes is all
   it takes to add one. A different one is shown each day. */
function countSceneVariants() {
  const dir = path.join(ASSETS, 'scenes');
  const counts = {};
  for (const pr of PRAYERS) {
    let n = 0;
    while (fs.existsSync(path.join(dir, pr.key + '-' + (n + 1) + '.jpg'))) n++;
    counts[pr.key] = n;
  }
  return counts;
}
let sceneCounts = {};

/** Day of the year, so the picture changes at local midnight. */
function dayOfYear(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}

function sceneImageFor(prayerKey) {
  const n = sceneCounts[prayerKey] || 0;
  if (n < 1) return null;
  const pick = (dayOfYear(new Date()) % n) + 1;
  return prayerKey + '-' + pick + '.jpg';
}

/* ---------------------------------------------------------------- payload glue */

function payloadFor(prayer, state) {
  const s = state || scheduler.snapshot();
  const at = s.times[prayer.key];
  return {
    prayer: {
      key: prayer.key, en: prayer.en, ar: prayer.ar,
      scene: prayer.scene, variant: prayer.variant
    },
    at,
    times: s.times,
    statuses: s.statuses,
    streak: s.streak,
    settings: {
      sound: store.settings.sound,
      snoozeMinutes: store.settings.snoozeMinutes,
      immersiveMinutes: store.settings.immersiveMinutes,
      immersiveMinMinutes: store.settings.immersiveMinMinutes,
      asrMethod: store.settings.asrMethod,
      visualStyle: store.settings.visualStyle,
      translationLanguage: store.settings.translationLanguage
    },
    sceneImage: sceneImageFor(prayer.key)
  };
}

/* ------------------------------------------------------------------------ tray */

function trayIcon() {
  const p = path.join(ASSETS, 'tray.png');
  const img = nativeImage.createFromPath(p);
  return img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 });
}

function fmt(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

const MARK = { prayed: '✓', going: '→', snoozed: '○', missed: '—', asking: '●', pending: ' ' };

function refreshTray() {
  if (!tray) return;
  const s = scheduler.snapshot();
  const next = s.next;
  const mins = Math.max(0, Math.round((new Date(next.at) - Date.now()) / 60000));
  const hh = Math.floor(mins / 60), mm = mins % 60;
  const inWords = hh ? hh + 'h ' + mm + 'm' : mm + 'm';

  tray.setToolTip('Salah Reminder — ' + next.en + ' in ' + inWords + ' (' + fmt(next.at) + ')');

  const items = PRAYERS.map((p) => {
    const label = p.en + (p.key === 'asr' ? ' (Hanafi)' : '');
    return {
      label: '  ' + MARK[s.statuses[p.key]] + '  ' + label.padEnd(16, ' ') + fmt(s.times[p.key]),
      enabled: true,
      click: () => { openPrompt(p, s, { preview: true }); }
    };
  });

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Next: ' + next.en + ' in ' + inWords, enabled: false },
    { label: s.streak > 0 ? 'Complete days in a row: ' + s.streak : 'Today', enabled: false },
    { type: 'separator' },
    ...items,
    { type: 'separator' },
    { label: 'Show reminder for next prayer', click: () => {
        const n = scheduler.nextPrayer();
        openPrompt(n.prayer, scheduler.snapshot(), { preview: true });
      } },
    { label: 'Settings…', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]));
}

/* ------------------------------------------------------------------------- IPC */

ipcMain.handle('prayer:answer', (_e, { prayerKey, action }) => {
  const prayer = PRAYERS.find((p) => p.key === prayerKey);

  /* A prompt opened from the tray before its waqt is a look ahead, not an
     answer. Leave the day's record and the schedule untouched so the real
     reminder still arrives at its time. Once the waqt's reminder is actually
     due, the same window answers for real. */
  const t = scheduler.times[prayerKey];
  const dueAt = t ? t.getTime() - (store.settings.leadMinutes || 5) * 60000 : 0;
  const lookingAhead = promptPreview && Date.now() < dueAt;

  const state = lookingAhead ? scheduler.snapshot() : scheduler.answer(prayerKey, action);
  refreshTray();
  if (action === 'going') {
    openImmersive(prayer, state);
  } else {
    closePrompt();
  }
  return state;
});

ipcMain.handle('immersive:close', () => { closeImmersive(); });

/* A renderer asks for its payload as soon as its scripts run. */
ipcMain.handle('payload:get', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && immersiveWin && w.id === immersiveWin.id) return immersivePayload;
  return promptPayload;
});

ipcMain.handle('settings:get', () => ({
  settings: store.settings,
  state: scheduler.snapshot(),
  cities: CITIES,
  app: {
    name: 'Salah Reminder',
    version: app.getVersion(),
    author: 'Riazul Islam',
    website: 'riazulb9.com'
  }
}));

ipcMain.handle('settings:save', (_e, patch) => {
  store.saveSettings(patch);
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: !!store.settings.launchAtLogin,
      name: 'Salah Reminder',
      args: ['--hidden']
    });
  }
  scheduler.refreshDay(new Date());
  refreshTray();
  return { settings: store.settings, state: scheduler.snapshot() };
});

ipcMain.handle('settings:preview', (_e, patch) => {
  const saved = JSON.parse(JSON.stringify(store.settings));
  store.settings = { ...saved, ...patch, offsets: { ...saved.offsets, ...(patch.offsets || {}) } };
  let times;
  try { times = scheduler.timesFor(new Date()); }
  finally { store.settings = saved; }
  return Object.fromEntries(Object.entries(times).map(([k, v]) => [k, v ? v.toISOString() : null]));
});

ipcMain.handle('window:close', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && !w.isDestroyed()) w.close();
});

/* ------------------------------------------------------------------ lifecycle */

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));

  /* First run: guess the city from the machine's time zone so somebody
     installing in Dhaka does not open to Riyadh. Falls back silently. */
  if (store.firstRun) {
    const city = detectCity();
    if (city) {
      const patch = { latitude: city.lat, longitude: city.lng, method: city.m };
      if (city.lang) patch.translationLanguage = city.lang;
      store.saveSettings(patch);
      console.log('[first run] detected', city.n, 'from', city.tz);
    }
  }

  sceneCounts = countSceneVariants();
  console.log('[scenes] variants per waqt:', JSON.stringify(sceneCounts));
  scheduler = new Scheduler(store);

  scheduler.on('prompt', (prayer, state) => openPrompt(prayer, state));
  scheduler.on('tick', () => refreshTray());
  scheduler.on('day-changed', () => refreshTray());
  scheduler.start();

  tray = new Tray(trayIcon());
  tray.on('click', () => openSettings());
  refreshTray();

  // show Settings first; closing it leaves the app running in the tray
  if (store.settings.showSettingsOnStart !== false && !process.argv.includes('--selftest')) {
    openSettings();
  }

  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: !!store.settings.launchAtLogin,
      name: 'Salah Reminder',
      args: ['--hidden']
    });
  }

  if (process.argv.includes('--selftest')) {
    require('./selftest').run({
      app, store, scheduler, PRAYERS, openPrompt, openSettings,
      getPromptWin: () => promptWin,
      getImmersiveWin: () => immersiveWin,
      getSettingsWin: () => settingsWin
    });
  }

  // clocks drift and laptops sleep — recompute whenever the OS comes back
  powerMonitor.on('resume', () => { scheduler.refreshDay(new Date()); scheduler.tick(); });
  powerMonitor.on('unlock-screen', () => scheduler.tick());
});

app.on('window-all-closed', (e) => { /* stay alive in the tray */ });
app.on('before-quit', () => { app.isQuitting = true; if (scheduler) scheduler.stop(); });
