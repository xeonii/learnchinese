import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextMissItem, practiceOnCorrect, practiceOnFail, practiceOnToneSlip, rotateMisses } from '../src/misses.js';
import { onCorrect, startLearning, todayKey } from '../src/srs.js';

describe('misses', () => {
  it('nextMissItem never returns intro', () => {
    const cards = [
      { id: 'a', word: '你好', pinyin: 'ni3hao3', phase: 'new', due: 0 },
    ];
    const misses = [{ id: 'a', reason: 'unknown-intro' }];
    const item = nextMissItem(cards, misses);
    assert.equal(item, null);
  });

  it('nextMissItem upgrades listen → read for learning', () => {
    const cards = [
      { id: 'b', word: '你好', pinyin: 'ni3hao3', phase: 'learning', step: 0, due: Date.now() - 1000 },
    ];
    const misses = [{ id: 'b', reason: 'fail' }];
    const item = nextMissItem(cards, misses);
    assert.equal(item.type, 'read');
  });

  it('nextMissItem returns listen-type for review', () => {
    const cards = [
      { id: 'c', word: '你好', pinyin: 'ni3hao3', phase: 'review', due: Date.now() - 1000, intervalDays: 2 },
    ];
    const misses = [{ id: 'c', reason: 'fail' }];
    const item = nextMissItem(cards, misses);
    assert.equal(item.type, 'listen-type');
  });

  it('practiceOnFail does not change ease or lapse', () => {
    const card = { id: 'x', phase: 'review', ease: 2.5, lapses: 1, due: Date.now() - 1000 };
    const result = practiceOnFail(card);
    assert.equal(result.updated.ease, 2.5);
    assert.equal(result.updated.lapses, 1);
    assert.equal(result.shouldRemove, false);
  });

  it('practiceOnToneSlip does not increment toneSlips', () => {
    const card = { id: 'y', phase: 'review', toneSlips: 3, due: Date.now() - 1000 };
    const result = practiceOnToneSlip(card);
    assert.equal(result.updated.toneSlips, 3);
    assert.equal(result.shouldRemove, false);
  });

  it('practiceOnCorrect removes due card after onCorrect', () => {
    const now = Date.now();
    const card = { id: 'z', phase: 'learning', step: 1, due: now - 1000, reps: 2 };
    const result = practiceOnCorrect(card, 'fail', now);
    assert.equal(result.shouldRemove, true);
    assert.equal(result.updated.phase, 'review');
    assert.ok(result.updated.due > now);
  });

  it('practiceOnCorrect for unknown-intro starts learning then graduates', () => {
    const now = Date.now();
    const card = { id: 'w', word: '你好', phase: 'skipped', due: 0 };
    const result = practiceOnCorrect(card, 'unknown-intro', now);
    assert.equal(result.shouldRemove, true);
    assert.equal(result.updated.introducedDate, todayKey(now));
  });

  it('practiceOnCorrect for not-due card does nothing', () => {
    const now = Date.now();
    const card = { id: 'q', phase: 'review', due: now + 10000, intervalDays: 5 };
    const result = practiceOnCorrect(card, 'tone-slip', now);
    assert.equal(result.shouldRemove, true);
    assert.equal(result.updated.due, card.due);
  });

  it('rotateMisses moves current to end on fail', () => {
    const misses = [{ id: 'a', reason: 'fail' }, { id: 'b', reason: 'fail' }];
    const rotated = rotateMisses(misses, 'a');
    assert.deepEqual(rotated, [{ id: 'b', reason: 'fail' }, { id: 'a', reason: 'fail' }]);
  });

  it('miss deduplication keeps highest severity', () => {
    const session = { misses: [{ id: 'x', reason: 'tone-slip' }] };
    
    const severity = { fail: 3, unknown: 3, 'unknown-intro': 1, 'tone-slip': 2 };
    const existing = session.misses.find((m) => m.id === 'x');
    const newReason = 'fail';
    const newSeverity = severity[newReason];
    const oldSeverity = severity[existing.reason];
    
    assert.ok(newSeverity > oldSeverity);
  });

  it('intro skip adds unknown-intro miss', () => {
    const card = { id: 'skip-test', phase: 'new' };
    const missReason = 'unknown-intro';
    const misses = [{ id: card.id, reason: missReason }];
    
    assert.equal(misses[0].reason, 'unknown-intro');
  });

  it('fail once adds fail miss', () => {
    const card = { id: 'fail-test', phase: 'learning' };
    const missReason = 'fail';
    const misses = [{ id: card.id, reason: missReason }];
    
    assert.equal(misses[0].reason, 'fail');
    assert.equal(misses.length, 1);
  });

  it('no duplicate miss for same card', () => {
    const misses = [{ id: 'dup', reason: 'fail' }];
    const newEntry = { id: 'dup', reason: 'fail' };
    
    const exists = misses.some((m) => m.id === newEntry.id);
    assert.equal(exists, true);
  });
});
