'use strict';
/**
 * prayer-times.js
 * Dependency-free astronomical computation of the five daily prayer times.
 *
 * Algorithm follows the standard solar-position method (Meeus, low-precision
 * form) used by the reference PrayTimes implementation:
 *   - Sun declination and equation of time from the Julian day
 *   - Hour angle for a given solar depression/altitude angle
 *   - Two refinement passes so each time uses the sun position at that time
 *
 * Configured here for Umm al-Qura (the Saudi standard) with Hanafi Asr.
 */

// --- trig helpers in degrees -------------------------------------------------
const DEG = Math.PI / 180;
const dsin = (d) => Math.sin(d * DEG);
const dcos = (d) => Math.cos(d * DEG);
const dtan = (d) => Math.tan(d * DEG);
const darcsin = (x) => Math.asin(x) / DEG;
const darccos = (x) => Math.acos(x) / DEG;
const darctan2 = (y, x) => Math.atan2(y, x) / DEG;
const darccot = (x) => Math.atan2(1, x) / DEG;

function fix(a, b) {
  a = a - b * Math.floor(a / b);
  return a < 0 ? a + b : a;
}
const fixAngle = (a) => fix(a, 360);
const fixHour = (a) => fix(a, 24);

// --- calculation methods -----------------------------------------------------
// isha given either as a solar depression angle, or as minutes after maghrib.
const METHODS = {
  UmmAlQura: {
    label: 'Umm al-Qura (Makkah)',
    fajr: 18.5,
    ishaMinutes: 90,          // 120 during Ramadan, handled below
    ramadanIshaMinutes: 120
  },
  MWL: { label: 'Muslim World League', fajr: 18, isha: 17 },
  ISNA: { label: 'Islamic Society of North America', fajr: 15, isha: 15 },
  Egypt: { label: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  Karachi: { label: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  Dubai: { label: 'Gulf / Dubai', fajr: 18.2, isha: 18.2 }
};

// Asr shadow factor. Hanafi = 2 (shadow twice the object's length plus the
// noon shadow); Standard (Shafi'i/Maliki/Hanbali) = 1.
const ASR_FACTORS = { Hanafi: 2, Standard: 1 };

const DEFAULTS = {
  latitude: 24.7136,        // Riyadh
  longitude: 46.6753,
  timezone: 3,              // UTC+3, Saudi Arabia has no DST
  elevation: 0,             // metres; 0 matches published Umm al-Qura tables
  method: 'UmmAlQura',
  asrMethod: 'Hanafi',
  isRamadan: false,
  // manual fine-tuning, in minutes, to match your local masjid
  offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
};

// --- solar position ----------------------------------------------------------
function julianDay(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716))
       + Math.floor(30.6001 * (month + 1))
       + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);          // mean anomaly
  const q = fixAngle(280.459 + 0.98564736 * D);          // mean longitude
  const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g)); // ecliptic longitude
  const e = 23.439 - 0.00000036 * D;                     // obliquity
  const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;  // right ascension, hours
  return {
    declination: darcsin(dsin(e) * dsin(L)),
    equation: q / 15 - fixHour(RA)                        // equation of time, hours
  };
}

// --- the calculator ----------------------------------------------------------
class PrayerCalculator {
  constructor(config = {}) {
    this.config = {
      ...DEFAULTS,
      ...config,
      offsets: { ...DEFAULTS.offsets, ...(config.offsets || {}) }
    };
  }

  get method() {
    return METHODS[this.config.method] || METHODS.UmmAlQura;
  }

  get asrFactor() {
    return ASR_FACTORS[this.config.asrMethod] ?? ASR_FACTORS.Hanafi;
  }

  /** Solar depression angle for sunrise/sunset, corrected for observer height. */
  riseSetAngle() {
    const elv = Math.max(0, this.config.elevation || 0);
    return 0.833 + 0.0347 * Math.sqrt(elv);
  }

  midDay(jDate, t) {
    const eqt = sunPosition(jDate + t).equation;
    return fixHour(12 - eqt);
  }

  /**
   * Time (in local solar hours) at which the sun sits at `angle` degrees below
   * the horizon. direction 'ccw' = before noon, otherwise after noon.
   */
  sunAngleTime(jDate, angle, t, direction) {
    const lat = this.config.latitude;
    const decl = sunPosition(jDate + t).declination;
    const noon = this.midDay(jDate, t);
    const numerator = -dsin(angle) - dsin(decl) * dsin(lat);
    const denominator = dcos(decl) * dcos(lat);
    const ratio = numerator / denominator;
    if (ratio > 1 || ratio < -1) return NaN;   // sun never reaches that angle
    const hourAngle = darccos(ratio) / 15;
    return noon + (direction === 'ccw' ? -hourAngle : hourAngle);
  }

