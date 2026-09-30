import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AGAIN, DAY_MS, GOOD, firstReview, intervalDays, retrievability, review } from '../src/lib/fsrs.js';

test('interval equals stability at 90% retention', () => {
  assert.equal(intervalDays(10), 10);
  assert.equal(Math.round(retrievability(10, 10) * 100), 90);
});

test('a new word you knew comes back in a few days; one you missed, in minutes', () => {
  const now = 0;
  const good = firstReview(GOOD, now);
  assert.equal(good.due, 3 * DAY_MS);
  const again = firstReview(AGAIN, now);
  assert.ok(again.due < DAY_MS);
  assert.equal(again.lapses, 1);
});

test('knowing it again grows the interval; missing it shrinks stability', () => {
  let card = firstReview(GOOD, 0);
  const s1 = card.S;
  card = review(card, GOOD, card.due);
  assert.ok(card.S > s1 * 2);
  const lapsed = review(card, AGAIN, card.due);
  assert.ok(lapsed.S < card.S);
  assert.ok(lapsed.D > card.D);
});
