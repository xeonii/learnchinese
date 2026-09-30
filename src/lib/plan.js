// What to practice today: due reviews, a few new words, one story.
import { dayKey, hanzi, isReadable, knownChars, nextDayStart } from './profile.js';

export const MAX_REVIEWS = 80;

export function dueWords(profile, now = Date.now()) {
  const cutoff = nextDayStart(now);
  return Object.values(profile.words)
    .filter((r) => r.s === 'active' && r.card && r.card.due < cutoff)
    .sort((a, b) => a.card.due - b.card.due)
    .slice(0, MAX_REVIEWS);
}

export function learnedToday(profile, now = Date.now()) {
  return profile.log[dayKey(now)]?.learned || 0;
}

/**
 * New words for today. Saved words come first; then frequent deck words that
 * are exactly one new character away, so each new 字 arrives inside a word
 * whose other characters you can already read.
 */
export function pickNewWords(profile, deck, n, known = knownChars(profile)) {
  if (n <= 0) return [];
  const picked = Object.values(profile.words)
    .filter((r) => r.s === 'queued')
    .sort((a, b) => a.added - b.added)
    .slice(0, n);
  const introduced = new Set();
  for (const r of picked) for (const ch of hanzi(r.w)) if (!known.has(ch)) introduced.add(ch);

  const candidates = [];
  for (let i = 0; i < deck.length && candidates.length < 400; i += 1) {
    const e = deck[i];
    if (profile.words[e.w]) continue;
    const unknown = new Set(hanzi(e.w).filter((ch) => !known.has(ch)));
    if (unknown.size === 0) continue; // already readable
    candidates.push({ e, unknown, score: i + 500 * (unknown.size - 1) });
  }
  candidates.sort((a, b) => a.score - b.score);
  for (const c of candidates) {
    if (picked.length >= n) break;
    // One new 字 per word per day keeps look-alikes from piling up.
    if ([...c.unknown].some((ch) => introduced.has(ch))) continue;
    for (const ch of c.unknown) introduced.add(ch);
    picked.push({ ...c.e, s: 'new', src: 'deck' });
  }
  return picked;
}

export function storyReadability(story, known) {
  let total = 0;
  let readable = 0;
  const unknown = new Set();
  for (const s of story.sentences) {
    for (const [t, p] of s.tokens) {
      if (p === undefined) continue;
      total += 1;
      if (isReadable(t, known)) readable += 1;
      else unknown.add(t);
    }
  }
  return { share: total ? readable / total : 0, unknown: [...unknown] };
}

/**
 * Today's story: the easiest unread story you can mostly read (≥ 80% of
 * words). If none clears the bar, the unread one you can read best.
 * The pick is remembered for the day so it doesn't shift under you.
 */
export function pickStory(profile, stories, now = Date.now(), known = knownChars(profile)) {
  const pinned = profile.log[dayKey(now)]?.story;
  if (pinned) {
    const s = stories.find((x) => x.id === pinned);
    if (s) return s;
  }
  const scored = stories.map((s) => ({ s, ...storyReadability(s, known), read: profile.read[s.id] }));
  const unread = scored.filter((x) => !x.read);
  const pool = unread.length ? unread : scored.sort((a, b) => String(a.read).localeCompare(String(b.read)));
  const easyEnough = pool.filter((x) => x.share >= 0.8).sort((a, b) => a.s.level - b.s.level || b.share - a.share);
  if (easyEnough.length) return easyEnough[0].s;
  return [...pool].sort((a, b) => b.share - a.share)[0]?.s || null;
}

/**
 * The session queue. Reviews first (warm-up), new words woven in after the
 * first few. Each new word is met, then quizzed a few cards later.
 */
export function buildSession(profile, deck, now = Date.now(), extraNew = 0) {
  const known = knownChars(profile);
  const due = dueWords(profile, now);
  const newCount = Math.max(0, (profile.settings?.newPerDay ?? 5) - learnedToday(profile, now)) + extraNew;
  const fresh = pickNewWords(profile, deck, newCount, known);

  const queue = due.map((r) => ({ kind: 'review', w: r.w }));
  let at = Math.min(queue.length, 6);
  for (const entry of fresh) {
    queue.splice(at, 0, { kind: 'meet', w: entry.w, entry });
    at = Math.min(queue.length, at + 3);
  }
  return queue;
}

/** Put an item back a few cards later (or at the end). */
export function requeue(queue, item, gap = 3) {
  const next = [...queue];
  next.splice(Math.min(next.length, gap), 0, item);
  return next;
}
