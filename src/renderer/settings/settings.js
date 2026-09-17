(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const NUMS = ['latitude','longitude','elevation','leadMinutes','snoozeMinutes','maxSnoozes',
              'immersiveMinutes','immersiveMinMinutes'];
  const SELS = ['method','asrMethod','visualStyle','translationLanguage'];
  const BOOLS = ['isRamadan','sound','launchAtLogin','showSettingsOnStart'];
  const OFFS = ['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  const META = [
    ['fajr','الفجر','Fajr'],
    ['dhuhr','الظهر','Dhuhr'],
    ['asr','العصر','Asr'],
    ['maghrib','المغرب','Maghrib'],
    ['isha','العشاء','Isha']
  ];

  let CITIES = [];

  const scene = window.createScene('girih', $('deco'), window.PALETTES.night, { density: 0.4, seed: 5 });
  scene.start();

  (function buildLanguageList() {
    const sel = $('translationLanguage');
    (window.VERSE_LANGUAGES || [{ code: 'en', label: 'English', native: 'English' }])
      .forEach((l) => {
        const o = document.createElement('option');
        o.value = l.code;
        o.textContent = l.label + (l.native && l.native !== l.label ? '  \u2014  ' + l.native : '');
        sel.appendChild(o);
      });
  })();

  // ---- city presets (the table comes from the main process) ---------------
  function buildCityList() {
    const sel = $('city');
    let group = null;
    CITIES.forEach((c, i) => {
      if (!group || group.label !== c.g) {
        group = document.createElement('optgroup');
        group.label = c.g;
        sel.appendChild(group);
      }
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = c.n;
      group.appendChild(o);
    });
    sel.addEventListener('change', () => {
      const c = CITIES[Number(sel.value)];
      if (!c) return;
      $('latitude').value = c.lat;
      $('longitude').value = c.lng;
      $('method').value = c.m;
      livePreview();
    });
  }

  /** Select the city whose coordinates match, if any. */
  function matchCity(lat, lng) {
    const i = CITIES.findIndex(
      (c) => Math.abs(c.lat - lat) < 0.01 && Math.abs(c.lng - lng) < 0.01);
    $('city').value = i >= 0 ? String(i) : '';
  }

  function collect() {
    const p = {};
    NUMS.forEach((k) => { p[k] = Number($(k).value); });
    SELS.forEach((k) => { p[k] = $(k).value; });
    BOOLS.forEach((k) => { p[k] = $(k).checked; });
    p.offsets = {};
    OFFS.forEach((k) => { p.offsets[k] = Number($('off-' + k).value) || 0; });
    return p;
  }

  function fill(s) {
    NUMS.forEach((k) => { $(k).value = s[k]; });
    SELS.forEach((k) => { $(k).value = s[k]; });
    BOOLS.forEach((k) => { $(k).checked = !!s[k]; });
    OFFS.forEach((k) => { $('off-' + k).value = (s.offsets && s.offsets[k]) || 0; });
    matchCity(Number(s.latitude), Number(s.longitude));
  }

  function fmt(iso) {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  function renderPreview(times) {
    $('preview').innerHTML = META.map(([k, ar, en]) =>
      '<div class="pv"><div class="a">' + ar + '</div><div class="t">' + fmt(times[k]) +
      '</div><div class="l">' + (k === 'asr' ? 'Asr &middot; Hanafi' : en) + '</div></div>'
    ).join('');
  }

  let debounce = null;
  function livePreview() {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const times = await window.salah.previewTimes(collect());
      renderPreview(times);
      // reflect the Asr label if the reckoning changed
      const asrCell = document.querySelectorAll('.pv .l')[2];
      if (asrCell) asrCell.innerHTML = $('asrMethod').value === 'Hanafi' ? 'Asr &middot; Hanafi' : 'Asr';
    }, 220);
  }

  document.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('input', livePreview);
    el.addEventListener('change', livePreview);
  });
  ['latitude', 'longitude'].forEach((k) => {
    $(k).addEventListener('input', () => matchCity(Number($('latitude').value), Number($('longitude').value)));
  });

  $('save').onclick = async () => {
    await window.salah.saveSettings(collect());
    $('status').textContent = 'Saved — today’s schedule has been rebuilt.';
    setTimeout(() => { $('status').textContent = ''; }, 3200);
  };
  $('close').onclick = $('cancel').onclick = () => window.salah.closeWindow();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.salah.closeWindow(); });

  (async () => {
    const res = await window.salah.getSettings();
    CITIES = res.cities || [];
    buildCityList();
    fill(res.settings);
    renderPreview(res.state.times);

    const a = res.app || {};
    $('about').innerHTML =
      (a.name || 'Salah Reminder') + '  ' + (a.version ? 'v' + a.version : '') +
      '<br>\u00A9 ' + new Date().getFullYear() + ' ' + (a.author || 'Riazul Islam') +
      ', <a href="https://' + (a.website || 'riazulb9.com') + '" target="_blank" rel="noreferrer">' +
      (a.website || 'riazulb9.com') + '</a>';
  })();
})();
