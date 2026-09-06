import { hanziOf } from './coverage.js';
import { alreadyInLibrary, makeWordId } from './dict.js';
import { markKnown } from './srs.js';
import { initializeWords } from './storage.js';

export function profileUrl() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  return `${base}learner-profile.json`;
}

/**
 * Fetch teacher learner profile. Missing/invalid → null (app behaves as today).
 */
export async function loadLearnerProfile(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(profileUrl());
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.version !== 1) return null;
    if (!Array.isArray(data.knownChars)) return null;
    return data;
  } catch {
    return null;
  }
}

/** True when every 字 in the word appears in knownChars. Empty word → false. */
export function charsAllKnown(word, knownChars) {
  const known = new Set(knownChars || []);
  const chars = hanziOf(word);
  if (!chars.length || !known.size) return false;
  return chars.every((ch) => known.has(ch));
}

/**
 * Merge teacher extraVocab into the library (source: teacher).
 * Skip entries already present. User progress / existing cards win.
 */
export function mergeExtraVocab(words, profile) {
  if (!profile?.extraVocab?.length) return words;
  let next = words;
  for (const entry of profile.extraVocab) {
    if (!entry?.word || !entry?.pinyin) continue;
    if (alreadyInLibrary(next, entry) || next.some((w) => w.word === entry.word)) continue;
    const card = initializeWords([{
      id: makeWordId(entry.word, entry.pinyin, next),
      word: entry.word,
      pinyin: entry.pinyin,
      meaning: entry.meaning || '',
      chars: hanziOf(entry.word),
      tier: 0,
      sortIndex: -Date.now(),
      source: 'teacher',
    }])[0];
    next = [...next, card];
  }
  return next;
}

/**
 * Placement bias: new cards whose 字 are all in knownChars → markKnown.
 * Incomplete knownChars is only a bias — never auto-fail unknown 字.
 * Cards that already left `new` keep user progress.
 */
export function applyKnownBias(words, profile, now = Date.now()) {
  if (!profile?.knownChars?.length) return words;
  let changed = false;
  const next = words.map((card) => {
    if (card.phase !== 'new' || card.suspended) return card;
    if (!charsAllKnown(card.word, profile.knownChars)) return card;
    changed = true;
    return markKnown(card, now);
  });
  return changed ? next : words;
}

/** Apply extraVocab merge + knownChars placement in one pass. */
export function applyLearnerProfile(words, profile, now = Date.now()) {
  if (!profile) return words;
  return applyKnownBias(mergeExtraVocab(words, profile), profile, now);
}

/**
 * Priority for daily queue / intros: suggestedNext 字 first, then weakChars.
 * Lower number = sooner. Words with no match keep default order via secondary keys.
 */
export function profileCharRank(card, profile) {
  if (!profile) return Number.POSITIVE_INFINITY;
  const chars = new Set(hanziOf(card.word));
  const suggested = profile.suggestedNext || [];
  for (let i = 0; i < suggested.length; i += 1) {
    if (chars.has(suggested[i])) return i;
  }
  const weak = profile.weakChars || [];
  for (let i = 0; i < weak.length; i += 1) {
    if (chars.has(weak[i])) return 1000 + i;
  }
  return Number.POSITIVE_INFINITY;
}

/** Stable sort: profile priority, then existing order (tier / sortIndex / id). */
export function sortByProfile(cards, profile) {
  if (!profile) return cards;
  return [...cards].sort((a, b) => {
    const pa = profileCharRank(a, profile);
    const pb = profileCharRank(b, profile);
    if (pa !== pb) return pa - pb;
    const tier = (a.tier || 1) - (b.tier || 1);
    if (tier !== 0) return tier;
    const sort = (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
    if (sort !== 0) return sort;
    return String(a.id).localeCompare(String(b.id));
  });
}

/** Partner 字 for a mixup involving any 字 in the word. */
export function mixupPartners(word, profile) {
  if (!profile?.mixups?.length) return [];
  const chars = new Set(hanziOf(word));
  const partners = [];
  for (const m of profile.mixups) {
    if (!m?.a || !m?.b) continue;
    if (chars.has(m.a)) partners.push(m.b);
    if (chars.has(m.b)) partners.push(m.a);
  }
  return partners;
}
