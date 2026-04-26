import { useAppState } from '../useAppState';
import { findRoutine } from '../routines';
import { advanceStep, clearActive, setActive } from '../state';
import { navigate } from '../router';
import { tap } from '../vibration';

export function Resume() {
  const state = useAppState();
  const active = state.active;
  const routine = active ? findRoutine(state.customRoutines, active.routineId) : null;

  if (!active || !routine) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Aucune routine en cours.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Accueil</button>
      </main>
    );
  }

  const step = routine.steps[active.stepIndex];

  const resume = () => {
    tap();
    setActive({ ...active, stepStartedAt: Date.now(), remindersSent: 0 });
    navigate('/routine/' + routine.id);
  };
  const skip = () => {
    tap();
    advanceStep();
    navigate('/routine/' + routine.id);
  };
  const stop = () => {
    tap();
    clearActive();
    navigate('/');
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-10 flex flex-col items-center text-center gap-6">
      <span className="text-7xl">{routine.icon}</span>
      <h1 className="text-hero font-extrabold">{routine.name}</h1>
      <p className="text-inkSoft">
        Étape : <b>{step?.label || '—'}</b>
      </p>
      <div className="w-full flex flex-col gap-3 mt-4">
        <button className="btn btn-block btn-primary btn-lg" onClick={resume}>↩️ Reprendre cette étape</button>
        <button className="btn btn-block" onClick={skip}>⏭️ Étape suivante</button>
        <button className="btn btn-block btn-danger" onClick={stop}>⏹️ Arrêter la routine</button>
      </div>
    </main>
  );
}
