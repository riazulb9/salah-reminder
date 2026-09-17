'use strict';
/**
 * selftest.js — drives the real app end to end with no human clicking.
 *
 *   npm start -- --selftest          (or:  "Salah Reminder.exe" --selftest)
 *
 * Opens the prompt for each prayer, checks the card actually rendered, clicks
 * every button, and confirms the state the click was supposed to produce.
 * Writes a report to  %APPDATA%\<app>\selftest.log  and prints it.
 */
const fs = require('fs');
const path = require('path');

function run(ctx) {
  const { app, store, scheduler, PRAYERS, openPrompt, openSettings,
          getPromptWin, getImmersiveWin, getSettingsWin } = ctx;
  const lines = [];
  let failures = 0;

  const log = (s) => { lines.push(s); console.log(s); };
  const check = (name, ok, detail) => {
    log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   ' + detail : ''));
    if (!ok) failures++;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // capture anything the renderer complains about
  const rendererErrors = [];
  app.on('web-contents-created', (_e, wc) => {
    wc.on('console-message', (_ev, level, message, line, sourceId) => {
      if (level >= 2) rendererErrors.push(message + '  (' + sourceId + ':' + line + ')');
    });
    wc.on('preload-error', (_ev, p, err) => rendererErrors.push('PRELOAD ' + p + ': ' + err.message));
  });

  const js = async (win, expr) => {
    try { return await win.webContents.executeJavaScript(expr, true); }
    catch (err) { return { __error: err.message }; }
  };

  async function testPrayer(pr, action, style) {
    rendererErrors.length = 0;
    if (style) store.saveSettings({ visualStyle: style });
    const dayKey = scheduler.dayKey;

    // reset this waqt so the test is repeatable
    store.record(dayKey, pr.key, { status: 'pending', snoozes: 0, nextPromptAt: null });
    scheduler.plan[pr.key] = { snoozes: 0, nextPromptAt: null };

    openPrompt(pr, scheduler.snapshot());
    await wait(2200);

    const win = getPromptWin();
    if (!win || win.isDestroyed()) { check(pr.en + '/' + action + ': window opened', false); return; }

    // did the payload actually arrive and render?
    const dom = await js(win, `(function(){
      var ph = document.getElementById('photo');
      return {
        ar: document.getElementById('ar').textContent.trim(),
        en: document.getElementById('en').textContent.trim(),
        ask: document.getElementById('ask').textContent.trim(),
        buttons: !!document.getElementById('yes'),
        vAr: document.getElementById('var').textContent.trim(),
        vEn: document.getElementById('ven').textContent.trim(),
        vRef: document.getElementById('vref').textContent.trim(),
        bodyClass: document.body.className,
        photoW: ph ? ph.naturalWidth : -1,
        canvasShown: getComputedStyle(document.getElementById('bg')).display !== 'none'
      };
    })()`);

    const tag = pr.en + '/' + action + (style ? '/' + style : '');
    check(tag + ': card rendered the prayer name',
      !!dom && dom.ar && dom.ar.length > 0, 'ar="' + (dom && dom.ar) + '"');
    check(tag + ': the card is showing this prayer',
      !!dom && dom.en === pr.en, 'expected ' + pr.en + ', showing ' + (dom && dom.en));
    check(tag + ': verse rendered in Arabic and English',
      !!dom && dom.vAr.length > 10 && dom.vEn.length > 10 && dom.vRef.length > 3,
      (dom ? dom.vRef : '') + ' | ' + (dom ? dom.vAr.slice(0, 28) : ''));
    if (style) {
      check(tag + ': body carries the style class', !!dom && dom.bodyClass === 'style-' + style, dom && dom.bodyClass);
      if (style === 'geometry') {
        check(tag + ': geometry canvas is drawn', !!dom && dom.canvasShown);
      } else {
        check(tag + ': the artwork loaded', !!dom && dom.photoW > 100, 'naturalWidth=' + (dom && dom.photoW));
        if (style === 'photo') check(tag + ': geometry canvas hidden', !!dom && !dom.canvasShown);
      }
    }

    // click it exactly the way a person would
    await js(win, `document.getElementById('${action === 'prayed' ? 'yes' : action === 'later' ? 'no' : 'going'}').click()`);
    await wait(1600);

    if (rendererErrors.length) {
      check(pr.en + '/' + action + ': no renderer errors on click', false, rendererErrors.join(' | '));
    } else {
      check(pr.en + '/' + action + ': no renderer errors on click', true);
    }

    const rec = store.day(dayKey)[pr.key] || {};
    const stillOpen = getPromptWin() && !getPromptWin().isDestroyed();

    if (action === 'prayed') {
      check(pr.en + ': "prayed" recorded', rec.status === 'prayed', 'status=' + rec.status);
      check(pr.en + ': prompt closed', !stillOpen);
    } else if (action === 'later') {
      check(pr.en + ': "snoozed" recorded', rec.status === 'snoozed', 'status=' + rec.status);
      check(pr.en + ': snooze scheduled', !!rec.nextPromptAt, 'next=' + rec.nextPromptAt);
      check(pr.en + ': prompt closed', !stillOpen);
    } else {
      check(pr.en + ': "going" recorded', rec.status === 'going', 'status=' + rec.status);
      const im = getImmersiveWin();
      check(pr.en + ': immersive screen opened', !!im && !im.isDestroyed());
      if (im && !im.isDestroyed()) {
        const idom = await js(im, `(function(){
          var ph = document.getElementById('photo');
          return {
            ar: document.getElementById('ar').textContent.trim(),
            locked: !document.body.classList.contains('unlocked'),
            vAr: document.getElementById('dar').textContent.trim(),
            vRef: document.getElementById('dtr').textContent.trim(),
            photoW: ph ? ph.naturalWidth : -1
          };
        })()`);
        check(pr.en + ': immersive rendered', !!idom && !!idom.ar, idom && idom.ar);
        check(pr.en + ': immersive shows the verse',
          !!idom && idom.vAr.length > 10 && idom.vRef.length > 3, idom && idom.vRef);
        check(pr.en + ': immersive artwork loaded', !!idom && idom.photoW > 100,
          'naturalWidth=' + (idom && idom.photoW));
        check(pr.en + ': immersive starts locked', !!idom && idom.locked);
        im.destroy();
        await wait(400);
      }
    }
  }

  /* --shots: open each window and save a real screenshot, so the result can
     be looked at rather than only asserted about. */
  async function shots() {
    const dir = path.join(app.getPath('userData'), 'shots');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    store.saveSettings({ visualStyle: 'both' });
    for (const pr of PRAYERS) {
      openPrompt(pr, scheduler.snapshot());
      await wait(3000);
      const win = getPromptWin();
      if (win && !win.isDestroyed()) {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(dir, 'prompt-' + pr.key + '.png'), img.toPNG());
        log('saved prompt-' + pr.key + '.png');
        win.destroy();
        await wait(500);
      }
    }
    // one immersive screen
    openPrompt(PRAYERS[4], scheduler.snapshot());
    await wait(1500);
    const pw = getPromptWin();
    if (pw && !pw.isDestroyed()) {
      await js(pw, "document.getElementById('going').click()");
      await wait(4000);
      const im = getImmersiveWin();
      if (im && !im.isDestroyed()) {
        const img = await im.webContents.capturePage();
        fs.writeFileSync(path.join(dir, 'immersive-isha.png'), img.toPNG());
        log('saved immersive-isha.png');
        im.destroy();
      }
    }
    // and the settings window
    openSettings();
    await wait(3000);
    const sw = getSettingsWin && getSettingsWin();
    if (sw && !sw.isDestroyed()) {
      const img = await sw.webContents.capturePage();
      fs.writeFileSync(path.join(dir, 'settings.png'), img.toPNG());
      log('saved settings.png');
      sw.destroy();
      await wait(400);
    }
    log('shots in: ' + dir);
    app.exit(0);
  }


  /* A prompt opened from the tray before its time must change nothing. */
  async function testPreviewDoesNotMark(pr) {
    const dayKey = scheduler.dayKey;
    const lead = (store.settings.leadMinutes || 5) * 60000;
    const dueAt = new Date(scheduler.times[pr.key].getTime() - lead);
    if (dueAt.getTime() <= Date.now()) {
      log('  SKIP  preview test for ' + pr.en + ' (its reminder is already due)');
      return;
    }
    store.record(dayKey, pr.key, { status: 'pending', snoozes: 0, nextPromptAt: null });
    scheduler.plan[pr.key] = { snoozes: 0, nextPromptAt: dueAt };

    openPrompt(pr, scheduler.snapshot(), { preview: true });
    await wait(2000);
    const win = getPromptWin();
    if (!win || win.isDestroyed()) { check('preview: window opened', false); return; }

    await js(win, "document.getElementById('yes').click()");
    await wait(1400);

    const rec = store.day(dayKey)[pr.key] || {};
    check('preview: "prayed" is NOT recorded', rec.status !== 'prayed', 'status=' + rec.status);
    check('preview: the real reminder is still scheduled',
      !!(scheduler.plan[pr.key] && scheduler.plan[pr.key].nextPromptAt),
      'next=' + (scheduler.plan[pr.key] && scheduler.plan[pr.key].nextPromptAt));

    const w2 = getPromptWin();
    if (w2 && !w2.isDestroyed()) { w2.destroy(); await wait(400); }
  }

  /* The translation must actually change with the language. */
  async function testLanguages(pr) {
    const seen = {};
    for (const lang of ['en', 'bn', 'ur', 'zh', 'fr']) {
      store.saveSettings({ translationLanguage: lang });
      openPrompt(pr, scheduler.snapshot(), { preview: true });
      await wait(1900);
      const win = getPromptWin();
      if (!win || win.isDestroyed()) { check('language ' + lang + ': window opened', false); continue; }
      const got = await js(win, `(function(){
        var e = document.getElementById('ven');
        return { text: e.textContent.trim(), cls: e.className, dir: e.getAttribute('dir') };
      })()`);
      seen[lang] = got && got.text;
      check('language ' + lang + ': translation is present',
        !!got && got.text.length > 8, (got ? got.text.slice(0, 44) : ''));
      check('language ' + lang + ': script class applied',
        !!got && got.cls.indexOf('lang-' + lang) >= 0, got && got.cls);
      if (lang === 'ur') check('language ur: laid out right to left', !!got && got.dir === 'rtl');
      win.destroy();
      await wait(300);
    }
    const distinct = new Set(Object.values(seen).filter(Boolean));
    check('each language gives different text', distinct.size === Object.keys(seen).length,
      distinct.size + ' distinct of ' + Object.keys(seen).length);
    store.saveSettings({ translationLanguage: 'en' });
  }

  /* The button we want people to reach for should be the emphasised one. */
  async function testPrimaryButton(pr) {
    openPrompt(pr, scheduler.snapshot(), { preview: true });
    await wait(1800);
    const win = getPromptWin();
    if (!win || win.isDestroyed()) { check('primary button: window opened', false); return; }
    const got = await js(win, `(function(){
      var b = document.querySelector('.actions button.primary');
      var first = document.querySelector('.actions button');
      var ar = getComputedStyle(document.getElementById('ar')).fontFamily;
      return { primaryId: b && b.id, firstId: first && first.id, arabicFont: ar };
    })()`);
    check('"going to pray" is the emphasised button', !!got && got.primaryId === 'going', got && got.primaryId);
    check('"going to pray" is listed first', !!got && got.firstId === 'going', got && got.firstId);
    check('the bundled Arabic font is in use',
      !!got && /Amiri/i.test(got.arabicFont), got && got.arabicFont);
    win.destroy();
    await wait(300);
  }


  /* The settings window: branding, ownership, and the city list over IPC. */
  async function testSettingsWindow() {
    openSettings();
    await wait(2600);
    const win = getSettingsWin && getSettingsWin();
    if (!win || win.isDestroyed()) { check('settings: window opened', false); return; }

    const got = await js(win, `(function(){
      var mark = document.querySelector('.brand img');
      var sel = document.getElementById('city');
      var about = document.getElementById('about');
      return {
        markLoaded: mark ? mark.naturalWidth : -1,
        heading: document.querySelector('.bar h1').textContent.trim(),
        cityOptions: sel ? sel.options.length : -1,
        hasDhaka: sel ? Array.from(sel.options).some(function(o){return o.textContent.trim() === 'Dhaka';}) : false,
        about: about ? about.innerText.trim() : '',
        hasStartToggle: !!document.getElementById('showSettingsOnStart'),
        langOptions: document.getElementById('translationLanguage').options.length
      };
    })()`);

    check('settings: the logo mark loaded', !!got && got.markLoaded > 8, 'naturalWidth=' + (got && got.markLoaded));
    check('settings: heading reads Salah Reminder', !!got && /Salah Reminder/i.test(got.heading), got && got.heading);
    check('settings: the city list arrived over IPC', !!got && got.cityOptions > 50, (got && got.cityOptions) + ' options');
    check('settings: Dhaka is in the list', !!got && got.hasDhaka);
    check('settings: all eight languages offered', !!got && got.langOptions === 8, (got && got.langOptions) + '');
    check('settings: the launch toggle exists', !!got && got.hasStartToggle);
    check('settings: copyright names the owner and site',
      !!got && got.about.indexOf('Riazul Islam') >= 0 && got.about.indexOf('riazulb9.com') >= 0,
      got && got.about);

    win.destroy();
    await wait(400);
  }

  app.whenReady().then(async () => {
    await wait(1200);
    if (process.argv.includes('--shots')) return shots();
    log('\n=== Salah Reminder self-test ===\n');

    /* Stop the real scheduler and clear every pending reminder. Otherwise a
       genuinely-due waqt fires mid-test and swaps the window underneath us,
       which is correct app behaviour but makes the run non-deterministic. */
    scheduler.stop();
    for (const pr of PRAYERS) {
      scheduler.plan[pr.key] = { snoozes: 0, nextPromptAt: null };
      store.record(scheduler.dayKey, pr.key, { status: 'pending', snoozes: 0, nextPromptAt: null });
    }
    log('scheduler paused for the duration of the run');
    log('today: ' + scheduler.dayKey);

    try {
      await testPrayer(PRAYERS[2], 'prayed', 'both');    // Asr
      await testPrayer(PRAYERS[2], 'later', 'photo');
      await testPrayer(PRAYERS[1], 'prayed', 'geometry'); // Dhuhr
      await testPrayer(PRAYERS[4], 'prayed', 'both');     // Isha
      await testPrayer(PRAYERS[3], 'later', 'both');      // Maghrib
      await testPrayer(PRAYERS[0], 'going', 'both');      // Fajr -> immersive

      await testPreviewDoesNotMark(PRAYERS[4]);           // Isha, still ahead
      await testLanguages(PRAYERS[2]);                    // Asr
      await testPrimaryButton(PRAYERS[2]);
      await testSettingsWindow();
    } catch (err) {
      check('the run completed without throwing', false, err.stack || err.message);
    }

    store.saveSettings({ visualStyle: 'both' });
    log('\n' + (failures === 0 ? 'All checks passed.' : failures + ' check(s) failed.') + '\n');
    try {
      fs.writeFileSync(path.join(app.getPath('userData'), 'selftest.log'), lines.join('\n'), 'utf8');
    } catch (_) {}
    app.exit(failures === 0 ? 0 : 1);
  });
}

module.exports = { run };
