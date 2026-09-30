import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyPlacement, bandVerdict, sampleBand, PER_BAND } from '../src/lib/placement.js';
import { emptyProfile } from '../src/lib/profile.js';
import { deck } from './helpers.js';

test('samples distinct words from a band', () => {
  const s = sampleBand(deck, 0, 42);
  assert.equal(s.length, PER_BAND);
  assert.equal(new Set(s.map((e) => e.w)).size, PER_BAND);
});

test('stops when a band is mostly unknown', () => {
  const ans = (k) => Array.from({ length: 6 }, (_, i) => ({ known: i < k }));
  assert.equal(bandVerdict(ans(6), []), 'next');
  assert.equal(bandVerdict(ans(2), []), 'done');
  assert.equal(bandVerdict(ans(4), [{ known: 4 }]), 'done');
});

test('a passed band is credited whole; misses are saved to learn', () => {
  const words = sampleBand(deck, 0, 1);
  const answers = words.map((entry, i) => ({ entry, known: i > 0 }));
  const p = applyPlacement(emptyProfile(), deck, [{ band: 0, known: 5, answers }]);
  assert.equal(p.placed, true);
  assert.equal(p.words[words[0].w].s, 'queued');
  assert.equal(Object.values(p.words).filter((r) => r.s === 'known').length, 99);
});
