import { DECK_INDEX } from '../content.js';
import { pinyinSyllables } from '../lib/pinyin.js';
import { charStatus, hanzi, markKnown, queueWord, removeWord } from '../lib/profile.js';
import { Icon, Pinyin, Sheet, SoundButton, haptic, relativeDays } from './bits.jsx';

export function statusOf(rec, now = Date.now()) {
  if (!rec) return { key: 'new', label: 'New to you' };
  if (rec.s === 'known') return { key: 'known', label: 'You know this' };
  if (rec.s === 'queued') return { key: 'queued', label: 'Saved · you’ll learn it soon' };
  if (rec.card?.due <= now) return { key: 'due', label: 'Due for review' };
  return { key: 'active', label: `Learning · next review ${relativeDays(rec.card?.due, now)}` };
}

export function WordSheet({ entry, profile, update, onClose, chars }) {
  const open = !!entry;
  if (!open) return <Sheet open={false} />;
  const rec = profile.words[entry.w];
  const info = { ...entry, ...(rec || {}) };
  const status = statusOf(rec);
  const cs = chars || charStatus(profile);
  const syl = pinyinSyllables(info.p);
  const perChar = hanzi(info.w);

  const save = () => { haptic(); update((p) => queueWord(p, info, 'story')); };
  const unsave = () => update((p) => removeWord(p, info.w));
  const know = () => { haptic(); update((p) => markKnown(p, info, 'manual')); };

  return (
    <Sheet open={open} onClose={onClose} label={info.w}>
      <div className="ws">
        <div className="ws-head">
          <div className="ws-word han">{info.w}</div>
          <SoundButton text={info.w} auto size="lg" />
        </div>
        <Pinyin p={info.p} className="ws-pinyin" />
        {info.g && <p className="ws-gloss">{info.g}</p>}
        <div className={`ws-status st-${status.key}`}><span className="dot" />{status.label}</div>

        {perChar.length > 1 && (
          <div className="ws-chars">
            {perChar.map((ch, i) => {
              const st = cs.get(ch);
              const d = DECK_INDEX.get(ch);
              return (
                <div key={i} className={`ws-char ${st?.known ? 'is-known' : st ? 'is-learning' : ''}`}>
                  <span className="han">{ch}</span>
                  <small>{syl.length === perChar.length ? syl[i].text : d?.p}</small>
                  {d?.g && <em>{d.g.split(';')[0]}</em>}
                </div>
              );
            })}
          </div>
        )}

        <div className="ws-actions">
          {status.key === 'new' && (
            <>
              <button className="btn btn-ghost" onClick={know}>I know this</button>
              <button className="btn btn-primary" onClick={save}><Icon name="plus" size={18} />Learn this</button>
            </>
          )}
          {status.key === 'queued' && (
            <button className="btn btn-ghost wide" onClick={unsave}><Icon name="check" size={18} />Saved · tap to remove</button>
          )}
          {(status.key === 'known' || status.key === 'active') && (
            <button className="btn btn-ghost wide" onClick={save}>I forgot this · review it today</button>
          )}
          {status.key === 'due' && <p className="ws-note">It’s in today’s practice.</p>}
        </div>
      </div>
    </Sheet>
  );
}
