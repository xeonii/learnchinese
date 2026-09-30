import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DECK, DECK_INDEX, lookupWord } from '../content.js';
import { unlockAudio } from '../lib/audio.js';
import { AGAIN, GOOD } from '../lib/fsrs.js';
import { buildSession, requeue } from '../lib/plan.js';
import { pinyinSyllables } from '../lib/pinyin.js';
import { gradeWord, hanzi, knownChars, learnWord, logMinutes, markKnown, markSessionDone } from '../lib/profile.js';
import { Icon, Pinyin, SoundButton, haptic } from './bits.jsx';

const SWIPE = 90;

/** Other words you know that share a character: the hook for a new 字. */
function anchors(profile, word) {
  const out = [];
  for (const ch of hanzi(word)) {
    const hits = Object.values(profile.words)
      .filter((r) => r.w !== word && r.w.includes(ch) && r.w.length > 1 && (r.s === 'known' || r.s === 'active'))
      .sort((a, b) => (DECK_INDEX.get(a.w)?.rank ?? 1e9) - (DECK_INDEX.get(b.w)?.rank ?? 1e9))
      .slice(0, 2)
      .map((r) => r.w);
    out.push({ ch, hits });
  }
  return out;
}

function CharBreakdown({ profile, entry, known }) {
  const list = anchors(profile, entry.w);
  const syl = pinyinSyllables(entry.p);
  return (
    <div className="breakdown">
      {list.map(({ ch, hits }, i) => {
        const isNew = !known.has(ch);
        return (
          <div key={i} className={`bd-row ${isNew ? 'is-new' : ''}`}>
            <span className="han bd-ch">{ch}</span>
            <span className="bd-py">{syl.length === list.length ? syl[i].text : ''}</span>
            <span className="bd-hint">
              {isNew ? <b>new character</b> : hits.length ? <>as in <span className="han">{hits.join('、')}</span></> : 'you know this one'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Session({ profile, update, onDone, onExit, extraNew = 0 }) {
  const [queue, setQueue] = useState(() => buildSession(profile, DECK, Date.now(), extraNew));
  const [total] = useState(() => queue.length);
  const [revealed, setRevealed] = useState(false);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const [stats, setStats] = useState({ reviewed: 0, knew: 0, learned: [], missed: new Set() });
  const [extra, setExtra] = useState(0);
  const graded = useRef(new Set());
  const start = useRef(Date.now());
  const knownAtStart = useRef(knownChars(profile));
  const pointer = useRef(null);

  const item = queue[0];
  const entry = item ? (item.entry || lookupWord(profile, item.w) || { w: item.w, p: '', g: '' }) : null;
  const known = useMemo(() => knownChars(profile), [profile]);
  const done = total + extra - queue.length;

  useEffect(() => { unlockAudio(); }, []);

  const finish = useCallback((final) => {
    update((p) => markSessionDone(logMinutes(p, Date.now() - start.current)));
    onDone({ ...final, knownBefore: knownAtStart.current.size });
  }, [update, onDone]);

  const advance = useCallback((nextQueue, nextStats) => {
    setRevealed(false);
    setDrag(0);
    setLeaving(null);
    if (!nextQueue.length) finish(nextStats);
    else setQueue(nextQueue);
  }, [finish]);

  const grade = useCallback((g) => {
    if (!item || item.kind === 'meet') return;
    haptic(g === GOOD ? 8 : 20);
    const w = item.w;
    const first = !graded.current.has(w);
    if (first) {
      graded.current.add(w);
      if (item.kind === 'first') update((p) => learnWord(p, entry, g));
      else if (item.kind === 'review') update((p) => gradeWord(p, w, g));
    }
    const nextStats = {
      ...stats,
      reviewed: stats.reviewed + (first ? 1 : 0),
      knew: stats.knew + (first && g === GOOD ? 1 : 0),
      missed: g === AGAIN ? new Set([...stats.missed, w]) : stats.missed,
    };
    setStats(nextStats);
    let rest = queue.slice(1);
    if (g === AGAIN) {
      rest = requeue(rest, { kind: 'retry', w, entry }, 3);
      setExtra((x) => x + 1);
    }
    setLeaving(g === GOOD ? 'right' : 'left');
    setTimeout(() => advance(rest, nextStats), 220);
  }, [item, entry, queue, stats, update, advance]);

  const meet = useCallback((knowIt) => {
    haptic();
    let rest = queue.slice(1);
    let nextStats = stats;
    if (knowIt) {
      update((p) => markKnown(p, entry, 'session'));
    } else {
      rest = requeue(rest, { kind: 'first', w: item.w, entry }, 2);
      nextStats = { ...stats, learned: [...stats.learned, entry] };
      setStats(nextStats);
      setExtra((x) => x + 1);
    }
    setLeaving('up');
    setTimeout(() => advance(rest, nextStats), 200);
  }, [queue, stats, item, entry, update, advance]);

  // Keyboard: space reveals, ←/→ grade.
  useEffect(() => {
    const onKey = (e) => {
      if (!item) return;
      if (item.kind === 'meet') {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); meet(false); }
        return;
      }
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); return; }
      if (revealed && (e.key === 'ArrowRight' || e.key === '2')) grade(GOOD);
      if (revealed && (e.key === 'ArrowLeft' || e.key === '1')) grade(AGAIN);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, revealed, grade, meet]);

  if (!item) {
    return (
      <div className="session">
        <div className="session-empty">
          <div className="han big-glyph">好</div>
          <h2>Nothing due right now</h2>
          <p>You’re caught up. Go read something.</p>
          <button className="btn btn-primary" onClick={() => finish(stats)}>Continue</button>
        </div>
      </div>
    );
  }

  const onPointerDown = (e) => {
    if (!revealed || item.kind === 'meet') return;
    pointer.current = { x: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!pointer.current) return;
    setDrag(e.clientX - pointer.current.x);
  };
  const onPointerUp = () => {
    if (!pointer.current) return;
    pointer.current = null;
    if (drag > SWIPE) grade(GOOD);
    else if (drag < -SWIPE) grade(AGAIN);
    else setDrag(0);
  };

  const tilt = Math.max(-1, Math.min(1, drag / 160));
  const style = leaving
    ? undefined
    : { transform: `translateX(${drag}px) rotate(${tilt * 6}deg)`, transition: pointer.current ? 'none' : undefined };
  const isMeet = item.kind === 'meet';
  const label = { review: 'Review', first: 'Quick check', retry: 'Once more', meet: 'New word' }[item.kind];
  const longWord = [...entry.w].length > 3;

  return (
    <div className="session">
      <header className="session-top">
        <button className="icon-btn" onClick={onExit} aria-label="End session"><Icon name="close" /></button>
        <div className="progress"><div className="progress-fill" style={{ width: `${(done / Math.max(1, total + extra)) * 100}%` }} /></div>
        <span className="session-count">{queue.length}</span>
      </header>

      <div className="card-stage">
        <div
          key={`${item.kind}-${item.w}-${done}`}
          className={`card ${isMeet ? 'card-meet' : ''} ${revealed ? 'is-revealed' : ''} ${leaving ? `leave-${leaving}` : 'enter'}`}
          style={style}
          onClick={() => !isMeet && !revealed && setRevealed(true)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="card-label">{label}</div>
          <div className={`card-word han ${longWord ? 'is-long' : ''}`}>{entry.w}</div>

          {isMeet ? (
            <div className="card-back">
              <div className="card-py-row"><Pinyin p={entry.p} className="card-py" /><SoundButton text={entry.w} auto /></div>
              <p className="card-gloss">{entry.g}</p>
              <CharBreakdown profile={profile} entry={entry} known={known} />
            </div>
          ) : revealed ? (
            <div className="card-back">
              <div className="card-py-row"><Pinyin p={entry.p} className="card-py" /><SoundButton text={entry.w} auto /></div>
              <p className="card-gloss">{entry.g}</p>
            </div>
          ) : (
            <div className="card-hint">Read it in your head, then tap</div>
          )}

          {!isMeet && revealed && (
            <>
              <div className="swipe-tag tag-yes" style={{ opacity: Math.max(0, tilt) }}>Knew it</div>
              <div className="swipe-tag tag-no" style={{ opacity: Math.max(0, -tilt) }}>Not yet</div>
            </>
          )}
        </div>
      </div>

      <footer className="session-actions">
        {isMeet ? (
          <>
            <button className="btn btn-ghost" onClick={() => meet(true)}>I know it</button>
            <button className="btn btn-primary" onClick={() => meet(false)}>Got it</button>
          </>
        ) : revealed ? (
          <>
            <button className="btn btn-no" onClick={() => grade(AGAIN)}><Icon name="close" size={18} />Not yet</button>
            <button className="btn btn-yes" onClick={() => grade(GOOD)}><Icon name="check" size={18} />Knew it</button>
          </>
        ) : (
          <button className="btn btn-primary wide" onClick={() => setRevealed(true)}>Show answer</button>
        )}
      </footer>
    </div>
  );
}
