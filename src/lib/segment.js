// Segment pasted Chinese text into tappable words using the frequency deck
// plus CC-CEDICT. Fewest tokens wins; deck words beat obscure dictionary ones.
import { briefGloss, pickBestEntry } from './dict.js';
import { numberedToMarked } from './pinyin.js';

const HAN = /[一-鿿]/;

export function buildIndex(deck, dict) {
  const deckMap = new Map(deck.map((e) => [e.w, e]));
  const dictMap = new Map();
  for (const e of dict || []) {
    if (!dictMap.has(e.word)) dictMap.set(e.word, []);
    dictMap.get(e.word).push(e);
  }
  return { deckMap, dictMap };
}

function info(w, index) {
  const d = index.deckMap.get(w);
  if (d) return [w, d.p, d.g];
  const best = pickBestEntry(index.dictMap.get(w));
  if (best) return [w, numberedToMarked(best.pinyin), briefGloss(best.meaning)];
  return [w, '', ''];
}

function segmentRun(run, index) {
  const n = run.length;
  const best = Array(n + 1).fill(Infinity);
  const from = Array(n + 1).fill(0);
  best[0] = 0;
  for (let i = 0; i < n; i += 1) {
    for (let len = 1; len <= Math.min(4, n - i); len += 1) {
      const w = run.slice(i, i + len);
      let cost;
      if (len === 1 || index.deckMap.has(w)) cost = 1;
      else if (index.dictMap.has(w)) cost = 1.6;
      else continue;
      if (best[i] + cost < best[i + len]) {
        best[i + len] = best[i] + cost;
        from[i + len] = i;
      }
    }
  }
  const out = [];
  for (let j = n; j > 0; j = from[j]) out.unshift(run.slice(from[j], j));
  return out;
}

/** Text → a story-shaped object the Reader can show. */
export function textToStory(text, index) {
  const sentences = [];
  const chunks = String(text || '').match(/[^。！？!?\n]+[。！？!?]*[”」]?|\n+/g) || [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const tokens = [];
    for (const m of chunk.matchAll(/[一-鿿]+|[^一-鿿]+/g)) {
      if (HAN.test(m[0])) for (const w of segmentRun(m[0], index)) tokens.push(info(w, index));
      else tokens.push([m[0]]);
    }
    sentences.push({ en: '', tokens });
  }
  return { id: 'pasted', level: 0, title: '', en: '', sentences };
}
