import { useEffect, useState } from 'react';
import { useAppState } from '../useAppState';
import { findRoutine, routineMode, type Routine } from '../routines';
import { navigate } from '../router';
import { startRoutine } from '../state';
import * as wakelock from '../wakelock';
import { tap } from '../vibration';

interface Props { routineId: string }

function targetPath(routine: Routine): string {
  return routineMode(routine) === 'flexible'
    ? '/checklist/' + routine.id
    : '/routine/' + routine.id;
}

export function Buffer({ routineId }: Props) {
  const state = useAppState();
  const routine = findRoutine(state.customRoutines, routineId);
  const [remaining, setRemaining] = useState(10);

  useEffect(() => {
    if (!routine) return;
    wakelock.acquire();
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => { clearInterval(id); wakelock.release(); };
  }, [routine]);

  useEffect(() => {
    if (remaining <= 0 && routine) {
      startRoutine(routine.id);
      navigate(targetPath(routine));
    }
  }, [remaining, routine]);

  if (!routine) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Routine introuvable.</p>
        <button className="btn mt-4" onClick={() => navigate('/')}>Retour</button>
      </main>
    );
  }

  const skip = () => { tap(); startRoutine(routine.id); navigate(targetPath(routine)); };
  const cancel = () => { tap(); navigate('/'); };

  return (
    <main className="max-w-xl mx-auto px-4 py-10 flex flex-col items-center text-center gap-8">
      <span className="text-7xl">{routine.icon}</span>
      <h1 className="text-hero font-extrabold">{routine.name}</h1>
      <p className="text-inkSoft">On s'installe…</p>
      <div className="text-mega font-extrabold text-accentStrong tabular-nums">{Math.max(0, remaining)}</div>
      <div className="flex flex-col gap-3 w-full">
        <button className="btn btn-block btn-primary" onClick={skip}>Passer</button>
        <button className="btn btn-block" onClick={cancel}>Annuler</button>
      </div>
    </main>
  );
}
