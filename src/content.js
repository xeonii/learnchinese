import deckRows from './data/deck.json';
import storyData from './data/stories.json';

/** Frequency-ranked words: { w, p, g, rank }. */
export const DECK = deckRows.map(([w, p, g], rank) => ({ w, p, g, rank }));
export const DECK_INDEX = new Map(DECK.map((e) => [e.w, e]));
export const STORIES = storyData;

export const LEVELS = { 1: 'First steps', 2: 'Everyday', 3: 'Stories', 4: 'Longer reads' };

/** Best-known info for a word: the learner's saved copy, then the deck. */
export function lookupWord(profile, w) {
  return profile?.words[w] || DECK_INDEX.get(w) || null;
}
