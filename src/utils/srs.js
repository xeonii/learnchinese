const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;

export function calculateNextReview(card, quality) {
  const ease = card.ease || INITIAL_EASE;
  const interval = card.interval || 0;
  const repetitions = card.repetitions || 0;

  let newEase = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEase < MIN_EASE) newEase = MIN_EASE;

  let newInterval;
  let newRepetitions;

  if (quality < 3) {
    newInterval = 1;
    newRepetitions = 0;
  } else {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEase);
    }
    newRepetitions = repetitions + 1;
  }

  const now = Date.now();
  const nextReview = now + newInterval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    ease: newEase,
    interval: newInterval,
    repetitions: newRepetitions,
    lastReview: now,
    nextReview: nextReview,
  };
}

export function getDueCards(cards) {
  const now = Date.now();
  return cards.filter(card => !card.nextReview || card.nextReview <= now);
}

export function getNewCardsForToday(cards, dailyNewLimit) {
  const today = new Date().toDateString();
  const newCardsToday = cards.filter(
    card => card.status === 'new' && card.introducedDate === today
  ).length;
  
  const remainingNew = dailyNewLimit - newCardsToday;
  if (remainingNew <= 0) return [];

  return cards
    .filter(card => card.status === 'new' && !card.introducedDate)
    .slice(0, remainingNew);
}

export function shouldShowCard(card) {
  if (!card.nextReview) return true;
  return card.nextReview <= Date.now();
}
