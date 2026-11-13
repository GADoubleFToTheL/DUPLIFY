import { lazy, Suspense, useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { setSoundEnabled, unlockAudio } from './audio/sfx';
import { setVoiceEnabled } from './audio/voice';
import { useSettings } from './state/settingsStore';
import { Build } from './ui/screens/Build';
import { Gallery } from './ui/screens/Gallery';
import { Home } from './ui/screens/Home';
import { Ideas } from './ui/screens/Ideas';
import { ParentArea } from './ui/screens/parent/ParentArea';

// Entwickler-Seiten nur bei Bedarf laden
const DevParts = lazy(() => import('./ui/screens/dev/DevParts').then((m) => ({ default: m.DevParts })));
const DevBuild = lazy(() => import('./ui/screens/dev/DevBuild').then((m) => ({ default: m.DevBuild })));
const DevRecipes = lazy(() => import('./ui/screens/dev/DevRecipes').then((m) => ({ default: m.DevRecipes })));

export function App() {
  const sound = useSettings((s) => s.sound);
  const voice = useSettings((s) => s.voice);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => setVoiceEnabled(voice), [voice]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <Router hook={useHashLocation}>
      <Suspense fallback={null}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/ideen" component={Ideas} />
        <Route path="/bauen" component={Build} />
        <Route path="/bauwerke" component={Gallery} />
        <Route path="/eltern" nest component={ParentArea} />
        <Route path="/dev/teile" component={DevParts} />
        <Route path="/dev/bauen" component={DevBuild} />
        <Route path="/dev/rezepte" component={DevRecipes} />
        <Route component={Home} />
      </Switch>
      </Suspense>
    </Router>
  );
}
