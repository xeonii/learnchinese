# 口到字

You already speak Mandarin. This is ten minutes a day to learn to read it.

**Live:** https://xeonii.github.io/learnchinese/

## How it works

1. **Placement (about 2 minutes, once).** Swipe through common words: *I can read it* / *Not sure*. Frequency bands you mostly know are credited whole, so a first-grade reader starts with the ~400 characters they already have.
2. **Today.** One button runs the day's practice:
   - **Reviews.** A word appears. Read it in your head, tap to check (pinyin, meaning, audio), then **Knew it** or **Not yet**. Swipe right/left works too. Anything you miss comes back a few cards later.
   - **New words** (5 a day by default). Each is picked to be *one new character away*: a frequent word whose other characters you can already read, shown next to words you know that share them (欢 → "as in 喜欢").
   - **Today's story.** The easiest unread story you can mostly read. Tap any word for pinyin, meaning and audio; *Learn this* adds it to your practice. Pinyin can be off, shown over new words, or shown everywhere. **EN** shows a translation under each sentence.
3. **Read** has every story by level, plus *Read your own text*: paste a message or menu and read it with the same tap-to-look-up.
4. **Words** is your library and a full CC-CEDICT search.
5. **Me** is your profile: estimated share of everyday text you can read, every character you know (with the date you learned it), a practice calendar, and settings.

No writing, no typing.

## Your profile

Everything lives in one profile in IndexedDB (mirrored to localStorage): each word you've met, its schedule, the date each character became known, and a daily log. It survives reloads and carries on day to day. Add the site to your home screen so the browser keeps the data, and use **Me → Backup → Save** now and then. Progress from the previous version of the app is migrated automatically.

A character counts as **known** once a word containing it is solid: marked known, or reviewed until its memory stability reaches 7 days.

## Scheduling

[FSRS-5](https://github.com/open-spaced-repetition/fsrs4anki/wiki) with two grades (knew it / not yet), targeting 90% recall. The day rolls over at 4 a.m.

## Content

- `src/data/deck.json`: the 6,000 most frequent words, from [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT) frequency ranks. Rebuild with `npm run content`.
- `content/stories.mjs`: hand-written graded stories with English. `npm run stories` segments them into words with pinyin and glosses (`src/data/stories.json`). Mark a word break with `|`, override a reading with `字{zì}`.
- `public/cedict.json.gz`: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See `public/CEDICT-LICENSE.txt`.

## Dev

```bash
npm install
npm test
npm run dev
```

Vite base path is `/learnchinese/` for GitHub Pages.
