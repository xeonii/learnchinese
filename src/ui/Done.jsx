import { useMemo } from 'react';
import { STORIES } from '../content.js';
import { pickStory } from '../lib/plan.js';
import { dayKey, knownChars, streak } from '../lib/profile.js';
import { Icon, Pinyin } from './bits.jsx';

export default function Done({ profile, result, onRead, onHome }) {
  const known = useMemo(() => knownChars(profile), [profile]);
  const story = pickStory(profile, STORIES);
  const storyDone = story && profile.read[story.id] === dayKey();
  const accuracy = result.reviewed ? Math.round((result.knew / result.reviewed) * 100) : null;
  const gained = known.size - result.knownBefore;
  const days = streak(profile);

  return (
    <div className="done">
      <div className="seal">好</div>
      <h1>Nice work.</h1>
      <p className="muted">{days > 1 ? `${days} days in a row.` : 'Come back tomorrow to keep it going.'}</p>

      <div className="done-stats">
        <div><b>{result.reviewed}</b><span>words practiced</span></div>
        {accuracy !== null && <div><b>{accuracy}%</b><span>knew it</span></div>}
        <div><b>{gained > 0 ? `+${gained}` : known.size}</b><span>{gained > 0 ? 'characters' : 'characters known'}</span></div>
      </div>

      {result.learned.length > 0 && (
        <div className="done-new">
          <h3 className="section-title">New today</h3>
          {result.learned.map((e) => (
            <div key={e.w} className="done-word">
              <span className="han">{e.w}</span>
              <Pinyin p={e.p} />
              <span className="muted">{e.g?.split(';')[0]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="done-actions">
        {story && !storyDone && (
          <button className="btn btn-primary btn-big wide" onClick={() => onRead(story)}>
            Read today’s story · <span className="han">{story.title}</span><Icon name="arrow" size={20} />
          </button>
        )}
        <button className={`btn ${story && !storyDone ? 'btn-ghost' : 'btn-primary'} wide`} onClick={onHome}>Back to today</button>
      </div>
    </div>
  );
}
