// Two-minute placement: sample words from rising frequency bands. A band you
// mostly know is credited whole; the test stops once bands get hard.
import { knownChars, markKnown, queueWord, stampChars } from './profile.js';

export const BANDS = [
  [0, 100], [100, 250], [250, 450], [450, 700], [700, 1000],
  [1000, 1400], [1400, 2000], [2000, 2800], [2800, 4000], [4000, 6000],
];
export const PER_BAND = 6;
const PASS = 5; // ≥5 of 6 known → credit the band
const FAIL = 2; // ≤2 of 6 known → stop

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function sampleBand(deck, band, seed = Date.now()) {
  const [lo, hi] = BANDS[band];
  const slice = deck.slice(lo, Math.min(hi, deck.length));
  const rand = rng(seed + band * 7919);
  const pool = [...slice];
  const out = [];
  while (out.length < PER_BAND && pool.length) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

/** After a band: 'next' to continue or 'done'. */
export function bandVerdict(answers, history) {
  const knownN = answers.filter((a) => a.known).length;
  if (knownN <= FAIL) return 'done';
  // Two middling bands in a row: close enough.
  const prev = history.at(-1);
  if (prev && prev.known < PASS && knownN < PASS) return 'done';
  return 'next';
}

/**
 * Apply placement to a profile. history: [{ band, known, answers: [{entry, known}] }]
 * Words you said you know → known. Passed bands → every word credited known.
 * Words you missed in the easier bands are saved as the first things to learn.
 */
export function applyPlacement(profile, deck, history, now = Date.now()) {
  let p = profile;
  for (const h of history) {
    if (h.known >= PASS) {
      const [lo, hi] = BANDS[h.band];
      for (const e of deck.slice(lo, hi)) {
        if (!h.answers.some((a) => a.entry.w === e.w && !a.known)) p = markKnown(p, e, 'placement', now);
      }
    }
    for (const a of h.answers) {
      if (a.known) p = markKnown(p, a.entry, 'placement', now);
      else if (h.band <= 4) p = queueWord(p, a.entry, 'placement', now);
    }
  }
  // The baseline is what you could read before practicing here.
  return stampChars({ ...p, placed: true, baseline: [...knownChars(p)] }, now);
}
