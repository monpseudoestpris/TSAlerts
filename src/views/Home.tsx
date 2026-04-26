import { useAppState } from '../useAppState';
import { DEFAULT_ROUTINES, findRoutine, userCustomRoutines } from '../routines';
import { navigate } from '../router';
import { tap } from '../vibration';
import { deleteCustomRoutine } from '../state';

function startRoutine(id: string) {
  tap();
  navigate('/buffer/' + id);
}

function editRoutine(e: React.MouseEvent, id: string) {
  e.stopPropagation();
  tap();
  navigate('/editor/' + id);
}

export function Home() {
  const state = useAppState();
  const customs = userCustomRoutines(state.customRoutines);

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-display font-extrabold tracking-tight">L'Ancre</h1>
        <button className="iconbtn" onClick={() => navigate('/settings')} aria-label="Réglages">⚙️</button>
      </header>

      <section className="grid grid-cols-2 gap-4">
        {DEFAULT_ROUTINES.map((def) => {
          const r = findRoutine(state.customRoutines, def.id) || def;
          const isSuper = r.kind === 'super';
          return (
            <div
              key={r.id}
              className={`relative ${isSuper ? 'col-span-2' : ''}`}
            >
              <button
                onClick={() => startRoutine(r.id)}
                className="card w-full flex flex-col items-center justify-center gap-2 active:shadow-neu-in"
              >
                <span className="text-6xl">{r.icon}</span>
                <span className="text-lg font-semibold">{r.name}</span>
                {isSuper && <span className="text-xs text-inkMuted">Super-Routine</span>}
              </button>
              <button
                className="iconbtn !w-10 !h-10 !text-base absolute top-2 right-2"
                onClick={(e) => editRoutine(e, r.id)}
                aria-label={`Modifier ${r.name}`}
              >✏️</button>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-inkSoft">Mes routines</h2>
        {customs.length === 0 && (
          <p className="text-sm text-inkMuted">Aucune routine personnalisée pour le moment.</p>
        )}
        <ul className="space-y-2">
          {customs.map((r) => (
            <li key={r.id} className="card-soft flex items-center gap-3">
              <button
                className="flex-1 flex items-center gap-3 text-left"
                onClick={() => startRoutine(r.id)}
              >
                <span className="text-3xl">{r.icon}</span>
                <span className="font-semibold">{r.name || 'Sans titre'}</span>
              </button>
              <button className="iconbtn" onClick={() => navigate('/editor/' + r.id)} aria-label="Modifier">✏️</button>
              <button
                className="iconbtn"
                onClick={() => { if (confirm('Supprimer cette routine ?')) deleteCustomRoutine(r.id); }}
                aria-label="Supprimer"
              >🗑️</button>
            </li>
          ))}
        </ul>
        <button className="btn btn-block btn-primary" onClick={() => navigate('/editor/new')}>
          ➕ Nouvelle routine
        </button>
      </section>
    </main>
  );
}
