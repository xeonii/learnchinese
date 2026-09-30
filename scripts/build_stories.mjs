#!/usr/bin/env node
// Segment content/stories.mjs into tappable tokens with pinyin + gloss.
//   node scripts/build_stories.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import stories from '../content/stories.mjs';
import { numberedToMarked } from '../src/lib/pinyin.js';

const root = new URL('..', import.meta.url);
const deck = JSON.parse(readFileSync(new URL('src/data/deck.json', root)));
const cedict = JSON.parse(gunzipSync(readFileSync(new URL('public/cedict.json.gz', root))));

const HAN = /[一-鿿]/;
const byDeck = new Map(deck.map(([w, p, g]) => [w, { p, g }]));
const byCedict = new Map();
for (const [w, p, m] of cedict) {
  if (!byCedict.has(w)) byCedict.set(w, []);
  byCedict.get(w).push({ p, m });
}
// Words the segmenter may match: the frequency deck plus short CC-CEDICT words.
const words = new Set(deck.map(([w]) => w));
for (const w of byCedict.keys()) if (w.length >= 2 && w.length <= 4) words.add(w);
// Pairs that glue across a word boundary in these stories.
const BLOCK = new Set(['到了', '都会', '得很', '小的', '小白', '我去', '说中', '穿衣', '我有', '我给', '天黑', '我在', '有的人', '一把', '我只', '了一', '上有', '回她', '了一个', '上写', '的一天', '我的', '我们都', '在家', '看见了', '说他', '在视', '里看', '得不', '我也', '人在', '里有', '我先', '里只', '了很', '有一', '家的']);
for (const w of BLOCK) words.delete(w);

function bestCedict(w) {
  const hits = byCedict.get(w) || [];
  const scored = hits.map((h) => {
    let s = 0;
    if (/^[a-z]/.test(h.m)) s += 20;
    if (/^(surname|variant of|old variant|see |used in)/i.test(h.m)) s -= 30;
    if (/^[A-Z]/.test(h.p)) s -= 20;
    return { h, s };
  }).sort((a, b) => b.s - a.s);
  return scored[0]?.h;
}

function info(w, extra) {
  if (extra?.has(w)) return extra.get(w);
  const d = byDeck.get(w);
  if (d) return { p: d.p, g: d.g };
  const c = bestCedict(w);
  if (c) return { p: numberedToMarked(c.p), g: c.m.split('/')[0].split(';').slice(0, 2).join(';').trim() };
  if (w.length > 1) {
    return { p: [...w].map((ch) => info(ch).p).join(' '), g: '' };
  }
  return { p: '', g: '' };
}

const deckWords = new Set(deck.map(([w]) => w).filter((w) => !BLOCK.has(w)));

// Fewest-tokens segmentation of a run of 汉字. Deck words cost 1, other
// CC-CEDICT words a bit more, so everyday words win ties.
function segmentRun(run, extra) {
  const n = run.length;
  const best = Array(n + 1).fill(Infinity);
  const from = Array(n + 1).fill(0);
  best[0] = 0;
  for (let i = 0; i < n; i += 1) {
    if (best[i] === Infinity) continue;
    for (let len = 1; len <= Math.min(4, n - i); len += 1) {
      const w = run.slice(i, i + len);
      let cost;
      if (len === 1) cost = 1;
      else if (deckWords.has(w) || extra.has(w)) cost = 1;
      else if (words.has(w)) cost = 1.6;
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

function segment(src, extra) {
  const tokens = [];
  const re = /([\u4e00-\u9fff]+)|\{([^}]*)\}|\||([^\u4e00-\u9fff{|]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) for (const w of segmentRun(m[1], extra)) tokens.push({ t: w, ...info(w, extra) });
    else if (m[2] !== undefined) tokens.at(-1).p = m[2];
    else if (m[3]) tokens.push({ t: m[3] });
  }
  return tokens.map((tok) => (tok.p === undefined ? [tok.t] : [tok.t, tok.p, tok.g]));
}

const out = stories.map((s) => ({
  id: s.id,
  level: s.level,
  title: s.title,
  en: s.en,
  sentences: s.sentences.map(([zh, en]) => ({ en, tokens: segment(zh, new Map(Object.entries(s.words || {}).map(([w, [p, g]]) => [w, { p, g }]))) })),
}));

writeFileSync(new URL('src/data/stories.json', root), JSON.stringify(out));
if (process.argv.includes('--print')) {
  for (const s of out) {
    console.log(`\n# ${s.title}`);
    for (const sen of s.sentences) {
      console.log(sen.tokens.map((t) => (t.length > 1 ? `${t[0]}(${t[1]})` : t[0])).join(' '));
    }
  }
}
console.log(`stories: ${out.length}`);
