/* Per-waqt colour palettes. Each variant is keyed to the quality of light at
   that time of day, so the five prayers never look the same twice in a row. */
window.PALETTES = {
  dawn: {                       // Fajr — the blue hour turning rose
    bg0: '#050a18', bg1: '#101f3d', bg2: '#2a3358',
    line: '#f2d7bd', lineSoft: 'rgba(242,215,189,0.20)',
    accent: '#e9a882', accent2: '#8fb4e8',
    glow: 'rgba(233,168,130,0.55)',
    particle: 'rgba(255,223,196,0.85)',
    text: '#f6ece2', textDim: 'rgba(246,236,226,0.58)'
  },
  noon: {                       // Dhuhr — high sun, emerald and gold
    bg0: '#03150f', bg1: '#0a3229', bg2: '#12564a',
    line: '#f0cf92', lineSoft: 'rgba(240,207,146,0.20)',
    accent: '#e8c26a', accent2: '#6fd6b2',
    glow: 'rgba(232,194,106,0.55)',
    particle: 'rgba(255,240,200,0.85)',
    text: '#f5efdf', textDim: 'rgba(245,239,223,0.58)'
  },
  after: {                      // Asr — amber light raking through a screen
    bg0: '#160a03', bg1: '#3d1e08', bg2: '#7a4415',
    line: '#ffd9a0', lineSoft: 'rgba(255,217,160,0.20)',
    accent: '#ffb257', accent2: '#e0743a',
    glow: 'rgba(255,178,87,0.55)',
    particle: 'rgba(255,226,178,0.9)',
    text: '#fdeedd', textDim: 'rgba(253,238,221,0.58)'
  },
  dusk: {                       // Maghrib — crimson dissolving into violet
    bg0: '#12040f', bg1: '#3a0d2a', bg2: '#6d1b34',
    line: '#ffc9b0', lineSoft: 'rgba(255,201,176,0.20)',
    accent: '#ff8f6b', accent2: '#b06fd6',
    glow: 'rgba(255,143,107,0.55)',
    particle: 'rgba(255,214,196,0.85)',
    text: '#fbe8e4', textDim: 'rgba(251,232,228,0.58)'
  },
  night: {                      // Isha — deep indigo, silver and gold
    bg0: '#04050d', bg1: '#0d1130', bg2: '#1c2352',
    line: '#e4d3a8', lineSoft: 'rgba(228,211,168,0.18)',
    accent: '#d9bd7c', accent2: '#93a6e8',
    glow: 'rgba(217,189,124,0.5)',
    particle: 'rgba(226,232,255,0.8)',
    text: '#e9edf8', textDim: 'rgba(233,237,248,0.55)'
  }
};
