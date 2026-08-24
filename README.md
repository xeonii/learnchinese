# 口到字

A 5–15 minute daily session for heritage Mandarin speakers: attach 汉字 to words you already know by sound.

**Live:** https://xeonii.github.io/learnchinese/

The scheduled unit is the **word**. The 483-character list is a coverage map, not the deck. Roadmap: [PLAN.md](PLAN.md).

## How a session works

Open the app, tap **Start practice**. There is no drill menu.

1. **Intro** — huge word, English gloss, audio.  
   I already read this / Learn it / Skip — I don’t know this word
2. **Learning** — listen, then pick the word among lookalikes/homophones.
3. **Then type pinyin** for the whole word (`ni3hao3` or `nǐhǎo`). Toneless `nihao` fails. `v` = `ü`.
4. **After graduation** — audio only, type pinyin (multiple choice is retired).
5. **Tone slip** — right syllables, wrong tone: comes back sooner, not a full fail.
6. Stop at ~12 minutes or when the queue is empty.

New words cap: 10/day. Known words are buried (21 days). Skipped words stay out of the way.

Look up any word in the bundled dictionary and add it to your library. Export/import a JSON backup from the home screen.

## Progress

A 字 counts as known after it has been read correctly in two different words, or in one graduated word. The home bar is that coverage number, not “cards remaining.”

## Data

Seed library: unique example words from 483 simplified 字 (课标《识字、写字教学基本字表》300 + high-frequency G1–2 extras).

Dictionary: a compact copy of [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (~121k entries), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See `public/CEDICT-LICENSE.txt`.

Progress lives in IndexedDB (`koudaozi`). Older `koudaozi_v2` character progress is migrated onto the example-word cards.

## Audio

Plays the **词语**, never pinyin, via dictionary audio then a `zh-*` voice if needed.

## Dev

```bash
npm install
npm test
npm run dev
```

Rebuild the compact dictionary (needs a CC-CEDICT download):

```bash
python3 scripts/build_cedict.py /path/to/cedict_1_0_ts_utf-8_mdbg.txt.gz
```

Vite base path is `/learnchinese/` for GitHub Pages.
