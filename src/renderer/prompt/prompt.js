(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let scene = null, target = null, payload = null, verseTimer = null;
  let verseLang = 'en';

  function fmt(iso) {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function chime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      // a soft, non-startling two-note figure
      [[528, 0], [396, 0.55]].forEach(([f, t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 1.9);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 2);
      });
      setTimeout(() => ctx.close(), 3000);
    } catch (_) {}
  }

  function applyPalette(variant) {
    const p = window.PALETTES[variant] || window.PALETTES.night;
    const r = document.documentElement.style;
    r.setProperty('--text', p.text);
    r.setProperty('--dim', p.textDim);
    r.setProperty('--accent', p.accent);
    r.setProperty('--glow', p.glow);
    return p;
  }

  function renderDots(statuses, activeKey) {
    const el = $('dots');
    el.innerHTML = '';
    ORDER.forEach((k) => {
      const d = document.createElement('div');
      d.className = 'dot'
        + (statuses[k] === 'prayed' ? ' prayed' : '')
        + (statuses[k] === 'missed' ? ' missed' : '')
        + (k === activeKey ? ' now' : '');
      d.title = k;
      el.appendChild(d);
    });
  }

  function tick() {
    if (!target) return;
    const diff = target - Date.now();
    const late = diff < 0;
    const s = Math.abs(Math.round(diff / 1000));
    const m = Math.floor(s / 60), ss = s % 60;
    const hrs = Math.floor(m / 60);
    const body = hrs > 0
      ? hrs + 'h ' + String(m % 60).padStart(2, '0') + 'm'
      : m + ':' + String(ss).padStart(2, '0');
    $('cd').firstChild.nodeValue = body;
    $('cdlabel').textContent = late ? 'since the adhan' : 'until the adhan';
    $('eyebrow').textContent = late ? 'The waqt has begun' : 'Five minutes to go';
  }

  function render(data) {
    payload = data;
    const pr = data.prayer;
    const p = applyPalette(pr.variant);

    $('ar').textContent = pr.ar;
    $('en').textContent = pr.en;
    const hanafi = pr.key === 'asr' ? ' · Hanafi' : '';
    $('at').innerHTML = 'Adhan at <b>' + fmt(data.at) + '</b>' + hanafi;
    $('ask').textContent = 'Have you prayed ' + pr.en + ' yet?';
    $('nosub').textContent = 'Ask me again in ' + (data.settings.snoozeMinutes || 10) + ' minutes';
    $('foot').textContent = data.streak > 1 ? data.streak + ' complete days in a row' : '';

    renderDots(data.statuses, pr.key);
    target = new Date(data.at).getTime();
    tick();

    // --- visual style: photograph, generated geometry, or both --------------
    const style = data.settings.visualStyle || 'both';
    document.body.className = 'style-' + style;

    const photo = $('photo');
    // the main process picks today's image; there may be several per waqt
    const imageFile = data.sceneImage;
    if (style === 'geometry' || !imageFile) {
      photo.removeAttribute('src');
      photo.classList.remove('on');
      if (!imageFile) document.body.className = 'style-geometry';
    } else {
      photo.onload = () => photo.classList.add('on');
      photo.onerror = () => { document.body.className = 'style-geometry'; };
      photo.src = '../../../assets/scenes/' + imageFile;
    }

    if (scene) scene.destroy();
    scene = null;
    if (style !== 'photo') {
      scene = window.createScene(pr.scene, $('bg'), p, {
        density: 0.65,
        seed: ORDER.indexOf(pr.key) + 3,
        overlay: style === 'both'
      });
      scene.start();
    }

    // --- the verse for this prayer, rotating ---------------------------------
    verseLang = data.settings.translationLanguage || 'en';
    startVerses(pr.key);

    if (data.settings.sound) chime();
  }

  function showVerse(v) {
    $('verse').className = 'verse' + (v.type === 'quran' ? ' quran' : '');
    $('var').textContent = v.ar;
    const en = $('ven');
    en.textContent = window.verseText ? window.verseText(v, verseLang) : v.en;
    en.className = 'v-en lang-' + verseLang;
    en.setAttribute('dir', (window.RTL_LANGUAGES || []).indexOf(verseLang) >= 0 ? 'rtl' : 'ltr');
    $('vref').textContent = v.ref;
  }

  function startVerses(prayerKey) {
    if (verseTimer) clearInterval(verseTimer);
    if (!window.verseCycler) return;
    const next = window.verseCycler(prayerKey);
    showVerse(next());
    verseTimer = setInterval(() => {
      const el = $('verse');
      el.classList.add('out');
      setTimeout(() => { showVerse(next()); el.classList.remove('out'); }, 700);
    }, 18000);
  }

  window.salah.onPayload(render);
  // Ask for the payload directly as well. A push can land before this script
  // has run, and a missed push is gone for good — the pull closes that gap.
  if (window.salah.getPayload) {
    window.salah.getPayload().then((d) => { if (d && !payload) render(d); }).catch(() => {});
  }

  const send = async (action) => {
    if (!payload && window.salah.getPayload) {
      try { const d = await window.salah.getPayload(); if (d) render(d); } catch (_) {}
    }
    if (!payload) return;                 // nothing to answer about yet
    if (scene) scene.stop();
    window.salah.answer(payload.prayer.key, action);
  };
  $('yes').onclick = () => send('prayed');
  $('no').onclick = () => send('later');
  $('going').onclick = () => send('going');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') send('later');
    if (e.key === 'Enter') send('prayed');
  });

  setInterval(tick, 500);
})();
