import { pinyinMatches, toCanonical, gradePinyin, toMarked, syllableKey } from '../src/pinyin.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('numbered pinyin matches marked target', () => {
  assert.equal(pinyinMatches('ni3', 'nǐ'), true);
  assert.equal(pinyinMatches('hao3', 'hǎo'), true);
  assert.equal(pinyinMatches('yi1', 'yī'), true);
  assert.equal(pinyinMatches('wo3', 'wǒ'), true);
  assert.equal(pinyinMatches('ta1', 'tā'), true);
  assert.equal(pinyinMatches('nv3', 'nǚ'), true);
  assert.equal(pinyinMatches('lv4', 'lǜ'), true);
  assert.equal(pinyinMatches('xue2', 'xué'), true);
});

test('marked pinyin matches', () => {
  assert.equal(pinyinMatches('nǐ', 'nǐ'), true);
  assert.equal(pinyinMatches('Nǐ', 'nǐ'), true);
  assert.equal(pinyinMatches('nǐhǎo', 'nǐhǎo'), true);
  assert.equal(pinyinMatches('nǐ hǎo', 'nǐhǎo'), true);
  assert.equal(pinyinMatches('ni3hao3', 'nǐhǎo'), true);
});

test('toneless input is rejected', () => {
  assert.equal(pinyinMatches('ni', 'nǐ'), false);
  assert.equal(pinyinMatches('yi', 'yī'), false);
  assert.equal(pinyinMatches('hao', 'hǎo'), false);
  assert.equal(gradePinyin('nihao', 'nǐhǎo').result, 'wrong');
});

test('neutral tone particles', () => {
  assert.equal(pinyinMatches('de', 'de'), true);
  assert.equal(pinyinMatches('le', 'le'), true);
  assert.equal(pinyinMatches('men', 'men'), true);
});

test('canonical form', () => {
  assert.equal(toCanonical('nǐ'), 'ni3');
  assert.equal(toCanonical('nǚ'), 'nv3');
  assert.equal(toCanonical('Zhōngguó'), 'zhong1guo2');
});

test('tone slip is distinct from a wrong syllable', () => {
  const slip = gradePinyin('ni2', 'nǐ');
  assert.equal(slip.result, 'tone-slip');
  assert.equal(slip.slips[0].pair, '3→2');

  const wordSlip = gradePinyin('ni2hao3', 'nǐhǎo');
  assert.equal(wordSlip.result, 'tone-slip');
  assert.deepEqual(wordSlip.slips.map((s) => s.pair), ['3→2']);

  const wrong = gradePinyin('wo3', 'nǐ');
  assert.equal(wrong.result, 'wrong');
});

test('partial tones are not a tone slip', () => {
  assert.equal(gradePinyin('ni3hao', 'nǐhǎo').result, 'wrong');
});

test('toMarked round-trips numbered pinyin', () => {
  assert.equal(toMarked('ni3hao3'), 'nǐhǎo');
  assert.equal(toMarked('nv3'), 'nǚ');
  assert.equal(toMarked('zhong1guo2'), 'zhōngguó');
});

test('syllableKey strips tones', () => {
  assert.equal(syllableKey('nǐhǎo'), syllableKey('ni2hao1'));
});
