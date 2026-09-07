import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  approxHanLength,
  briefGloss,
  entryFromStoryLookup,
  isoDate,
  loadDaily,
  longestMatchAt,
  lookupStoryToken,
  pickBestEntry,
  segmentStory,
} from '../src/daily.js';
import { addDictWord, initializeWords } from '../src/storage.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sample = JSON.parse(readFileSync(join(root, 'public/daily/2026-09-07.json'), 'utf8'));

const miniDict = [
  { word: '几乎', pinyin: 'ji1hu1', meaning: 'almost' },
  { word: '店员', pinyin: 'dian4yuan2', meaning: 'shop assistant' },
  { word: '价钱', pinyin: 'jia4qian2', meaning: 'price' },
  { word: '听清', pinyin: 'ting1qing1', meaning: 'hear clearly' },
  { word: '付钱', pinyin: 'fu4qian2', meaning: 'pay' },
  { word: '满', pinyin: 'man3', meaning: 'full' },
  { word: '遍', pinyin: 'bian4', meaning: 'time / everywhere' },
  { word: '才', pinyin: 'cai2', meaning: 'only then' },
];

describe('daily story', () => {
  it('loads daily JSON via latest then date fallback', async () => {
    const calls = [];
    const data = await loadDaily(new Date('2026-09-07T12:00:00'), async (url) => {
      calls.push(url);
      if (url.endsWith('latest.json')) return { ...sample };
      throw new Error('should not need date file');
    });
    assert.equal(data.date, '2026-09-07');
    assert.ok(data.short.text.includes('满'));
    assert.equal(calls.length, 1);
    assert.match(calls[0], /daily\/latest\.json$/);
  });

  it('falls back to date file when latest is missing', async () => {
    const calls = [];
    const data = await loadDaily(new Date('2026-09-07T12:00:00'), async (url) => {
      calls.push(url);
      if (url.endsWith('latest.json')) throw new Error('missing');
      if (url.endsWith('2026-09-07.json')) return { ...sample };
      throw new Error(`unexpected ${url}`);
    });
    assert.equal(data.date, '2026-09-07');
    assert.equal(calls.length, 2);
  });

  it('returns null quietly when no daily file exists', async () => {
    const data = await loadDaily(Date.now(), async () => {
      throw new Error('404');
    });
    assert.equal(data, null);
  });

  it('isoDate formats YYYY-MM-DD', () => {
    assert.equal(isoDate(new Date('2026-09-07T15:00:00')), '2026-09-07');
  });

  it('approxHanLength counts 汉字 only', () => {
    assert.equal(approxHanLength(sample.short.text), 36);
    assert.ok(approxHanLength(sample.long.text) >= 90);
    assert.ok(approxHanLength(sample.long.text) <= 120);
  });

  it('tap path resolves pinyin from dict (longest word match)', () => {
    const tokens = segmentStory(sample.short.text, miniDict);
    const almost = tokens.find((t) => t.text === '几乎');
    assert.ok(almost, 'expected 几乎 as a segmented word');
    const info = lookupStoryToken(almost.text, miniDict);
    assert.equal(info.known, true);
    assert.equal(info.pinyin, 'ji1hu1');
    assert.match(info.meaning, /almost/i);

    const at = sample.short.text.indexOf('几乎');
    assert.equal(longestMatchAt(sample.short.text, at, miniDict), '几乎');
    assert.equal(longestMatchAt(sample.short.text, at + 1, miniDict), '乎');
  });

  it('unknown 字 is marked unknown', () => {
    const info = lookupStoryToken('𡨸', miniDict);
    assert.equal(info.known, false);
    assert.equal(info.pinyin, null);
  });

  it('prefers common gloss over proper-noun senses', () => {
    const best = pickBestEntry([
      { word: '满', pinyin: 'man3', meaning: 'Manchu ethnic group' },
      { word: '满', pinyin: 'man3', meaning: 'full; filled; packed' },
    ]);
    assert.equal(best.meaning, 'full; filled; packed');
    assert.equal(briefGloss(best.meaning), 'full');
  });

  it('I didn’t know this adds the word to the library via story source', () => {
    const info = lookupStoryToken('满', miniDict);
    const entry = entryFromStoryLookup(info);
    const seed = initializeWords([{ word: '你好', pinyin: 'ni3hao3', meaning: 'hello', source: 'seed' }]);
    const { words, added, exists } = addDictWord(seed, entry, { source: 'story' });
    assert.equal(exists, false);
    assert.equal(added.source, 'story');
    assert.equal(added.word, '满');
    assert.equal(added.phase, 'new');
    assert.equal(words.length, 2);
    assert.match(`Added ${added.word} to your library.`, /^Added 满 to your library\.$/);
  });

  it('sample content matches the shipped daily file', () => {
    assert.deepEqual(sample.dueChars, ['满', '遍', '才']);
    assert.equal(sample.short.title, '');
    assert.equal(sample.long.title, '');
  });
});
