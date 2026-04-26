import { uid } from './utils';

export interface Step {
  id: string;
  label: string;
  icon: string;
  durationSec: number;
}

export type RoutineMode = 'sequential' | 'flexible';

export interface Routine {
  id: string;
  name: string;
  icon: string;
  steps: Step[];
  builtin?: boolean;
  kind?: 'super';
  /** 'sequential' (Tunnel, défaut) ou 'flexible' (Menu / checklist libre). */
  mode?: RoutineMode;
  scheduledAt?: string | null;
}

export interface StepStatus {
  done: boolean;
  timeSpent: number;
}

export interface ActiveState {
  routineId: string;
  /** Mode séquentiel : index de l'étape courante. */
  stepIndex: number;
  stepStartedAt: number;
  remindersSent?: number;
  /** Mode flexible : statut par étape (clé = stepId). */
  stepsStatus?: Record<string, StepStatus>;
  /** Mode flexible : étape actuellement ouverte en focus (timer). */
  currentStepId?: string | null;
}

export const DEFAULT_ROUTINES: Routine[] = [
  {
    id: 'matin', name: 'Matin', icon: '🌅', builtin: true,
    steps: [
      { id: 'm1', label: 'Lever',     icon: '🛌', durationSec: 5 * 60 },
      { id: 'm2', label: 'Habillage', icon: '👕', durationSec: 10 * 60 },
      { id: 'm3', label: 'Sac',       icon: '🎒', durationSec: 5 * 60 },
    ],
  },
  {
    id: 'midi', name: 'Midi', icon: '🍽️', builtin: true,
    steps: [
      { id: 'd1', label: 'Mettre la table', icon: '🍴', durationSec: 3 * 60 },
      { id: 'd2', label: 'Repas',           icon: '🥗', durationSec: 15 * 60 },
      { id: 'd3', label: 'Débarrasser',     icon: '🧽', durationSec: 3 * 60 },
    ],
  },
  {
    id: 'retour-college', name: 'Retour Collège', icon: '🎒',
    kind: 'super', builtin: true,
    steps: [
      { id: 'rc1', label: 'Goûter',      icon: '🍪', durationSec: 15 * 60 },
      { id: 'rc2', label: 'Repos',       icon: '🌿', durationSec: 30 * 60 },
      { id: 'rc3', label: 'Lecture ENT', icon: '📖', durationSec: 10 * 60 },
    ],
  },
  {
    id: 'soir', name: 'Soir', icon: '🌙', builtin: true,
    steps: [
      { id: 's1', label: 'Devoirs', icon: '📚', durationSec: 20 * 60 },
      { id: 's2', label: 'Pause',   icon: '🌿', durationSec: 10 * 60 },
      { id: 's3', label: 'Repas',   icon: '🍲', durationSec: 20 * 60 },
    ],
  },
  {
    id: 'coucher', name: 'Coucher', icon: '🛏️', builtin: true,
    steps: [
      { id: 'c1', label: 'Pyjama',      icon: '🩲', durationSec: 5 * 60 },
      { id: 'c2', label: 'Dents',       icon: '🪥', durationSec: 3 * 60 },
      { id: 'c3', label: 'Mise au lit', icon: '😴', durationSec: 2 * 60 },
    ],
  },
];

export const DEFAULT_SCHEDULES: Record<string, string> = {
  matin: '07:00',
  midi: '12:00',
  'retour-college': '17:00',
  soir: '19:00',
  coucher: '21:30',
};

export function newCustomRoutine(): Routine {
  return {
    id: uid('r'),
    name: '',
    icon: '⭐',
    builtin: false,
    scheduledAt: null,
    steps: [newStep()],
  };
}

export function newStep(): Step {
  return { id: uid('s'), label: '', icon: '✅', durationSec: 5 * 60 };
}

export function totalDurationSec(routine: Routine | null | undefined): number {
  return (routine?.steps || []).reduce((acc, s) => acc + (s.durationSec || 0), 0);
}

export function isBuiltinId(id: string): boolean {
  return DEFAULT_ROUTINES.some((r) => r.id === id);
}

export function defaultRoutine(id: string): Routine | null {
  return DEFAULT_ROUTINES.find((r) => r.id === id) || null;
}

/** Override (customRoutines) prioritaire sur la version par défaut. */
export function findRoutine(customRoutines: Routine[], id: string | null | undefined): Routine | null {
  if (!id) return null;
  return customRoutines.find((r) => r.id === id) || DEFAULT_ROUTINES.find((r) => r.id === id) || null;
}

/** Liste les routines personnelles (= non override d'un builtin). */
export function userCustomRoutines(customRoutines: Routine[]): Routine[] {
  return customRoutines.filter((r) => !isBuiltinId(r.id));
}

export function getScheduledTime(state: { schedules: Record<string, string>; customRoutines: Routine[] }, routineId: string): string | null {
  if (DEFAULT_SCHEDULES[routineId] !== undefined) {
    return state.schedules[routineId] || null;
  }
  const r = state.customRoutines.find((x) => x.id === routineId);
  return r?.scheduledAt || null;
}

export function allRoutines(state: { customRoutines: Routine[] }): Routine[] {
  const overridden = DEFAULT_ROUTINES.map(
    (r) => state.customRoutines.find((c) => c.id === r.id) || r
  );
  return [...overridden, ...userCustomRoutines(state.customRoutines)];
}

export function routineMode(r: Routine): RoutineMode {
  return r.mode === 'flexible' ? 'flexible' : 'sequential';
}

export function nextSuggestedStepId(routine: Routine, status: Record<string, StepStatus> | undefined): string | null {
  for (const s of routine.steps) {
    if (!status?.[s.id]?.done) return s.id;
  }
  return null;
}

export function isRoutineComplete(routine: Routine, status: Record<string, StepStatus> | undefined): boolean {
  if (routine.steps.length === 0) return false;
  return routine.steps.every((s) => status?.[s.id]?.done);
}
