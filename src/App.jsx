import { useEffect, useMemo, useRef, useState } from 'react';
import charactersData from './data/characters.json';
import { speakChinese, canPlayAudio, unlockAudio } from './audio.js';
import { gradePinyin, toMarked } from './pinyin.js';
import { characterCoverage } from './coverage.js';
import { alreadyInLibrary, loadDict, searchDict } from './dict.js';
import { coverageChars, seedWordsFromCharacters } from './seed.js';
import {
  DAILY_NEW_LIMIT,
  SESSION_MINUTES,
  learnedNewCount,
  markKnown,
  markSkipped,
  onCorrect,
  onFail,
  onToneSlip,
  startLearning,
  updateStreak,
} from './srs.js';
import {
  addDictWord,
  clearState,
  downloadBackup,
  enrichSeedMeanings,
  initializeWords,
  loadState,
  parseImportedState,
  saveState,
} from './storage.js';
import { choicesFor, estimateMinutes, nextItem, phaseLabel, replaceCard, sessionCounts } from './session.js';

const SEED = seedWordsFromCharacters(charactersData);
const COVERAGE_LIST = coverageChars(charactersData);

function persist(words, meta) {
  saveState({ words, meta });
}

function formatMs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function appendSlips(meta, slips) {
  if (!slips?.length) return meta;
  return {
    ...meta,
    toneSlipLog: [...(meta.toneSlipLog || []), ...slips].slice(-200),
  };
}

