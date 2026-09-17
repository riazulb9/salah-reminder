'use strict';
/* Exercises the ask / snooze / answer state machine with a fake clock.
   Run with: node src/main/scheduler.test.js */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store, toKey } = require('./store');
const { Scheduler } = require('./scheduler');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'salah-test-'));
const store = new Store(dir);
// timezone pinned so the test is independent of the machine's clock
store.saveSettings({ leadMinutes: 5, snoozeMinutes: 10, maxSnoozes: 3, timezone: 3 });

let failures = 0;
const check = (name, ok, detail) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failures++;
};

// freeze "now" so the test is deterministic
const REAL = Date;
let fakeNow = new REAL(2026, 8, 14, 15, 0, 0);
global.Date = class extends REAL {
  constructor(...a) { return a.length ? new REAL(...a) : new REAL(fakeNow); }
  static now() { return fakeNow.getTime(); }
};
const advance = (mins) => { fakeNow = new REAL(fakeNow.getTime() + mins * 60000); };

const sched = new Scheduler(store);
sched.refreshDay(new Date());

// start the clock half an hour before Asr, whatever Asr works out to be
fakeNow = new REAL(sched.times.asr.getTime() - 30 * 60000);
sched.refreshDay(new Date());
const asrAt = sched.times.asr;

// Fajr and Dhuhr are already done, so Asr is the only thing outstanding
sched.answer('fajr', 'prayed');
sched.answer('dhuhr', 'prayed');
console.log('\n  Asr (Hanafi) today is at ' +
  String(asrAt.getHours()).padStart(2, '0') + ':' + String(asrAt.getMinutes()).padStart(2, '0') + '\n');

const prompts = [];
sched.on('prompt', (pr) => prompts.push({ key: pr.key, at: new Date(fakeNow) }));

// step forward a minute at a time up to the lead time
const untilPrompt = Math.round((asrAt - fakeNow) / 60000) - 5;
for (let i = 0; i < untilPrompt + 1; i++) { sched.tick(); advance(1); }

check('asks once, five minutes before the waqt', prompts.length === 1,
  prompts.length ? 'asked at ' + prompts[0].at.toTimeString().slice(0, 5) : 'never asked');
check('the prompt is for Asr', prompts[0] && prompts[0].key === 'asr');

// "Not yet" -> comes back after the snooze interval, not before
sched.answer('asr', 'later');
for (let i = 0; i < 9; i++) { advance(1); sched.tick(); }
check('stays quiet during the snooze', prompts.length === 1, prompts.length + ' prompts so far');
advance(2); sched.tick();
check('asks again after 10 minutes', prompts.length === 2);

// "Not yet" twice more, then the cap stops it
sched.answer('asr', 'later'); advance(11); sched.tick();
sched.answer('asr', 'later'); advance(11); sched.tick();
sched.answer('asr', 'later'); advance(11); sched.tick();
const capped = store.day(toKey(new Date())).asr.status;
check('stops asking once the snooze cap is reached', prompts.length <= 5 && capped !== 'asking',
  'status now "' + capped + '" after ' + prompts.length + ' prompts');

// a fresh waqt answered with "prayed" is never asked about again
const before = prompts.length;
sched.answer('maghrib', 'prayed');
for (let i = 0; i < 200; i++) { advance(1); sched.tick(); }
const maghribPrompts = prompts.slice(before).filter((p) => p.key === 'maghrib').length;
check('never asks again after "I have prayed"', maghribPrompts === 0, maghribPrompts + ' prompts');
check('"prayed" is recorded', store.day(toKey(new Date())).maghrib.status === 'prayed');

// "Going now" is recorded, then completed when the screen closes
sched.answer('isha', 'going');
check('"going" is recorded', store.day(toKey(new Date())).isha.status === 'going');
sched.completeGoing('isha');
check('closing the immersive screen marks it prayed',
  store.day(toKey(new Date())).isha.status === 'prayed');

global.Date = REAL;
fs.rmSync(dir, { recursive: true, force: true });
console.log('\n' + (failures === 0 ? 'All checks passed.' : failures + ' check(s) failed.') + '\n');
process.exit(failures === 0 ? 0 : 1);
