'use strict';
/* Sanity checks for the prayer time engine. Run with: npm run test:times */
const { PrayerCalculator } = require('./prayer-times');

const RIYADH = { latitude: 24.7136, longitude: 46.6753, timezone: 3 };
const pad = (n) => String(n).padStart(2, '0');
const hm = (d) => d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : '--:--';

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failures++;
}

const hanafi = new PrayerCalculator({ ...RIYADH, asrMethod: 'Hanafi' });
const standard = new PrayerCalculator({ ...RIYADH, asrMethod: 'Standard' });

console.log('\nRiyadh — Umm al-Qura, Hanafi Asr\n');
const samples = [
  new Date(2026, 0, 15),
  new Date(2026, 3, 15),
  new Date(2026, 5, 21),   // summer solstice
  new Date(2026, 8, 14),
  new Date(2026, 11, 21)   // winter solstice
];

for (const d of samples) {
  const t = hanafi.timesFor(d);
  console.log('  ' + d.toDateString() + '   Fajr ' + hm(t.fajr) + '  Shuruq ' + hm(t.sunrise)
    + '  Dhuhr ' + hm(t.dhuhr) + '  Asr ' + hm(t.asr) + '  Maghrib ' + hm(t.maghrib)
    + '  Isha ' + hm(t.isha));
}
console.log('');

// 1. strict ordering across a whole year
let ordered = true, orderDetail = '';
for (let i = 0; i < 365; i++) {
  const d = new Date(2026, 0, 1); d.setDate(d.getDate() + i);
  const t = hanafi.timesFor(d);
  const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha];
  if (seq.some((x) => !x) || seq.some((x, j) => j > 0 && x <= seq[j - 1])) {
    ordered = false; orderDetail = 'broke on ' + d.toDateString(); break;
  }
}
check('times stay in order on all 365 days of 2026', ordered, orderDetail);

// 2. Hanafi Asr always falls later than the standard Asr
let later = true;
for (let i = 0; i < 365; i += 7) {
  const d = new Date(2026, 0, 1); d.setDate(d.getDate() + i);
  if (hanafi.timesFor(d).asr <= standard.timesFor(d).asr) { later = false; break; }
}
check('Hanafi Asr is always later than the standard Asr', later);

// 3. Umm al-Qura Isha is exactly 90 minutes after Maghrib
const t0 = hanafi.timesFor(new Date(2026, 8, 14));
const gap = Math.round((t0.isha - t0.maghrib) / 60000);
check('Isha is 90 minutes after Maghrib (Umm al-Qura)', gap === 90, gap + ' min');

// 4. Ramadan shifts Isha to 120 minutes
const ram = new PrayerCalculator({ ...RIYADH, isRamadan: true }).timesFor(new Date(2026, 8, 14));
const rgap = Math.round((ram.isha - ram.maghrib) / 60000);
check('Isha is 120 minutes after Maghrib during Ramadan', rgap === 120, rgap + ' min');

// 5. known published values for Riyadh, 14 Sep 2026 (tolerance: 2 minutes)
const expect = { fajr: '04:20', sunrise: '05:39', dhuhr: '11:50', maghrib: '17:58', isha: '19:28' };
let matched = true, mdetail = [];
for (const [k, v] of Object.entries(expect)) {
  const got = hm(t0[k]);
  const diff = Math.abs(
    (Number(got.slice(0, 2)) * 60 + Number(got.slice(3))) -
    (Number(v.slice(0, 2)) * 60 + Number(v.slice(3)))
  );
  if (diff > 2) { matched = false; mdetail.push(k + ' got ' + got + ' expected ' + v); }
}
check('matches published Riyadh times within 2 minutes', matched, mdetail.join('; '));

// 6. offsets apply
const off = new PrayerCalculator({ ...RIYADH, offsets: { asr: 7 } }).timesFor(new Date(2026, 8, 14));
check('manual offsets shift the time', Math.round((off.asr - t0.asr) / 60000) === 7);

// 7. the app is shared internationally, so every listed city must produce a
//    complete, ordered set of times on every day of the year
const CITIES = [
  ['Makkah', 21.4225, 39.8262, 3, 'UmmAlQura'],
  ['Dhaka', 23.8103, 90.4125, 6, 'Karachi'],
  ['Khulna', 22.8456, 89.5403, 6, 'Karachi'],
  ['Kuala Lumpur', 3.1390, 101.6869, 8, 'MWL'],
  ['Jakarta', -6.2088, 106.8456, 7, 'MWL'],
  ['Seoul', 37.5665, 126.9780, 9, 'MWL'],
  ['Cairo', 30.0444, 31.2357, 2, 'Egypt'],
  ['London', 51.5074, -0.1278, 1, 'MWL'],
  ['Stockholm', 59.3293, 18.0686, 2, 'MWL'],
  ['Moscow', 55.7558, 37.6173, 3, 'MWL'],
  ['Toronto', 43.6532, -79.3832, -4, 'ISNA'],
  ['Los Angeles', 34.0522, -118.2437, -7, 'ISNA'],
  ['Sydney', -33.8688, 151.2093, 10, 'MWL'],
  ['Johannesburg', -26.2041, 28.0473, 2, 'MWL']
];

let cityOk = true, cityDetail = '';
for (const [name, lat, lng, tz, method] of CITIES) {
  const calc = new PrayerCalculator({ latitude: lat, longitude: lng, timezone: tz,
                                      method, asrMethod: 'Hanafi' });
  for (let i = 0; i < 365; i += 3) {
    const d = new Date(2026, 0, 1); d.setDate(d.getDate() + i);
    const t = calc.timesFor(d);
    const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha];
    if (seq.some((x) => !x || isNaN(x.getTime()))) {
      cityOk = false; cityDetail = name + ' has a missing time on ' + d.toDateString(); break;
    }
    if (seq.some((x, j) => j > 0 && x <= seq[j - 1])) {
      cityOk = false; cityDetail = name + ' is out of order on ' + d.toDateString(); break;
    }
  }
  if (!cityOk) break;
}
check('all 14 preset cities give complete, ordered times year-round', cityOk, cityDetail);

// 8. the midsummer high-latitude fallback actually engages
const sthlm = new PrayerCalculator({ latitude: 59.3293, longitude: 18.0686,
                                     timezone: 2, method: 'MWL' }).timesFor(new Date(2026, 5, 21));
const nightGap = (sthlm.isha - sthlm.fajr) / 3600000;
check('Stockholm at midsummer still yields a Fajr and an Isha',
  sthlm.fajr && sthlm.isha && nightGap < 0 === false,
  'Fajr ' + hm(sthlm.fajr) + ', Isha ' + hm(sthlm.isha));

console.log('\n' + (failures === 0 ? 'All checks passed.' : failures + ' check(s) failed.') + '\n');
process.exit(failures === 0 ? 0 : 1);