  asrAngleTime(jDate, t) {
    const lat = this.config.latitude;
    const decl = sunPosition(jDate + t).declination;
    const angle = -darccot(this.asrFactor + dtan(Math.abs(lat - decl)));
    return this.sunAngleTime(jDate, angle, t, 'cw');
  }

  /**
   * Returns { fajr, sunrise, dhuhr, asr, maghrib, isha } as Date objects in
   * local machine time, for the calendar date given.
   */
  timesFor(date) {
    const cfg = this.config;
    const jDate = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate())
                - cfg.longitude / (15 * 24);

    // seed guesses (hours), then refine twice
    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (let pass = 0; pass < 2; pass++) {
      const p = {};
      for (const k of Object.keys(t)) p[k] = t[k] / 24;
      t = {
        fajr:    this.sunAngleTime(jDate, this.method.fajr, p.fajr, 'ccw'),
        sunrise: this.sunAngleTime(jDate, this.riseSetAngle(), p.sunrise, 'ccw'),
        dhuhr:   this.midDay(jDate, p.dhuhr),
        asr:     this.asrAngleTime(jDate, p.asr),
        sunset:  this.sunAngleTime(jDate, this.riseSetAngle(), p.sunset, 'cw'),
        isha:    18
      };
      t.isha = t.sunset;
    }

    // convert solar hours -> local clock hours
    const shift = cfg.timezone - cfg.longitude / 15;
    const out = {
      fajr:    t.fajr + shift,
      sunrise: t.sunrise + shift,
      dhuhr:   t.dhuhr + shift + 1 / 60,   // +1 min so dhuhr is safely past zenith
      asr:     t.asr + shift,
      maghrib: t.sunset + shift
    };

    /* Higher latitudes: above roughly 48 degrees the sun never dips far enough
       below the horizon in midsummer for Fajr or Isha to exist astronomically.
       Fall back to the one-seventh-of-the-night rule so the app still works in
       London, Stockholm or Toronto rather than showing blanks. */
    const nightLength = 24 - (out.maghrib - out.sunrise);
    const seventh = nightLength / 7;
    if (!isFinite(out.fajr)) out.fajr = out.sunrise - seventh;
    if (!isFinite(out.sunrise) || !isFinite(out.maghrib)) {
      // the sun never rose or never set — anchor to the solar noon instead
      const noon = t.dhuhr + shift;
      if (!isFinite(out.sunrise)) out.sunrise = noon - 6;
      if (!isFinite(out.maghrib)) out.maghrib = noon + 6;
      if (!isFinite(out.fajr)) out.fajr = out.sunrise - 1.5;
    }

    // isha
    const m = this.method;
    if (m.ishaMinutes != null) {
      const mins = cfg.isRamadan && m.ramadanIshaMinutes != null
        ? m.ramadanIshaMinutes : m.ishaMinutes;
      out.isha = out.maghrib + mins / 60;
    } else {
      out.isha = this.sunAngleTime(jDate, m.isha, (t.sunset + 1) / 24, 'cw') + shift;
      if (!isFinite(out.isha)) out.isha = out.maghrib + seventh;
    }
    // Asr can also vanish inside the polar circle
    if (!isFinite(out.asr)) out.asr = (out.dhuhr + out.maghrib) / 2;

    // manual offsets
    for (const k of Object.keys(out)) {
      const off = cfg.offsets[k] || 0;
      out[k] += off / 60;
    }

    // hours -> Date
    const result = {};
    for (const k of Object.keys(out)) {
      result[k] = hoursToDate(date, out[k]);
    }
    return result;
  }
}

function hoursToDate(baseDate, hours) {
  if (!isFinite(hours)) return null;
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const totalMinutes = Math.round(hours * 60);
  d.setMinutes(d.getMinutes() + totalMinutes);
  d.setSeconds(0, 0);
  return d;
}

/** The five obligatory prayers, in order, with display labels. */
const PRAYERS = [
  { key: 'fajr',    en: 'Fajr',    ar: 'الفجر',   scene: 'celestial',  variant: 'dawn'  },
  { key: 'dhuhr',   en: 'Dhuhr',   ar: 'الظهر',   scene: 'girih',      variant: 'noon'  },
  { key: 'asr',     en: 'Asr',     ar: 'العصر',   scene: 'mashrabiya', variant: 'after' },
  { key: 'maghrib', en: 'Maghrib', ar: 'المغرب',  scene: 'celestial',  variant: 'dusk'  },
  { key: 'isha',    en: 'Isha',    ar: 'العشاء',  scene: 'girih',      variant: 'night' }
];

module.exports = { PrayerCalculator, PRAYERS, METHODS, ASR_FACTORS, DEFAULTS, julianDay, sunPosition };
