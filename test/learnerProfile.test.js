import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyKnownBias,
  applyLearnerProfile,
  charsAllKnown,
  loadLearnerProfile,
  mergeExtraVocab,
  mixupPartners,
  profileCharRank,
  sortByProfile,
} from '../src/learnerProfile.js';
import { choicesFor, nextItem } from '../src/session.js';
import { initializeWords } from '../src/storage.js';

const PROFILE = {
  version: 1,
  knownChars: ['我', '们', '好', '你', '的'],
  weakChars: ['坐', '放', '学'],
  mixups: [
    { a: '是', b: '在', note: 'test' },
    { a: '商', b: '店', note: 'test' },
  ],
  extraVocab: [
    { word: '坐', pinyin: 'zuo4', meaning: 'sit' },
    { word: '放学', pinyin: 'fang4xue2', meaning: 'school is out' },
  ],
  sentenceLevel: 'G1',
  suggestedNext: ['坐', '放', '学'],
};

describe('learner profile', () => {
  it('charsAllKnown only when every 字 is listed (incomplete list is bias, not auto-fail)', () => {
    assert.equal(charsAllKnown('我们', PROFILE.knownChars), true);
    assert.equal(charsAllKnown('你好', PROFILE.knownChars), true);
    assert.equal(charsAllKnown('坐', PROFILE.knownChars), false);
    assert.equal(charsAllKnown('商店', PROFILE.knownChars), false);
    assert.equal(charsAllKnown('', PROFILE.knownChars), false);
  });

  it('known-char intro skip: fully-known new words are markKnown, not offered as intro', () => {
    const cards = initializeWords([
      { word: '我们', pinyin: 'women', meaning: 'we', chars: ['我', '们'], tier: 1, sortIndex: 0 },
      { word: '坐', pinyin: 'zuo4', meaning: 'sit', chars: ['坐'], tier: 1, sortIndex: 1 },
    ]);
    const biased = applyKnownBias(cards, PROFILE, 1_000_000);
    assert.equal(biased[0].phase, 'review');
    assert.equal(biased[0].knownAtIntro, true);
    assert.equal(biased[1].phase, 'new');

    const item = nextItem(biased, {
      intros: 0,
      learnedNew: 0,
      hasVoice: false,
      promptIndex: 0,
      profile: PROFILE,
    }, 1_000_000);
    assert.equal(item.type, 'intro');
    assert.equal(item.card.word, '坐');
  });

  it('does not overwrite user progress on already-reviewed cards', () => {
    const cards = initializeWords([
      { word: '我们', pinyin: 'women', meaning: 'we', chars: ['我', '们'], tier: 1 },
    ]).map((c) => ({ ...c, phase: 'learning', step: 1, reps: 2 }));
    const biased = applyKnownBias(cards, PROFILE, 1_000_000);
    assert.equal(biased[0].phase, 'learning');
    assert.equal(biased[0].reps, 2);
  });

  it('weak/suggestedNext sort puts those 字 first in the intro queue', () => {
    const cards = initializeWords([
      { word: '苹果', pinyin: 'pingguo', meaning: 'apple', chars: ['苹', '果'], tier: 1, sortIndex: 0 },
      { word: '放学', pinyin: 'fang4xue2', meaning: 'school out', chars: ['放', '学'], tier: 1, sortIndex: 1 },
      { word: '坐', pinyin: 'zuo4', meaning: 'sit', chars: ['坐'], tier: 1, sortIndex: 2 },
    ]);
    const sorted = sortByProfile(cards, PROFILE);
    assert.equal(sorted[0].word, '坐');
    assert.equal(sorted[1].word, '放学');
    assert.ok(profileCharRank(sorted[0], PROFILE) < profileCharRank(sorted[2], PROFILE));

    const item = nextItem(cards, {
      intros: 0,
      learnedNew: 0,
      hasVoice: false,
      promptIndex: 0,
      profile: PROFILE,
    }, 2_000_000);
    assert.equal(item.card.word, '坐');
  });

  it('extraVocab ingest adds missing teacher words', () => {
    const cards = initializeWords([
      { word: '你好', pinyin: 'ni3hao3', meaning: 'hello', chars: ['你', '好'], tier: 1 },
    ]);
    const merged = mergeExtraVocab(cards, PROFILE);
    assert.equal(merged.length, 3);
    const added = merged.filter((w) => w.source === 'teacher');
    assert.equal(added.length, 2);
    assert.ok(added.some((w) => w.word === '坐'));
    assert.ok(added.some((w) => w.word === '放学'));

    const again = mergeExtraVocab(merged, PROFILE);
    assert.equal(again.length, 3);
  });

  it('mixup distractor prefers the partner 字 in listen MC', () => {
    const cards = initializeWords([
      { word: '是的', pinyin: 'shi4de', meaning: 'yes', chars: ['是', '的'], tier: 1 },
      { word: '在家', pinyin: 'zai4jia1', meaning: 'at home', chars: ['在', '家'], tier: 1 },
      { word: '苹果', pinyin: 'ping2guo3', meaning: 'apple', chars: ['苹', '果'], tier: 1 },
      { word: '桌子', pinyin: 'zhuo1zi', meaning: 'table', chars: ['桌', '子'], tier: 1 },
      { word: '水', pinyin: 'shui3', meaning: 'water', chars: ['水'], tier: 1 },
    ]);
    assert.deepEqual(mixupPartners('是的', PROFILE), ['在']);
    const choices = choicesFor(cards[0], cards, 4, PROFILE);
    const words = choices.map((c) => c.word);
    assert.ok(words.includes('是的'));
    assert.ok(words.includes('在家'), `expected 在家 among ${words.join(',')}`);
  });

  it('missing profile file is a no-op', async () => {
    const fetch404 = async () => ({ ok: false, status: 404 });
    assert.equal(await loadLearnerProfile(fetch404), null);

    const fetchThrow = async () => { throw new Error('network'); };
    assert.equal(await loadLearnerProfile(fetchThrow), null);

    const cards = initializeWords([
      { word: '坐', pinyin: 'zuo4', meaning: 'sit', chars: ['坐'], tier: 1 },
    ]);
    assert.equal(applyLearnerProfile(cards, null), cards);
    assert.equal(mergeExtraVocab(cards, null), cards);
    assert.equal(applyKnownBias(cards, null), cards);
    assert.equal(sortByProfile(cards, null), cards);
  });

  it('applyLearnerProfile merges vocab then applies known bias', () => {
    const cards = initializeWords([
      { word: '我们', pinyin: 'women', meaning: 'we', chars: ['我', '们'], tier: 1 },
    ]);
    const next = applyLearnerProfile(cards, PROFILE, 3_000_000);
    assert.ok(next.some((w) => w.word === '坐' && w.source === 'teacher'));
    assert.equal(next.find((w) => w.word === '我们').phase, 'review');
  });
});
