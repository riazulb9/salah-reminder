'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('salah', {
  // pushed from the main process
  onPayload: (fn) => ipcRenderer.on('payload', (_e, data) => fn(data)),
  // pulled by the renderer on load, so it never depends on a push landing first
  getPayload: () => ipcRenderer.invoke('payload:get'),
  onState:   (fn) => ipcRenderer.on('state', (_e, data) => fn(data)),

  // prompt window
  answer: (prayerKey, action) => ipcRenderer.invoke('prayer:answer', { prayerKey, action }),

  // immersive window
  closeImmersive: () => ipcRenderer.invoke('immersive:close'),

  // settings window
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  previewTimes: (patch) => ipcRenderer.invoke('settings:preview', patch),
  closeWindow: () => ipcRenderer.invoke('window:close')
});
