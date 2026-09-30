import { useEffect, useRef, useState } from 'react';
import { speakChinese } from '../lib/audio.js';
import { pinyinSyllables } from '../lib/pinyin.js';

const paths = {
  home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /></>,
  book: <><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" /><path d="M12 6v13.5" /></>,
  list: <><path d="M8 7h12M8 12h12M8 17h12" /><circle cx="4" cy="7" r=".6" /><circle cx="4" cy="12" r=".6" /><circle cx="4" cy="17" r=".6" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" /></>,
  sound: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.2 1.5.9 2.6 1.9 3.1C11 8.6 11 5.6 12 3z" />,
  globe: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8c-2.2-2.3-3.2-5-3.2-8s1-5.7 3.2-8z" /></>,
  paste: <><rect x="6" y="5" width="12" height="15" rx="2" /><path d="M9.5 5V3.5h5V5M9 10h6M9 13.5h6M9 17h3.5" /></>,
};

export function Icon({ name, size = 22, stroke = 1.8, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {paths[name]}
    </svg>
  );
}

/** Tone-colored pinyin. */
export function Pinyin({ p, className = '' }) {
  return (
    <span className={`pinyin ${className}`}>
      {pinyinSyllables(p).map((s, i) => <span key={i} className={`t${s.tone}`}>{s.text}</span>)}
    </span>
  );
}

export function SoundButton({ text, auto = false, size = 'md', label = 'Play audio' }) {
  const [playing, setPlaying] = useState(false);
  const play = async (e) => {
    e?.stopPropagation();
    setPlaying(true);
    try { await speakChinese(text); } finally { setTimeout(() => setPlaying(false), 700); }
  };
  useEffect(() => {
    if (auto && text) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text]);
  return (
    <button type="button" className={`sound sound-${size} ${playing ? 'is-playing' : ''}`} onClick={play} aria-label={label}>
      <Icon name="sound" size={size === 'lg' ? 26 : 20} />
    </button>
  );
}

/** Progress ring. value 0..1 */
export function Ring({ value, size = 132, stroke = 10, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, shown))} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Sheet({ open, onClose, children, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={label} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}

export function pct(x) {
  if (x > 0 && x < 0.01) return '<1%';
  return `${Math.round(x * 100)}%`;
}

export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

export function relativeDays(due, now = Date.now()) {
  const days = Math.round((due - now) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 30) return `in ${days} days`;
  if (days < 365) return `in ${Math.round(days / 30)} mo`;
  return `in ${(days / 365).toFixed(1)} yr`;
}
