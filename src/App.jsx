import { useCallback, useEffect, useState } from 'react';
import { stampChars, emptyProfile } from './lib/profile.js';
import { loadProfile, saveProfile } from './lib/store.js';
import { Icon } from './ui/bits.jsx';
import Done from './ui/Done.jsx';
import Library from './ui/Library.jsx';
import Me from './ui/Me.jsx';
import Onboarding from './ui/Onboarding.jsx';
import Reader from './ui/Reader.jsx';
import Session from './ui/Session.jsx';
import Today from './ui/Today.jsx';
import Words from './ui/Words.jsx';

const TABS = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'read', label: 'Read', icon: 'book' },
  { key: 'words', label: 'Words', icon: 'list' },
  { key: 'me', label: 'Me', icon: 'user' },
];

export default function App() {
  const [profile, setProfile] = useState(null);
  const [boot, setBoot] = useState({ loading: true, migrated: 0 });
  const [onboarding, setOnboarding] = useState(false);
  const [tab, setTab] = useState('today');
  // Full-screen overlays: { kind: 'session' | 'done' | 'reader' | 'placement', ... }
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    loadProfile().then((res) => {
      const p = res?.profile || emptyProfile();
      setProfile(p);
      setOnboarding(!p.placed);
      setBoot({ loading: false, migrated: res?.migrated ? Object.keys(p.words).length : 0 });
    });
  }, []);

  const update = useCallback((fn) => {
    setProfile((p) => {
      const next = stampChars(fn(p));
      saveProfile(next);
      return next;
    });
  }, []);

  const replace = useCallback((next) => {
    if (!next.placed) setOnboarding(true);
    const stamped = stampChars(next);
    saveProfile(stamped);
    setProfile(stamped);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [tab, overlay?.kind]);

  if (boot.loading || !profile) {
    return <div className="boot"><span className="han">字</span></div>;
  }

  if (onboarding || !profile.placed || overlay?.kind === 'placement') {
    return (
      <Onboarding
        profile={profile}
        replace={replace}
        migratedCount={boot.migrated}
        skipWelcome={overlay?.kind === 'placement'}
        onCancel={overlay?.kind === 'placement' ? () => setOverlay(null) : null}
        onFinish={() => { setOnboarding(false); setOverlay(null); setTab('today'); }}
      />
    );
  }

  const read = (story, custom = false) => setOverlay({ kind: 'reader', story, custom });

  if (overlay?.kind === 'session') {
    return (
      <Session
        profile={profile}
        update={update}
        extraNew={overlay.extraNew}
        onExit={() => setOverlay(null)}
        onDone={(result) => setOverlay({ kind: 'done', result })}
      />
    );
  }
  if (overlay?.kind === 'done') {
    return <Done profile={profile} result={overlay.result} onRead={(s) => read(s)} onHome={() => setOverlay(null)} />;
  }
  if (overlay?.kind === 'reader') {
    return <Reader story={overlay.story} custom={overlay.custom} profile={profile} update={update} onClose={() => setOverlay(null)} />;
  }

  return (
    <div className="shell">
      <main>
        {tab === 'today' && (
          <Today profile={profile} update={update} onStart={(more) => setOverlay({ kind: 'session', extraNew: more ? 5 : 0 })} onRead={read} />
        )}
        {tab === 'read' && <Library profile={profile} onRead={read} />}
        {tab === 'words' && <Words profile={profile} update={update} />}
        {tab === 'me' && (
          <Me profile={profile} update={update} onReplace={replace} onRedoPlacement={() => setOverlay({ kind: 'placement' })} />
        )}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={23} stroke={tab === t.key ? 2.1 : 1.7} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
