/* ===========================================================================
   scenes.js — three generative Islamic-art canvas scenes.

     girih       animated stellar tessellation and rosette strapwork
     mashrabiya  carved lattice screen with light raking through it
     celestial   nur: starfield, crescent, expanding rings of light

   All geometry is generated mathematically at runtime — nothing is traced
   from an existing artwork, and nothing figurative is drawn.
   =========================================================================== */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }

  /* Deterministic PRNG so a scene looks the same each time it opens. */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------------------------------------------------------------- geometry */

  /** Vertices of a regular n-gon. */
  function ngon(cx, cy, r, n, rot) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + i * TAU / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  /** Strokes a polyline, revealing only the first `progress` fraction of it. */
  function strokeProgress(ctx, pts, progress) {
    if (progress <= 0) return;
    const segs = pts.length - 1;
    const total = segs * clamp(progress, 0, 1);
    const whole = Math.floor(total);
    const frac = total - whole;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= Math.min(whole, segs); i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (whole < segs && frac > 0) {
      const a = pts[whole], b = pts[whole + 1];
      ctx.lineTo(lerp(a[0], b[0], frac), lerp(a[1], b[1], frac));
    }
    ctx.stroke();
  }

  /**
   * Star polygon {n/skip} — the backbone of Islamic stellar geometry.
   * Handles the multi-cycle case (when gcd(n, skip) > 1) by drawing each cycle.
   */
  function starPolygon(ctx, cx, cy, r, n, skip, rot, progress) {
    const pts = ngon(cx, cy, r, n, rot);
    const cycles = gcd(n, skip);
    for (let s = 0; s < cycles; s++) {
      const seq = [];
      let i = s;
      do { seq.push(pts[i]); i = (i + skip) % n; } while (i !== s);
      seq.push(pts[s]);
      strokeProgress(ctx, seq, progress === undefined ? 1 : progress);
    }
  }

  /* ------------------------------------------------------------- scene base */

  class BaseScene {
    constructor(canvas, palette, opts) {
      this.canvas = canvas;
      this.opts = Object.assign({ density: 1, seed: 7, overlay: false }, opts || {});
      /* overlay: the scene is drawn on top of a photograph, so it paints only
         its ornament on a transparent canvas and leaves the ground alone. */
      this.overlay = !!this.opts.overlay;
      this.ctx = canvas.getContext('2d', { alpha: this.overlay });
      this.p = palette;
      this.rand = mulberry32(this.opts.seed * 2654435761 % 2147483647);
      this.t0 = performance.now();
      this.running = false;
      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
      this.resize();
    }

    resize() {
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, rect.width);
      this.h = Math.max(1, rect.height);
      this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.min = Math.min(this.w, this.h);
      if (this.build) this.build();
    }

    start() {
      if (this.running) return;
      this.running = true;
      const loop = (now) => {
        if (!this.running) return;
        const t = (now - this.t0) / 1000;
        this.draw(t);
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    destroy() {
      this.stop();
      window.removeEventListener('resize', this._onResize);
    }

    /** Deep vertical + radial ground wash shared by every scene. */
    paintGround(t, focusY) {
      const { ctx, w, h, p } = this;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, p.bg0);
      g.addColorStop(0.55, p.bg1);
      g.addColorStop(1, p.bg0);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const breathe = 0.5 + 0.5 * Math.sin(t * 0.22);
      const rg = ctx.createRadialGradient(
        w / 2, focusY, 0,
        w / 2, focusY, this.min * lerp(0.55, 0.78, breathe)
      );
      rg.addColorStop(0, p.bg2);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    paintVignette(strength) {
      const { ctx, w, h } = this;
      const g = ctx.createRadialGradient(
        w / 2, h / 2, this.min * 0.25,
        w / 2, h / 2, Math.max(w, h) * 0.78
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (strength === undefined ? 0.62 : strength) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* ================================================================== GIRIH */

  class GirihScene extends BaseScene {
    build() {
      this.tile = this.makeTile();
      this.motes = [];
      const n = Math.round(46 * this.opts.density);
      for (let i = 0; i < n; i++) {
        this.motes.push({
          a: this.rand() * TAU,
          r: 0.18 + this.rand() * 0.68,
          sp: (0.03 + this.rand() * 0.09) * (this.rand() < 0.5 ? -1 : 1),
          s: 0.6 + this.rand() * 1.9,
          ph: this.rand() * TAU
        });
      }
    }

    /** Offscreen 8-fold star-and-cross tile, used as a repeating wallpaper. */
    makeTile() {
      const S = Math.round(clamp(this.min * 0.22, 64, 150));
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      x.strokeStyle = this.p.line;
      x.lineWidth = 1.15;
      x.lineJoin = 'round';
      x.globalAlpha = 1;

      const R = S * 0.34;
      // stars on the lattice points and at the tile centre
      const centres = [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]];
      for (const [cx, cy] of centres) {
        starPolygon(x, cx, cy, R, 8, 3, Math.PI / 8, 1);
        starPolygon(x, cx, cy, R * 0.58, 8, 3, 0, 1);
      }
      // connecting strapwork between neighbouring stars
      x.globalAlpha = 0.55;
      x.beginPath();
      x.moveTo(0, S / 2); x.lineTo(S, S / 2);
      x.moveTo(S / 2, 0); x.lineTo(S / 2, S);
      x.stroke();
      return c;
    }

    draw(t) {
      if (this.overlay) return this.drawOverlay(t);
      const { ctx, w, h, p } = this;
      this.paintGround(t, h * 0.5);

      // --- drifting wallpaper of stars -------------------------------------
      const pat = ctx.createPattern(this.tile, 'repeat');
      ctx.save();
      ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 0.3);
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.sin(t * 0.013) * 0.06);
      const drift = (t * 5) % this.tile.width;
      ctx.translate(-w / 2 - drift, -h / 2 - drift * 0.4);
      ctx.fillStyle = pat;
      ctx.fillRect(-this.tile.width, -this.tile.width,
                   w + this.tile.width * 3, h + this.tile.width * 3);
      ctx.restore();

      // --- central rosette --------------------------------------------------
      const cx = w / 2, cy = h / 2;
      const cycle = 16;                       // seconds per draw-and-hold cycle
      const phase = (t % cycle) / cycle;
      const reveal = easeOutCubic(clamp(phase / 0.42, 0, 1));
      const fade = phase > 0.86 ? 1 - easeInOut((phase - 0.86) / 0.14) : 1;
      const breathe = 1 + 0.022 * Math.sin(t * 0.55);
      const R = this.min * 0.34 * breathe;
      const spin = t * 0.024;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = p.glow;

      // outer rings
      ctx.strokeStyle = p.lineSoft;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      for (const k of [1.0, 0.86, 0.5, 0.28]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, TAU * clamp(reveal * 1.2, 0, 1));
        ctx.stroke();
      }

      // 24 radial spokes
      ctx.globalAlpha = fade * 0.35;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = spin + i * TAU / 24;
        ctx.moveTo(cx + Math.cos(a) * R * 0.28, cy + Math.sin(a) * R * 0.28);
        ctx.lineTo(cx + Math.cos(a) * R * reveal, cy + Math.sin(a) * R * reveal);
      }
      ctx.stroke();

      // interlaced star polygons — the rosette proper
      ctx.globalAlpha = fade;
      ctx.shadowBlur = 14;
      const layers = [
        { n: 16, skip: 7, r: 1.00, lw: 1.7, col: p.line },
        { n: 16, skip: 5, r: 0.86, lw: 1.3, col: p.accent },
        { n: 12, skip: 5, r: 0.58, lw: 1.5, col: p.line },
        { n: 8,  skip: 3, r: 0.34, lw: 1.9, col: p.accent2 }
      ];
      layers.forEach((L, i) => {
        const lag = i * 0.09;
        const pr = clamp((reveal - lag) / (1 - lag), 0, 1);
        if (pr <= 0) return;
        ctx.strokeStyle = L.col;
        ctx.lineWidth = L.lw;
        starPolygon(ctx, cx, cy, R * L.r, L.n, L.skip,
                    spin * (i % 2 ? -1.6 : 1) + i * 0.19, pr);
      });

      // a still point at the centre
      ctx.shadowBlur = 26;
      ctx.fillStyle = p.accent;
      ctx.globalAlpha = fade * (0.5 + 0.35 * Math.sin(t * 1.1));
      ctx.beginPath();
      ctx.arc(cx, cy, this.min * 0.011, 0, TAU);
      ctx.fill();
      ctx.restore();

      // --- gold motes orbiting the rosette ----------------------------------
      ctx.save();
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.particle;
      for (const m of this.motes) {
        const a = m.a + t * m.sp;
        const rr = this.min * 0.5 * m.r;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.82;
        ctx.globalAlpha = 0.20 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.ph));
        ctx.beginPath();
        ctx.arc(x, y, m.s, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      this.paintVignette(0.6);
    }

    /* Drawn over a photograph: the rosette and its motes, nothing else. */
    drawOverlay(t) {
      const { ctx, w, h, p } = this;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const cycle = 16;
      const phase = (t % cycle) / cycle;
      const reveal = easeOutCubic(clamp(phase / 0.42, 0, 1));
      const fade = phase > 0.86 ? 1 - easeInOut((phase - 0.86) / 0.14) : 1;
      const breathe = 1 + 0.022 * Math.sin(t * 0.55);
      const R = this.min * 0.47 * breathe;   // wide, so the middle stays clear
      const spin = t * 0.024;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * 0.42;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 16;

      /* Low-skip star polygons: their chords hug the rim instead of crossing
         the middle, so the ornament reads as a woven ring around the words. */
      const layers = [
        { n: 32, skip: 3, r: 1.00, lw: 1.1, col: p.line },
        { n: 24, skip: 2, r: 0.88, lw: 1.0, col: p.accent },
        { n: 48, skip: 5, r: 1.13, lw: 0.8, col: p.line }
      ];
      ctx.strokeStyle = p.lineSoft;
      ctx.lineWidth = 0.9;
      for (const k of [0.86, 1.02, 1.15]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, TAU * clamp(reveal * 1.2, 0, 1));
        ctx.stroke();
      }
      layers.forEach((L, i) => {
        const lag = i * 0.09;
        const pr = clamp((reveal - lag) / (1 - lag), 0, 1);
        if (pr <= 0) return;
        ctx.strokeStyle = L.col;
        ctx.lineWidth = L.lw;
        starPolygon(ctx, cx, cy, R * L.r, L.n, L.skip,
                    spin * (i % 2 ? -1.6 : 1) + i * 0.19, pr);
      });

      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.particle;
      for (const m of this.motes) {
        const a = m.a + t * m.sp;
        const rr = this.min * 0.5 * m.r;
        ctx.globalAlpha = 0.14 + 0.32 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.ph));
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82, m.s, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ============================================================ MASHRABIYA */

  /**
   * A carved wooden screen read the way a real one is read: the wood is opaque
   * and the pattern is the holes. We build one seamless tile of dark wood with
   * star-shaped apertures punched out of it, lay it over a lit background, and
   * cut a pointed arch out of the whole screen so light pours through.
   */
  class MashrabiyaScene extends BaseScene {
    build() {
      this.screen = this.makeScreen(1);
      this.screenFine = this.makeScreen(0.52);
      this.layer = document.createElement('canvas');
      this.layer.width = Math.round(this.w * this.dpr);
      this.layer.height = Math.round(this.h * this.dpr);
      this.lctx = this.layer.getContext('2d');
      this.lctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.dust = [];
      const n = Math.round(120 * this.opts.density);
      for (let i = 0; i < n; i++) {
        this.dust.push({
          x: this.rand(), y: this.rand(),
          z: 0.35 + this.rand() * 0.9,
          s: 0.5 + this.rand() * 1.7,
          ph: this.rand() * TAU,
          vx: (this.rand() - 0.5) * 0.010
        });
      }
    }

    /** One square tile: opaque wood, star apertures carved through it. */
    makeScreen(scale) {
      const S = Math.round(clamp(this.min * 0.20, 92, 190) * (scale || 1));
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');

      // solid wood
      x.fillStyle = '#000';
      x.fillRect(0, 0, S, S);

      // build a closed {n/skip} star outline, for filling rather than stroking
      const starPath = (cx, cy, r, n, skip, rot) => {
        const pts = ngon(cx, cy, r, n, rot);
        x.beginPath();
        x.moveTo(pts[0][0], pts[0][1]);
        let i = 0;
        for (let k = 1; k < n; k++) { i = (i + skip) % n; x.lineTo(pts[i][0], pts[i][1]); }
        x.closePath();
      };

      const bigR = S * 0.30, smallR = S * 0.105;
      const bigs = [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]];
      const smalls = [[S / 2, 0], [0, S / 2], [S, S / 2], [S / 2, S]];

      // carve the apertures
      x.globalCompositeOperation = 'destination-out';
      for (const [cx, cy] of bigs) { starPath(cx, cy, bigR, 8, 3, Math.PI / 8); x.fill(); }
      for (const [cx, cy] of smalls) { starPath(cx, cy, smallR, 4, 1, Math.PI / 4); x.fill(); }

      // a fine warm line where the light catches the carved edge
      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = 'rgba(255,214,160,0.30)';
      x.lineWidth = 1.1;
      x.lineJoin = 'round';
      for (const [cx, cy] of bigs) { starPath(cx, cy, bigR * 1.045, 8, 3, Math.PI / 8); x.stroke(); }
      x.strokeStyle = 'rgba(255,214,160,0.18)';
      for (const [cx, cy] of smalls) { starPath(cx, cy, smallR * 1.1, 4, 1, Math.PI / 4); x.stroke(); }

      return c;
    }

    archPath(ctx) {
      const { w, h } = this;
      const aw = this.min * 0.255;
      const cx = w / 2, floor = h * 0.96;
      const springer = floor - h * 0.30;     // where the curve starts
      const apex = floor - h * 0.70;
      ctx.beginPath();
      ctx.moveTo(cx - aw, floor);
      ctx.lineTo(cx - aw, springer);
      ctx.quadraticCurveTo(cx - aw * 0.94, apex + h * 0.10, cx, apex);
      ctx.quadraticCurveTo(cx + aw * 0.94, apex + h * 0.10, cx + aw, springer);
      ctx.lineTo(cx + aw, floor);
      ctx.closePath();
    }

    draw(t) {
      if (this.overlay) return this.drawOverlay(t);
      const { ctx, w, h, p } = this;

      // --- the lit world behind the screen ------------------------------------
      const g = ctx.createLinearGradient(0, h, w * 0.9, 0);
      g.addColorStop(0, p.bg1);
      g.addColorStop(0.55, p.bg2);
      g.addColorStop(1, p.accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // the sun, drifting the way afternoon light does
      const sx = w * (0.68 + 0.07 * Math.sin(t * 0.05));
      const sy = h * (0.26 + 0.06 * Math.cos(t * 0.043));
      const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.min * 1.0);
      sun.addColorStop(0, 'rgba(255,242,214,0.72)');
      sun.addColorStop(0.28, p.glow);
      sun.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      // --- the screen: dark wood with the light coming through -----------------
      const lx = this.lctx;
      lx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      lx.clearRect(0, 0, w, h);
      const pat = lx.createPattern(this.screen, 'repeat');
      const swayX = Math.sin(t * 0.10) * this.min * 0.010;
      const swayY = Math.cos(t * 0.083) * this.min * 0.007;
      lx.save();
      lx.translate(swayX, swayY);
      lx.fillStyle = pat;
      lx.fillRect(-this.min * 0.2, -this.min * 0.2, w + this.min * 0.4, h + this.min * 0.4);
      lx.restore();

      // cut the archway out of the screen
      lx.globalCompositeOperation = 'destination-out';
      this.archPath(lx);
      lx.fill();
      lx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.globalAlpha = 0.93;
      ctx.drawImage(this.layer, 0, 0, w, h);
      ctx.restore();

      // --- inside the opening: a finer screen, and the horizon beyond ------------
      ctx.save();
      this.archPath(ctx);
      ctx.clip();

      // depth: a warm horizon band far behind the window
      const far = ctx.createLinearGradient(0, h * 0.20, 0, h * 0.96);
      far.addColorStop(0, 'rgba(255,244,222,0.42)');
      far.addColorStop(0.62, 'rgba(255,198,126,0.20)');
      far.addColorStop(1, 'rgba(90,40,10,0.30)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = far;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'source-over';
      const finePat = ctx.createPattern(this.screenFine, 'repeat');
      ctx.globalAlpha = 0.50;
      ctx.translate(swayX * 0.5, swayY * 0.5);
      ctx.fillStyle = finePat;
      ctx.fillRect(-this.min * 0.2, -this.min * 0.2, w + this.min * 0.4, h + this.min * 0.4);
      ctx.restore();

      // --- the arch frame -------------------------------------------------------
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 26;
      ctx.strokeStyle = 'rgba(20,9,2,0.85)';
      ctx.lineWidth = this.min * 0.022;
      this.archPath(ctx);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,226,186,0.50)';
      ctx.lineWidth = 1.5;
      this.archPath(ctx);
      ctx.stroke();
      ctx.restore();

      // --- shafts of light in the air ------------------------------------------
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(sx, sy);
      ctx.rotate(0.66 + 0.04 * Math.sin(t * 0.07));
      for (let i = 0; i < 5; i++) {
        const off = ((t * 12 + i * 160) % (this.min * 1.9)) - this.min * 0.5;
        const bw = this.min * (0.055 + 0.03 * ((i * 7) % 3));
        const lg = ctx.createLinearGradient(0, off, 0, off + bw);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, 'rgba(255,240,214,0.075)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(-this.min * 2, off, this.min * 4, bw);
      }
      ctx.restore();

      // --- dust hanging in the beam ---------------------------------------------
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 7;
      ctx.fillStyle = p.particle;
      for (const d of this.dust) {
        const y = ((d.y - t * 0.011 * d.z) % 1 + 1) % 1;
        const x = ((d.x + d.vx * t) % 1 + 1) % 1;
        const px = x * w, py = y * h;
        const near = 1 - clamp(Math.hypot(px - sx, py - sy) / (this.min * 1.0), 0, 1);
        ctx.globalAlpha = (0.08 + 0.6 * near) * (0.45 + 0.55 * Math.sin(t * 1.5 + d.ph));
        ctx.beginPath();
        ctx.arc(px, py, d.s * d.z, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      this.paintVignette(0.66);
    }

    /* Drawn over a photograph: shafts of light and dust hanging in them. */
    drawOverlay(t) {
      const { ctx, w, h, p } = this;
      ctx.clearRect(0, 0, w, h);

      const sx = w * (0.68 + 0.07 * Math.sin(t * 0.05));
      const sy = h * (0.22 + 0.06 * Math.cos(t * 0.043));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(sx, sy);
      ctx.rotate(0.66 + 0.04 * Math.sin(t * 0.07));
      for (let i = 0; i < 5; i++) {
        const off = ((t * 12 + i * 160) % (this.min * 1.9)) - this.min * 0.5;
        const bw = this.min * (0.055 + 0.03 * ((i * 7) % 3));
        const lg = ctx.createLinearGradient(0, off, 0, off + bw);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, 'rgba(255,240,214,0.075)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(-this.min * 2, off, this.min * 4, bw);
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 7;
      ctx.fillStyle = p.particle;
      for (const d of this.dust) {
        const y = ((d.y - t * 0.011 * d.z) % 1 + 1) % 1;
        const x = ((d.x + d.vx * t) % 1 + 1) % 1;
        const px = x * w, py = y * h;
        const near = 1 - clamp(Math.hypot(px - sx, py - sy) / (this.min * 1.0), 0, 1);
        ctx.globalAlpha = (0.06 + 0.45 * near) * (0.45 + 0.55 * Math.sin(t * 1.5 + d.ph));
        ctx.beginPath();
        ctx.arc(px, py, d.s * d.z, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ============================================================== CELESTIAL */

  class CelestialScene extends BaseScene {
    build() {
      this.stars = [];
      const n = Math.round(260 * this.opts.density);
      for (let i = 0; i < n; i++) {
        this.stars.push({
          x: this.rand(), y: this.rand() * 0.84,
          s: 0.35 + Math.pow(this.rand(), 3) * 2.2,
          ph: this.rand() * TAU,
          sp: 0.4 + this.rand() * 1.7
        });
      }
      this.skyline = [
        { x: 0.12, scale: 0.50, kind: 'dome' },
        { x: 0.26, scale: 0.86, kind: 'minaret' },
        { x: 0.42, scale: 0.62, kind: 'dome' },
        { x: 0.50, scale: 1.00, kind: 'dome' },
        { x: 0.58, scale: 0.62, kind: 'dome' },
        { x: 0.74, scale: 0.86, kind: 'minaret' },
        { x: 0.88, scale: 0.50, kind: 'dome' }
      ];
    }

    /** Onion dome with a finial — drawn, not traced. */
    domePath(ctx, x, base, u) {
      ctx.beginPath();
      ctx.moveTo(x - u, base);
      ctx.lineTo(x - u, base - u * 0.46);
      ctx.bezierCurveTo(x - u * 1.16, base - u * 1.10,
                        x - u * 0.34, base - u * 1.46,
                        x,            base - u * 1.72);
      ctx.bezierCurveTo(x + u * 0.34, base - u * 1.46,
                        x + u * 1.16, base - u * 1.10,
                        x + u,        base - u * 0.46);
      ctx.lineTo(x + u, base);
      ctx.closePath();
      ctx.fill();
      // finial
      ctx.beginPath();
      ctx.rect(x - u * 0.035, base - u * 2.04, u * 0.07, u * 0.34);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, base - u * 2.10, u * 0.075, 0, TAU);
      ctx.fill();
    }

    /** Tapered minaret with a gallery and a slender cap. */
    minaretPath(ctx, x, base, u) {
      const w0 = u * 0.17, w1 = u * 0.135, w2 = u * 0.105;
      const gY = base - u * 1.62, gH = u * 0.14, gW = u * 0.30;
      ctx.beginPath();
      ctx.moveTo(x - w0, base);
      ctx.lineTo(x - w1, gY + gH);
      ctx.lineTo(x - gW, gY + gH);
      ctx.lineTo(x - gW, gY);
      ctx.lineTo(x - w2, gY);
      ctx.lineTo(x - w2 * 0.82, base - u * 2.36);
      ctx.lineTo(x - w2 * 1.30, base - u * 2.40);
      ctx.lineTo(x,             base - u * 2.92);      // cap
      ctx.lineTo(x + w2 * 1.30, base - u * 2.40);
      ctx.lineTo(x + w2 * 0.82, base - u * 2.36);
      ctx.lineTo(x + w2, gY);
      ctx.lineTo(x + gW, gY);
      ctx.lineTo(x + gW, gY + gH);
      ctx.lineTo(x + w1, gY + gH);
      ctx.lineTo(x + w0, base);
      ctx.closePath();
      ctx.fill();
      // finial spike
      ctx.beginPath();
      ctx.moveTo(x - u * 0.022, base - u * 2.90);
      ctx.lineTo(x,             base - u * 3.16);
      ctx.lineTo(x + u * 0.022, base - u * 2.90);
      ctx.closePath();
      ctx.fill();
    }

    drawSkyline() {
      const { ctx, w, h } = this;
      const base = h * 0.905;
      const unit = this.min * 0.125;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      for (const s of this.skyline) {
        const u = unit * s.scale;
        if (s.kind === 'dome') this.domePath(ctx, s.x * w, base, u);
        else this.minaretPath(ctx, s.x * w, base, u);
      }
      ctx.fillRect(0, base, w, h - base);
      ctx.restore();
    }

    draw(t) {
      if (this.overlay) return this.drawOverlay(t);
      const { ctx, w, h, p } = this;
      const cx = w * 0.5, cy = h * 0.36;
      const R = this.min * 0.115;
      const bob = Math.sin(t * 0.3) * this.min * 0.006;

      // --- sky ------------------------------------------------------------------
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, p.bg0);
      g.addColorStop(0.5, p.bg1);
      g.addColorStop(0.88, p.bg2);
      g.addColorStop(1, p.bg1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // --- stars ------------------------------------------------------------------
      ctx.save();
      ctx.fillStyle = p.particle;
      for (const s of this.stars) {
        const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.globalAlpha = tw * 0.95 * (1 - s.y * 0.5);
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.s, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // --- quiet geometry behind everything ---------------------------------------
      ctx.save();
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.09;
      starPolygon(ctx, cx, cy + bob, this.min * 0.42, 12, 5, t * 0.016, 1);
      ctx.globalAlpha = 0.055;
      starPolygon(ctx, cx, cy + bob, this.min * 0.60, 24, 11, -t * 0.010, 1);
      ctx.restore();

      // --- expanding rings of light -------------------------------------------------
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const period = 5.5, ringCount = 4;
      for (let i = 0; i < ringCount; i++) {
        const ph = ((t / period) + i / ringCount) % 1;
        const rr = lerp(R * 0.9, this.min * 0.62, easeOutCubic(ph));
        ctx.globalAlpha = (1 - ph) * 0.34;
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = lerp(2.6, 0.4, ph);
        ctx.beginPath();
        ctx.arc(cx, cy + bob, rr, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      // --- halo, then the crescent on top -------------------------------------------
      ctx.save();
      ctx.translate(cx, cy + bob);
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 4.6);
      halo.addColorStop(0, p.glow);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.45 + 0.1 * Math.sin(t * 0.6);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, R * 4.6, 0, TAU);
      ctx.fill();
      ctx.restore();

      if (!this._moon || this._moonR !== R) {
        const off = document.createElement('canvas');
        const oR = R * 1.5;
        off.width = off.height = Math.ceil(R * 3 * this.dpr);
        const oc = off.getContext('2d');
        oc.scale(this.dpr, this.dpr);
        oc.fillStyle = p.line;
        oc.beginPath(); oc.arc(oR, oR, R, 0, TAU); oc.fill();
        oc.globalCompositeOperation = 'destination-out';
        oc.beginPath(); oc.arc(oR + R * 0.46, oR - R * 0.33, R * 0.95, 0, TAU); oc.fill();
        this._moon = off; this._moonR = R;
      }
      ctx.save();
      ctx.translate(cx, cy + bob);
      ctx.rotate(-0.38);
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 34;
      ctx.drawImage(this._moon, -R * 1.5, -R * 1.5, R * 3, R * 3);
      ctx.restore();

      // --- horizon glow, then the skyline -----------------------------------------
      const hg = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.94);
      hg.addColorStop(0, 'rgba(0,0,0,0)');
      hg.addColorStop(1, p.glow);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34 + 0.06 * Math.sin(t * 0.25);
      ctx.fillStyle = hg;
      ctx.fillRect(0, h * 0.58, w, h * 0.36);
      ctx.restore();

      this.drawSkyline();

      // --- drifting motes -----------------------------------------------------------
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.particle;
      const drifters = Math.round(this.stars.length * 0.12);
      for (let i = 0; i < drifters; i++) {
        const s = this.stars[i];
        const y = ((s.y * 1.2 - t * 0.02 * s.sp) % 1 + 1) % 1;
        ctx.globalAlpha = 0.26 * (0.5 + 0.5 * Math.sin(t + s.ph));
        ctx.beginPath();
        ctx.arc(s.x * w, y * h * 0.9, s.s * 1.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      this.paintVignette(0.52);
    }

    /* Drawn over a photograph: rings of light and slow stellar geometry. */
    drawOverlay(t) {
      const { ctx, w, h, p } = this;
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.40;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.13;
      starPolygon(ctx, cx, cy, this.min * 0.56, 36, 4, t * 0.016, 1);
      ctx.globalAlpha = 0.08;
      starPolygon(ctx, cx, cy, this.min * 0.80, 48, 5, -t * 0.010, 1);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const period = 5.5, ringCount = 4;
      for (let i = 0; i < ringCount; i++) {
        const ph = ((t / period) + i / ringCount) % 1;
        const rr = lerp(this.min * 0.18, this.min * 0.82, easeOutCubic(ph));
        ctx.globalAlpha = (1 - ph) * 0.20;
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = lerp(2.4, 0.4, ph);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.particle;
      for (const s2 of this.stars) {
        const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s2.sp + s2.ph));
        ctx.globalAlpha = tw * 0.32 * (1 - s2.y * 0.5);
        ctx.beginPath();
        ctx.arc(s2.x * w, s2.y * h, s2.s * 0.9, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ export */

  const REGISTRY = {
    girih: GirihScene,
    mashrabiya: MashrabiyaScene,
    celestial: CelestialScene
  };

  window.createScene = function (kind, canvas, palette, opts) {
    const Cls = REGISTRY[kind] || GirihScene;
    return new Cls(canvas, palette, opts);
  };
  window.SCENE_KINDS = Object.keys(REGISTRY);
})();
