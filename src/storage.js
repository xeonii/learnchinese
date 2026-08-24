import { INITIAL_EASE } from './srs.js';
import { hanziOf } from './coverage.js';
import { alreadyInLibrary, makeWordId } from './dict.js';

export const OLD_STORAGE_KEY = 'koudaozi_v2';
export const LS_FALLBACK_KEY = 'koudaozi_v3';
export const DB_NAME = 'koudaozi';
export const DB_VERSION = 1;
export const STORE = 'kv';
export const STATE_KEY = 'state';

function emptyMeta() {
  return { streak: 0, lastSessionDate: null, toneSlipLog: [] };
}

export function initializeWords(seed) {
  return seed.map((entry, index) => ({
    id: entry.id || entry.word,
    word: entry.word,
    pinyin: entry.pinyin,
    meaning: entry.meaning,
    chars: entry.chars || hanziOf(entry.word),
    tier: entry.tier ?? 1,
    sortIndex: entry.sortIndex ?? index,
    source: entry.source || 'seed',
    phase: 'new',
    step: 0,
    ease: INITIAL_EASE,
    intervalDays: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    toneSlips: 0,
    toneSlipLog: [],
    introducedDate: null,
    knownAtIntro: false,
  }));
}

function srsRank(card) {
  const order = { review: 4, relearning: 3, learning: 2, skipped: 1, new: 0 };
  return ((order[card.phase] || 0) * 1000) + (card.reps || 0);
}

function copySrs(from, onto) {
  return {
    ...onto,
    phase: from.phase,
    step: from.step ?? 0,
    ease: from.ease ?? INITIAL_EASE,
    intervalDays: from.intervalDays || 0,
    due: from.due || 0,
    reps: from.reps || 0,
    lapses: from.lapses || 0,
    introducedDate: from.introducedDate || null,
    knownAtIntro: !!from.knownAtIntro,
  };
}

export function migrateFromV2(old, seed) {
  const words = initializeWords(seed);
  const byWord = new Map(words.map((w) => [w.word, w]));
  for (const card of old.cards || []) {
    if (!card?.word) continue;
    const current = byWord.get(card.word);
    if (!current) continue;
    if (srsRank(card) <= srsRank(current)) continue;
    const updated = copySrs(card, current);
    byWord.set(card.word, updated);
  }
  return {
    words: [...byWord.values()],
    meta: {
      streak: old.streak || 0,
      lastSessionDate: old.lastSessionDate || null,
      toneSlipLog: [],
    },
  };
}

export function addDictWord(words, entry) {
  if (alreadyInLibrary(words, entry)) return { words, added: null, exists: true };
  const card = initializeWords([{
    id: makeWordId(entry.word, entry.pinyin, words),
    word: entry.word,
    pinyin: entry.pinyin,
    meaning: entry.meaning,
    chars: hanziOf(entry.word),
    tier: 0,
    sortIndex: -Date.now(),
    source: 'dict',
  }])[0];
  return { words: [...words, card], added: card, exists: false };
}

export function enrichSeedMeanings(words, dict) {
  if (!dict?.length) return words;
  const byWord = new Map();
  for (const entry of dict) {
    if (!byWord.has(entry.word)) byWord.set(entry.word, entry);
  }
  let changed = false;
  const next = words.map((w) => {
    if (w.source !== 'seed' || w.phase !== 'new') return w;
    const hit = byWord.get(w.word);
    if (!hit || hit.meaning === w.meaning) return w;
    changed = true;
    return { ...w, meaning: hit.meaning };
  });
  return changed ? next : words;
}

export function serializeState(words, meta) {
  return {
    version: 3,
    words,
    meta: { ...emptyMeta(), ...meta },
    exportedAt: new Date().toISOString(),
  };
}

export function parseImportedState(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || !Array.isArray(data.words) || data.words.length === 0) {
    throw new Error('Backup has no words');
  }
  return {
    words: data.words,
    meta: { ...emptyMeta(), ...(data.meta || {}) },
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(key) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(key, value) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

async function idbClear() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save progress', error);
  }
}

export async function loadState(seed) {
  try {
    const fromIdb = await idbGet(STATE_KEY);
    if (fromIdb?.words?.length) return fromIdb;
  } catch {
    // fall through
  }

  const v3 = typeof localStorage !== 'undefined' ? readLocal(LS_FALLBACK_KEY) : null;
  if (v3?.words?.length) {
    try { await saveState(v3); } catch { /* ignore */ }
    return v3;
  }

  const v2 = typeof localStorage !== 'undefined' ? readLocal(OLD_STORAGE_KEY) : null;
  if (v2?.cards?.length && seed) {
    const migrated = migrateFromV2(v2, seed);
    try { await saveState(migrated); } catch { /* ignore */ }
    return migrated;
  }

  return null;
}

export async function saveState(state) {
  const payload = {
    version: 3,
    words: state.words,
    meta: { ...emptyMeta(), ...(state.meta || {}) },
  };
  try {
    await idbSet(STATE_KEY, payload);
    return;
  } catch {
    if (typeof localStorage !== 'undefined') writeLocal(LS_FALLBACK_KEY, payload);
  }
}

export async function clearState() {
  await idbClear();
  try {
    localStorage.removeItem(OLD_STORAGE_KEY);
    localStorage.removeItem(LS_FALLBACK_KEY);
  } catch {
    // ignore
  }
}

export function downloadBackup(words, meta) {
  const blob = new Blob([JSON.stringify(serializeState(words, meta), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `koudaozi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
