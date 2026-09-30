import { useEffect, useMemo } from 'react';
import { DECK, LEVELS, STORIES } from '../content.js';
import { dueWords, learnedToday, pickNewWords, pickStory, storyReadability } from '../lib/plan.js';
import { dayKey, knownChars, pinStory, streak, textCoverage } from '../lib/profile.js';
import { Icon, Ring, pct } from './bits.jsx';

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function Today({ profile, update, onStart, onRead }) {
  const now = Date.now();
  const known = useMemo(() => knownChars(profile), [profile]);
  const cov = useMemo(() => textCoverage(DECK, known), [known]);
  const due = dueWords(profile, now).length;
  const newLeft = Math.max(0, (profile.settings?.newPerDay ?? 5) - learnedToday(profile, now));
  const fresh = pickNewWords(profile, DECK, newLeft, known).length;
  const story = pickStory(profile, STORIES, now, known);
  const readShare = story ? storyReadability(story, known).share : 0;
  const today = profile.log[dayKey(now)] || {};
  const practiced = !!today.done;
  const storyDone = story && profile.read[story.id] === dayKey(now);
  const days = streak(profile, now);

  useEffect(() => {
    if (story && !today.story) update((p) => pinStory(p, story.id));
  }, [story, today.story, update]);

  const baseline = new Set(profile.baseline || []);
  const recent = Object.entries(profile.chars)
    .filter(([ch]) => !baseline.has(ch))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, 14)
    .map(([ch]) => ch);

  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page today">
      <header className="today-head">
        <div>
          <p className="eyebrow">{dateLine}</p>
          <h1 className="han greet">{greeting()}</h1>
        </div>
        <div className={`streak ${days ? 'is-on' : ''}`} title="Days in a row">
          <Icon name="flame" size={18} stroke={1.6} />
          <b>{days}</b>
        </div>
      </header>

      <section className="hero">
        <Ring value={cov.share} size={148} stroke={11}>
          <b className="ring-num">{pct(cov.share)}</b>
          <small>of everyday<br />Chinese</small>
        </Ring>
        <div className="hero-copy">
          <p>You can read</p>
          <div className="hero-stat"><b>{known.size}</b><span>characters</span></div>
          <div className="hero-stat"><b>{cov.words.toLocaleString()}</b><span>common words</span></div>
        </div>
      </section>

      <section className={`plan ${practiced ? 'is-done' : ''}`}>
        <div className="plan-row">
          <span className="plan-num">{due}</span>
          <span className="plan-label">to review</span>
        </div>
        <div className="plan-row">
          <span className="plan-num">{fresh}</span>
          <span className="plan-label">new words</span>
        </div>
        <div className="plan-row">
          <span className="plan-num">1</span>
          <span className="plan-label">story</span>
        </div>
        {practiced && due === 0 && fresh === 0 ? (
          <button className="btn btn-quiet wide" onClick={() => onStart(true)}>
            <Icon name="check" size={18} />Practice done · learn 5 more
          </button>
        ) : (
          <button className="btn btn-primary btn-big wide" onClick={() => onStart(false)}>
            {practiced ? 'Keep going' : 'Start today’s practice'}<Icon name="arrow" size={20} />
          </button>
        )}
        <p className="plan-time">About {Math.max(3, Math.round((due * 5 + fresh * 20) / 60) + 3)} minutes</p>
      </section>

      {story && (
        <button className={`story-card ${storyDone ? 'is-read' : ''}`} onClick={() => onRead(story)}>
          <div className="story-card-top">
            <span className="eyebrow">Today’s story · {LEVELS[story.level]}</span>
            {storyDone && <span className="badge"><Icon name="check" size={14} />Read</span>}
          </div>
          <div className="han story-card-title">{story.title}</div>
          <div className="story-card-en">{story.en}</div>
          <div className="meter"><div style={{ width: pct(readShare) }} /></div>
          <div className="story-card-foot">You can read {pct(readShare)} of it <Icon name="arrow" size={16} /></div>
        </button>
      )}

      {recent.length > 0 && (
        <section className="recent">
          <h3 className="section-title">Recently learned</h3>
          <div className="recent-chars">
            {recent.map((ch) => <span key={ch} className="han">{ch}</span>)}
          </div>
        </section>
      )}
    </div>
  );
}
