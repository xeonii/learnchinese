import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onCorrect, onFail, startLearning, markKnown, dueCards, learnedNewCount, LEARN_STEPS_MS } from '../src/srs.js';
import { initializeCards } from '../src/storage.js';
import { nextItem, promptFor } from '../src/session.js';

const sample = [
  { char: '你', pinyin: 'nǐ', meaning: 'you', word: '你好', wordPinyin: 'nǐhǎo', tier: 1 },
  { char: '我', pinyin: 'wǒ', meaning: 'I', word: '我们', wordPinyin: 'wǒmen', tier: 1 },
  { char: '的', pinyin: 'de', meaning: 'particle', word: '我的', wordPinyin: 'wǒde', tier: 1 },
];

test('unknown cards are not due; first session offers intro', () => {
  const cards = initializeCards(sample);
  assert.equal(dueCards(cards, 1000).length, 0);
  const item = nextItem(cards, { intros: 0, learnedNew: 0, hasVoice: true, promptIndex: 0 }, 1000);
  assert.equal(item.type, 'intro');
  assert.equal(item.card.char, '你');
  assert.equal(item.canLearn, true);
});

test('I do not know this word does not empty the queue', () => {
  let cards = initializeCards(sample);
  cards = cards.map((c, i) => (i === 0 ? { ...c, phase: 'skipped' } : c));
  const item = nextItem(cards, { intros: 1, learnedNew: 0, hasVoice: false, promptIndex: 0 }, 1000);
  assert.equal(item.type, 'intro');
  assert.equal(item.card.char, '我');
});

test('learning card is due immediately and failed cards return in under a minute', () => {
  const now = 5_000_000;
  let card = startLearning(initializeCards(sample)[0], now);
  assert.ok(dueCards([card], now).length === 1);
  card = onFail(card, now);
  assert.equal(card.phase, 'relearning');
  assert.equal(dueCards([card], now).length, 0);
  assert.equal(dueCards([card], now + 45 * 1000).length, 1);
});

test('first pass comes back in the same session (~45s) as a listen prompt', () => {
  const now = 8_000_000;
  let card = startLearning(initializeCards(sample)[0], now);
  card = onCorrect(card, now);
  assert.equal(card.phase, 'learning');
  assert.equal(card.step, 1);
  assert.equal(card.due, now + LEARN_STEPS_MS[0]);
  const prompt = promptFor(card, { hasVoice: true, promptIndex: 0 });
  assert.equal(prompt.type, 'listen');
});

test('already-know does not count as a new learn', () => {
  const now = 9_000_000;
  const cards = initializeCards(sample).map((c, i) => (i === 0 ? markKnown(c, now) : c));
  assert.equal(learnedNewCount(cards, now), 0);
});
