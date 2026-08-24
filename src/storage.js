import { INITIAL_EASE } from './srs.js';

export const STORAGE_KEY = 'koudaozi_v2';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save progress', error);
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function initializeCards(characters) {
  return characters.map((entry, index) => ({
    id: index,
    char: entry.char,
    pinyin: entry.pinyin,
    meaning: entry.meaning,
    word: entry.word,
    wordPinyin: entry.wordPinyin,
    tier: entry.tier || 1,
    phase: 'new',
    step: 0,
    ease: INITIAL_EASE,
    intervalDays: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    introducedDate: null,
    knownAtIntro: false,
  }));
}
