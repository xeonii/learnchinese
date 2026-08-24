import { hanziOf } from './coverage.js';

export function seedWordsFromCharacters(characters) {
  const byWord = new Map();
  characters.forEach((entry, index) => {
    const word = entry.word;
    if (!word) return;
    if (!byWord.has(word)) {
      byWord.set(word, {
        word,
        pinyin: entry.wordPinyin || entry.pinyin,
        meaning: entry.meaning,
        chars: hanziOf(word),
        tier: entry.tier || 1,
        sortIndex: index,
        source: 'seed',
      });
      return;
    }
    const existing = byWord.get(word);
    existing.tier = Math.min(existing.tier, entry.tier || 1);
  });
  return [...byWord.values()];
}

export function coverageChars(characters) {
  return characters.map((entry) => entry.char);
}
