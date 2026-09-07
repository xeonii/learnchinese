import { lookupExact } from './dict.js';

const HAN = /[\u4e00-\u9fff]/;
const MAX_WORD_LEN = 8;

export function dailyBaseUrl() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  return `${base}daily/`;
}

export function isoDate(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function approxHanLength(text) {
  return [...String(text || '')].filter((ch) => HAN.test(ch)).length;
}

function buildWordSet(dict) {
  const set = new Set();
  if (!dict?.length) return set;
  for (const entry of dict) {
    const w = entry?.word;
    if (!w || w.length < 2 || w.length > MAX_WORD_LEN) continue;
    if (![...w].every((ch) => HAN.test(ch))) continue;
    set.add(w);
  }
  return set;
}

/** Greedy longest-dict-match segmentation; single 字 always allowed. */
export function segmentStory(text, dict) {
  const wordSet = buildWordSet(dict);
  const tokens = [];
  const s = String(text || '');
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (!HAN.test(ch)) {
      let j = i + 1;
      while (j < s.length && !HAN.test(s[j])) j += 1;
      tokens.push({ text: s.slice(i, j), kind: 'other' });
      i = j;
      continue;
    }
    let matched = ch;
    const limit = Math.min(MAX_WORD_LEN, s.length - i);
    for (let len = limit; len >= 2; len -= 1) {
      const slice = s.slice(i, i + len);
      if (![...slice].every((c) => HAN.test(c))) continue;
      if (wordSet.has(slice)) {
        matched = slice;
        break;
      }
    }
    tokens.push({ text: matched, kind: 'han' });
    i += matched.length;
  }
  return tokens;
}

export function isDueToken(tokenText, dueChars) {
  if (!dueChars?.length || !tokenText) return false;
  return [...tokenText].some((ch) => dueChars.includes(ch));
}

export function lookupStoryToken(tokenText, dict) {
  const word = String(tokenText || '');
  if (!word) return { word: '', pinyin: null, meaning: null, known: false };
  const hits = lookupExact(dict, word);
  if (hits.length) {
    const best = hits[0];
    return {
      word: best.word,
      pinyin: best.pinyin,
      meaning: best.meaning,
      known: true,
    };
  }
  // Prefer a multi-char dict hit already segmented; else try single-char glosses.
  if (word.length === 1) {
    return { word, pinyin: null, meaning: null, known: false };
  }
  return { word, pinyin: null, meaning: null, known: false };
}

/** Prefer longest dict match at a character index (for tests / explicit taps). */
export function longestMatchAt(text, index, dict) {
  const wordSet = buildWordSet(dict);
  const s = String(text || '');
  if (index < 0 || index >= s.length || !HAN.test(s[index])) return null;
  const limit = Math.min(MAX_WORD_LEN, s.length - index);
  for (let len = limit; len >= 2; len -= 1) {
    const slice = s.slice(index, index + len);
    if (![...slice].every((c) => HAN.test(c))) continue;
    if (wordSet.has(slice)) return slice;
  }
  return s[index];
}

export function entryFromStoryLookup(info) {
  return {
    word: info.word,
    pinyin: info.pinyin || '',
    meaning: info.meaning || 'From today’s story',
    source: 'story',
  };
}

export async function fetchDailyJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Daily HTTP ${res.status}`);
  const data = await res.json();
  if (!data || (!data.short?.text && !data.long?.text)) {
    throw new Error('Daily JSON missing story text');
  }
  return data;
}

/**
 * Load today’s story. Tries latest.json, then YYYY-MM-DD.json.
 * Missing files → null (quiet empty state).
 */
export async function loadDaily(now = Date.now(), fetcher = fetchDailyJson) {
  const base = dailyBaseUrl();
  const date = isoDate(now);
  const urls = [`${base}latest.json`, `${base}${date}.json`];
  for (const url of urls) {
    try {
      return await fetcher(url);
    } catch {
      // try next
    }
  }
  return null;
}
