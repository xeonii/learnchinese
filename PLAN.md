# 口到字 — Assessment & Feature Roadmap

A plan for evolving 口到字 from a character drill into a literacy tool for a heritage
Mandarin speaker: strong listening comprehension, fluent with pinyin, ~300–500
characters of reading ability, occasional tone/pronunciation transfer from Shanghainese.

**Status:** Phase 1 is implemented in this branch (word cards, bundled CC-CEDICT,
tone-aware grading, IndexedDB, exercise ladder). Phases 2–5 remain the roadmap.

---

## 1. Honest assessment of the current methodology

### What is already right

The core loop is genuinely evidence-aligned, not just gamification:

- **Real spaced repetition.** The scheduler (`src/srs.js`) is an SM-2 style system with
  learning steps, same-day relearning for misses, ease penalties on lapses, and a
  daily new-card cap. This is the same skeleton as Anki, and spaced retrieval is the
  single best-supported technique in the memory literature (testing effect + spacing
  effect).
- **Active recall, not passive review.** Typing the pinyin (with tone required) is
  retrieval practice, which beats recognition-based review for retention.
- **Sound-first design fits a heritage learner.** Attaching 汉字 to words you already
  know by ear is exactly the right framing — the gap is sound→glyph mapping, not
  vocabulary or grammar.
- **Desirable difficulty in distractors.** Listen items pull lookalikes and homophones
  as choices, which forces discrimination rather than elimination.
- **Habit scaffolding.** Short bounded sessions, streaks, and "come back tomorrow"
  match how durable routines actually form.

### What is missing or limiting

1. **Characters are the wrong ceiling; words are the unit of literacy.** Chinese text
   is mostly multi-character words. Knowing 电 and 脑 separately doesn't mean you read
   电脑. Each card has exactly one example word, and the word itself is never scheduled
   or tested. The current design tops out at "can name 483 glyphs," not "can read."
2. **No reading practice at all.** Recognizing a character on a flashcard and reading
   it embedded in a sentence are different skills. Everything the SRS builds needs a
   place to *transfer*, and the research on extensive/graded reading is clear that
   in-context exposure is what consolidates recognition into fluency.
3. **The fixed 483-character list is a dead end.** There is no way to add words you
   encounter in real life (texts from relatives, menus, signs), no dictionary, and no
   path beyond the list once it's exhausted.
4. **Multiple choice is the weakest exercise type.** The listen→pick-one-of-four format
   can be gamed by elimination and produces weaker memories than recall. It's fine as
   an early step for a brand-new character, but it currently persists forever.
5. **Tone errors aren't treated specially.** For a Shanghainese-dominant speaker, tone
   transfer is a *specific, predictable* failure mode. Today a wrong tone is graded the
   same as a completely wrong syllable, and nothing tracks which tones or which
   syllable families cause trouble.
6. **`localStorage` only.** Progress is trapped on one browser on one device. A daily
   routine tool needs to survive a cleared cache and work on both phone and laptop.
7. **The scheduler could be better.** SM-2 works, but FSRS (the modern open-source
   scheduler that replaced SM-2 in Anki) measurably reduces reviews for the same
   retention. Low urgency, but worth doing when the card model changes anyway.
8. **No production practice.** The user's real-world literacy act is typing pinyin into
   an IME and picking the right character — that exact skill is never exercised.

**Verdict:** the methodology is sound as far as it goes — it is a legitimate SRS, not
flashcard theater. But it currently trains *character recognition in isolation*, which
is a prerequisite for literacy, not literacy itself. The plan below keeps the loop and
builds the missing layers around it.

---

## 2. Design principles for what comes next

- **Words first, characters underneath.** The scheduled unit becomes the word; the app
  tracks per-character knowledge as a derived layer (for coverage stats and for
  choosing which new words are "one new character away").
- **Exploit the learner's asymmetric strengths.** Listening and pinyin are near-native;
  reading is the bottleneck. Every exercise should route *through* sound and pinyin
  toward characters — never the reverse.
