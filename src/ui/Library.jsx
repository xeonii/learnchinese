import { useMemo, useState } from 'react';
import { DECK, LEVELS, STORIES } from '../content.js';
import { loadDict } from '../lib/dict.js';
import { storyReadability } from '../lib/plan.js';
import { knownChars } from '../lib/profile.js';
import { buildIndex, textToStory } from '../lib/segment.js';
import { Icon, pct } from './bits.jsx';

export default function Library({ profile, onRead }) {
  const known = useMemo(() => knownChars(profile), [profile]);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const levels = [1, 2, 3, 4].map((level) => ({
    level,
    stories: STORIES.filter((s) => s.level === level).map((s) => ({ s, share: storyReadability(s, known).share })),
  }));

  const readPasted = async () => {
    if (!/[一-鿿]/.test(text)) { setError('Paste some Chinese text first.'); return; }
    setBusy(true);
    setError('');
    try {
      const dict = await loadDict();
      onRead(textToStory(text, buildIndex(DECK, dict)), true);
    } catch {
      setError('Couldn’t load the dictionary. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Read</h1>
        <p className="muted">Short stories written with the words you know. Tap anything you can’t read.</p>
      </header>

      <section className={`paste ${pasting ? 'is-open' : ''}`}>
        {!pasting ? (
          <button className="paste-open" onClick={() => setPasting(true)}>
            <Icon name="paste" />
            <div>
              <b>Read your own text</b>
              <span>A message from family, a menu, a sign…</span>
            </div>
            <Icon name="arrow" size={18} />
          </button>
        ) : (
          <>
            <textarea className="han" value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴中文…" rows={5} autoFocus />
            {error && <p className="error">{error}</p>}
            <div className="row">
              <button className="btn btn-ghost" onClick={() => { setPasting(false); setError(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={readPasted} disabled={busy}>{busy ? 'Loading…' : 'Read it'}</button>
            </div>
          </>
        )}
      </section>

      {levels.map(({ level, stories }) => (
        <section key={level} className="shelf">
          <h3 className="section-title">{LEVELS[level]}<span>Level {level}</span></h3>
          <div className="shelf-list">
            {stories.map(({ s, share }) => {
              const read = profile.read[s.id];
              return (
                <button key={s.id} className={`shelf-item ${read ? 'is-read' : ''}`} onClick={() => onRead(s)}>
                  <span className="han shelf-title">{s.title}</span>
                  <span className="shelf-en">{s.en}</span>
                  <span className="shelf-meta">
                    {read ? <><Icon name="check" size={14} />Read</> : <span className={share >= 0.8 ? 'good' : ''}>{pct(share)} readable</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="muted small center">More stories are on the way.</p>
    </div>
  );
}
