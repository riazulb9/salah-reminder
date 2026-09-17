'use strict';
/**
 * The preset cities, in one place so both the main process (first-run
 * detection) and the settings window use the same table.
 *
 *   n    name shown in the list        g    region heading
 *   lat/lng   coordinates              m    calculation method
 *   tz   IANA time zone, used to guess the city on first run
 *   lang optional translation language to start with
 *
 * Where several cities share a time zone, the one marked primary wins the
 * guess, otherwise the first listed.
 */
const CITIES = [
  { g: 'Arabia',        n: 'Makkah',        lat: 21.4225,  lng: 39.8262,   m: 'UmmAlQura', tz: 'Asia/Riyadh' },
  { g: 'Arabia',        n: 'Madinah',       lat: 24.4686,  lng: 39.6142,   m: 'UmmAlQura', tz: 'Asia/Riyadh' },
  { g: 'Arabia',        n: 'Riyadh',        lat: 24.7136,  lng: 46.6753,   m: 'UmmAlQura', tz: 'Asia/Riyadh', primary: true },
  { g: 'Arabia',        n: 'Jeddah',        lat: 21.4858,  lng: 39.1925,   m: 'UmmAlQura', tz: 'Asia/Riyadh' },
  { g: 'Arabia',        n: 'Dammam',        lat: 26.4207,  lng: 50.0888,   m: 'UmmAlQura', tz: 'Asia/Riyadh' },
  { g: 'Gulf',          n: 'Dubai',         lat: 25.2048,  lng: 55.2708,   m: 'Dubai',     tz: 'Asia/Dubai' },
  { g: 'Gulf',          n: 'Abu Dhabi',     lat: 24.4539,  lng: 54.3773,   m: 'Dubai',     tz: 'Asia/Dubai' },
  { g: 'Gulf',          n: 'Doha',          lat: 25.2854,  lng: 51.5310,   m: 'UmmAlQura', tz: 'Asia/Qatar' },
  { g: 'Gulf',          n: 'Kuwait City',   lat: 29.3759,  lng: 47.9774,   m: 'UmmAlQura', tz: 'Asia/Kuwait' },
  { g: 'Gulf',          n: 'Manama',        lat: 26.2285,  lng: 50.5860,   m: 'UmmAlQura', tz: 'Asia/Bahrain' },
  { g: 'Gulf',          n: 'Muscat',        lat: 23.5880,  lng: 58.3829,   m: 'UmmAlQura', tz: 'Asia/Muscat' },
  { g: 'Middle East',   n: 'Cairo',         lat: 30.0444,  lng: 31.2357,   m: 'Egypt',     tz: 'Africa/Cairo' },
  { g: 'Middle East',   n: 'Istanbul',      lat: 41.0082,  lng: 28.9784,   m: 'MWL',       tz: 'Europe/Istanbul' },
  { g: 'Middle East',   n: 'Amman',         lat: 31.9454,  lng: 35.9284,   m: 'MWL',       tz: 'Asia/Amman' },
  { g: 'Middle East',   n: 'Beirut',        lat: 33.8938,  lng: 35.5018,   m: 'MWL',       tz: 'Asia/Beirut' },
  { g: 'Middle East',   n: 'Baghdad',       lat: 33.3152,  lng: 44.3661,   m: 'MWL',       tz: 'Asia/Baghdad' },
  { g: 'South Asia',    n: 'Dhaka',         lat: 23.8103,  lng: 90.4125,   m: 'Karachi',   tz: 'Asia/Dhaka',  lang: 'bn' },
  { g: 'South Asia',    n: 'Khulna',        lat: 22.8456,  lng: 89.5403,   m: 'Karachi',   tz: 'Asia/Dhaka',  lang: 'bn' },
  { g: 'South Asia',    n: 'Chattogram',    lat: 22.3569,  lng: 91.7832,   m: 'Karachi',   tz: 'Asia/Dhaka',  lang: 'bn' },
  { g: 'South Asia',    n: 'Sylhet',        lat: 24.8949,  lng: 91.8687,   m: 'Karachi',   tz: 'Asia/Dhaka',  lang: 'bn' },
  { g: 'South Asia',    n: 'Rajshahi',      lat: 24.3745,  lng: 88.6042,   m: 'Karachi',   tz: 'Asia/Dhaka',  lang: 'bn' },
  { g: 'South Asia',    n: 'Karachi',       lat: 24.8607,  lng: 67.0011,   m: 'Karachi',   tz: 'Asia/Karachi', lang: 'ur' },
  { g: 'South Asia',    n: 'Lahore',        lat: 31.5204,  lng: 74.3587,   m: 'Karachi',   tz: 'Asia/Karachi', lang: 'ur' },
  { g: 'South Asia',    n: 'Islamabad',     lat: 33.6844,  lng: 73.0479,   m: 'Karachi',   tz: 'Asia/Karachi', lang: 'ur' },
  { g: 'South Asia',    n: 'Delhi',         lat: 28.6139,  lng: 77.2090,   m: 'Karachi',   tz: 'Asia/Kolkata', lang: 'hi' },
  { g: 'South Asia',    n: 'Mumbai',        lat: 19.0760,  lng: 72.8777,   m: 'Karachi',   tz: 'Asia/Kolkata', lang: 'hi' },
  { g: 'South Asia',    n: 'Kolkata',       lat: 22.5726,  lng: 88.3639,   m: 'Karachi',   tz: 'Asia/Kolkata', lang: 'hi' },
  { g: 'South Asia',    n: 'Hyderabad',     lat: 17.3850,  lng: 78.4867,   m: 'Karachi',   tz: 'Asia/Kolkata', lang: 'hi' },
  { g: 'Southeast Asia',n: 'Kuala Lumpur',  lat: 3.1390,   lng: 101.6869,  m: 'MWL',       tz: 'Asia/Kuala_Lumpur' },
  { g: 'Southeast Asia',n: 'Jakarta',       lat: -6.2088,  lng: 106.8456,  m: 'MWL',       tz: 'Asia/Jakarta' },
  { g: 'Southeast Asia',n: 'Singapore',     lat: 1.3521,   lng: 103.8198,  m: 'MWL',       tz: 'Asia/Singapore' },
  { g: 'East Asia',     n: 'Seoul',         lat: 37.5665,  lng: 126.9780,  m: 'MWL',       tz: 'Asia/Seoul' },
  { g: 'East Asia',     n: 'Tokyo',         lat: 35.6762,  lng: 139.6503,  m: 'MWL',       tz: 'Asia/Tokyo' },
  { g: 'Europe',        n: 'London',        lat: 51.5074,  lng: -0.1278,   m: 'MWL',       tz: 'Europe/London' },
  { g: 'Europe',        n: 'Manchester',    lat: 53.4808,  lng: -2.2426,   m: 'MWL',       tz: 'Europe/London' },
  { g: 'Europe',        n: 'Birmingham',    lat: 52.4862,  lng: -1.8904,   m: 'MWL',       tz: 'Europe/London' },
  { g: 'Europe',        n: 'Paris',         lat: 48.8566,  lng: 2.3522,    m: 'MWL',       tz: 'Europe/Paris', lang: 'fr' },
  { g: 'Europe',        n: 'Berlin',        lat: 52.5200,  lng: 13.4050,   m: 'MWL',       tz: 'Europe/Berlin' },
  { g: 'Europe',        n: 'Amsterdam',     lat: 52.3676,  lng: 4.9041,    m: 'MWL',       tz: 'Europe/Amsterdam' },
  { g: 'Europe',        n: 'Rome',          lat: 41.9028,  lng: 12.4964,   m: 'MWL',       tz: 'Europe/Rome' },
  { g: 'Europe',        n: 'Madrid',        lat: 40.4168,  lng: -3.7038,   m: 'MWL',       tz: 'Europe/Madrid', lang: 'es' },
  { g: 'Europe',        n: 'Stockholm',     lat: 59.3293,  lng: 18.0686,   m: 'MWL',       tz: 'Europe/Stockholm' },
  { g: 'Europe',        n: 'Moscow',        lat: 55.7558,  lng: 37.6173,   m: 'MWL',       tz: 'Europe/Moscow', lang: 'ru' },
  { g: 'North America', n: 'New York',      lat: 40.7128,  lng: -74.0060,  m: 'ISNA',      tz: 'America/New_York' },
  { g: 'North America', n: 'Washington DC', lat: 38.9072,  lng: -77.0369,  m: 'ISNA',      tz: 'America/New_York' },
  { g: 'North America', n: 'Chicago',       lat: 41.8781,  lng: -87.6298,  m: 'ISNA',      tz: 'America/Chicago' },
  { g: 'North America', n: 'Houston',       lat: 29.7604,  lng: -95.3698,  m: 'ISNA',      tz: 'America/Chicago' },
  { g: 'North America', n: 'Los Angeles',   lat: 34.0522,  lng: -118.2437, m: 'ISNA',      tz: 'America/Los_Angeles' },
  { g: 'North America', n: 'Toronto',       lat: 43.6532,  lng: -79.3832,  m: 'ISNA',      tz: 'America/Toronto' },
  { g: 'Africa',        n: 'Casablanca',    lat: 33.5731,  lng: -7.5898,   m: 'MWL',       tz: 'Africa/Casablanca' },
  { g: 'Africa',        n: 'Tunis',         lat: 36.8065,  lng: 10.1815,   m: 'MWL',       tz: 'Africa/Tunis' },
  { g: 'Africa',        n: 'Algiers',       lat: 36.7538,  lng: 3.0588,    m: 'MWL',       tz: 'Africa/Algiers' },
  { g: 'Africa',        n: 'Lagos',         lat: 6.5244,   lng: 3.3792,    m: 'MWL',       tz: 'Africa/Lagos' },
  { g: 'Africa',        n: 'Nairobi',       lat: -1.2921,  lng: 36.8219,   m: 'MWL',       tz: 'Africa/Nairobi' },
  { g: 'Africa',        n: 'Johannesburg',  lat: -26.2041, lng: 28.0473,   m: 'MWL',       tz: 'Africa/Johannesburg' },
  { g: 'Oceania',       n: 'Sydney',        lat: -33.8688, lng: 151.2093,  m: 'MWL',       tz: 'Australia/Sydney' },
  { g: 'Oceania',       n: 'Melbourne',     lat: -37.8136, lng: 144.9631,  m: 'MWL',       tz: 'Australia/Melbourne' }
];

/** The city whose time zone matches this machine, or null. */
function detectCity() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
  if (!tz) return null;
  const matches = CITIES.filter((c) => c.tz === tz);
  if (!matches.length) return null;
  return matches.find((c) => c.primary) || matches[0];
}

module.exports = { CITIES, detectCity };
