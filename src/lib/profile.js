// The learner's profile: every word they have met, every character they can
// read, and a day-by-day log. Pure functions; persistence lives in store.js.
import { AGAIN, DAY_MS, firstReview, knownCard, review } from './fsrs.js';

export const PROFILE_VERSION = 4;
const DAY_START_HOUR = 4; // a "day" rolls over at 4 a.m. local time
/** A 字 is "known" once some word containing it is this stable (days). */
export const KNOWN_STABILITY = 7;

const HAN = /[一-鿿]/;
export const hanzi = (word) => [...String(word || '')].filter((ch) => HAN.test(ch));

export function dayKey(now = Date.now()) {
  const d = new Date(now - DAY_START_HOUR * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function nextDayStart(now = Date.now()) {
  const d = new Date(now - DAY_START_HOUR * 60 * 60 * 1000);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + DAY_MS + DAY_START_HOUR * 60 * 60 * 1000;
}

export function emptyProfile(now = Date.now()) {
  return {
    v: PROFILE_VERSION,
    createdAt: now,
    placed: false,
    words: {},
    chars: {},
    log: {},
    read: {},
    settings: { newPerDay: 5 },
    backupAt: null,
  };
}

function entryOf(entry) {
  return { w: entry.w, p: entry.p || '', g: entry.g || '' };
}

function putWord(profile, rec) {
  return { ...profile, words: { ...profile.words, [rec.w]: rec } };
}

function bumpLog(profile, now, patch) {
  const key = dayKey(now);
  const day = { reviews: 0, correct: 0, learned: 0, stories: 0, ...(profile.log[key] || {}) };
  for (const [k, v] of Object.entries(patch)) day[k] = typeof v === 'number' ? (day[k] || 0) + v : v;
  return { ...profile, log: { ...profile.log, [key]: day } };
}

/** Save a word to learn later (from a story tap, the dictionary, or placement misses). */
export function queueWord(profile, entry, src, now = Date.now()) {
  const had = profile.words[entry.w];
  if (had) {
    if (had.s === 'queued') return profile;
    // Already learning or known: bring it back for a review today.
    const card = had.card ? { ...had.card, due: now } : { ...knownCard(now, 1), due: now };
    return putWord(profile, { ...had, s: 'active', card });
  }
  return putWord(profile, { ...entryOf(entry), s: 'queued', src, added: now });
}

export function markKnown(profile, entry, src = 'known', now = Date.now()) {
  const had = profile.words[entry.w];
  return putWord(profile, {
    ...entryOf(entry),
    ...(had || {}),
    s: 'known',
    src: had?.src || src,
    added: had?.added || now,
    card: null,
  });
}

export function removeWord(profile, w) {
  const words = { ...profile.words };
  delete words[w];
  return { ...profile, words };
}

/** First sight of a new word in a session: start its card with this grade. */
export function learnWord(profile, entry, grade, now = Date.now()) {
  const had = profile.words[entry.w];
  const rec = {
    ...entryOf(entry),
    src: 'deck',
    added: now,
    ...(had || {}),
    s: 'active',
    card: firstReview(grade, now),
    learnedOn: dayKey(now),
  };
  return bumpLog(putWord(profile, rec), now, { learned: 1, reviews: 1, correct: grade === AGAIN ? 0 : 1 });
}

export function gradeWord(profile, w, grade, now = Date.now()) {
  const had = profile.words[w];
  if (!had) return profile;
  const rec = { ...had, s: 'active', card: review(had.card, grade, now) };
  return bumpLog(putWord(profile, rec), now, { reviews: 1, correct: grade === AGAIN ? 0 : 1 });
}

export function logStory(profile, storyId, now = Date.now()) {
  const next = bumpLog(profile, now, { stories: 1 });
  return { ...next, read: { ...next.read, [storyId]: dayKey(now) } };
}

/** Remember today's story so the pick doesn't shift as you learn words. */
export function pinStory(profile, storyId, now = Date.now()) {
  if (profile.log[dayKey(now)]?.story === storyId) return profile;
  return bumpLog(profile, now, { story: storyId });
}

export function logMinutes(profile, ms, now = Date.now()) {
  return bumpLog(profile, now, { ms: Math.round(ms) });
}

export function markSessionDone(profile, now = Date.now()) {
  return bumpLog(profile, now, { done: true });
}

/** Strength 0..1 of a word: 1 when known or very stable. */
export function wordStrength(rec) {
  if (!rec) return 0;
  if (rec.s === 'known') return 1;
  if (rec.s !== 'active' || !rec.card) return 0;
  return Math.min(1, rec.card.S / 30);
}

/**
 * Per-character status derived from words.
 * known: in a known word, or a word whose card is at least KNOWN_STABILITY days.
 * learning: in any active or queued word, but not known yet.
 */
export function charStatus(profile) {
  const map = new Map();
  for (const rec of Object.values(profile.words)) {
    const known = rec.s === 'known' || (rec.s === 'active' && rec.card?.S >= KNOWN_STABILITY);
    const strength = wordStrength(rec);
    for (const ch of hanzi(rec.w)) {
      const cur = map.get(ch) || { ch, known: false, strength: 0, words: [] };
      cur.words.push(rec.w);
      cur.known = cur.known || known;
      cur.strength = Math.max(cur.strength, strength);
      map.set(ch, cur);
    }
  }
  return map;
}

export function knownChars(profile) {
  const set = new Set();
  for (const [ch, st] of charStatus(profile)) if (st.known) set.add(ch);
  return set;
}

/** Record the day each 字 first became known, so the profile has a history. */
export function stampChars(profile, now = Date.now()) {
  let chars = null;
  for (const ch of knownChars(profile)) {
    if (!profile.chars[ch]) {
      chars = chars || { ...profile.chars };
      chars[ch] = dayKey(now);
    }
  }
  return chars ? { ...profile, chars } : profile;
}

export const isReadable = (word, known) => hanzi(word).every((ch) => known.has(ch));

/**
 * Estimated share of everyday text you can read: frequency-weighted (Zipf)
 * share of the deck whose every character you know.
 */
export function textCoverage(deck, known) {
  let total = 0;
  let got = 0;
  let words = 0;
  deck.forEach((entry, i) => {
    const weight = 1 / (i + 1);
    total += weight;
    if (isReadable(entry.w, known)) {
      got += weight;
      words += 1;
    }
  });
  return { share: total ? got / total : 0, words };
}

export function streak(profile, now = Date.now()) {
  const active = (k) => profile.log[k]?.reviews > 0 || profile.log[k]?.stories > 0;
  let n = 0;
  let t = now;
  if (!active(dayKey(t))) t -= DAY_MS; // today not done yet: streak still alive
  while (active(dayKey(t))) {
    n += 1;
    t -= DAY_MS;
  }
  return n;
}

export function counts(profile) {
  const c = { known: 0, active: 0, queued: 0 };
  for (const rec of Object.values(profile.words)) c[rec.s] = (c[rec.s] || 0) + 1;
  return c;
}

// ---------- backup ----------

export function exportJson(profile) {
  return JSON.stringify({ ...profile, exportedAt: new Date().toISOString() });
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (data?.v === PROFILE_VERSION && data.words) return { ...emptyProfile(), ...data };
  if (Array.isArray(data?.words)) return migrateV3(data);
  throw new Error('That file isn’t a 口到字 backup.');
}

/** Bring progress over from the previous version of the app. */
export function migrateV3(old, now = Date.now()) {
  let profile = emptyProfile(now);
  for (const card of old.words || []) {
    if (!card?.word) continue;
    const entry = { w: card.word, p: String(card.pinyin || ''), g: String(card.meaning || '') };
    if (card.knownAtIntro) {
      profile = markKnown(profile, entry, 'import', now);
    } else if (['review', 'learning', 'relearning'].includes(card.phase)) {
      const S = card.phase === 'review' ? Math.max(1, card.intervalDays || 1) : 0.5;
      profile = putWord(profile, {
        ...entry,
        s: 'active',
        src: 'import',
        added: now,
        card: { S, D: 5, reps: card.reps || 1, lapses: card.lapses || 0, last: now - S * DAY_MS, due: card.due || now },
      });
    } else if (card.source && card.source !== 'seed' && card.phase === 'new') {
      profile = queueWord(profile, entry, 'import', now);
    }
  }
  profile.placed = Object.keys(profile.words).length >= 20;
  return stampChars(profile, now);
}
