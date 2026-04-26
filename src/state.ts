// Store + persistance localStorage. Compatible useSyncExternalStore (React).
import { DEFAULT_SCHEDULES, type ActiveState, type Routine } from './routines';
import { debounce } from './utils';

const STORAGE_KEY = 'lancre.v1';

export type ThemeName = 'light' | 'dark' | 'gold' | 'green-leaf' | 'tree';

export interface GeofenceTask {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  routineId: string;
  enabled: boolean;
}

export interface AppState {
  customRoutines: Routine[];
  schedules: Record<string, string>;
  active: ActiveState | null;
  geofences: GeofenceTask[];
  geo: { enabled: boolean; cooldownMin: number };
  permissions: { notification: NotificationPermission };
  flags: {
    iosBannerDismissed: boolean;
    continuousFlow: boolean;
    darkMode: boolean;
    theme: ThemeName;
  };
}

const initial: AppState = {
  customRoutines: [],
  schedules: { ...DEFAULT_SCHEDULES },
  active: null,
  geofences: [],
  geo: { enabled: false, cooldownMin: 30 },
  permissions: {
    notification: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  },
  flags: { iosBannerDismissed: false, continuousFlow: false, darkMode: false, theme: 'light' },
};

let state: AppState = load();
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initial);
    const parsed = JSON.parse(raw);
    const rawTheme = parsed?.flags?.theme;
    const migratedTheme = normalizeTheme(rawTheme)
      || (parsed?.flags?.darkMode ? 'dark' : 'light');

    return {
      ...structuredClone(initial),
      ...parsed,
      schedules: { ...initial.schedules, ...(parsed.schedules || {}) },
      geo: { ...initial.geo, ...(parsed.geo || {}) },
      flags: {
        ...initial.flags,
        ...(parsed.flags || {}),
        theme: migratedTheme,
        darkMode: migratedTheme === 'dark',
      },
      geofences: Array.isArray(parsed.geofences) ? parsed.geofences : [],
    };
  } catch {
    return structuredClone(initial);
  }
}

function normalizeTheme(value: unknown): ThemeName | null {
  if (value === 'light' || value === 'dark' || value === 'gold'
    || value === 'green-leaf' || value === 'tree') return value;
  return null;
}

const persist = debounce(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}, 200);

export function getState(): AppState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit() {
  for (const fn of listeners) {
    try { fn(); } catch (e) { console.error(e); }
  }
}

export function update(mutator: (draft: AppState) => void): void {
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  persist();
  emit();
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    state = load();
    emit();
  }
});

// ---- Helpers métier ----

export function startRoutine(routineId: string): void {
  update((s) => {
    s.active = {
      routineId,
      stepIndex: 0,
      stepStartedAt: Date.now(),
      remindersSent: 0,
      stepsStatus: {},
      currentStepId: null,
    };
  });
}

export function advanceStep(): void {
  update((s) => {
    if (!s.active) return;
    s.active.stepIndex += 1;
    s.active.stepStartedAt = Date.now();
    s.active.remindersSent = 0;
  });
}

export function markStepDone(stepId: string, timeSpent = 0, done = true): void {
  update((s) => {
    if (!s.active) return;
    if (!s.active.stepsStatus) s.active.stepsStatus = {};
    const prev = s.active.stepsStatus[stepId] || { done: false, timeSpent: 0 };
    s.active.stepsStatus[stepId] = { done, timeSpent: prev.timeSpent + Math.max(0, timeSpent) };
    if (s.active.currentStepId === stepId && done) s.active.currentStepId = null;
  });
}

export function setCurrentStep(stepId: string | null): void {
  update((s) => {
    if (!s.active) return;
    s.active.currentStepId = stepId;
    s.active.stepStartedAt = Date.now();
  });
}

export function setActive(active: ActiveState | null): void {
  update((s) => { s.active = active; });
}

export function clearActive(): void {
  update((s) => { s.active = null; });
}

export function bumpReminders(): void {
  update((s) => {
    if (!s.active) return;
    s.active.remindersSent = (s.active.remindersSent || 0) + 1;
  });
}

export function upsertCustomRoutine(routine: Routine): void {
  update((s) => {
    const i = s.customRoutines.findIndex((r) => r.id === routine.id);
    if (i >= 0) s.customRoutines[i] = routine;
    else s.customRoutines.push(routine);
  });
}

export function deleteCustomRoutine(id: string): void {
  update((s) => {
    s.customRoutines = s.customRoutines.filter((r) => r.id !== id);
    if (s.active?.routineId === id) s.active = null;
  });
}

export function setSchedule(routineId: string, hhmm: string): void {
  update((s) => { s.schedules[routineId] = hhmm; });
}

export function setNotificationPermission(p: NotificationPermission): void {
  update((s) => { s.permissions.notification = p; });
}

export function dismissIosBanner(): void {
  update((s) => { s.flags.iosBannerDismissed = true; });
}

export function setContinuousFlow(enabled: boolean): void {
  update((s) => { s.flags.continuousFlow = !!enabled; });
}

export function setDarkMode(enabled: boolean): void {
  update((s) => {
    s.flags.darkMode = !!enabled;
    s.flags.theme = enabled ? 'dark' : 'light';
  });
}

export function setTheme(theme: ThemeName): void {
  update((s) => {
    const next = normalizeTheme(theme) || 'light';
    s.flags.theme = next;
    s.flags.darkMode = next === 'dark';
  });
}

export function setGeoEnabled(enabled: boolean): void {
  update((s) => { s.geo.enabled = !!enabled; });
}

export function setGeoCooldownMin(minutes: number): void {
  update((s) => { s.geo.cooldownMin = Math.max(1, Math.round(minutes || 1)); });
}

export function upsertGeofence(task: GeofenceTask): void {
  update((s) => {
    const i = s.geofences.findIndex((z) => z.id === task.id);
    if (i >= 0) s.geofences[i] = task;
    else s.geofences.push(task);
  });
}

export function deleteGeofence(id: string): void {
  update((s) => {
    s.geofences = s.geofences.filter((z) => z.id !== id);
  });
}

export function setGeofenceEnabled(id: string, enabled: boolean): void {
  update((s) => {
    const zone = s.geofences.find((z) => z.id === id);
    if (zone) zone.enabled = !!enabled;
  });
}
