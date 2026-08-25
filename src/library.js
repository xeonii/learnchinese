import { todayKey } from './srs.js';

export function filterLibrary(cards, filter, searchQuery, now = Date.now()) {
  let filtered = cards;

  if (filter === 'Due') {
    filtered = cards.filter((c) => 
      ['learning', 'relearning', 'review'].includes(c.phase) && c.due <= now
    );
  } else if (filter === 'Learning') {
    filtered = cards.filter((c) => c.phase === 'learning' || c.phase === 'relearning');
  } else if (filter === 'Missed today') {
    const today = todayKey(now);
    filtered = cards.filter((c) => c.lastMissedAt === today);
  } else if (filter === 'Added') {
    filtered = cards.filter((c) => c.source === 'dict');
  } else if (filter === 'Seed') {
    filtered = cards.filter((c) => c.source === 'seed');
  } else if (filter === 'Skipped') {
    filtered = cards.filter((c) => c.phase === 'skipped');
  } else if (filter === 'Suspended') {
    filtered = cards.filter((c) => c.suspended === true);
  }

  if (searchQuery?.trim()) {
    const q = searchQuery.trim();
    filtered = filtered.filter((w) =>
      w.word.includes(q) ||
      (w.pinyin || '').toLowerCase().includes(q.toLowerCase()) ||
      (w.meaning || '').toLowerCase().includes(q.toLowerCase())
    );
  }

  return filtered.sort((a, b) => a.word.localeCompare(b.word, 'zh'));
}

export function dueLabel(card, now = Date.now()) {
  if (card.suspended) return 'suspended';
  if (card.phase === 'new') return 'new';
  if (card.phase === 'skipped') return 'skipped';
  if (!card.due) return '';
  
  if (card.due <= now) return 'due';
  
  const daysUntil = Math.ceil((card.due - now) / (24 * 60 * 60 * 1000));
  if (daysUntil === 1) return 'due tomorrow';
  if (daysUntil < 7) return `due in ${daysUntil}d`;
  return `due ${new Date(card.due).toLocaleDateString()}`;
}
