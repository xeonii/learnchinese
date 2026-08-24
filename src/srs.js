export const DAY_MS = 24 * 60 * 60 * 1000;
export const LEARN_STEPS_MS = [45 * 1000, 8 * 60 * 1000];
export const LAPSE_MS = 45 * 1000;
export const GRADUATE_DAYS = 1;
export const KNOWN_DAYS = 21;
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const DAILY_NEW_LIMIT = 10;
export const MAX_INTROS_PER_SESSION = 40;
export const SESSION_MINUTES = 12;

export function todayKey(now = Date.now()) {
  return new Date(now).toDateString();
}

export function startLearning(card, now = Date.now()) {
  return {
    ...card,
    phase: 'learning',
    step: 0,
    due: now,
    introducedDate: todayKey(now),
  };
}

export function markKnown(card, now = Date.now()) {
  return {
    ...card,
    phase: 'review',
    step: 0,
    intervalDays: KNOWN_DAYS,
    ease: INITIAL_EASE,
    due: now + KNOWN_DAYS * DAY_MS,
    introducedDate: card.introducedDate || todayKey(now),
    knownAtIntro: true,
  };
}

export function markSkipped(card) {
  return { ...card, phase: 'skipped' };
}

export function onCorrect(card, now = Date.now()) {
  const ease = card.ease || INITIAL_EASE;

  if (card.phase === 'learning' || card.phase === 'relearning') {
    const steps = card.phase === 'relearning' ? [LAPSE_MS] : LEARN_STEPS_MS;
    const step = card.step ?? 0;
    if (step + 1 >= steps.length) {
      const intervalDays = card.phase === 'relearning'
        ? Math.max(1, Math.round((card.intervalDays || 1) * 0.5))
        : GRADUATE_DAYS;
      return {
        ...card,
        phase: 'review',
        step: 0,
        intervalDays,
        ease,
        due: now + intervalDays * DAY_MS,
        reps: (card.reps || 0) + 1,
        lapses: card.lapses || 0,
      };
    }
    return {
      ...card,
      step: step + 1,
      due: now + steps[step],
      reps: (card.reps || 0) + 1,
    };
  }

  const intervalDays = !card.intervalDays ? 1 : Math.round(card.intervalDays * ease);
  return {
    ...card,
    phase: 'review',
    intervalDays,
    ease,
    due: now + intervalDays * DAY_MS,
    reps: (card.reps || 0) + 1,
  };
}

export function onFail(card, now = Date.now()) {
  return {
    ...card,
    phase: 'relearning',
    step: 0,
    ease: Math.max(MIN_EASE, (card.ease || INITIAL_EASE) - 0.2),
    due: now + LAPSE_MS,
    lapses: (card.lapses || 0) + 1,
  };
}

export function isDue(card, now = Date.now()) {
  return ['learning', 'relearning', 'review'].includes(card.phase) && card.due <= now;
}

export function dueCards(cards, now = Date.now()) {
  return cards
    .filter((card) => isDue(card, now))
    .sort((a, b) => {
      const rank = (c) => (c.phase === 'relearning' ? 0 : c.phase === 'learning' ? 1 : 2);
      const d = rank(a) - rank(b);
      return d !== 0 ? d : a.due - b.due;
    });
}

export function unseenCards(cards) {
  return cards
    .filter((card) => card.phase === 'new')
    .sort((a, b) => (a.tier - b.tier) || a.id - b.id);
}

export function learnedNewCount(cards, now = Date.now()) {
  const today = todayKey(now);
  return cards.filter((card) => (
    card.introducedDate === today
    && !card.knownAtIntro
    && card.phase !== 'skipped'
    && card.phase !== 'new'
  )).length;
}

export function updateStreak(prev, now = Date.now()) {
  const today = todayKey(now);
  if (prev.lastSessionDate === today) {
    return { streak: prev.streak || 1, lastSessionDate: today };
  }
  const yesterday = todayKey(now - DAY_MS);
  if (prev.lastSessionDate === yesterday) {
    return { streak: (prev.streak || 0) + 1, lastSessionDate: today };
  }
  return { streak: 1, lastSessionDate: today };
}
