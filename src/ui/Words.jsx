import { useEffect, useMemo, useState } from 'react';
import { DECK_INDEX } from '../content.js';
import { cleanGloss, loadDict, searchDict } from '../lib/dict.js';
import { numberedToMarked, toCanonical } from '../lib/pinyin.js';
import { charStatus, counts, wordStrength } from '../lib/profile.js';
import { Icon, Pinyin } from './bits.jsx';
import { WordSheet, statusOf } from './WordSheet.jsx';

const FILTERS = [
  { key: 'active', label: 'Learning' },
  { key: 'queued', label: 'Saved' },
  { key: 'known', label: 'Known' },
];

function Row({ e, rec, onOpen }) {
  const st = statusOf(rec);
  return (
    <button className="word-row" onClick={() => onOpen(e)}>
      <span className="han word-row-w">{e.w}</span>
      <span className="word-row-mid">
        <Pinyin p={e.p} />
        <span className="word-row-g">{e.g}</span>
      </span>
      <span className={`strength st-${st.key}`} style={{ '--s': wordStrength(rec) }} title={st.label} />
    </button>
  );
}

export default function Words({ profile, update }) {
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');
  const [dict, setDict] = useState(null);
  const [dictError, setDictError] = useState(false);
  const [sheet, setSheet] = useState(null);
  const chars = useMemo(() => charStatus(profile), [profile]);
  const c = counts(profile);

  useEffect(() => {
    if (!q || dict) return;
    loadDict().then(setDict).catch(() => setDictError(true));
  }, [q, dict]);

  const mine = useMemo(() => {
    const list = Object.values(profile.words);
    const query = q.trim().toLowerCase();
    if (query) {
      if (/[\u4e00-\u9fff]/.test(query)) return list.filter((r) => r.w.includes(query)).slice(0, 30);
      const canon = toCanonical(query).replace(/[\d\s]/g, '');
      const re = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      return list.filter((r) => toCanonical(r.p).replace(/[\d\s]/g, '') === canon || re.test(r.g || '')).slice(0, 30);
    }
    return list
      .filter((r) => r.s === filter)
      .sort((a, b) => (filter === 'active'
        ? (a.card?.due ?? 0) - (b.card?.due ?? 0)
        : (DECK_INDEX.get(a.w)?.rank ?? 1e9) - (DECK_INDEX.get(b.w)?.rank ?? 1e9)))
      .slice(0, 300);
  }, [profile.words, filter, q]);

  const results = useMemo(() => {
    if (!q.trim() || !dict) return [];
    return searchDict(dict, q, 30)
      .filter((e) => !profile.words[e.word])
      .map((e) => ({ w: e.word, p: numberedToMarked(e.pinyin), g: cleanGloss(e.meaning).split('/').slice(0, 3).join('; ') }));
  }, [dict, q, profile.words]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Words</h1>
      </header>

      <label className="search">
        <Icon name="search" size={20} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 汉字, pinyin or English" autoCapitalize="off" autoCorrect="off" />
        {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear"><Icon name="close" size={18} /></button>}
      </label>

      {!q && (
        <div className="tabs-inline">
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>
              {f.label}<span>{c[f.key] || 0}</span>
            </button>
          ))}
        </div>
      )}

      {q && mine.length > 0 && <h3 className="section-title">Your words</h3>}
      <div className="word-list">
        {mine.map((r) => <Row key={r.w} e={r} rec={r} onOpen={setSheet} />)}
      </div>

      {!q && mine.length === 0 && (
        <div className="empty">
          <div className="han">空</div>
          <p>{filter === 'queued' ? 'Words you save from stories or search show up here.' : filter === 'active' ? 'Words you’re learning show up here.' : 'Words you know show up here.'}</p>
        </div>
      )}

      {q && (
        <>
          <h3 className="section-title">Dictionary</h3>
          {!dict && !dictError && <p className="muted">Loading dictionary…</p>}
          {dictError && <p className="error">Couldn’t load the dictionary.</p>}
          {dict && results.length === 0 && <p className="muted">No matches.</p>}
          <div className="word-list">
            {results.map((e, i) => <Row key={`${e.w}-${i}`} e={e} rec={null} onOpen={setSheet} />)}
          </div>
        </>
      )}

      <WordSheet entry={sheet} profile={profile} update={update} chars={chars} onClose={() => setSheet(null)} />
    </div>
  );
}
