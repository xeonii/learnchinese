import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  onCorrect,
  onFail,
  onToneSlip,
  startLearning,
  markKnown,
  dueCards,
  isDue,
  learnedNewCount,
  suspendCard,
  unseenCards,
  unsuspendCard,
  LEARN_STEPS_MS,
  TONE_SLIP_MS,
} from '../src/srs.js';
import { initializeWords } from '../src/storage.js';
import { nextItem, promptFor } from '../src/session.js';

const sample = [
  { word: '你好', pinyin: 'nǐhǎo', meaning: 'hello', chars: ['你', '好'], tier: 1 },
  { word: '我们', pinyin: 'wǒmen', meaning: 'we', chars: ['我', '们'], tier: 1 },
  { word: '我的', pinyin: 'wǒde', meaning: 'mine', chars: ['我', '的'], tier: 1 },
];

test('unknown cards are not due; first session offers intro', () => {
  const cards = initializeWords(sample);
  assert.equal(dueCards(cards, 1000).length, 0);
  const item = nextItem(cards, { intros: 0, learnedNew: 0, hasVoice: true, promptIndex: 0 }, 1000);
  assert.equal(item.type, 'intro');
  assert.equal(item.card.word, '你好');
  assert.equal(item.canLearn, true);
});

test('I do not know this word does not empty the queue', () => {
  let cards = initializeWords(sample);
  cards = cards.map((c, i) => (i === 0 ? { ...c, phase: 'skipped' } : c));
  const item = nextItem(cards, { intros: 1, learnedNew: 0, hasVoice: false, promptIndex: 0 }, 1000);
  assert.equal(item.type, 'intro');
  assert.equal(item.card.word, '我们');
});

test('learning card is due immediately and failed cards return in under a minute', () => {
  const now = 5_000_000;
  let card = startLearning(initializeWords(sample)[0], now);
  assert.ok(dueCards([card], now).length === 1);
  card = onFail(card, now);
  assert.equal(card.phase, 'relearning');
  assert.equal(dueCards([card], now).length, 0);
  assert.equal(dueCards([card], now + 45 * 1000).length, 1);
});

test('exercise ladder: listen MC, then type pinyin, then audio-only', () => {
  const now = 8_000_000;
  let card = startLearning(initializeWords(sample)[0], now);
  assert.equal(promptFor(card, { hasVoice: true }).type, 'listen');

  card = onCorrect(card, now);
  assert.equal(card.phase, 'learning');
  assert.equal(card.step, 1);
  assert.equal(card.due, now + LEARN_STEPS_MS[0]);
  assert.equal(promptFor(card, { hasVoice: true }).type, 'read');

  card = onCorrect(card, now + LEARN_STEPS_MS[0]);
  assert.equal(card.phase, 'review');
  assert.equal(promptFor(card, { hasVoice: true }).type, 'listen-type');
});

test('already-know does not count as a new learn', () => {
  const now = 9_000_000;
  const cards = initializeWords(sample).map((c, i) => (i === 0 ? markKnown(c, now) : c));
  assert.equal(learnedNewCount(cards, now), 0);
});

test('tone slip is not a lapse and comes back sooner', () => {
  const now = 10_000_000;
  let card = startLearning(initializeWords(sample)[0], now);
  const ease = card.ease;
  card = onToneSlip(card, now, [{ pair: '3→2' }]);
  assert.equal(card.phase, 'learning');
  assert.equal(card.lapses || 0, 0);
  assert.equal(card.ease, ease);
  assert.equal(card.toneSlips, 1);
  assert.equal(card.due, now + TONE_SLIP_MS);
  assert.equal(dueCards([card], now).length, 0);
  assert.equal(dueCards([card], now + TONE_SLIP_MS).length, 1);
});

test('suspendCard sets suspended flag', () => {
  const card = { id: 'x', word: '你好', phase: 'review', suspended: false };
  const suspended = suspendCard(card);
  assert.equal(suspended.suspended, true);
});

test('unsuspendCard removes suspended flag', () => {
  const card = { id: 'y', word: '你好', phase: 'review', suspended: true };
  const unsuspended = unsuspendCard(card);
  assert.equal(unsuspended.suspended, false);
});

test('suspended cards are not due', () => {
  const now = Date.now();
  const card = { id: 'z', phase: 'review', due: now - 1000, suspended: true };
  assert.equal(isDue(card, now), false);
});

test('suspended cards are not in unseenCards', () => {
  const cards = [
    { id: 'a', word: '你好', phase: 'new', suspended: false },
    { id: 'b', word: '再见', phase: 'new', suspended: true },
  ];
  const unseen = unseenCards(cards);
  assert.equal(unseen.length, 1);
  assert.equal(unseen[0].id, 'a');
});

test('suspended cards are absent from dueCards', () => {
  const now = Date.now();
  const cards = [
    { id: 'c', phase: 'review', due: now - 1000, suspended: false },
    { id: 'd', phase: 'review', due: now - 1000, suspended: true },
  ];
  const due = dueCards(cards, now);
  assert.equal(due.length, 1);
  assert.equal(due[0].id, 'c');
});