export default function App() {
  const [words, setWords] = useState([]);
  const [meta, setMeta] = useState({ streak: 0, lastSessionDate: null, toneSlipLog: [] });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('home');
  const [item, setItem] = useState(null);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [slips, setSlips] = useState([]);
  const [choices, setChoices] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());
  const [dict, setDict] = useState(null);
  const [dictError, setDictError] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupDebounced, setLookupDebounced] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadState(SEED);
      if (cancelled) return;
      if (saved?.words?.length) {
        setWords(saved.words);
        setMeta({
          streak: saved.meta?.streak || 0,
          lastSessionDate: saved.meta?.lastSessionDate || null,
          toneSlipLog: saved.meta?.toneSlipLog || [],
        });
      } else {
        setWords(initializeWords(SEED));
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDict()
      .then((entries) => {
        if (!cancelled) setDict(entries);
      })
      .catch(() => {
        if (!cancelled) setDictError(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dict || !ready) return;
    setWords((prev) => enrichSeedMeanings(prev, dict));
  }, [dict, ready]);

  useEffect(() => {
    const id = setTimeout(() => setLookupDebounced(lookupQuery), 120);
    return () => clearTimeout(id);
  }, [lookupQuery]);

  useEffect(() => {
    if (!ready || words.length === 0) return;
    persist(words, meta);
  }, [words, meta, ready]);

  useEffect(() => {
    if (screen !== 'session' || !session) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(id);
  }, [screen, session]);

  const counts = useMemo(() => sessionCounts(words, nowTick), [words, nowTick]);
  const minutes = estimateMinutes(words, nowTick);
  const coverage = useMemo(() => characterCoverage(words, COVERAGE_LIST), [words]);
  const lookupHits = useMemo(
    () => (screen === 'lookup' ? searchDict(dict, lookupDebounced) : []),
    [dict, lookupDebounced, screen],
  );
  const libraryHits = useMemo(() => {
    if (screen !== 'library') return [];
    const q = libraryQuery.trim();
    const list = [...words].sort((a, b) => a.word.localeCompare(b.word, 'zh'));
    if (!q) return list;
    return list.filter((w) => (
      w.word.includes(q)
      || (w.pinyin || '').toLowerCase().includes(q.toLowerCase())
      || (w.meaning || '').toLowerCase().includes(q.toLowerCase())
    ));
  }, [words, libraryQuery, screen]);

  function goNext(nextWords, nextSession) {
    const now = Date.now();
    if (now >= nextSession.endsAt) {
      finishSession(nextWords, nextSession);
      return;
    }
    const ctx = {
      hasVoice: canPlayAudio(),
      intros: nextSession.intros,
      learnedNew: learnedNewCount(nextWords, now),
      promptIndex: nextSession.promptIndex,
    };
    const nxt = nextItem(nextWords, ctx, now);
    if (!nxt) {
      finishSession(nextWords, nextSession);
      return;
    }
    setWords(nextWords);
    setItem(nxt);
    setSession({
      ...nextSession,
      promptIndex: nextSession.promptIndex + (nxt.type === 'intro' ? 0 : 1),
    });
    setInput('');
    setRevealed(false);
    setFeedback(null);
    setSlips([]);
    setChoices(nxt.type === 'listen' ? choicesFor(nxt.card, nextWords) : []);
    if (nxt.type === 'listen' || nxt.type === 'intro' || nxt.type === 'listen-type') {
      speakChinese(nxt.card.word);
    }
  }

  function startSession() {
    unlockAudio();
    const now = Date.now();
    const nextSession = {
      startedAt: now,
      endsAt: now + SESSION_MINUTES * 60 * 1000,
      intros: 0,
      promptIndex: 0,
      reviewed: 0,
      newLearned: 0,
      known: 0,
      skipped: 0,
      correct: 0,
      incorrect: 0,
      toneSlips: 0,
    };
    setScreen('session');
    goNext(words, nextSession);
  }

  function finishSession(nextWords, nextSession) {
    const streakMeta = updateStreak(meta, Date.now());
    const nextMeta = { ...meta, ...streakMeta };
    setWords(nextWords);
    setMeta(nextMeta);
    persist(nextWords, nextMeta);
    setSession(nextSession);
    setScreen('summary');
    setItem(null);
  }

  function handleIntro(choice) {
    const now = Date.now();
    let updated;
    const patch = { intros: session.intros + 1 };
    if (choice === 'known') {
      updated = markKnown(item.card, now);
      patch.known = session.known + 1;
    } else if (choice === 'skip') {
      updated = markSkipped(item.card);
      patch.skipped = session.skipped + 1;
    } else {
      updated = startLearning(item.card, now);
      patch.newLearned = session.newLearned + 1;
    }
    goNext(replaceCard(words, updated), { ...session, ...patch });
  }

  function grade(kind, nextSlips = []) {
    const now = Date.now();
    let updated;
    if (kind === 'correct') updated = onCorrect(item.card, now);
    else if (kind === 'tone-slip') updated = onToneSlip(item.card, now, nextSlips);
    else updated = onFail(item.card, now);

    setFeedback(kind);
    setSlips(nextSlips);
    setRevealed(true);
    setWords(replaceCard(words, updated));
    if (kind === 'tone-slip') setMeta((prev) => appendSlips(prev, nextSlips));
    speakChinese(item.card.word);
    setSession({
      ...session,
      reviewed: session.reviewed + 1,
      correct: session.correct + (kind === 'correct' ? 1 : 0),
      incorrect: session.incorrect + (kind === 'incorrect' ? 1 : 0),
      toneSlips: session.toneSlips + (kind === 'tone-slip' ? 1 : 0),
    });
  }

  function handlePinyinSubmit() {
    if (!input.trim()) return;
    const result = gradePinyin(input, item.card.pinyin);
    grade(result.result, result.slips);
  }

  function handleContinue() {
    const current = words.find((c) => c.id === item.card.id) || item.card;
    goNext(replaceCard(words, current), session);
  }

  async function handleReset() {
    await clearState();
    const fresh = initializeWords(SEED);
    setWords(fresh);
    setMeta({ streak: 0, lastSessionDate: null, toneSlipLog: [] });
    setScreen('home');
    setSession(null);
    setNotice('');
  }

  function handleAdd(entry) {
    const { words: next, exists } = addDictWord(words, entry);
    setWords(next);
    setNotice(exists
      ? `${entry.word} is already in your library.`
      : `Added ${entry.word} to your library.`);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseImportedState(await file.text());
      setWords(parsed.words);
      setMeta(parsed.meta);
      persist(parsed.words, parsed.meta);
      setNotice(`Imported ${parsed.words.length} words.`);
      setScreen('home');
    } catch {
      setNotice('Couldn’t read that backup file.');
    }
  }

  if (!ready) {
    return (
      <div className="shell">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (screen === 'summary' && session) {
    return (
      <div className="shell">
        <header className="top">
          <p className="brand">口到字</p>
        </header>
        <section className="panel summary">
          <h1>That’s it for today.</h1>
          <p className="lede">Come back tomorrow for 5–15 minutes.</p>
          <dl className="facts">
            <div><dt>Reviewed</dt><dd>{session.reviewed}</dd></div>
            <div><dt>New</dt><dd>{session.newLearned}</dd></div>
            <div><dt>Already knew</dt><dd>{session.known}</dd></div>
            <div><dt>Tone slips</dt><dd>{session.toneSlips}</dd></div>
          </dl>
          <p className="muted">
            Due {sessionCounts(words).due} · {sessionCounts(words).newLeft}/{DAILY_NEW_LIMIT} new left today
            · {coverage.known}/{coverage.total} characters known
          </p>
          <button className="primary" onClick={() => setScreen('home')}>Done</button>
        </section>
      </div>
    );
  }

  if (screen === 'session' && item) {
    const remaining = session ? session.endsAt - nowTick : 0;
    return (
      <div className="shell session">
        <header className="session-bar">
          <button className="text-btn" onClick={() => finishSession(words, session)} aria-label="End session">✕</button>
          <span className="count">{session.reviewed + session.known + session.skipped + session.newLearned}</span>
          <span className="clock">{formatMs(remaining)}</span>
        </header>
        {item.type === 'intro' && (
          <IntroCard card={item.card} canLearn={item.canLearn} onChoice={handleIntro} />
        )}
        {item.type === 'read' && (
          <ReadCard
            card={item.card}
            input={input}
            setInput={setInput}
            revealed={revealed}
            feedback={feedback}
            slips={slips}
            typed={input}
            onSubmit={handlePinyinSubmit}
            onContinue={handleContinue}
          />
        )}
        {item.type === 'listen-type' && (
          <ListenTypeCard
            card={item.card}
            input={input}
            setInput={setInput}
            revealed={revealed}
            feedback={feedback}
            slips={slips}
            typed={input}
            onSubmit={handlePinyinSubmit}
            onContinue={handleContinue}
          />
        )}
        {item.type === 'listen' && (
          <ListenCard
            card={item.card}
            choices={choices}
            revealed={revealed}
            feedback={feedback}
            slips={slips}
            onPick={(word) => grade(word === item.card.word ? 'correct' : 'incorrect')}
            onContinue={handleContinue}
          />
        )}
      </div>
    );
  }

  if (screen === 'lookup') {
    return (
      <div className="shell">
        <header className="top">
          <button className="text-btn back" onClick={() => { setScreen('home'); setNotice(''); }}>← Home</button>
          <p className="brand">Look up a word</p>
        </header>
        <section className="panel">
          <input
            className="search"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            placeholder="汉字, ni3hao3, or english"
            aria-label="Dictionary search"
            autoFocus
          />
          {!dict && !dictError && <p className="muted">Loading dictionary…</p>}
          {dictError && <p className="warn">Couldn’t load CC-CEDICT. Check your connection and refresh.</p>}
          {dict && lookupQuery.trim() && lookupHits.length === 0 && (
            <p className="muted">No matches.</p>
          )}
          <ul className="hits">
            {lookupHits.map((entry) => {
              const inLib = alreadyInLibrary(words, entry);
              return (
                <li key={`${entry.word}:${entry.pinyin}`}>
                  <div>
                    <p className="hit-word">{entry.word}</p>
                    <p className="hit-meta">{toMarked(entry.pinyin)} · {entry.meaning}</p>
                  </div>
                  {inLib ? (
                    <span className="pill">In library</span>
                  ) : (
                    <button className="secondary small" onClick={() => handleAdd(entry)}>Add</button>
                  )}
                </li>
              );
            })}
          </ul>
          {notice && <p className="muted">{notice}</p>}
        </section>
      </div>
    );
  }

  if (screen === 'library') {
    return (
      <div className="shell">
        <header className="top">
          <button className="text-btn back" onClick={() => setScreen('home')}>← Home</button>
          <p className="brand">Library · {words.length} words</p>
        </header>
        <section className="panel">
          <input
            className="search"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            placeholder="Filter your words"
            aria-label="Filter library"
          />
          <ul className="hits library">
            {libraryHits.map((card) => (
              <li key={card.id}>
                <div>
                  <p className="hit-word">{card.word}</p>
                  <p className="hit-meta">{toMarked(card.pinyin)} · {card.meaning}</p>
                </div>
                <span className={`pill ${card.phase}`}>{phaseLabel(card.phase)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="top">
        <p className="brand">口到字</p>
        <p className="lede">Attach characters to words you already know.</p>
      </header>
      <section className="panel">
        <button className="primary start" onClick={startSession}>
          Start practice
          <span>about {minutes} min</span>
        </button>
        <ul className="stats">
          <li><strong>{meta.streak}</strong> streak</li>
          <li><strong>{counts.due}</strong> due</li>
          <li><strong>{counts.newLeft}</strong> new today</li>
        </ul>
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.min(100, (coverage.known / Math.max(1, coverage.total)) * 100)}%` }} />
        </div>
        <p className="muted">
          Characters known {coverage.known} / {coverage.total} · from {counts.known} words in your library ({counts.total} total)
        </p>
        {notice && <p className="muted">{notice}</p>}
      </section>
      <nav className="home-nav">
        <button className="ghost" onClick={() => { setNotice(''); setScreen('lookup'); }}>Look up a word</button>
        <button className="ghost" onClick={() => setScreen('library')}>Library</button>
      </nav>
      <footer>
        <button className="text-btn" onClick={() => downloadBackup(words, meta)}>Export backup</button>
        <button className="text-btn" onClick={() => fileRef.current?.click()}>Import backup</button>
        <button className="text-btn" onClick={handleReset}>Reset progress</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleImport}
        />
      </footer>
    </div>
  );
}

function PlayButton({ className, text, label }) {
  const [state, setState] = useState('idle');

  async function play(event) {
    event.preventDefault();
    event.stopPropagation();
    setState('playing');
    const ok = await speakChinese(text);
    setState(ok ? 'idle' : 'error');
  }

  const isSpeaker = className === 'speaker';
  return (
    <>
      <button
        type="button"
        className={`${className}${state === 'playing' ? ' is-playing' : ''}`}
        onClick={play}
        aria-label={label}
        aria-busy={state === 'playing'}
      >
        {isSpeaker ? (state === 'playing' ? '…' : '▶') : label}
      </button>
      {state === 'error' && (
        <p className="warn">Couldn’t play sound. Check the volume and tap play again.</p>
      )}
    </>
  );
}

function Han({ word }) {
  return <div className={`han${word.length > 1 ? ' han-word' : ''}`}>{word}</div>;
}

function IntroCard({ card, canLearn, onChoice }) {
  return (
    <article className="card">
      <p className="prompt">Do you know this word?</p>
      <Han word={card.word} />
      <p className="meaning">{card.meaning}</p>
      <PlayButton className="ghost" text={card.word} label="Play again" />
      <div className="stack">
        <button className="secondary" onClick={() => onChoice('known')}>I already read this</button>
        {canLearn ? (
          <button className="primary" onClick={() => onChoice('learn')}>Learn it</button>
        ) : (
          <p className="muted">Daily new cards are full — reviews first.</p>
        )}
        <button className="text-btn" onClick={() => onChoice('skip')}>Skip — I don’t know this word</button>
      </div>
    </article>
  );
}

function PinyinForm({ input, setInput, onSubmit }) {
  return (
    <form
      className="answer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        id="pinyin-input"
        name="pinyin"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="ni3hao3 or nǐhǎo"
        aria-label="Pinyin"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        autoFocus
      />
      <button className="primary" type="submit">Submit</button>
    </form>
  );
}

function ReadCard({ card, input, setInput, revealed, feedback, slips, typed, onSubmit, onContinue }) {
  return (
    <article className="card">
      <p className="prompt">Type the pinyin</p>
      <Han word={card.word} />
      {!revealed ? (
        <PinyinForm input={input} setInput={setInput} onSubmit={onSubmit} />
      ) : (
        <Reveal card={card} feedback={feedback} slips={slips} typed={typed} onContinue={onContinue} />
      )}
    </article>
  );
}

function ListenTypeCard({ card, input, setInput, revealed, feedback, slips, typed, onSubmit, onContinue }) {
  return (
    <article className="card">
      <p className="prompt">Listen, then type the pinyin</p>
      <PlayButton className="speaker" text={card.word} label="Play" />
      {!revealed ? (
        <PinyinForm input={input} setInput={setInput} onSubmit={onSubmit} />
      ) : (
        <Reveal card={card} feedback={feedback} slips={slips} typed={typed} onContinue={onContinue} />
      )}
    </article>
  );
}

function ListenCard({ card, choices, revealed, feedback, slips, onPick, onContinue }) {
  return (
    <article className="card">
      <p className="prompt">Listen, then pick the word</p>
      <PlayButton className="speaker" text={card.word} label="Play" />
      {!revealed ? (
        <div className="choices">
          {choices.map((c) => (
            <button type="button" key={c.id} className="choice word-choice" onClick={() => onPick(c.word)}>
              {c.word}
            </button>
          ))}
        </div>
      ) : (
        <Reveal card={card} feedback={feedback} slips={slips} onContinue={onContinue} />
      )}
    </article>
  );
}

function gradeCopy(feedback) {
  if (feedback === 'correct') return 'Right';
  if (feedback === 'tone-slip') return 'Right syllables, wrong tone';
  return 'Not quite';
}

function Reveal({ card, feedback, slips, typed, onContinue }) {
  return (
    <div className="reveal">
      <p className={`grade ${feedback}`}>{gradeCopy(feedback)}</p>
      <p className="pinyin">{toMarked(card.pinyin)}</p>
      {feedback === 'tone-slip' && slips?.length > 0 && (
        <p className="muted">
          You typed {typed || '—'} · expected {slips.map((s) => `${s.syllable}${s.expected}`).join(' ')}
        </p>
      )}
      <p className="word">{card.word}</p>
      <p className="meaning">{card.meaning}</p>
      <PlayButton className="ghost" text={card.word} label="Play word" />
      <button className="primary" onClick={onContinue} autoFocus>Continue</button>
    </div>
  );
}
