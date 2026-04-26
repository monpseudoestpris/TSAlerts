import { useAppState } from '../useAppState';
import {
  findRoutine,
  isRoutineComplete,
  nextSuggestedStepId,
} from '../routines';
import { navigate } from '../router';
import { clearActive, markStepDone, setCurrentStep } from '../state';
import { done, tap } from '../vibration';
import { formatMin } from '../utils';
import { useEffect } from 'react';
import * as wakelock from '../wakelock';

interface Props { routineId: string }

export function Checklist({ routineId }: Props) {
  const state = useAppState();
  const routine = findRoutine(state.customRoutines, routineId);
  const active = state.active;

  useEffect(() => { wakelock.acquire(); return () => { wakelock.release(); }; }, []);

  if (!routine) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Routine introuvable.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Accueil</button>
      </main>
    );
  }
  if (!active || active.routineId !== routine.id) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Routine non démarrée.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Accueil</button>
      </main>
    );
  }

  const status = active.stepsStatus || {};
  const total = routine.steps.length;
  const doneCount = routine.steps.filter((s) => status[s.id]?.done).length;
  const suggestedId = nextSuggestedStepId(routine, status);
  const complete = isRoutineComplete(routine, status);

  const openStep = (stepId: string) => {
    tap();
    setCurrentStep(stepId);
    navigate(`/step/${routine.id}/${stepId}`);
  };

  const toggleDone = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    tap();
    const wasDone = !!status[stepId]?.done;
    markStepDone(stepId, 0, !wasDone);
  };

  const finish = () => {
    done();
    clearActive();
    navigate('/');
  };
  const stop = () => {
    if (confirm('Arrêter cette routine ?')) {
      tap();
      clearActive();
      navigate('/');
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <button className="iconbtn" onClick={() => navigate('/')} aria-label="Accueil">🏠</button>
        <div className="text-sm text-inkSoft flex items-center gap-2">
          <span>{routine.icon}</span>
          <span className="font-semibold">{routine.name}</span>
        </div>
        <button className="iconbtn" onClick={stop} aria-label="Arrêter">⏹️</button>
      </header>

      <div>
        <div className="flex justify-between text-sm text-inkSoft mb-1">
          <span>Progression</span>
          <span className="tabular-nums">{doneCount}/{total}</span>
        </div>
        <div className="w-full h-3 rounded-full bg-bgDeep shadow-neu-in overflow-hidden">
          <div
            className="h-full bg-accentStrong transition-all"
            style={{ width: total > 0 ? `${(doneCount / total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <ul className="space-y-3">
        {routine.steps.map((s) => {
          const isDone = !!status[s.id]?.done;
          const isSuggested = !isDone && s.id === suggestedId;
          return (
            <li key={s.id}>
              <button
                onClick={() => openStep(s.id)}
                className={`card-soft w-full flex items-center gap-3 text-left transition ${
                  isDone ? 'opacity-60' : ''
                } ${isSuggested ? 'ring-2 ring-accentStrong animate-halo' : ''}`}
              >
                <span
                  role="checkbox"
                  aria-checked={isDone}
                  onClick={(e) => toggleDone(e, s.id)}
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-neu-sm cursor-pointer ${
                    isDone ? 'bg-success text-white' : 'bg-bg text-inkSoft'
                  }`}
                >
                  {isDone ? '✓' : ''}
                </span>
                <span className="text-3xl">{s.icon}</span>
                <span className="flex-1">
                  <span className={`block font-semibold ${isDone ? 'line-through' : ''}`}>
                    {s.label || 'Étape'}
                  </span>
                  <span className="block text-xs text-inkSoft">{formatMin(s.durationSec)}</span>
                </span>
                <span className="text-inkMuted text-xl">›</span>
              </button>
            </li>
          );
        })}
      </ul>

      {complete ? (
        <button className="btn btn-block btn-lg btn-success" onClick={finish}>
          🎉 Terminer la routine
        </button>
      ) : (
        <p className="text-center text-sm text-inkMuted">
          Choisis une tâche dans l'ordre que tu veux.
        </p>
      )}
    </main>
  );
}
