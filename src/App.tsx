import { useEffect } from 'react';
import { useHashRoute, match, navigate } from './router';
import { Home } from './views/Home';
import { Buffer } from './views/Buffer';
import { Routine } from './views/Routine';
import { Resume } from './views/Resume';
import { Settings } from './views/Settings';
import { Editor } from './views/Editor';
import { Checklist } from './views/Checklist';
import { StepFocus } from './views/StepFocus';
import { IosBanner } from './components/IosBanner';
import { useAppState } from './useAppState';
import { startGeofenceWatcher } from './geofence';
import { getState } from './state';
import { findRoutine } from './routines';

export function App() {
  const route = useHashRoute();
  const state = useAppState();

  useEffect(() => {
    const isDark = !!state.flags.darkMode;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#181d25' : '#eaeef3');
  }, [state.flags.darkMode]);

  useEffect(() => {
    if (!state.geo.enabled) return;
    const stop = startGeofenceWatcher(getState, (zone) => {
      const snap = getState();
      if (snap.active) return;
      const routine = findRoutine(snap.customRoutines, zone.routineId);
      if (!routine) return;

      const ok = window.confirm(
        `Tu es proche de ${zone.name}. Lancer la routine « ${routine.name} » ?`
      );
      if (ok) navigate('/buffer/' + routine.id);
    });
    return stop;
  }, [state.geo.enabled]);

  // Deep-link depuis le SW (clic sur notification)
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const data = ev?.data;
      if (data?.type === 'open-routine' && data.routineId) {
        navigate('/buffer/' + data.routineId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, []);

  let view: JSX.Element = <Home />;
  let m: Record<string, string> | null;

  if (route.path === '/' || route.path === '') view = <Home />;
  else if (route.path === '/settings') view = <Settings />;
  else if (route.path === '/resume') view = <Resume />;
  else if ((m = match('/buffer/:id', route.path))) view = <Buffer routineId={m.id} />;
  else if ((m = match('/routine/:id', route.path))) view = <Routine routineId={m.id} />;
  else if ((m = match('/checklist/:id', route.path))) view = <Checklist routineId={m.id} />;
  else if ((m = match('/step/:rid/:sid', route.path))) view = <StepFocus routineId={m.rid} stepId={m.sid} />;
  else if ((m = match('/editor/:id', route.path))) view = <Editor id={m.id} />;
  else view = <Home />;

  return (
    <>
      {view}
      <IosBanner />
    </>
  );
}
