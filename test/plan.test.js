import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GOOD } from '../src/lib/fsrs.js';
import { buildSession, dueWords, pickNewWords, pickStory, requeue } from '../src/lib/plan.js';
import { emptyProfile, hanzi, knownChars, learnWord, markKnown, queueWord } from '../src/lib/profile.js';
import { deck, stories } from './helpers.js';

const NOON = new Date(2026, 8, 30, 12).getTime();
const DAY = 24 * 60 * 60 * 1000;

function knowTop(n) {
  let p = emptyProfile(NOON);
  for (const e of deck.slice(0, n)) p = markKnown(p, e, 'placement', NOON);
  return p;
}

test('new words are one new character away and never share a new 字', () => {
  const p = knowTop(300);
  const known = knownChars(p);
  const picks = pickNewWords(p, deck, 8, known);
  assert.equal(picks.length, 8);
  const seen = new Set();
  for (const e of picks) {
    const unknown = hanzi(e.w).filter((ch) => !known.has(ch));
    assert.equal(unknown.length, 1, e.w);
    assert.ok(!seen.has(unknown[0]));
    seen.add(unknown[0]);
  }
});

test('saved words are learned before deck words', () => {
  const p = queueWord(knowTop(100), { w: '豆豆', p: 'dòudòu', g: 'name' }, 'story', NOON);
  assert.equal(pickNewWords(p, deck, 3)[0].w, '豆豆');
});

test('session: reviews that are due today, then new words woven in', () => {
  let p = knowTop(100);
  p = learnWord(p, { w: '猫' }, GOOD, NOON - 5 * DAY);
  const q = buildSession(p, deck, NOON);
  assert.equal(dueWords(p, NOON).length, 1);
  assert.equal(q[0].kind, 'review');
  assert.equal(q.filter((i) => i.kind === 'meet').length, 5);
});

test('story pick: easiest unread one you can mostly read, stable for the day', () => {
  const p = knowTop(1500);
  const s = pickStory(p, stories, NOON);
  assert.equal(s.level, 1);
  const pinned = { ...p, log: { '2026-09-30': { story: 'letter' } } };
  assert.equal(pickStory(pinned, stories, NOON).id, 'letter');
});

test('requeue puts an item a few cards later', () => {
  assert.deepEqual(requeue([1, 2, 3, 4, 5], 'x', 3), [1, 2, 3, 'x', 4, 5]);
  assert.deepEqual(requeue([1], 'x', 3), [1, 'x']);
});

test('pinning today’s story keeps it chosen', async () => {
  const { pinStory } = await import('../src/lib/profile.js');
  const p = pinStory(knowTop(300), 'old-street', NOON);
  assert.equal(pickStory(p, stories, NOON).id, 'old-street');
  assert.notEqual(pickStory(p, stories, NOON + DAY).id, 'old-street');
});
