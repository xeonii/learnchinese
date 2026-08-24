/** A 字 counts as known after correct reads in this many different words. */
export const KNOWN_CHAR_WORDS = 2;

export function hanziOf(word) {
  return [...String(word || '')].filter((ch) => /[\u4e00-\u9fff]/.test(ch));
}

function countsAsRead(card) {
  if (!card || card.phase === 'new' || card.phase === 'skipped') return false;
  return (card.reps || 0) > 0 || !!card.knownAtIntro;
}

/**
 * Derive per-character knowledge from word-card history.
 * Known if the 字 was read correctly in N different words, or in one
 * graduated (review) word — so single-word 字 can still count.
 */
export function characterCoverage(words, charList) {
  const hits = new Map();
  const graduated = new Map();

  for (const card of words) {
    if (!countsAsRead(card)) continue;
    const id = card.id || card.word;
    for (const ch of hanziOf(card.word)) {
      if (!hits.has(ch)) hits.set(ch, new Set());
      hits.get(ch).add(id);
      if (card.phase === 'review') {
        if (!graduated.has(ch)) graduated.set(ch, new Set());
        graduated.get(ch).add(id);
      }
    }
  }

  let known = 0;
  const perChar = {};
  for (const ch of charList) {
    const n = hits.get(ch)?.size || 0;
    const g = graduated.get(ch)?.size || 0;
    const isKnown = n >= KNOWN_CHAR_WORDS || (n >= 1 && g >= 1);
    perChar[ch] = { words: n, known: isKnown };
    if (isKnown) known += 1;
  }

  return {
    known,
    total: charList.length,
    perChar,
  };
}
