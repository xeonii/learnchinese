import { useEffect, useMemo, useState } from 'react';
import charactersData from './data/characters.json';
import { speakChinese, canPlayAudio } from './audio.js';
import { pinyinMatches } from './pinyin.js';
import {
  DAILY_NEW_LIMIT,
  SESSION_MINUTES,
  learnedNewCount,
  markKnown,
  markSkipped,
  onCorrect,
  onFail,
  startLearning,
  updateStreak,
} from './srs.js';
import { clearState, initializeCards, loadState, saveState } from './storage.js';
import { choicesFor, estimateMinutes, nextItem, replaceCard, sessionCounts } from './session.js';

function persist(cards, meta) {
  saveState({ cards, streak: meta.streak, lastSessionDate: meta.lastSessionDate });
}

function formatMs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [cards, setCards] = useState([]);
  const [meta, setMeta] = useState({ streak: 0, lastSessionDate: null });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('home');
  const [item, setItem] = useState(null);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [choices, setChoices] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const saved = loadState();
    if (saved?.cards?.length) {
      setCards(saved.cards);
      setMeta({
        streak: saved.streak || 0,
        lastSessionDate: saved.lastSessionDate || null,
      });
    } else {
      setCards(initializeCards(charactersData));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || cards.length === 0) return;
    persist(cards, meta);
  }, [cards, meta, ready]);

  useEffect(() => {
    if (screen !== 'session' || !session) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(id);
  }, [screen, session]);

  const counts = useMemo(() => sessionCounts(cards, nowTick), [cards, nowTick]);
  const minutes = estimateMinutes(cards, nowTick);

  function goNext(nextCards, nextSession) {
    const now = Date.now();
    if (now >= nextSession.endsAt) {
      finishSession(nextCards, nextSession);
      return;
    }
    const ctx = {
      hasVoice: canPlayAudio(),
      intros: nextSession.intros,
      learnedNew: learnedNewCount(nextCards, now),
      promptIndex: nextSession.promptIndex,
    };
    const nxt = nextItem(nextCards, ctx, now);
    if (!nxt) {
      finishSession(nextCards, nextSession);
      return;
    }
    setCards(nextCards);
    setItem(nxt);
    setSession({
      ...nextSession,
      promptIndex: nextSession.promptIndex + (nxt.type === 'intro' ? 0 : 1),
    });
    setInput('');
    setRevealed(false);
    setFeedback(null);
    setChoices(nxt.type === 'listen' ? choicesFor(nxt.card, nextCards) : []);
    if (nxt.type === 'listen' || nxt.type === 'intro') {
      speakChinese(nxt.card.word || nxt.card.char);
    }
  }

  function startSession() {
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
    };
    setScreen('session');
    goNext(cards, nextSession);
  }

  function finishSession(nextCards, nextSession) {
    const streakMeta = updateStreak(meta, Date.now());
    setCards(nextCards);
    setMeta(streakMeta);
    persist(nextCards, streakMeta);
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
    goNext(replaceCard(cards, updated), { ...session, ...patch });
  }

  function grade(correct) {
    const now = Date.now();
    const updated = correct ? onCorrect(item.card, now) : onFail(item.card, now);
    setFeedback(correct ? 'correct' : 'incorrect');
    setRevealed(true);
    setCards(replaceCard(cards, updated));
    speakChinese(item.card.word || item.card.char);
    setSession({
      ...session,
      reviewed: session.reviewed + 1,
      correct: session.correct + (correct ? 1 : 0),
      incorrect: session.incorrect + (correct ? 0 : 1),
    });
  }

  function handlePinyinSubmit() {
    if (!input.trim()) return;
    grade(pinyinMatches(input, item.card.pinyin));
  }

  function handleContinue() {
    const current = cards.find((c) => c.id === item.card.id) || item.card;
    goNext(replaceCard(cards, current), session);
  }

  function handleReset() {
    clearState();
    const fresh = initializeCards(charactersData);
    setCards(fresh);
    setMeta({ streak: 0, lastSessionDate: null });
    setScreen('home');
    setSession(null);
  }

  if (!ready) {
    return (
      <div className="shell">
        <p className="muted">加载中…</p>
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
          <h1>今天到这里。</h1>
          <p className="lede">明天同一时间再来 5–15 分钟。</p>
          <dl className="facts">
            <div><dt>复习</dt><dd>{session.reviewed}</dd></div>
            <div><dt>新学</dt><dd>{session.newLearned}</dd></div>
            <div><dt>已会</dt><dd>{session.known}</dd></div>
            <div><dt>连胜</dt><dd>{meta.streak} 天</dd></div>
          </dl>
          <p className="muted">到期 {sessionCounts(cards).due} · 还可新学 {sessionCounts(cards).newLeft}/{DAILY_NEW_LIMIT}</p>
          <button className="primary" onClick={() => setScreen('home')}>完成</button>
        </section>
      </div>
    );
  }

  if (screen === 'session' && item) {
    const remaining = session ? session.endsAt - nowTick : 0;
    return (
      <div className="shell session">
        <header className="session-bar">
          <button className="text-btn" onClick={() => finishSession(cards, session)} aria-label="End session">✕</button>
          <span className="count">{session.reviewed + session.known + session.skipped + session.newLearned}</span>
          <span className="clock">{formatMs(remaining)}</span>
        </header>
        {item.type === 'intro' && (
          <IntroCard
            card={item.card}
            canLearn={item.canLearn}
            onChoice={handleIntro}
          />
        )}
        {item.type === 'read' && (
          <ReadCard
            card={item.card}
            input={input}
            setInput={setInput}
            revealed={revealed}
            feedback={feedback}
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
            onPick={(ch) => grade(ch === item.card.char)}
            onContinue={handleContinue}
          />
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="top">
        <p className="brand">口到字</p>
        <p className="lede">把会说的词，钉到汉字上。</p>
      </header>
      <section className="panel">
        <button className="primary start" onClick={startSession}>
          开始练习
          <span>约 {minutes} 分钟</span>
        </button>
        <ul className="stats">
          <li><strong>{meta.streak}</strong> 连胜</li>
          <li><strong>{counts.due}</strong> 到期</li>
          <li><strong>{counts.newLeft}</strong> 今日新字</li>
        </ul>
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.min(100, (counts.known / counts.total) * 100)}%` }} />
        </div>
        <p className="muted">
          已认识 {counts.known} / {counts.total} · 课标基本字 300 + 常用字
        </p>
      </section>
      <footer>
        <button className="text-btn" onClick={handleReset}>清除进度</button>
      </footer>
    </div>
  );
}

function IntroCard({ card, canLearn, onChoice }) {
  return (
    <article className="card">
      <p className="prompt">这个字，你会吗？</p>
      <div className="han">{card.char}</div>
      <p className="word">{card.word}</p>
      <p className="meaning">{card.meaning}</p>
      <button className="ghost" onClick={() => speakChinese(card.word || card.char)}>再听一遍</button>
      <div className="stack">
        <button className="secondary" onClick={() => onChoice('known')}>我会这个字</button>
        {canLearn ? (
          <button className="primary" onClick={() => onChoice('learn')}>学习</button>
        ) : (
          <p className="muted">今日新字已满，先复习。</p>
        )}
        <button className="text-btn" onClick={() => onChoice('skip')}>不认识这个词，跳过</button>
      </div>
    </article>
  );
}

function ReadCard({ card, input, setInput, revealed, feedback, onSubmit, onContinue }) {
  return (
    <article className="card">
      <p className="prompt">拼音怎么写？</p>
      <div className="han">{card.char}</div>
      {!revealed ? (
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
            placeholder="ni3 或 nǐ"
            aria-label="拼音"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            autoFocus
          />
          <button className="primary" type="submit">提交</button>
        </form>
      ) : (
        <Reveal card={card} feedback={feedback} onContinue={onContinue} />
      )}
    </article>
  );
}

function ListenCard({ card, choices, revealed, feedback, onPick, onContinue }) {
  return (
    <article className="card">
      <p className="prompt">听词，选出汉字</p>
      <button className="speaker" onClick={() => speakChinese(card.word || card.char)} aria-label="Play">
        ▶
      </button>
      {!revealed ? (
        <div className="choices">
          {choices.map((c) => (
            <button key={c.char} className="choice" onClick={() => onPick(c.char)}>
              {c.char}
            </button>
          ))}
        </div>
      ) : (
        <Reveal card={card} feedback={feedback} onContinue={onContinue} />
      )}
    </article>
  );
}

function Reveal({ card, feedback, onContinue }) {
  return (
    <div className="reveal">
      <p className={`grade ${feedback}`}>{feedback === 'correct' ? '对' : '不对'}</p>
      <p className="pinyin">{card.pinyin}</p>
      <p className="word">{card.word}<span> · {card.wordPinyin}</span></p>
      <p className="meaning">{card.meaning}</p>
      <button className="ghost" onClick={() => speakChinese(card.word || card.char)}>听词语</button>
      <button className="primary" onClick={onContinue} autoFocus>继续</button>
    </div>
  );
}
