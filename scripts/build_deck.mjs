#!/usr/bin/env node
// Build src/data/deck.json: the most frequent Mandarin words, ranked.
// Source: drkameleon/complete-hsk-vocabulary (MIT), which carries frequency ranks.
//   node scripts/build_deck.mjs [path/to/complete.min.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { numberedToMarked } from '../src/lib/pinyin.js';

const SRC = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json';
const LIMIT = 6000;

const raw = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : await (await fetch(SRC)).text();
const rows = JSON.parse(raw).filter((r) => r.q && /^[一-鿿]+$/.test(r.s));

const BAD = /^(surname|variant of|old variant|used in|see |abbr\.|\(archaic\)|\(old\)|\(literary\)|\(dialect\))/i;

// Readings that are the everyday sense, where the source lists a rarer one first.
const PREFER = {
  说: 'shuō', 要: 'yào', 个: 'gè', 看: 'kàn', 着: 'zhe', 还: 'hái', 都: 'dōu', 那: 'nà',
  也: 'yě', 能: 'néng', 过: 'guò', 上: 'shàng', 吧: 'ba', 得: 'de', 为: 'wèi', 和: 'hé',
  地: 'de', 了: 'le', 长: 'cháng', 行: 'xíng', 觉: 'jué', 中: 'zhōng', 从: 'cóng', 里: 'lǐ',
  啊: 'a', 哪: 'nǎ', 呢: 'ne', 吗: 'ma', 好: 'hǎo', 只: 'zhǐ', 没: 'méi', 发: 'fā', 重: 'zhòng',
  便: 'biàn', 教: 'jiāo', 数: 'shù', 少: 'shǎo', 当: 'dāng', 分: 'fēn', 干: 'gàn', 大: 'dà',
  种: 'zhǒng', 家: 'jiā', 什么: 'shénme', 一: 'yī', 不: 'bù', 就: 'jiù', 把: 'bǎ', 空: 'kōng',
};

// Everyday glosses for function words whose dictionary lead sense is rare.
const GLOSS = {
  被: 'by (passive marker); quilt', 等: 'to wait; etc.; class', 刚: 'just (now); barely', 里: 'inside; in',
  着: '-ing (ongoing action)', 点: 'o’clock; a little; dot; to order', 可: 'but; can; may', 太: 'too (much); very',
  把: '(object marker); to hold', 和: 'and; with', 啊: 'ah (sentence particle)', 呢: 'and…? (question particle)',
  得: '(links verb to result: 跑得快)', 地: '-ly (adverb marker)', 中: 'middle; in; China', 同: 'same; together; with',
  过: '(have done before); to pass', 上: 'up; on; previous', 下: 'down; below; next', 才: 'only then; just; only',
  跟: 'with; and; to follow', 比: 'than; to compare', 就: 'right away; just; then', 在: 'at; in; (doing)',
  呀: 'ah (sentence particle)', 吧: '(suggestion particle): let’s…, …right?', 了: '(completed action / change)',
  的: '’s; of (possessive particle)',
};

const lowerPy = (y) => y.toLowerCase().replace(/\s+/g, '');

function score(form) {
  const y = form.i?.y || '';
  const m = form.m || [];
  let s = m.length;
  if (/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(y)) s -= 100;
  if (m.length && BAD.test(m[0])) s -= 50;
  return s;
}

function gloss(meanings) {
  const out = [];
  for (const m of meanings) {
    if (BAD.test(m)) continue;
    const clean = m.replace(/\s*CL:.*$/, '').replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    if ([...out, clean].join('; ').length > 64 && out.length) break;
    out.push(clean);
    if (out.length >= 3) break;
  }
  return out.join('; ') || meanings[0] || '';
}

rows.sort((a, b) => a.q - b.q);
const seen = new Set();
const deck = [];
for (const r of rows) {
  if (seen.has(r.s)) continue;
  seen.add(r.s);
  let forms = [...r.f].sort((a, b) => score(b) - score(a));
  if (PREFER[r.s]) {
    const hit = r.f.find((f) => lowerPy(f.i.y) === PREFER[r.s]);
    if (hit) forms = [hit, ...forms.filter((f) => f !== hit)];
  }
  const f = forms[0];
  // Merge glosses of every form with the same reading.
  const py = lowerPy(f.i.y);
  const meanings = r.f.filter((x) => lowerPy(x.i.y) === py).flatMap((x) => x.m);
  deck.push([r.s, numberedToMarked(f.i.n.toLowerCase()), GLOSS[r.s] || gloss(meanings).replace(/\s*\(Taiwan pr\.[^)]*\)/g, '')]);
  if (deck.length >= LIMIT) break;
}

writeFileSync(new URL('../src/data/deck.json', import.meta.url), JSON.stringify(deck));
console.log(`deck: ${deck.length} words`);
