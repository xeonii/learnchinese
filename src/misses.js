import { onCorrect, onFail, onToneSlip, startLearning } from './srs.js';

export function nextMissItem(cards, misses) {
  if (!misses?.length) return null;
  
  const first = misses[0];
  const card = cards.find((c) => c.id === first.id);
  if (!card) {
    return null;
  }

  return promptForMiss(card);
}

export function promptForMiss(card) {
  if (card.phase === 'new') {
    return null;
  }
  
  const isLearning = card.phase === 'learning' || card.phase === 'relearning';
  return { type: isLearning ? 'read' : 'listen-type', card };
}

export function practiceOnCorrect(card, missReason, now = Date.now()) {
  const isDueOrLearning = ['learning', 'relearning', 'review'].includes(card.phase) 
    && card.due <= now;
  
  if (isDueOrLearning) {
    return { updated: onCorrect(card, now), shouldRemove: true };
  }
  
  if (missReason === 'unknown-intro') {
    const learning = startLearning(card, now);
    const graduated = onCorrect(learning, now);
    return { updated: graduated, shouldRemove: true };
  }
  
  return { updated: card, shouldRemove: true };
}

export function practiceOnFail(card) {
  return { updated: card, shouldRemove: false };
}

export function practiceOnToneSlip(card) {
  return { updated: card, shouldRemove: false };
}

export function rotateMisses(misses, currentId) {
  const without = misses.filter((m) => m.id !== currentId);
  const current = misses.find((m) => m.id === currentId);
  if (!current) return without;
  return [...without, current];
}
