'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  // location — Riyadh
  latitude: 24.7136,
  longitude: 46.6753,
  timezone: null,            // null = follow the machine's clock automatically
  elevation: 0,
  method: 'UmmAlQura',
  asrMethod: 'Hanafi',       // Asr is shown by the Hanafi reckoning
  isRamadan: false,
  offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },

  // behaviour
  leadMinutes: 5,            // ask this long before the waqt
  snoozeMinutes: 10,         // "Not yet" comes back after this
  maxSnoozes: 8,             // then it stops asking for that waqt
  immersiveMinutes: 20,      // "Going now" screen closes itself after this
  immersiveMinMinutes: 10,   // ...and cannot be closed by hand before this
  sound: true,
  launchAtLogin: true,
  // 'both' | 'photo' | 'geometry' — what the windows look like
  visualStyle: 'both',
  // which language the verse translation is shown in
  translationLanguage: 'en',
  // open Settings when the app starts, then drop to the tray when it closes
  showSettingsOnStart: true
};

class Store {
  constructor(dir) {
    this.dir = dir;
    this.settingsPath = path.join(dir, 'settings.json');
    // true the very first time the app runs, used to guess the city
    this.firstRun = !fs.existsSync(this.settingsPath);
    this.logPath = path.join(dir, 'log.json');
    this.settings = this._read(this.settingsPath, DEFAULT_SETTINGS, true);
    this.log = this._read(this.logPath, {}, false);
  }

  _read(file, fallback, deepMergeOffsets) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (deepMergeOffsets) {
        return {
          ...fallback, ...raw,
          offsets: { ...fallback.offsets, ...(raw.offsets || {}) }
        };
      }
      return { ...fallback, ...raw };
    } catch (_) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  _write(file, data) {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[store] write failed', file, err.message);
    }
  }

  saveSettings(patch) {
    this.settings = {
      ...this.settings, ...patch,
      offsets: { ...this.settings.offsets, ...(patch.offsets || {}) }
    };
    // the unlock point can never sit past the auto-close point
    const auto = Number(this.settings.immersiveMinutes) || 20;
    const min = Number(this.settings.immersiveMinMinutes);
    this.settings.immersiveMinutes = auto;
    this.settings.immersiveMinMinutes = Math.max(0, Math.min(isNaN(min) ? 10 : min, auto));
    this._write(this.settingsPath, this.settings);
    return this.settings;
  }

  /** Per-day, per-prayer record. */
  day(key) {
    if (!this.log[key]) this.log[key] = {};
    return this.log[key];
  }

  record(dayKey, prayer, patch) {
    const d = this.day(dayKey);
    d[prayer] = { ...(d[prayer] || {}), ...patch };
    this._prune();
    this._write(this.logPath, this.log);
    return d[prayer];
  }

  _prune() {
    const keys = Object.keys(this.log).sort();
    while (keys.length > 90) delete this.log[keys.shift()];
  }

  /** Consecutive days (ending yesterday or today) with all five marked prayed. */
  streak(todayKey) {
    let n = 0;
    const d = new Date(todayKey + 'T12:00:00');
    for (let i = 0; i < 90; i++) {
      const key = toKey(d);
      const rec = this.log[key];
      const complete = rec && ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        .every((k) => rec[k] && rec[k].status === 'prayed');
      if (complete) n++;
      else if (i > 0) break;      // today being incomplete does not break it
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

module.exports = { Store, DEFAULT_SETTINGS, toKey };
