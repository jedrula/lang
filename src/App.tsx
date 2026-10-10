import { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Onboarding } from './screens/Onboarding';
import { Placement } from './screens/Placement';
import { Home } from './screens/Home';
import { Session, type SessionKind } from './screens/Session';
import { Course } from './screens/Course';
import { Settings } from './screens/Settings';

type Route =
  | { name: 'home' }
  | { name: 'course' }
  | { name: 'settings' }
  | { name: 'placement' }
  | { name: 'session'; kind: SessionKind; n: number };

function Shell() {
  const { state } = useStore();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const start = (kind: SessionKind) => setRoute({ name: 'session', kind, n: Date.now() });

  if (route.name === 'placement') return <Placement onDone={() => setRoute({ name: 'home' })} />;
  if (!state.onboarded) return <Onboarding onPlacement={() => setRoute({ name: 'placement' })} onSkip={() => setRoute({ name: 'home' })} />;
  if (route.name === 'session')
    return <Session key={route.n} kind={route.kind} onExit={(next) => (next ? start(next) : setRoute({ name: 'home' }))} />;

  const tab = (name: 'home' | 'course' | 'settings', label: string) => (
    <button className={`tab ${route.name === name ? 'is-on' : ''}`} aria-current={route.name === name} onClick={() => setRoute({ name } as Route)}>
      {label}
    </button>
  );

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">
          Lingo<span className="brand-dot">.</span>
          <span className="brand-sub">EN for Polish speakers</span>
        </span>
        <nav>
          {tab('home', 'Today')}
          {tab('course', 'Course')}
          {tab('settings', 'Settings')}
        </nav>
      </header>
      <main>
        {route.name === 'home' && <Home start={start} />}
        {route.name === 'course' && <Course start={start} />}
        {route.name === 'settings' && <Settings onRetakePlacement={() => setRoute({ name: 'placement' })} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