- **Recall over recognition, always ratcheting up.** Multiple choice → typed pinyin →
  reading in context. Cards should graduate between formats, not stay in the easiest one.
- **Everything feeds the SRS.** Dictionary lookups, reading taps, and manual adds all
  land in one library with one scheduler. No parallel silos.
- **Stay static-first.** GitHub Pages hosting is a feature (free, zero-maintenance).
  Add a backend only for the one thing that needs it: sync.

---

## 3. Phased roadmap

### Phase 1 — Word-based cards + a real dictionary backbone — **done**

*Goal: break the 483-character ceiling and make the SRS schedule words.*

- **Migrate the card model from characters to words.** Existing progress maps over:
  each character card becomes (or links to) a word card for its example word. Keep the
  483-character list as a *coverage map*, not as the deck.
- **Bundle CC-CEDICT** (the open-licensed Chinese–English dictionary, ~120k entries) as
  compressed static data. This gives pinyin + definitions for any word, which unblocks
  every later feature: lookup, tap-to-define, add-to-library, segmentation.
- **Per-character knowledge derived from word history.** A character counts as "known"
  once it's been correctly read inside N different words. This is what drives the
  progress bar and coverage stats honestly.
- **Tone-aware grading.** When the typed pinyin has the right syllable but wrong tone,
  grade it as a distinct "tone slip": the card comes back sooner than a pass but
  without the full lapse penalty, and the slip is logged per tone-pair (e.g. 2nd→3rd)
  to surface the learner's Shanghainese-transfer patterns in stats.
- **Exercise ladder.** New words start with easy formats and graduate: listen→pick
  (existing) → char→type pinyin (existing) → audio-only→type pinyin (no character
  shown; pure sound-to-memory) → cloze in a sentence (Phase 3). Multiple choice is
  retired once a card graduates from learning.
