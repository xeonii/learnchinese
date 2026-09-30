import { useEffect, useMemo, useState } from 'react';
import { LEVELS } from '../content.js';
import { speakChinese, unlockAudio } from '../lib/audio.js';
import { charStatus, isReadable, knownChars, logStory } from '../lib/profile.js';
import { Icon, Pinyin, haptic } from './bits.jsx';
import { WordSheet } from './WordSheet.jsx';

const PINYIN_MODES = [
  { key: 'off', label: 'Off' },
  { key: 'new', label: 'New words' },
  { key: 'all', label: 'All' },
];

function loadPref(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function savePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export default function Reader({ story, profile, update, onClose, onFinished, custom = false }) {
  const [sheet, setSheet] = useState(null);
  const [pinyin, setPinyin] = useState(() => loadPref('reader.pinyin', 'off'));
  const [english, setEnglish] = useState(() => loadPref('reader.en', '0') === '1');
  const [tapped, setTapped] = useState(() => new Set());
  const [finished, setFinished] = useState(false);
  const known = useMemo(() => knownChars(profile), [profile]);
  const chars = useMemo(() => charStatus(profile), [profile]);

  useEffect(() => { unlockAudio(); }, []);
  useEffect(() => { savePref('reader.pinyin', pinyin); }, [pinyin]);
  useEffect(() => { savePref('reader.en', english ? '1' : '0'); }, [english]);

  const open = (tok) => {
    haptic(5);
    setTapped((s) => new Set(s).add(tok[0]));
    setSheet({ w: tok[0], p: tok[1], g: tok[2] });
  };

  const finish = () => {
    if (!custom) update((p) => logStory(p, story.id));
    setFinished(true);
    onFinished?.();
  };

  const saved = [...tapped].filter((w) => profile.words[w]?.s === 'queued' || profile.words[w]?.card?.due <= Date.now());

  return (
    <div className="reader">
      <header className="reader-top">
        <button className="icon-btn" onClick={onClose} aria-label="Back"><Icon name="back" /></button>
        <div className="reader-tools">
          <div className="seg" role="group" aria-label="Pinyin">
            <span className="seg-label">拼音</span>
            {PINYIN_MODES.map((m) => (
              <button key={m.key} className={pinyin === m.key ? 'on' : ''} onClick={() => setPinyin(m.key)}>{m.label}</button>
            ))}
          </div>
          <button className={`chip ${english ? 'on' : ''}`} onClick={() => setEnglish((x) => !x)}>EN</button>
        </div>
      </header>

      <article className="reader-body">
        {!custom && (
          <div className="reader-head">
            <span className="eyebrow">{LEVELS[story.level]} · Level {story.level}</span>
            <h1 className="han reader-title">{story.title}</h1>
            <p className="reader-en">{story.en}</p>
          </div>
        )}

        <div className={`passage ${english ? 'with-en' : ''} py-${pinyin}`}>
          {story.sentences.map((s, si) => (
            <span key={si} className="sentence">
              <span className="zh">
                {s.tokens.map((tok, ti) => {
                  if (tok.length === 1) return <span key={ti} className="punct">{tok[0]}</span>;
                  const readable = isReadable(tok[0], known);
                  const showPy = pinyin === 'all' || (pinyin === 'new' && !readable);
                  const rec = profile.words[tok[0]];
                  return (
                    <span key={ti} role="button" tabIndex={0}
                      className={`tok ${readable ? '' : 'is-new'} ${rec?.s === 'queued' ? 'is-saved' : ''} ${tapped.has(tok[0]) ? 'is-tapped' : ''}`}
                      onClick={() => open(tok)}
                      onKeyDown={(e) => { if (e.key === 'Enter') open(tok); }}>
                      {showPy ? (
                        <ruby>{tok[0]}<rt><Pinyin p={tok[1]} /></rt></ruby>
                      ) : tok[0]}
                    </span>
                  );
                })}
              </span>
              {english && (
                <span className="en-line">
                  <button className="mini-sound" aria-label="Play sentence"
                    onClick={() => speakChinese(s.tokens.map((t) => t[0]).join(''))}>
                    <Icon name="sound" size={15} />
                  </button>
                  {s.en}
                </span>
              )}
            </span>
          ))}
        </div>

        {!finished ? (
          <div className="reader-foot">
            <p className="muted">Tap any word for its pinyin and meaning.</p>
            <button className="btn btn-primary wide" onClick={finish}>
              <Icon name="check" size={18} />{custom ? 'Done' : 'Finished reading'}
            </button>
          </div>
        ) : (
          <div className="reader-done">
            <div className="seal small">读</div>
            <h3>{tapped.size === 0 ? 'Read without a single lookup.' : `You looked up ${tapped.size} word${tapped.size > 1 ? 's' : ''}.`}</h3>
            {saved.length > 0 && (
              <p className="muted">
                <span className="han">{saved.join('、')}</span> {saved.length > 1 ? 'are' : 'is'} in your practice now.
              </p>
            )}
            <button className="btn btn-primary wide" onClick={onClose}>Done</button>
          </div>
        )}
      </article>

      <WordSheet entry={sheet} profile={profile} update={update} chars={chars} onClose={() => setSheet(null)} />
    </div>
  );
}
