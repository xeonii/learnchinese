import { readFileSync } from 'node:fs';

export const deck = JSON.parse(readFileSync(new URL('../src/data/deck.json', import.meta.url)))
  .map(([w, p, g]) => ({ w, p, g }));
export const stories = JSON.parse(readFileSync(new URL('../src/data/stories.json', import.meta.url)));
