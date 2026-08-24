# 口到字

A 5–15 minute daily session for heritage Mandarin speakers: attach 汉字 to words you already know by sound.

**Live:** https://xeonii.github.io/learnchinese/

## How a session works

Open the app, tap **Start practice**. There is no drill menu.

1. **Intro** — huge character, example word, audio.  
   I already read this / Learn it / Skip — I don’t know this word
2. **Recall** — type pinyin (`ni3` or `nǐ`) or listen and pick the character among lookalikes/homophones.
3. **Same-day relearn** — misses come back in about a minute, not tomorrow.
4. Stop at ~12 minutes or when the queue is empty.

New 字 cap: 10/day. Known 字 are buried (21 days). Skipped words stay out of the way. The rest of the list is still waiting tomorrow — you will not see “all done” after tapping “I don’t know.”

## Data

483 simplified 字:

- 300 from 课标《识字、写字教学基本字表》
- 183 extra high-frequency G1–2 字

Each card has pinyin, a short English gloss, and a spoken word to hang the 字 on.

Progress is against this set, not HSK.

## Pinyin

Numbered (`ni3`) and marked (`nǐ`) both count. Toneless `ni` does not. `v` = `ü` (`nv3` 女).

## Audio

Plays the **汉字 / 词语**, never pinyin:

1. Native `zh-*` voice via Web Speech API when the browser has one
2. Otherwise Mandarin dictionary audio of the same Chinese text

Listen prompts (hear the word → pick 字) show up on the second pass, about 45 seconds later in the same session.

## Dev

```bash
npm install
npm test
npm run dev
```

Vite base path is `/learnchinese/` for GitHub Pages.
