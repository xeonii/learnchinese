import { useEffect, useMemo, useState } from 'react';
import { DECK } from '../content.js';
import { applyPlacement, BANDS, bandVerdict, sampleBand } from '../lib/placement.js';
import { knownChars, textCoverage } from '../lib/profile.js';
import { Icon, Pinyin, Ring, haptic, pct } from './bits.jsx';

function Welcome({ onBegin, migratedCount }) {
  return (
    <div className="welcome">
      <div className="welcome-mark han">口<span>到</span>字</div>
      <h1>You already speak it.<br />Now read it.</h1>
      <ul className="welcome-list">
        <li><b>Ten minutes a day.</b> Review a few words, learn a few new ones, read one short story.</li>
        <li><b>No writing, no typing.</b> Look, read it in your head, check yourself.</li>
        <li><b>Every character you learn is saved</b> to your profile, so you pick up where you left off.</li>
      </ul>
      {migratedCount > 0 && (
        <p className="welcome-note"><Icon name="check" size={16} />Brought over {migratedCount} words from your earlier practice.</p>
      )}
      <button className="btn btn-primary btn-big wide" onClick={onBegin}>
        Find my level<Icon name="arrow" size={20} />
      </button>
      <p className="muted small center">About two minutes. Swipe through common words.</p>
    </div>
  );
}

function Placement({ onDone, onCancel }) {
  const seed = useMemo(() => Date.now(), []);
  const [band, setBand] = useState(0);
  const [words, setWords] = useState(() => sampleBand(DECK, 0, seed));
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [history, setHistory] = useState([]);
  const [last, setLast] = useState(null);

  const answer = (known) => {
    haptic(known ? 6 : 14);
    const entry = words[i];
    setLast({ entry, known });
    const nextAnswers = [...answers, { entry, known }];
    if (i + 1 < words.length) {
      setAnswers(nextAnswers);
      setI(i + 1);
      return;
    }
    const knownN = nextAnswers.filter((a) => a.known).length;
    const nextHistory = [...history, { band, known: knownN, answers: nextAnswers }];
    if (bandVerdict(nextAnswers, history.map((h) => ({ known: h.known }))) === 'done' || band + 1 >= BANDS.length) {
      onDone(nextHistory);
      return;
    }
    setHistory(nextHistory);
    setBand(band + 1);
    setWords(sampleBand(DECK, band + 1, seed));
    setAnswers([]);
    setI(0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') answer(true);
      if (e.key === 'ArrowLeft') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const entry = words[i];
  return (
    <div className="placement">
      <div className="placement-top">
        {onCancel && <button className="icon-btn placement-close" onClick={onCancel} aria-label="Cancel"><Icon name="close" /></button>}
        <div className="bands">
          {BANDS.map((_, b) => <i key={b} className={b < band ? 'done' : b === band ? 'now' : ''} />)}
        </div>
        <p className="muted small">Can you read this word? Be honest. It only helps you.</p>
      </div>
      <div className="card-stage">
        <div key={entry.w} className="card enter">
          <div className="card-label">Common word · {band + 1}</div>
          <div className={`card-word han ${[...entry.w].length > 3 ? 'is-long' : ''}`}>{entry.w}</div>
        </div>
      </div>
      <div className="placement-last">
        {last && (
          <span className={last.known ? 'yes' : 'no'}>
            <span className="han">{last.entry.w}</span> <Pinyin p={last.entry.p} /> <span className="muted">{last.entry.g.split(';')[0]}</span>
          </span>
        )}
      </div>
      <footer className="session-actions">
        <button className="btn btn-no" onClick={() => answer(false)}>Not sure</button>
        <button className="btn btn-yes" onClick={() => answer(true)}>I can read it</button>
      </footer>
    </div>
  );
}

function Result({ profile, onFinish }) {
  const known = knownChars(profile);
  const cov = textCoverage(DECK, known);
  return (
    <div className="welcome result">
      <Ring value={cov.share} size={170} stroke={12}>
        <b className="ring-num">{pct(cov.share)}</b>
        <small>of everyday<br />Chinese</small>
      </Ring>
      <h1>You can already read {known.size} characters.</h1>
      <p className="muted">That covers about {pct(cov.share)} of the words in everyday text. Each day you’ll get a few new words, picked so that every new character sits next to ones you already know.</p>
      <button className="btn btn-primary btn-big wide" onClick={onFinish}>Let’s start<Icon name="arrow" size={20} /></button>
    </div>
  );
}

export default function Onboarding({ profile, replace, onFinish, onCancel, migratedCount = 0, skipWelcome = false }) {
  const [step, setStep] = useState(skipWelcome ? 'placement' : 'welcome');
  const [placed, setPlaced] = useState(null);

  if (step === 'welcome') return <Welcome migratedCount={migratedCount} onBegin={() => setStep('placement')} />;
  if (step === 'placement') {
    return (
      <Placement onCancel={onCancel} onDone={(history) => {
        const next = applyPlacement(profile, DECK, history);
        replace(next);
        setPlaced(next);
        setStep('result');
      }} />
    );
  }
  return <Result profile={placed || profile} onFinish={onFinish} />;
}
