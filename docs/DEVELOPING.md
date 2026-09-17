# Developing

## Layout

```
src/
  main/
    main.js            app lifecycle, windows, tray, IPC, daily artwork pick
    prayer-times.js    the astronomical engine (no dependencies)
    scheduler.js       when to ask, when to snooze, when to stop
    store.js           settings and a 90-day prayer log, in %APPDATA%
    preload.js         the narrow bridge exposed to the pages
    selftest.js        drives the real app end to end
    cities-data.js     the 57 presets, their time zones, and first-run detection
  renderer/
    shared/
      scenes.js        three canvas engines, plus an overlay mode
      palettes.js      per-waqt colour
      verses.js        the Qur'an and hadith, in eight languages
      fonts.css        bundled Amiri, and the script stacks
    prompt/            the five-minute card
    immersive/         the full-screen "going now" mode
    settings/          location, method, language, appearance, timings
assets/
  scenes/              <prayer>-<n>.jpg, counted at startup
  fonts/               Amiri (SIL OFL)
```

## Testing

```
npm test            # 27 checks: time engine, reminder logic, city table
npm run selftest    # 80 checks: launches the app and clicks every button
npm run selftest -- --shots   # saves screenshots to %APPDATA%\Salah Reminder\shots
```

The self-test is the one that matters. It opens the real windows, asserts the
card rendered the prayer it was asked for, clicks each button, and checks the
state the click should have produced — across all three visual styles, all the
translation languages, and into the full-screen screen. It pauses the live
scheduler first so a genuinely-due waqt cannot swap the window mid-run.

## Things that are easy to get wrong

**Never deliver first-paint data to a renderer by push alone.** The original
build pushed the payload on `ready-to-show`, which sometimes fires before the
page has registered its listener. A missed `ipcRenderer.on` message is gone for
good, the card came up blank, and every button threw. Both windows now *pull*
the payload with `payload:get` on load; the push only refreshes a window that
is already open.

**Star polygon geometry over text.** A star polygon `{n/skip}` has chords whose
closest approach to the centre is `cos(π·skip/n)·R`. `{16/7}` comes within
0.195R and draws straight through the words. The overlay mode uses low-skip
polygons — `{32/3}`, `{24/2}`, `{48/5}` — which stay beyond 0.94R and read as a
ring around the text.

**Previewing is not answering.** A prompt opened from the tray before its waqt
is due must not mark the prayer or cancel its real reminder. `main.js` tracks
`promptPreview` and skips recording when the reminder is not yet due.

**Windows shows `description` as the app's name** in the startup list, not
`productName`. electron-builder writes it into the executable's
FileDescription. Keep it as `Salah Reminder`; the tagline belongs in the README.

**Escapes inside `executeJavaScript` template literals.** A self-test check
wrote `/\s+/g` inside a backtick template, which JS collapses to `/s+/g` and
which then replaced every letter "s" in the string under test. Double the
backslash, or avoid the regex.

**Translations must stay original.** Saheeh International, Khattab's Clear
Quran and most others are copyrighted. The app is redistributed, so every
translation in `verses.js` is an original rendering.

## Building on Windows

```
npm run dist
```

Two snags you may hit once:

1. **Electron's postinstall extraction can fail silently**, leaving
   `node_modules/electron/dist` with only a `locales` folder. Extract the
   cached zip by hand and write the path marker:
   ```powershell
   Expand-Archive "$env:LOCALAPPDATA\electron\Cache\<hash>\electron-v32.3.3-win32-x64.zip" `
     -DestinationPath ".\node_modules\electron\dist" -Force
   Set-Content ".\node_modules\electron\path.txt" "electron.exe" -NoNewline
   ```

2. **electron-builder's winCodeSign archive contains macOS symlinks** that
   Windows will not create without Developer Mode, so the first build fails.
   Seed the cache directory once:
   ```powershell
   $c = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
   $z = Get-ChildItem $c -Filter *.7z | Select-Object -First 1
   & ".\node_modules\7zip-bin\win\x64\7za.exe" x $z.FullName "-o$c\winCodeSign-2.6.0" "-xr!darwin" -y
   ```
