(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);


  let scene = null, nextVerse = null, verseLang = 'en';
  let target = null;                 // the adhan
  let openedAt = Date.now();
  let totalMs = 20 * 60 * 1000;      // auto-close
  let unlockMs = 10 * 60 * 1000;     // before this, the screen stays put
  let unlocked = false;

  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  /* the adhan can be many hours away, so that countdown needs hours */
  const longDur = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60), h = Math.floor(m / 60);
    return h > 0
      ? h + 'h ' + String(m % 60).padStart(2, '0') + 'm'
      : m + ':' + String(s % 60).padStart(2, '0');
  };

  function render(data) {
    const pr = data.prayer;
    const p = window.PALETTES[pr.variant] || window.PALETTES.night;
    const r = document.documentElement.style;
    r.setProperty('--text', p.text);
    r.setProperty('--dim', p.textDim);
    r.setProperty('--accent', p.accent);
    r.setProperty('--glow', p.glow);

    $('ar').textContent = pr.ar;
    $('en').textContent = pr.en + (pr.key === 'asr' ? ' · Hanafi' : '');
    target = new Date(data.at).getTime();

    totalMs = (data.settings.immersiveMinutes || 20) * 60 * 1000;
    const minM = data.settings.immersiveMinMinutes;
    unlockMs = Math.min((minM == null ? 10 : minM) * 60 * 1000, totalMs);
    openedAt = Date.now();
    $('mark').style.left = (unlockMs / totalMs) * 100 + '%';

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
        density: 1, seed: 11, overlay: style === 'both'
      });
      scene.start();
    }

    verseLang = data.settings.translationLanguage || 'en';
    nextVerse = window.verseCycler ? window.verseCycler(pr.key) : null;
    showDhikr();
    tick();
  }

  window.salah.onPayload(render);
  if (window.salah.getPayload) {
    window.salah.getPayload().then((d) => { if (d && !target) render(d); }).catch(() => {});
  }

  function tick() {
    const now = Date.now();

    if (target) {
      const diff = target - now;
      const late = diff < 0;
      $('cd').firstChild.nodeValue = longDur(Math.abs(diff));
      $('cdlabel').textContent = late
        ? 'since the adhan — may Allah accept it'
        : 'until the adhan';
    }

    const elapsed = now - openedAt;
    $('bar').style.width = Math.min(100, (elapsed / totalMs) * 100) + '%';

    if (!unlocked && elapsed >= unlockMs) {
      unlocked = true;
      document.body.classList.add('unlocked');
    }

    if (unlocked) {
      $('lockmsg').textContent = 'Closes on its own in ' + mmss(totalMs - elapsed);
    } else {
      $('lockmsg').textContent = 'You can close this in ' + mmss(unlockMs - elapsed);
    }
  }
  setInterval(tick, 500);

  // rotate the dhikr with a slow cross-fade
  function showDhikr() {
    if (!nextVerse) return;
    const v = nextVerse();
    $('dhikr').className = 'dhikr' + (v.type === 'quran' ? ' quran' : '');
    $('dar').textContent = v.ar;
    const en = $('den');
    en.textContent = window.verseText ? window.verseText(v, verseLang) : v.en;
    en.className = 'd-en lang-' + verseLang;
    en.setAttribute('dir', (window.RTL_LANGUAGES || []).indexOf(verseLang) >= 0 ? 'rtl' : 'ltr');
    $('dtr').textContent = v.ref;
  }
  setInterval(() => {
    const el = $('dhikr');
    el.classList.add('out');
    setTimeout(() => { showDhikr(); el.classList.remove('out'); }, 1200);
  }, 23000);

  // the cursor and controls surface when the mouse moves
  let hideTimer = null;
  document.addEventListener('mousemove', () => {
    document.body.classList.add('showcursor');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => document.body.classList.remove('showcursor'), 2600);
  });

  /* Closing.
     Before the unlock point the screen holds — that is the whole point of
     choosing "I am going to pray now". Three presses of Esc within three
     seconds is the deliberate way out if something genuinely needs you. */
  function nudge() {
    document.body.classList.add('showcursor');
    const el = $('lockmsg');
    el.classList.remove('nudge');
    void el.offsetWidth;                 // restart the animation
    el.classList.add('nudge');
  }

  function close(force) {
    if (!force && !unlocked) { nudge(); return; }
    if (scene) scene.stop();
    window.salah.closeImmersive();
  }

  $('done').onclick = () => close(false);

  let escPresses = [];
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const now = Date.now();
      escPresses = escPresses.filter((t) => now - t < 3000);
      escPresses.push(now);
      if (escPresses.length >= 3) close(true);
      else close(false);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') close(false);
  });
})();