- Storage moves from `localStorage` to **IndexedDB** (the dictionary and a growing
  library won't fit in localStorage), with JSON export/import as the interim backup
  and device-transfer story.

FSRS was left for a later pass: SM-2 plus tone-slip is enough for this migration.
Review logs are now word-scoped, so FSRS can plug in without another card-model rewrite.

A thin lookup + add-to-library screen ships with Phase 1 so the bundled dictionary is
usable immediately. The full library browser, suggestions, and example sentences stay
in Phase 2.

### Phase 2 — Personal word library + dictionary lookup + miss review — **done**

*Goal: the "stored library of words" — one place where everything you're learning lives, plus an honest daily review loop that catches missed cards.*

- **Library screen.** ✓ Searchable, sortable list of every word in the system with filter chips (All / Due / Learning / Missed today / Added / Seed / Skipped / Suspended). Tap a row to see details and suspend/unsuspend the card.
- **Dictionary search polish.** ✓ Look up by characters, pinyin (`ni3hao3`, `nǐhǎo`, or toneless), or English against CC-CEDICT. Play button per hit. One tap adds a word to the library and the new-card queue. This is how the deck grows beyond the seed list: with words from the learner's actual life.
- **Review misses.** ✓ During session, track each fail/unknown/tone-slip/unknown-intro with deduplication by severity. After session, offer "Review misses" button. Miss session: no timer, no intros, no MC; upgrades listen → read for learning, listen-type for review; fail rotates to end, tone-slip stays, correct removes or applies onCorrect logic. Extra grades do not rewrite long-term intervals (Pleco-style ignore for overtime).
- **Smart suggestions.** Rank candidate new words by (a) frequency in everyday text and (b) "one new character away" — words where the learner already knows all characters but one. This makes each new character arrive pre-contextualized. *Deferred to Phase 3.*
- **Example sentences.** Attach 1–3 short sentences per word from Tatoeba's CC-licensed Chinese–English sentence pairs (ship a curated subset). These become the cloze material in Phase 3. *Deferred to Phase 3.*

### Phase 3 — Reading practice with tap-for-pinyin

*Goal: the literacy multiplier — transfer flashcard knowledge into actual reading.*

This is the highest-leverage phase for this specific learner. Strong listening + pinyin
means that once a popup shows pinyin, comprehension is nearly free — the reader can be
usable far earlier than it would be for a typical beginner.

- **Tap/highlight any word → popup** with pinyin, definition, audio, and an
  "add to library" button (the built-in equivalent of a Pleco/Zhongwen popup). Works
  everywhere Chinese text appears in the app, and on a paste-your-own-text screen for
  messages from relatives.
- **Word segmentation.** Tokenize text with dictionary-based longest-match against
  CC-CEDICT (or a WASM build of jieba if quality demands it), so taps select words,
  not single characters.
- **Graded mini-passages.** End each session with one 2–4 sentence passage composed
  almost entirely of known words plus 1–2 due/new ones ("n+1" comprehensible input).
  Start with a hand-curated or LLM-generated leveled corpus; each passage stores its
  word list so the app can pick the best-fitting one.
- **Reading feeds the SRS.** Words tapped repeatedly get flagged as add suggestions;
  words read correctly without a tap count as passive reinforcement (a light
  scheduling credit, not a full review).
- **Coverage meter.** "You can read X% of everyday text" computed against a standard
  frequency list — a far more motivating progress number than "483/483."

### Phase 4 — Sync, stats, and the daily routine

*Goal: make it a durable habit across devices.*

- **Sync.** Keep the static frontend; add the smallest possible backend (e.g.
  Supabase or a Cloudflare Worker + D1) storing one JSON blob of state per user with
  last-write-wins plus review-log merge. Auth can be a magic link — this is a
  single-user-per-account tool, not a social app.
- **Stats dashboard.** Characters and words known over time, frequency-list coverage,
  tone-slip heatmap (which tones/pairs fail), review-accuracy trend, streak calendar.
- **Structured daily session.** Formalize the routine the app already gestures at:
  reviews → a few new words → one graded passage → done, still inside 5–15 minutes.
  The summary screen reports the coverage meter so every session visibly moves a
  meaningful number.

### Phase 5 — Production practice (secondary vocabulary goal)

*Goal: mirror the learner's real-world writing act.*

- **IME simulation.** Hear a word or see an English gloss → type the pinyin → pick the
  correct characters from a homophone list, exactly like texting a relative. This is
  the production skill the learner actually uses, and homophone discrimination
  (是/事/时…) is a known weak point that pure recognition drills never touch.
- **Dictation.** Hear a short sentence → assemble it from word tiles (later: type it).
  Bridges listening strength into reading at the sentence level.
- Optional, later: recording/shadowing for pronunciation, though tone-slip tracking in
  Phase 1 likely covers the pronunciation goal well enough.

### Deliberately out of scope

- **Handwriting.** Stroke-order practice is a large effort with weak transfer to the
  stated goal (reading + typing literacy). Revisit only if wanted for its own sake.
- **Traditional characters, HSK alignment, social/leaderboard features.** Not on the
  path to this learner's goal.
- **Upgrading SM-2 to FSRS** is worthwhile but not a phase of its own — fold it into
  the Phase 1 card-model migration, since that's when review history gets restructured
  anyway.

---

## 4. Suggested build order and why

| Order | Item | Rationale |
|---|---|---|
| 1 | Phase 1 (word cards, CC-CEDICT, tone-aware grading, IndexedDB) | Foundation everything else stands on; tone grading is the cheapest big win for this learner |
| 2 | Phase 2 (library + lookup + suggestions) | Directly delivers the requested "stored library of words" and "connect to a dictionary" |
| 3 | Phase 3 (tap-for-pinyin reader + graded passages) | The literacy multiplier; delivers "highlight text and pinyin appears" |
| 4 | Phase 4 (sync + stats) | Needed once the tool is a real daily habit on more than one device |
| 5 | Phase 5 (IME practice, dictation) | High value but builds on everything above |

The single most important shift is Phase 1's move to words: every requested feature
(library, dictionary, tap-to-define, better SRS) is either impossible or awkward while
the unit of study is the isolated character, and straightforward once it's the word.
