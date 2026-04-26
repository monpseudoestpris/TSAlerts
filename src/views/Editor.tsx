import { useState } from 'react';
import { useAppState } from '../useAppState';
import {
  defaultRoutine,
  isBuiltinId,
  newCustomRoutine,
  newStep,
  type Routine,
} from '../routines';
import { deleteCustomRoutine, upsertCustomRoutine } from '../state';
import { reschedule } from '../scheduler';
import { navigate } from '../router';
import { tap } from '../vibration';

const EMOJIS = ['⭐','🌅','🍽️','🌙','🛏️','🎒','📚','🧘','🎨','🎮','🐱','🌿','🚿','🪥','🧦','🍎','💧','🎵','🧩','🧠'];

interface Props { id: string }

function loadOrNew(state: ReturnType<typeof useAppState>, id: string): Routine {
  if (id === 'new') return newCustomRoutine();
  // Override existant ?
  const override = state.customRoutines.find((r) => r.id === id);
  if (override) return structuredClone(override);
  // Builtin sans override : on clone la version par défaut comme base éditable
  const def = defaultRoutine(id);
  if (def) return structuredClone(def);
  return newCustomRoutine();
}

export function Editor({ id }: Props) {
  const state = useAppState();
  const [draft, setDraft] = useState<Routine>(() => loadOrNew(state, id));
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Routine>) => setDraft((d) => ({ ...d, ...patch }));
  const updateStep = (idx: number, patch: Partial<Routine['steps'][number]>) =>
    setDraft((d) => {
      const steps = d.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return { ...d, steps };
    });
  const moveStep = (idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = idx + dir;
      if (j < 0 || j >= d.steps.length) return d;
      const steps = d.steps.slice();
      [steps[idx], steps[j]] = [steps[j], steps[idx]];
      return { ...d, steps };
    });
  const removeStep = (idx: number) =>
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== idx) }));
  const addStep = () =>
    setDraft((d) => ({ ...d, steps: [...d.steps, newStep()] }));

  const builtin = id !== 'new' && isBuiltinId(id);
  const hasOverride = builtin && state.customRoutines.some((r) => r.id === id);

  const save = () => {
    if (!draft.name.trim()) { setError('Donne un nom à la routine.'); return; }
    if (draft.steps.length === 0) { setError('Ajoute au moins une étape.'); return; }
    for (const s of draft.steps) {
      if (!s.label.trim()) { setError('Chaque étape doit avoir un nom.'); return; }
      if (!s.durationSec || s.durationSec < 30) { setError('Durée mini : 30 s.'); return; }
    }
    tap();
    // Pour un builtin on conserve l'id d'origine (override)
    upsertCustomRoutine(builtin ? { ...draft, id, builtin: true } : draft);
    if (state.permissions.notification === 'granted') reschedule();
    navigate('/');
  };

  const resetBuiltin = () => {
    if (!hasOverride) return;
    if (!confirm('Réinitialiser cette routine à sa version par défaut ?')) return;
    tap();
    deleteCustomRoutine(id);
    if (state.permissions.notification === 'granted') reschedule();
    navigate('/');
  };

  const deleteCustom = () => {
    if (id === 'new' || builtin) return;
    if (!confirm('Supprimer cette routine ?')) return;
    tap();
    deleteCustomRoutine(id);
    if (state.permissions.notification === 'granted') reschedule();
    navigate('/');
  };

  const title = id === 'new' ? 'Nouvelle' : builtin ? 'Modifier (par défaut)' : 'Modifier';

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <button className="iconbtn" onClick={() => navigate('/')} aria-label="Retour">←</button>
        <h1 className="text-display font-extrabold">{title}</h1>
        <span className="w-14" />
      </header>

      <section className="card space-y-4">
        <label className="block">
          <span className="block text-sm font-semibold mb-1">Nom</span>
          <input
            className="field"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Ex : Préparer le sac"
          />
        </label>

        <div>
          <span className="block text-sm font-semibold mb-2">Icône</span>
          <div className="grid grid-cols-10 gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => update({ icon: e })}
                className={`iconbtn !w-10 !h-10 !text-xl ${draft.icon === e ? 'shadow-neu-in' : ''}`}
                type="button"
              >{e}</button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-semibold mb-1">Heure de rappel (optionnel)</span>
          <input
            type="time"
            className="field !w-32"
            value={draft.scheduledAt || ''}
            onChange={(e) => update({ scheduledAt: e.target.value || null })}
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.kind === 'super'}
            onChange={(e) => update({ kind: e.target.checked ? 'super' : undefined })}
          />
          <span>Cette routine enchaîne plusieurs blocs (Super-Routine)</span>
        </label>

        <div>
          <span className="block text-sm font-semibold mb-2">Mode</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update({ mode: 'sequential' })}
              className={`card-soft text-left transition ${
                (draft.mode ?? 'sequential') === 'sequential'
                  ? 'shadow-neu-in ring-2 ring-accentStrong'
                  : ''
              }`}
            >
              <div className="text-2xl">🚇</div>
              <div className="font-semibold">Tunnel</div>
              <div className="text-xs text-inkSoft">Étapes dans l'ordre, une à la fois.</div>
            </button>
            <button
              type="button"
              onClick={() => update({ mode: 'flexible' })}
              className={`card-soft text-left transition ${
                draft.mode === 'flexible' ? 'shadow-neu-in ring-2 ring-accentStrong' : ''
              }`}
            >
              <div className="text-2xl">📋</div>
              <div className="font-semibold">Menu</div>
              <div className="text-xs text-inkSoft">Coche les tâches dans l'ordre que tu veux.</div>
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Étapes</h2>
        {draft.steps.map((s, i) => (
          <div key={s.id} className="card-soft space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="field flex-1"
                value={s.label}
                onChange={(e) => updateStep(i, { label: e.target.value })}
                placeholder="Nom de l'étape"
              />
              <input
                className="field !w-16 text-center text-2xl"
                value={s.icon}
                onChange={(e) => updateStep(i, { icon: e.target.value.slice(0, 4) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-inkSoft">Durée</label>
              <input
                type="number"
                min={1}
                className="field !w-20"
                value={Math.round(s.durationSec / 60)}
                onChange={(e) => updateStep(i, { durationSec: Math.max(30, Number(e.target.value) * 60) })}
              />
              <span className="text-sm">min</span>
              <span className="flex-1" />
              <button className="iconbtn" onClick={() => moveStep(i, -1)} aria-label="Monter">↑</button>
              <button className="iconbtn" onClick={() => moveStep(i, 1)} aria-label="Descendre">↓</button>
              <button className="iconbtn" onClick={() => removeStep(i)} aria-label="Supprimer">🗑️</button>
            </div>
          </div>
        ))}
        <button className="btn btn-block" onClick={addStep}>➕ Ajouter une étape</button>
      </section>

      {error && <p className="text-rose-700 font-semibold">{error}</p>}

      <button className="btn btn-block btn-primary btn-lg" onClick={save}>💾 Enregistrer</button>

      {builtin && hasOverride && (
        <button className="btn btn-block" onClick={resetBuiltin}>
          ↩️ Réinitialiser aux valeurs par défaut
        </button>
      )}
      {!builtin && id !== 'new' && (
        <button className="btn btn-block btn-danger" onClick={deleteCustom}>
          🗑️ Supprimer cette routine
        </button>
      )}
    </main>
  );
}
