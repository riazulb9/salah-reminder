'use strict';
/* The preset city table and the first-run guess. */
const { CITIES, detectCity } = require('./cities-data');
const { METHODS } = require('./prayer-times');

let failures = 0;
const check = (name, ok, detail) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   ' + detail : ''));
  if (!ok) failures++;
};

console.log('\nPreset cities\n');

check('every city has a name, region, coordinates, method and time zone',
  CITIES.every((c) => c.n && c.g && typeof c.lat === 'number' && typeof c.lng === 'number' && c.m && c.tz),
  CITIES.length + ' cities');

check('every method named is one the engine knows',
  CITIES.every((c) => METHODS[c.m]),
  [...new Set(CITIES.map((c) => c.m))].join(', '));

check('coordinates are in range',
  CITIES.every((c) => c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180));

check('no duplicate city names',
  new Set(CITIES.map((c) => c.n)).size === CITIES.length);

check('every time zone string looks like an IANA name',
  CITIES.every((c) => /^[A-Za-z]+\/[A-Za-z_]+$/.test(c.tz)));

/* Resolve a time zone the way detectCity does, without touching the clock. */
function pick(tz) {
  const m = CITIES.filter((c) => c.tz === tz);
  return m.find((c) => c.primary) || m[0] || null;
}

const expected = {
  'Asia/Riyadh': 'Riyadh',
  'Asia/Dhaka': 'Dhaka',
  'Asia/Karachi': 'Karachi',
  'Asia/Kolkata': 'Delhi',
  'Europe/London': 'London',
  'America/Chicago': 'Chicago',
  'America/New_York': 'New York',
  'Asia/Dubai': 'Dubai'
};
let ok = true, detail = [];
for (const [tz, want] of Object.entries(expected)) {
  const got = pick(tz);
  if (!got || got.n !== want) { ok = false; detail.push(tz + ' gave ' + (got && got.n)); }
}
check('shared time zones resolve to the sensible city', ok, detail.join('; '));

check('Bangladeshi cities start in Bangla',
  CITIES.filter((c) => c.tz === 'Asia/Dhaka').every((c) => c.lang === 'bn'));
check('Pakistani cities start in Urdu',
  CITIES.filter((c) => c.tz === 'Asia/Karachi').every((c) => c.lang === 'ur'));

check('a language given is one the app ships',
  CITIES.every((c) => !c.lang || ['en','bn','ur','hi','es','fr','ru','zh'].indexOf(c.lang) >= 0));

// detectCity must never throw, whatever the machine reports
let threw = false;
try { detectCity(); } catch (_) { threw = true; }
check('detecting the city never throws', !threw,
  'this machine -> ' + JSON.stringify((detectCity() || {}).n || null));

console.log('\n' + (failures === 0 ? 'All checks passed.' : failures + ' check(s) failed.') + '\n');
process.exit(failures === 0 ? 0 : 1);
