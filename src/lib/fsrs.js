// FSRS-5 scheduler (https://github.com/open-spaced-repetition/fsrs4anki/wiki),
// reduced to two grades: 1 = didn't know, 3 = knew it.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const AGAIN = 1;
export const GOOD = 3;
export const RETENTION = 0.9;

const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const MAX_DAYS = 365 * 3;

const clampD = (d) => Math.min(10, Math.max(1, d));

export function retrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return (1 + FACTOR * (elapsedDays / stability)) ** DECAY;
}

export function intervalDays(stability, retention = RETENTION) {
  const days = (stability / FACTOR) * (retention ** (1 / DECAY) - 1);
  return Math.min(MAX_DAYS, Math.max(1, Math.round(days)));
}

const initD = (g) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);

function nextD(d, g) {
  const delta = -W[6] * (g - 3);
  const damped = d + (delta * (10 - d)) / 9;
  return clampD(W[7] * initD(4) + (1 - W[7]) * damped);
}

function recallS(d, s, r) {
  return s * (Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1) + 1);
}

function forgetS(d, s, r) {
  const next = W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(next, s);
}

/** A new card after its first grade. */
export function firstReview(grade, now = Date.now()) {
  const s = W[grade - 1];
  const card = { S: s, D: initD(grade), reps: 1, lapses: grade === AGAIN ? 1 : 0, last: now };
  return { ...card, due: grade === AGAIN ? now + 10 * 60 * 1000 : now + intervalDays(s) * DAY_MS };
}

/** Schedule an existing card. Same-day repeats use FSRS-5's short-term rule. */
export function review(card, grade, now = Date.now()) {
  if (!card || !card.S) return firstReview(grade, now);
  const elapsed = Math.max(0, (now - (card.last ?? now)) / DAY_MS);
  let S;
  if (elapsed < 1) {
    S = card.S * Math.exp(W[17] * (grade - 3 + W[18]));
  } else {
    const r = retrievability(elapsed, card.S);
    S = grade === AGAIN ? forgetS(card.D, card.S, r) : recallS(card.D, card.S, r);
  }
  S = Math.max(0.1, S);
  const due = grade === AGAIN ? now + 10 * 60 * 1000 : now + intervalDays(S) * DAY_MS;
  return {
    S,
    D: nextD(card.D, grade),
    reps: (card.reps || 0) + 1,
    lapses: (card.lapses || 0) + (grade === AGAIN ? 1 : 0),
    last: now,
    due,
  };
}

/** A card for a word the learner says they already know. */
export function knownCard(now = Date.now(), days = 30) {
  return { S: days, D: 3, reps: 1, lapses: 0, last: now, due: now + intervalDays(days) * DAY_MS };
}
