import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../useAppState';
import { findRoutine } from '../routines';
import { navigate } from '../router';
import { markStepDone, setCurrentStep } from '../state';
import * as wakelock from '../wakelock';
import { done as vibDone, pulse, tap } from '../vibration';
import { ProgressRing } from '../components/ProgressRing';
import { ScreenAlert } from '../components/ScreenAlert';
import { formatMmSs } from '../utils';

interface Props { routineId: string; stepId: string }

export function StepFocus({ routineId, stepId }: Props) {
  const state = useAppState();
  const routine = findRoutine(state.customRoutines, routineId);
  const active = state.active;
  const pulsedRef = useRef(false);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, force] = useState(0);
  const [showScreenAlert, setShowScreenAlert] = useState(false);

  useEffect(() => { wakelock.acquire(); return () => { wakelock.release(); }; }, []);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => () => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
  }, []);
  // Marquer cette étape comme courante au mount
  useEffect(() => {
    if (active && active.routineId === routineId && active.currentStepId !== stepId) {
      setCurrentStep(stepId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId, stepId]);

  if (!routine || !active || active.routineId !== routine.id) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Routine non démarrée.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Accueil</button>
      </main>
    );
  }
  const step = routine.steps.find((s) => s.id === stepId);
  if (!step) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Étape introuvable.</p>
        <button className="btn mt-4" onClick={() => navigate('/checklist/' + routine.id)}>Retour à la liste</button>
      </main>
    );
  }

  const startedAt = active.stepStartedAt;
  const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
  const remainingThisStep = Math.max(0, step.durationSec - elapsed);

  const onExpire = () => {
    if (pulsedRef.current) return;
    pulsedRef.current = true;
    pulse();
    setShowScreenAlert(true);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setShowScreenAlert(false), 9000);
  };

  const handleDone = () => {
    tap();
    vibDone();
    markStepDone(step.id, Math.min(elapsed, step.durationSec * 2), true);
    navigate('/checklist/' + routine.id);
  };

  const handleBack = () => {
    tap();
    setCurrentStep(null);
    navigate('/checklist/' + routine.id);
  };

  const status = active.stepsStatus?.[step.id];
  const alreadyDone = !!status?.done;

  return (
    <main className="max-w-xl mx-auto px-4 py-6 flex flex-col items-center gap-6">
      <header className="w-full flex items-center justify-between">
        <button className="iconbtn" onClick={handleBack} aria-label="Retour à la liste">←</button>
        <div className="text-sm text-inkSoft">
          <span className="font-semibold">{routine.name}</span>
        </div>
        <span className="w-14" />
      </header>

      <ProgressRing
        icon={step.icon}
        totalSec={step.durationSec}
        elapsedSec={elapsed}
        onExpire={onExpire}
      />

      <h1 className="text-hero font-extrabold text-center">{step.label || 'Étape'}</h1>
      <div className="text-mega font-extrabold text-accentStrong tabular-nums">
        {formatMmSs(remainingThisStep)}
      </div>

      <div className="w-full flex flex-col gap-3 mt-2">
        <button className="btn btn-block btn-lg btn-success" onClick={handleDone}>
          {alreadyDone ? '✅ Déjà fait — revalider' : '✅ Fait'}
        </button>
        <button className="btn btn-block" onClick={handleBack}>← Retour à la liste</button>
      </div>

      <ScreenAlert
        visible={showScreenAlert}
        title="Temps écoulé"
        message="Tu peux valider l'étape quand c'est terminé."
        onClose={() => setShowScreenAlert(false)}
      />
    </main>
  );
}
