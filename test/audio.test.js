import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chineseAudioUrl, isChineseText } from '../src/audio.js';

test('audio URLs encode 汉字, never pinyin', () => {
  const url = chineseAudioUrl('你好');
  assert.match(url, /dictvoice/);
  assert.ok(url.includes(encodeURIComponent('你好')));
  assert.equal(url.includes('ni'), false);
  assert.equal(url.includes('nǐ'), false);
});

test('refuses latin/pinyin as speech text', () => {
  assert.equal(isChineseText('你好'), true);
  assert.equal(isChineseText('你'), true);
  assert.equal(isChineseText('nǐ'), false);
  assert.equal(isChineseText('ni3'), false);
  assert.equal(isChineseText('yi1'), false);
});
