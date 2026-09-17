# Contributing

Thank you for wanting to help.

## Reporting something

Open an issue and say what happened, what you expected, your Windows version,
and your city. A screenshot helps a great deal.

## Prayer times look wrong for my city

Open Settings, pick your city from the list, and check the five times against
your local masjid. If they are off by a minute or two, the per-prayer fine
tuning boxes will line them up. If they are off by more than that, open an
issue with your city, your coordinates, and the times you expect.

## Adding a translation language

Translations live in `src/renderer/shared/verses.js`. Each entry has a `tr`
block keyed by language code. Add your language code to `VERSE_LANGUAGES` at
the top of that file and add the same key to all fifteen entries.

Please write a plain rendering of the meaning in your own words. Do **not**
paste in a published translation — most are copyrighted, and this app is
redistributed freely.

## Adding artwork

Drop a JPEG into `assets/scenes/` named `<prayer>-<n>.jpg`, continuing the
numbering (`fajr-3.jpg`, and so on). The app counts the files at startup and
rotates through them, a different one each day. Match the light to the time of
day, and keep images free of people and lettering.

## Running it

```
npm install
npm start           # run the app
npm test            # prayer times and the reminder logic
npm run selftest    # launches the app and clicks every button
```

Please make sure `npm test` and `npm run selftest` both pass before opening a
pull request.
