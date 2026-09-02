import {
  DAILY_NEW_LIMIT,
  MAX_INTROS_PER_SESSION,
  dueCards,
  learnedNewCount,
  unseenCards,
} from './srs.js';
import { syllableKey } from './pinyin.js';
import { mixupPartners, sortByProfile } from './learnerProfile.js';

export const LOOKALIKES = [
  ['人', '入', '八'],
  ['日', '曰', '目'],
  ['土', '士'],
  ['天', '夭'],
  ['未', '末'],
  ['他', '她'],
  ['的', '地'],
  ['己', '已'],
  ['午', '牛'],
  ['贝', '见'],
  ['干', '千'],
  ['大', '太'],
  ['木', '本'],
  ['白', '自'],
  ['住', '往'],
  ['清', '青', '请'],
  ['问', '间'],
  ['刀', '力'],
  ['田', '由', '甲'],
  ['口', '日'],
  ['手', '毛'],
  ['王', '玉'],
  ['买', '卖'],
  ['冷', '冷'],
  ['左', '右'],
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function estimateMinutes(cards, now = Date.now()) {
  const due = dueCards(cards, now).length;
  const remainingNew = Math.max(0, DAILY_NEW_LIMIT - learnedNewCount(cards, now));
  const unseen = unseenCards(cards).length;
  const intros = Math.min(unseen, Math.max(remainingNew, Math.min(12, unseen)));
  const seconds = due * 12 + intros * 16;
  return Math.max(5, Math.min(15, Math.round(seconds / 60) || 8));
}

export function nextItem(cards, ctx, now = Date.now()) {
  const dueNow = dueCards(cards, now);
  if (dueNow.length) {
    return promptFor(dueNow[0], ctx);
  }

  const unseen = sortByProfile(unseenCards(cards), ctx.profile);
  const canIntro = ctx.intros < MAX_INTROS_PER_SESSION && unseen.length > 0;
  if (canIntro) {
    return {
      type: 'intro',
      card: unseen[0],
      canLearn: ctx.learnedNew < DAILY_NEW_LIMIT,
    };
  }

  const soon = dueCards(cards, now + 3 * 60 * 1000);
  if (soon.length) {
    return promptFor(soon[0], ctx);
  }

  return null;
}

/**
 * Exercise ladder:
 *   learning step 0 / relearning → listen multiple-choice (if audio)
 *   learning later steps → see the word, type pinyin
 *   review → audio only, type pinyin (MC retired)
 */
export function promptFor(card, ctx) {
  const step = card.step ?? 0;
  const listenOk = !!ctx.hasVoice;

  if (card.phase === 'learning' && step === 0) {
    return { type: listenOk ? 'listen' : 'read', card };
  }
  if (card.phase === 'relearning') {
    return { type: listenOk ? 'listen' : 'read', card };
  }
  if (card.phase === 'review') {
    return { type: listenOk ? 'listen-type' : 'read', card };
  }
  return { type: 'read', card };
}

export function choicesFor(card, allCards, n = 4, profile = null) {
  const others = allCards.filter((c) => c.id !== card.id && c.word !== card.word);
  const picked = [];
  const add = (candidate) => {
    if (!candidate || candidate.word === card.word) return;
    if (picked.some((c) => c.word === candidate.word)) return;
    if (picked.length >= n - 1) return;
    picked.push(candidate);
  };

  // Teacher mixups: prefer the partner 字 as a distractor (e.g. 是 ↔ 在).
  const partners = mixupPartners(card.word, profile);
  for (const partner of partners) {
    others.filter((c) => c.word.includes(partner)).forEach(add);
  }

  const key = syllableKey(card.pinyin);
  others.filter((c) => syllableKey(c.pinyin) === key).forEach(add);

  for (const ch of card.word || '') {
    const group = LOOKALIKES.find((g) => g.includes(ch)) || [];
    group.forEach((look) => {
      others.filter((c) => c.word.includes(look)).forEach(add);
    });
  }

  shuffle(others).forEach(add);

  return shuffle([card, ...picked]).slice(0, Math.min(n, picked.length + 1));
}

export function replaceCard(cards, updated) {
  return cards.map((card) => (card.id === updated.id ? updated : card));
}

export function sessionCounts(cards, now = Date.now()) {
  return {
    due: dueCards(cards, now).length,
    newLeft: Math.max(0, DAILY_NEW_LIMIT - learnedNewCount(cards, now)),
    unseen: unseenCards(cards).length,
    known: cards.filter((c) => c.phase === 'review' || c.phase === 'learning' || c.phase === 'relearning').length,
    skipped: cards.filter((c) => c.phase === 'skipped').length,
    total: cards.length,
  };
}

export function phaseLabel(phase) {
  if (phase === 'learning' || phase === 'relearning') return 'learning';
  if (phase === 'review') return 'review';
  if (phase === 'skipped') return 'skipped';
  return 'new';
}
