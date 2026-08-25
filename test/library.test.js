import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterLibrary, dueLabel } from '../src/library.js';
import { todayKey } from '../src/srs.js';

describe('library', () => {
  const now = Date.now();
  const today = todayKey(now);

  it('filterLibrary All returns all cards', () => {
    const cards = [
      { id: 'a', word: '你好', phase: 'new' },
      { id: 'b', word: '再见', phase: 'review', due: now - 1000 },
    ];
    const filtered = filterLibrary(cards, 'All', '', now);
    assert.equal(filtered.length, 2);
  });

  it('filterLibrary Due returns only due cards', () => {
    const cards = [
      { id: 'a', word: '你好', phase: 'review', due: now - 1000 },
      { id: 'b', word: '再见', phase: 'review', due: now + 10000 },
      { id: 'c', word: '谢谢', phase: 'new' },
    ];
    const filtered = filterLibrary(cards, 'Due', '', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'a');
  });

  it('filterLibrary Learning returns learning and relearning', () => {
    const cards = [
      { id: 'a', word: '你好', phase: 'learning', due: now },
      { id: 'b', word: '再见', phase: 'relearning', due: now },
      { id: 'c', word: '谢谢', phase: 'review', due: now },
    ];
    const filtered = filterLibrary(cards, 'Learning', '', now);
    assert.equal(filtered.length, 2);
  });

  it('filterLibrary Missed today returns cards with lastMissedAt today', () => {
    const cards = [
      { id: 'a', word: '你好', phase: 'review', lastMissedAt: today },
      { id: 'b', word: '再见', phase: 'review', lastMissedAt: todayKey(now - 86400000) },
      { id: 'c', word: '谢谢', phase: 'review' },
    ];
    const filtered = filterLibrary(cards, 'Missed today', '', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'a');
  });

  it('filterLibrary Added returns dict-sourced cards', () => {
    const cards = [
      { id: 'a', word: '你好', source: 'seed' },
      { id: 'b', word: '再见', source: 'dict' },
    ];
    const filtered = filterLibrary(cards, 'Added', '', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].source, 'dict');
  });

  it('filterLibrary Seed returns seed cards', () => {
    const cards = [
      { id: 'a', word: '你好', source: 'seed' },
      { id: 'b', word: '再见', source: 'dict' },
    ];
    const filtered = filterLibrary(cards, 'Seed', '', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].source, 'seed');
  });

  it('filterLibrary Skipped returns skipped cards', () => {
    const cards = [
      { id: 'a', word: '你好', phase: 'skipped' },
      { id: 'b', word: '再见', phase: 'review' },
    ];
    const filtered = filterLibrary(cards, 'Skipped', '', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].phase, 'skipped');
  });

  it('filterLibrary Suspended returns suspended cards', () => {
    const cards = [
      { id: 'a', word: '你好', suspended: true },
      { id: 'b', word: '再见', suspended: false },
      { id: 'c', word: '谢谢' },
    ];
    const filtered = filterLibrary(cards, 'Suspended', '', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'a');
  });

  it('filterLibrary with search query filters by text', () => {
    const cards = [
      { id: 'a', word: '你好', pinyin: 'ni3hao3', meaning: 'hello' },
      { id: 'b', word: '再见', pinyin: 'zai4jian4', meaning: 'goodbye' },
    ];
    const filtered = filterLibrary(cards, 'All', 'hello', now);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'a');
  });

  it('dueLabel returns correct labels', () => {
    assert.equal(dueLabel({ suspended: true }, now), 'suspended');
    assert.equal(dueLabel({ phase: 'new' }, now), 'new');
    assert.equal(dueLabel({ phase: 'skipped' }, now), 'skipped');
    assert.equal(dueLabel({ phase: 'review', due: now - 1000 }, now), 'due');
    assert.equal(dueLabel({ phase: 'review', due: now + 86400000 }, now), 'due tomorrow');
    assert.equal(dueLabel({ phase: 'review', due: now + 2 * 86400000 }, now), 'due in 2d');
  });
});
