'use strict';
const { EventEmitter } = require('events');
const { PrayerCalculator, PRAYERS } = require('./prayer-times');
const { toKey } = require('./store');

const TICK_MS = 10 * 1000;   // a heartbeat, not long timers — survives sleep/wake

/**
 * Owns the "when do we ask?" logic.
 *
 *   pending  -> the prompt is due at `nextPromptAt`
 *   snoozed  -> answered "Not yet"; nextPromptAt pushed by snoozeMinutes
 *   going    -> answered "Going now"; immersive screen is up
 *   prayed   -> done for this waqt
 *   missed   -> the waqt window closed, or snoozes ran out
 *
 * Emits: 'prompt' (prayer, times), 'day-changed' (times), 'tick'
 */
class Scheduler extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    this.dayKey = null;
    this.times = null;
    this.plan = {};      // prayerKey -> { nextPromptAt: Date|null, snoozes: n }
    this.timer = null;
  }

  get settings() { return this.store.settings; }

  calculator(date) {
    const s = this.settings;
    const tz = s.timezone == null
      ? -date.getTimezoneOffset() / 60      // follow the machine, DST included
      : s.timezone;
    return new PrayerCalculator({
      latitude: s.latitude,
      longitude: s.longitude,
      timezone: tz,
      elevation: s.elevation,
      method: s.method,
      asrMethod: s.asrMethod,
      isRamadan: s.isRamadan,
      offsets: s.offsets
    });
  }

  timesFor(date) {
    return this.calculator(date).timesFor(date);
  }

  start() {
    this.refreshDay(new Date());
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  stop() { if (this.timer) clearInterval(this.timer); }

  /** Rebuild today's times and the prompt plan. Safe to call at any time. */
  refreshDay(now) {
    const key = toKey(now);
    this.dayKey = key;
    this.times = this.timesFor(now);
    const rec = this.store.day(key);
    const lead = this.settings.leadMinutes;

    this.plan = {};
    for (const pr of PRAYERS) {
      const t = this.times[pr.key];
      const saved = rec[pr.key];
      const status = saved ? saved.status : 'pending';
      let nextPromptAt = null;
      // 'asking' means the app closed with a prompt still open — ask again
      if (status === 'pending' || status === 'snoozed' || status === 'asking') {
        nextPromptAt = saved && saved.nextPromptAt
          ? new Date(saved.nextPromptAt)
          : new Date(t.getTime() - lead * 60000);
      }
      this.plan[pr.key] = {
        snoozes: saved ? (saved.snoozes || 0) : 0,
        nextPromptAt
      };
    }
    this.emit('day-changed', this.snapshot());
  }

  /** The moment a waqt's window closes: the next prayer's time, or midnight. */
  windowEnd(prayerKey) {
    const i = PRAYERS.findIndex((p) => p.key === prayerKey);
    const next = PRAYERS[i + 1];
    if (next) return this.times[next.key];
    const end = new Date(this.times.isha);
    end.setHours(23, 59, 0, 0);
    return end;
  }

  tick() {
    const now = new Date();
    if (toKey(now) !== this.dayKey) { this.refreshDay(now); }

    for (const pr of PRAYERS) {
      const st = this.plan[pr.key];
      if (!st || !st.nextPromptAt) continue;

      // window closed, or we have asked enough times
      if (now >= this.windowEnd(pr.key) || st.snoozes > this.settings.maxSnoozes) {
        st.nextPromptAt = null;
        this.store.record(this.dayKey, pr.key, { status: 'missed', nextPromptAt: null });
        continue;
      }

      if (now >= st.nextPromptAt) {
        st.nextPromptAt = null;              // cleared until the user answers
        this.store.record(this.dayKey, pr.key, {
          status: 'asking', nextPromptAt: null, lastAskedAt: now.toISOString()
        });
        this.emit('prompt', pr, this.snapshot());
        break;                               // one prompt at a time
      }
    }
    this.emit('tick', this.snapshot());
  }

  /** action: 'prayed' | 'later' | 'going' */
  answer(prayerKey, action) {
    const now = new Date();
    const st = this.plan[prayerKey] || (this.plan[prayerKey] = { snoozes: 0, nextPromptAt: null });

    if (action === 'prayed' || action === 'going') {
      st.nextPromptAt = null;
      this.store.record(this.dayKey, prayerKey, {
        status: action === 'going' ? 'going' : 'prayed',
        answeredAt: now.toISOString(),
        nextPromptAt: null
      });
    } else {
      st.snoozes += 1;
      const next = new Date(now.getTime() + this.settings.snoozeMinutes * 60000);
      st.nextPromptAt = next;
      this.store.record(this.dayKey, prayerKey, {
        status: 'snoozed',
        snoozes: st.snoozes,
        nextPromptAt: next.toISOString()
      });
    }
    return this.snapshot();
  }

  /** Called when the immersive screen closes — the prayer counts as done. */
  completeGoing(prayerKey) {
    const rec = this.store.day(this.dayKey)[prayerKey];
    if (rec && rec.status === 'going') {
      this.store.record(this.dayKey, prayerKey, {
        status: 'prayed', answeredAt: new Date().toISOString()
      });
    }
  }

  nextPrayer(now = new Date()) {
    for (const pr of PRAYERS) {
      if (this.times[pr.key] && this.times[pr.key] > now) {
        return { prayer: pr, at: this.times[pr.key], tomorrow: false };
      }
    }
    const t = new Date(now); t.setDate(t.getDate() + 1);
    const tmr = this.timesFor(t);
    return { prayer: PRAYERS[0], at: tmr.fajr, tomorrow: true };
  }

  snapshot() {
    const rec = this.store.day(this.dayKey);
    return {
      dayKey: this.dayKey,
      times: Object.fromEntries(
        Object.entries(this.times).map(([k, v]) => [k, v ? v.toISOString() : null])
      ),
      statuses: Object.fromEntries(
        PRAYERS.map((p) => [p.key, (rec[p.key] && rec[p.key].status) || 'pending'])
      ),
      next: (() => {
        const n = this.nextPrayer();
        return { key: n.prayer.key, en: n.prayer.en, ar: n.prayer.ar, at: n.at.toISOString(), tomorrow: n.tomorrow };
      })(),
      streak: this.store.streak(this.dayKey)
    };
  }
}

module.exports = { Scheduler, PRAYERS };
