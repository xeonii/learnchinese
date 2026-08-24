import { toCanonical } from './pinyin.js';

let cached = null;
let loading = null;

export function dictUrl() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  return `${base}cedict.json.gz`;
}

export function cleanGloss(meaning) {
  return String(meaning || '')
    .replace(/\s*CL:[^;/]*/g, '')
    .replace(/\s*;\s*;/g, ';')
    .replace(/^[;\s]+|[;\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inflateRow(row) {
  return {
    word: row[0],
    pinyin: row[1],
    meaning: cleanGloss(row[2]),
    toneless: String(row[1] || '').replace(/[0-9]/g, ''),
  };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PINYIN_QUERY = /^[a-züv:0-9\s'\-āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/i;

function englishScore(meaning, lower, wordRe) {
  if (!meaning) return 0;
  if (meaning === lower) return 95;
  if (meaning.startsWith(`${lower};`) || meaning.startsWith(`${lower},`) || meaning.startsWith(`${lower} `)) {
    return 90;
  }
  if (wordRe.test(meaning)) return 85;
  if (meaning.includes(lower)) return 35;
  return 0;
}

export async function decodeGzipJson(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let text;
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress the dictionary');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(bytes);
  }
  return JSON.parse(text);
}

export async function loadDict() {
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    const res = await fetch(dictUrl());
    if (!res.ok) throw new Error(`Dictionary HTTP ${res.status}`);
    const rows = await decodeGzipJson(await res.arrayBuffer());
    cached = rows.map(inflateRow);
    return cached;
  })();
  try {
    return await loading;
  } catch (error) {
    loading = null;
    throw error;
  }
}

export function lookupExact(dict, word) {
  if (!dict || !word) return [];
  return dict.filter((entry) => entry.word === word);
}

export function searchDict(dict, query, limit = 40) {
  const q = String(query || '').trim();
  if (!q || !dict?.length) return [];

  if (/[\u4e00-\u9fff]/.test(q)) {
    const exact = [];
    const starts = [];
    const contains = [];
    for (const entry of dict) {
      if (entry.word === q) exact.push(entry);
      else if (entry.word.startsWith(q)) starts.push(entry);
      else if (entry.word.includes(q)) contains.push(entry);
      if (exact.length + starts.length + contains.length >= limit * 3) break;
    }
    return [...exact, ...starts, ...contains].slice(0, limit);
  }

  const lower = q.toLowerCase();
  const asPinyin = PINYIN_QUERY.test(q);
  const canon = asPinyin ? toCanonical(q) : '';
  const toneless = canon.replace(/[0-9]/g, '');
  const hasTone = /[0-9]/.test(canon);
  const wordRe = new RegExp(`(?:^|[;,:/()\\s])${escapeRe(lower)}(?:$|[;,:/()\\s])`);
  const scored = [];

  for (const entry of dict) {
    let score = 0;
    if (canon) {
      if (entry.pinyin === canon) score = 100;
      else if (hasTone && entry.pinyin.startsWith(canon)) score = 80;
      else if (!hasTone && entry.toneless === toneless) score = 75;
      else if (!hasTone && toneless.length >= 2 && entry.toneless.startsWith(toneless)) score = 60;
    }
    score = Math.max(score, englishScore(entry.meaning.toLowerCase(), lower, wordRe));
    if (score) scored.push({ entry, score, len: entry.word.length });
  }

  scored.sort((a, b) => b.score - a.score || a.len - b.len || a.entry.word.localeCompare(b.entry.word, 'zh'));
  return scored.slice(0, limit).map((row) => row.entry);
}

export function alreadyInLibrary(words, entry) {
  const key = toCanonical(entry.pinyin);
  return words.some((w) => w.word === entry.word && toCanonical(w.pinyin) === key);
}

export function makeWordId(word, pinyin, words) {
  const taken = new Set(words.map((w) => w.id));
  if (!taken.has(word)) return word;
  const keyed = `${word}:${toCanonical(pinyin)}`;
  if (!taken.has(keyed)) return keyed;
  let n = 2;
  while (taken.has(`${keyed}:${n}`)) n += 1;
  return `${keyed}:${n}`;
}
