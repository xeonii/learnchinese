import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GOOD } from '../src/lib/fsrs.js';
import {
  charStatus, dayKey, emptyProfile, gradeWord, importJson, knownChars, learnWord, markKnown,
  migrateV3, queueWord, stampChars, streak, textCoverage,
} from '../src/lib/profile.js';
import { deck } from './helpers.js';

const DAY = 24 * 60 * 60 * 1000;
const NOON = new Date(2026, 8, 30, 12).getTime();

test('day rolls over at 4 a.m.', () => {
  assert.equal(dayKey(new Date(2026, 8, 30, 3).getTime()), '2026-09-29');
  assert.equal(dayKey(new Date(2026, 8, 30, 5).getTime()), '2026-09-30');
});

test('known words make their characters known and stamped', () => {
  let p = markKnown(emptyProfile(NOON), { w: '我们', p: 'wǒmen', g: 'we' }, 'placement', NOON);
  p = stampChars(p, NOON);
  assert.deepEqual([...knownChars(p)].sort(), ['们', '我'].sort());
  assert.equal(p.chars['我'], '2026-09-30');
  // stamps keep the first date
  assert.equal(stampChars(p, NOON + 5 * DAY).chars['我'], '2026-09-30');
});

test('a freshly learned word is "learning", not known', () => {
  const p = learnWord(emptyProfile(NOON), { w: '猫', p: 'māo', g: 'cat' }, GOOD, NOON);
  const st = charStatus(p).get('猫');
  assert.equal(st.known, false);
  assert.ok(st.strength > 0);
  assert.equal(p.log['2026-09-30'].learned, 1);
});

test('tapping a known word brings it back for review today', () => {
  let p = markKnown(emptyProfile(NOON), { w: '猫', p: 'māo', g: 'cat' }, 'placement', NOON);
  p = queueWord(p, { w: '猫' }, 'story', NOON);
  assert.equal(p.words['猫'].s, 'active');
  assert.equal(p.words['猫'].card.due, NOON);
});

test('streak counts consecutive days and survives an unfinished today', () => {
  let p = emptyProfile(NOON);
  p = learnWord(p, { w: '猫' }, GOOD, NOON - 2 * DAY);
  p = gradeWord(p, '猫', GOOD, NOON - DAY);
  assert.equal(streak(p, NOON), 2);
  p = gradeWord(p, '猫', GOOD, NOON);
  assert.equal(streak(p, NOON), 3);
  assert.equal(streak(p, NOON + 3 * DAY), 0);
});

test('coverage is frequency weighted', () => {
  const none = textCoverage(deck, new Set());
  assert.equal(none.share, 0);
  const top = textCoverage(deck, new Set(['的', '了', '我', '是', '你']));
  assert.ok(top.share > 0.1, `share ${top.share}`);
});

test('backup round-trips, and old-version progress migrates', () => {
  const p = markKnown(emptyProfile(NOON), { w: '猫' }, 'x', NOON);
  assert.deepEqual(importJson(JSON.stringify(p)).words, p.words);
  const old = {
    words: [
      { word: '你好', pinyin: 'nǐhǎo', meaning: 'hello', phase: 'review', intervalDays: 12, due: NOON, reps: 3 },
      { word: '我们', pinyin: 'wǒmen', meaning: 'we', phase: 'review', knownAtIntro: true },
      { word: '的', pinyin: 'de', phase: 'new', source: 'seed' },
    ],
  };
  const m = migrateV3(old, NOON);
  assert.equal(m.words['你好'].card.S, 12);
  assert.equal(m.words['我们'].s, 'known');
  assert.equal(m.words['的'], undefined);
});
