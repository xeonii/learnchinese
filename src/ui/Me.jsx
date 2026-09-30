import { useMemo, useRef, useState } from 'react';
import { DECK, DECK_INDEX } from '../content.js';
import { downloadBackup } from '../lib/store.js';
import { charStatus, counts, dayKey, emptyProfile, importJson, streak, textCoverage } from '../lib/profile.js';
import { Icon, Pinyin, Ring, Sheet, pct } from './bits.jsx';

const DAY = 86400000;

function Calendar({ log }) {
  const weeks = 18;
  const today = new Date();
  const end = new Date(today);
  end.setHours(12, 0, 0, 0);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const cells = [];
  for (let i = weeks * 7 - 1; i >= 0; i -= 1) {
    const t = end.getTime() - i * DAY;
    const key = dayKey(t);
    const d = log[key];
    const n = (d?.reviews || 0) + (d?.stories || 0) * 5;
    const lvl = t > today.getTime() ? -1 : n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4;
    cells.push(<i key={key} className={`l${lvl}`} title={d ? `${key}: ${d.reviews || 0} reviews` : key} />);
  }
  return <div className="calendar" style={{ '--weeks': weeks }}>{cells}</div>;
}

export default function Me({ profile, update, onReplace, onRedoPlacement }) {
  const chars = useMemo(() => charStatus(profile), [profile]);
  const [sel, setSel] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef(null);

  const known = useMemo(() => new Set([...chars.values()].filter((c) => c.known).map((c) => c.ch)), [chars]);
  const cov = useMemo(() => textCoverage(DECK, known), [known]);
  const c = counts(profile);
  const days = streak(profile);
  const practiced = Object.values(profile.log).filter((d) => d.reviews || d.stories).length;

  const byFreq = (a, b) => (DECK_INDEX.get(a.ch)?.rank ?? 1e9) - (DECK_INDEX.get(b.ch)?.rank ?? 1e9);
  // Newest first, so fresh characters are the first thing you see.
  const byDate = (a, b) => String(profile.chars[b.ch] || '').localeCompare(String(profile.chars[a.ch] || '')) || byFreq(a, b);
  const knownList = [...chars.values()].filter((x) => x.known).sort(byDate);
  const learningList = [...chars.values()].filter((x) => !x.known).sort(byFreq);

  const setNew = (n) => update((p) => ({ ...p, settings: { ...p.settings, newPerDay: n } }));
  const exportNow = () => {
    downloadBackup(profile);
    update((p) => ({ ...p, backupAt: Date.now() }));
  };
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onReplace(importJson(await file.text()));
      setMessage('Backup restored.');
    } catch (err) {
      setMessage(err.message || 'Couldn’t read that file.');
    }
    e.target.value = '';
  };

  const selInfo = sel && {
    ...chars.get(sel),
    d: DECK_INDEX.get(sel),
    since: profile.chars[sel],
  };

  return (
    <div className="page me">
      <header className="page-head"><h1>Your reading</h1></header>

      <section className="me-hero">
        <Ring value={cov.share} size={120} stroke={9}>
          <b className="ring-num">{pct(cov.share)}</b>
          <small>everyday text</small>
        </Ring>
        <div className="me-stats">
          <div><b>{known.size}</b><span>characters</span></div>
          <div><b>{(c.known || 0) + (c.active || 0)}</b><span>words</span></div>
          <div><b>{days}</b><span>day streak</span></div>
          <div><b>{practiced}</b><span>{practiced === 1 ? 'day' : 'days'} practiced</span></div>
        </div>
      </section>

      <section>
        <h3 className="section-title">Practice</h3>
        <Calendar log={profile.log} />
      </section>

      <section>
        <h3 className="section-title">Characters you can read<span>{knownList.length}</span></h3>
        {knownList.length === 0 && <p className="muted">They’ll fill in here as you practice.</p>}
        <div className="char-grid">
          {(showAll ? knownList : knownList.slice(0, 72)).map((x) => (
            <button key={x.ch} className="han" style={{ '--s': x.strength }} onClick={() => setSel(x.ch)}>{x.ch}</button>
          ))}
        </div>
        {knownList.length > 72 && (
          <button className="link-btn" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${knownList.length}`}
          </button>
        )}
        {learningList.length > 0 && (
          <>
            <h3 className="section-title">On the way<span>{learningList.length}</span></h3>
            <div className="char-grid is-learning">
              {learningList.map((x) => <button key={x.ch} className="han" onClick={() => setSel(x.ch)}>{x.ch}</button>)}
            </div>
          </>
        )}
      </section>

      <section className="settings">
        <h3 className="section-title">Settings</h3>
        <div className="setting">
          <div><b>New words a day</b><span>Fewer is gentler. More is faster.</span></div>
          <div className="seg">
            {[3, 5, 8, 12].map((n) => (
              <button key={n} className={profile.settings.newPerDay === n ? 'on' : ''} onClick={() => setNew(n)}>{n}</button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <b>Backup</b>
            <span>{profile.backupAt ? `Last saved ${new Date(profile.backupAt).toLocaleDateString()}` : 'Your progress lives on this device. Save a copy now and then.'}</span>
          </div>
          <div className="row">
            <button className="btn btn-ghost small" onClick={() => fileRef.current?.click()}>Restore</button>
            <button className="btn btn-primary small" onClick={exportNow}>Save</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
        </div>
        {message && <p className="muted small">{message}</p>}
        <div className="setting">
          <div><b>Placement</b><span>Re-check which words you already know.</span></div>
          <button className="btn btn-ghost small" onClick={onRedoPlacement}>Redo</button>
        </div>
        <div className="setting">
          <div><b>Start over</b><span>Erase all progress on this device.</span></div>
          {confirmReset ? (
            <div className="row">
              <button className="btn btn-ghost small" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="btn btn-danger small" onClick={() => { onReplace(emptyProfile()); setConfirmReset(false); }}>Erase</button>
            </div>
          ) : (
            <button className="btn btn-ghost small" onClick={() => setConfirmReset(true)}>Reset</button>
          )}
        </div>
        <p className="muted small">Tip: add this site to your home screen so your browser keeps your progress safe.</p>
      </section>

      <Sheet open={!!sel} onClose={() => setSel(null)} label={sel}>
        {selInfo && (
          <div className="ws char-sheet">
            <div className="ws-head"><div className="ws-word han">{sel}</div></div>
            {selInfo.d && <Pinyin p={selInfo.d.p} className="ws-pinyin" />}
            {selInfo.d?.g && <p className="ws-gloss">{selInfo.d.g}</p>}
            <div className={`ws-status st-${selInfo.known ? 'known' : 'active'}`}>
              <span className="dot" />{selInfo.known ? `Known${selInfo.since ? ` since ${new Date(`${selInfo.since}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}` : 'Still learning'}
            </div>
            <h3 className="section-title">In your words</h3>
            <div className="char-words">
              {selInfo.words.slice(0, 12).map((w) => {
                const r = profile.words[w];
                return <div key={w}><span className="han">{w}</span><Pinyin p={r?.p} /></div>;
              })}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
