import assert from 'node:assert/strict';
import { test } from 'node:test';
import { characterCoverage, KNOWN_CHAR_WORDS } from '../src/coverage.js';
import { initializeWords, migrateFromV2, addDictWord } from '../src/storage.js';
import { seedWordsFromCharacters } from '../src/seed.js';
import { searchDict, alreadyInLibrary, inflateRow } from '../src/dict.js';

test('character knowledge is derived from distinct words', () => {
  const chars = ['电', '脑', '你', '好'];
  const words = initializeWords([
    { word: '电脑', pinyin: 'dian4nao3', meaning: 'computer', tier: 1 },
    { word: '你好', pinyin: 'ni3hao3', meaning: 'hello', tier: 1 },
    { word: '大脑', pinyin: 'da4nao3', meaning: 'brain', tier: 1 },
  ]).map((w) => {
    if (w.word === '电脑') return { ...w, phase: 'review', reps: 2 };
    if (w.word === '大脑') return { ...w, phase: 'learning', reps: 1 };
    return w;
  });
  const cov = characterCoverage(words, chars);
  assert.equal(KNOWN_CHAR_WORDS, 2);
  assert.equal(cov.perChar['脑'].known, true);
  assert.equal(cov.perChar['电'].known, true);
  assert.equal(cov.perChar['你'].known, false);
  assert.equal(cov.known, 2);
});

test('a single graduated word can mark its characters known', () => {
  const words = initializeWords([
    { word: '你好', pinyin: 'ni3hao3', meaning: 'hello', tier: 1 },
  ]).map((w) => ({ ...w, phase: 'review', reps: 1 }));
  const cov = characterCoverage(words, ['你', '好', '我']);
  assert.equal(cov.perChar['你'].known, true);
  assert.equal(cov.perChar['我'].known, false);
});

test('v2 character cards migrate onto example-word cards', () => {
  const seed = seedWordsFromCharacters([
    { char: '你', pinyin: 'nǐ', meaning: 'you', word: '你好', wordPinyin: 'nǐhǎo', tier: 1 },
    { char: '好', pinyin: 'hǎo', meaning: 'good', word: '你好', wordPinyin: 'nǐhǎo', tier: 1 },
    { char: '我', pinyin: 'wǒ', meaning: 'I', word: '我们', wordPinyin: 'wǒmen', tier: 1 },
  ]);
  const migrated = migrateFromV2({
    streak: 4,
    lastSessionDate: 'Mon Jan 01 2026',
    cards: [
      { word: '你好', phase: 'review', reps: 3, due: 99, ease: 2.6, intervalDays: 6 },
      { word: '你好', phase: 'learning', reps: 1, due: 1 },
    ],
  }, seed);
  const nihao = migrated.words.find((w) => w.word === '你好');
  const women = migrated.words.find((w) => w.word === '我们');
  assert.equal(migrated.words.length, 2);
  assert.equal(nihao.phase, 'review');
  assert.equal(nihao.reps, 3);
  assert.equal(women.phase, 'new');
  assert.equal(migrated.meta.streak, 4);
});

test('dictionary search matches hanzi, numbered pinyin, and english', () => {
  const dict = [
    ['你好', 'ni3hao3', 'hello'],
    ['键', 'jian4', 'key (on a piano or computer keyboard)'],
    ['电脑', 'dian4nao3', 'computer; CL:臺|台[tai2]'],
    ['行', 'xing2', 'OK; to walk'],
    ['行', 'hang2', 'row; line'],
  ].map(inflateRow);

  assert.equal(searchDict(dict, '你')[0].word, '你好');
  assert.equal(searchDict(dict, 'ni3hao3')[0].word, '你好');
  assert.equal(searchDict(dict, 'computer')[0].word, '电脑');
  assert.equal(searchDict(dict, 'computer')[0].meaning, 'computer');
  assert.equal(searchDict(dict, 'xing2').length, 1);
  assert.equal(searchDict(dict, 'hang2')[0].pinyin, 'hang2');
});

test('adding a dict word updates a seed gloss when the word already exists', () => {
  const words = initializeWords([{ word: '电脑', pinyin: 'diànnǎo', meaning: 'brain', tier: 1, source: 'seed' }]);
  const entry = inflateRow(['电脑', 'dian4nao3', 'computer']);
  assert.equal(alreadyInLibrary(words, entry), true);
  const { exists, added, words: next } = addDictWord(words, entry);
  assert.equal(exists, true);
  assert.equal(added, null);
  assert.equal(next.find((w) => w.word === '电脑').meaning, 'computer');
});
