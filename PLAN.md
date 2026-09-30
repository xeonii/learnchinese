# 口到字 — design notes

## The learner

A heritage speaker: near-native listening, fluent pinyin, about first-grade reading (a few hundred characters). The gap is **glyph → sound/meaning**, not vocabulary or grammar. They don't want to write or type.

## Principles

- **Reading is the goal; cards serve reading.** Every session ends in a story.
- **Words, not isolated characters.** The scheduled unit is the word; character knowledge is derived from it.
- **Each new character arrives in context.** New words are chosen to be one unknown character away from what you can read, and shown next to known words that share a character.
- **Honest self-check, low friction.** Read it in your head, reveal, two buttons. No typing, no multiple choice.
- **Continuity.** One persistent profile with every word and character, dated, plus a daily log and backups.
- **Static-first.** GitHub Pages, offline-capable, no backend.

## Done

- Placement by frequency bands
- FSRS-5 scheduling with two grades
- Daily session: reviews, new words with character breakdown, then today's story
- Story reader with tap-to-look-up, pinyin modes, sentence translations and audio
- Paste-your-own-text reader
- Word library and CC-CEDICT search
- Profile: coverage estimate, character wall, calendar, settings, backup and restore
- Migration from the previous version

## Next

- More stories, especially levels 2–4, so the story picker always has something at about 90% readable
- Sync across devices (one JSON blob per user, e.g. a Cloudflare Worker + KV)
- Homophone practice: hear a word, pick the right characters (是/事/时), which matches how you'll type
- Light reading credit: words read in a story without a tap nudge their schedule
