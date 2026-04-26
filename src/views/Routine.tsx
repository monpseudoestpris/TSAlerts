import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../useAppState';
import { findRoutine } from '../routines';
import { navigate } from '../router';
import { advanceStep, clearActive } from '../state';
import * as wakelock from '../wakelock';
import { done, pulse, tap } from '../vibration';
import { ProgressRing } from '../components/ProgressRing';
import { formatMmSs } from '../utils';

interface Props { routineId: string }

export function Routine({ routineId }: Props) {
  const state = useAppState();
  const routine = findRoutine(state.customRoutines, routineId);
  const active = state.active;
  const pulsedRef = useRef(false);
  const [, force] = useState(0);

  const stepIndex = active?.stepIndex ?? 0;

  useEffect(() => { wakelock.acquire(); return () => { wakelock.release(); }; }, []);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { pulsedRef.current = false; }, [stepIndex]);

  if (!routine || !active || active.routineId !== routine.id) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Routine non démarrée.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Accueil</button>
      </main>
    );
  }

  const step = routine.steps[stepIndex];
  if (!step) return <RoutineDone routine={routine} />;

  const elapsed = Math.max(0, (Date.now() - active.stepStartedAt) / 1000);
  const remainingThisStep = Math.max(0, step.durationSec - elapsed);
  const remainingNext = routine.steps.slice(stepIndex + 1).reduce((a, s) => a + s.durationSec, 0);
  const minutesRemaining = Math.ceil((remainingThisStep + remainingNext) / 60);
  const isSuper = routine.kind === 'super';

  const onExpire = () => {
    if (pulsedRef.current) return;
    pulsedRef.current = true;
    pulse();
  };

  const handleNext = () => {
    tap();
    if (stepIndex + 1 >= routine.steps.length) {
      done();
      clearActive();
      navigate('/');
      return;
    }
    advanceStep();
  };

  const handleStop = () => {
    if (confirm('Arrêter cette routine ?')) {
      tap();
      clearActive();
      navigate('/');
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-6 flex flex-col items-center gap-6">
      <header className="w-full flex items-center justify-between">
        <button className="iconbtn" onClick={() => navigate('/')} aria-label="Accueil">🏠</button>
        <div className="text-sm text-inkSoft">
          {isSuper && <span className="mr-2 font-semibold text-accentStrong">Super-Routine</span>}
          {routine.name}
        </div>
        <button className="iconbtn" onClick={handleStop} aria-label="Arrêter">⏹️</button>
      </header>

      <div className="w-full flex gap-1.5">
        {routine.steps.map((s, i) => (
          <div
            key={s.id}
            className={'seg ' + (i < stepIndex ? 'seg-done' : i === stepIndex ? 'seg-current' : '')}
          />
        ))}
      </div>

      <ProgressRing icon={step.icon} totalSec={step.durationSec} elapsedSec={elapsed} onExpire={onExpire} />

      <h1 className="text-hero font-extrabold text-center">{step.label || 'Étape'}</h1>
      <div className="text-mega font-extrabold text-accentStrong tabular-nums">{formatMmSs(remainingThisStep)}</div>
      <p className="text-inkSoft text-sm">
        {minutesRemaining} min restantes · étape {stepIndex + 1}/{routine.steps.length}
      </p>

      <div className="w-full flex flex-col gap-3 mt-2">
        <button className="btn btn-block btn-lg btn-success" onClick={handleNext}>
          {stepIndex + 1 >= routine.steps.length ? '🎉 Terminer' : '✅ Étape suivante'}
        </button>
      </div>
    </main>
  );
}

function RoutineDone({ routine }: { routine: { name: string; icon: string } }) {
  useEffect(() => { done(); clearActive(); }, []);
  return (
    <main className="max-w-xl mx-auto p-10 text-center space-y-6">
      <div className="text-mega">{routine.icon}</div>
      <h1 className="text-hero font-extrabold">Bravo ! 🎉</h1>
      <p className="text-inkSoft">Routine « {routine.name} » terminée.</p>
      <button className="btn btn-block btn-primary" onClick={() => navigate('/')}>Accueil</button>
    </main>
  );
}
