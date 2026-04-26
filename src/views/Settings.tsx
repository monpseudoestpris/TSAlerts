import { useMemo, useState } from 'react';
import { useAppState } from '../useAppState';
import { DEFAULT_ROUTINES, allRoutines, findRoutine, userCustomRoutines } from '../routines';
import { navigate } from '../router';
import {
  type GeofenceTask,
  deleteCustomRoutine,
  setNotificationPermission,
  setSchedule,
  setContinuousFlow,
  setDarkMode,
  setGeoCooldownMin,
  setGeoEnabled,
  setGeofenceEnabled,
  upsertGeofence,
  deleteGeofence,
} from '../state';
import { reschedule, requestPermission, scheduleTest } from '../scheduler';
import { tap } from '../vibration';
import { uid } from '../utils';

export function Settings() {
  const state = useAppState();
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [zone, setZone] = useState({
    name: '',
    routineId: 'soir',
    lat: '',
    lng: '',
    radiusM: '120',
  });
  const routines = useMemo(() => allRoutines(state), [state]);

  const onPermission = async () => {
    const p = await requestPermission();
    setNotificationPermission(p);
    if (p === 'granted') reschedule();
  };

  const onTest = async () => {
    try {
      const r = await scheduleTest(10);
      setTestMsg(`Notification programmée (${r.mode}) dans 10 s.`);
    } catch (e: any) {
      setTestMsg('Erreur : ' + (e?.message || e));
    }
  };

  const onScheduleChange = (id: string, v: string) => {
    setSchedule(id, v);
    if (state.permissions.notification === 'granted') reschedule();
  };

  const getCurrentPosition = async (): Promise<GeolocationPosition> => {
    if (!navigator.geolocation) throw new Error('Géolocalisation indisponible');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 15000,
      });
    });
  };

  const onUseCurrentPosition = async () => {
    try {
      const pos = await getCurrentPosition();
      setZone((z) => ({
        ...z,
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6),
      }));
      setGeoMsg('Position capturée.');
    } catch (e: any) {
      setGeoMsg('Erreur géoloc: ' + (e?.message || e));
    }
  };

  const onAddZone = () => {
    const lat = Number(zone.lat);
    const lng = Number(zone.lng);
    const radiusM = Math.max(30, Number(zone.radiusM || '120'));
    if (!zone.name.trim()) {
      setGeoMsg('Nom de zone requis.');
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setGeoMsg('Latitude/Longitude invalides.');
      return;
    }
    if (!zone.routineId) {
      setGeoMsg('Choisis une routine.');
      return;
    }

    const task: GeofenceTask = {
      id: uid('zone'),
      name: zone.name.trim(),
      lat,
      lng,
      radiusM,
      routineId: zone.routineId,
      enabled: true,
    };

    tap();
    upsertGeofence(task);
    setZone({ name: '', routineId: zone.routineId, lat: '', lng: '', radiusM: '120' });
    setGeoMsg('Zone ajoutée.');
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-8">
      <header className="flex items-center justify-between">
        <button className="iconbtn" onClick={() => navigate('/')} aria-label="Retour">←</button>
        <h1 className="text-display font-extrabold">Réglages</h1>
        <span className="w-14" />
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Horaires</h2>
        {DEFAULT_ROUTINES.map((def) => {
          const r = findRoutine(state.customRoutines, def.id) || def;
          return (
            <label key={r.id} className="card-soft flex items-center gap-3">
              <span className="text-2xl">{r.icon}</span>
              <span className="flex-1 font-semibold">{r.name}</span>
              <input
                type="time"
                className="field !w-32"
                value={state.schedules[r.id] || ''}
                onChange={(e) => onScheduleChange(r.id, e.target.value)}
              />
              <button
                className="iconbtn"
                onClick={() => navigate('/editor/' + r.id)}
                aria-label={`Modifier ${r.name}`}
              >✏️</button>
            </label>
          );
        })}
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Mode Flux Continu</h2>
        <p className="text-inkSoft text-sm">
          Enchaîne automatiquement les étapes après le sas de 10 s, sans appuyer.
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={state.flags.continuousFlow}
            onChange={(e) => { tap(); setContinuousFlow(e.target.checked); }}
          />
          <span>Activer</span>
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Apparence</h2>
        <p className="text-inkSoft text-sm">
          Active un fond plus sombre pour réduire l'éblouissement.
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={state.flags.darkMode}
            onChange={(e) => { tap(); setDarkMode(e.target.checked); }}
          />
          <span>Mode sombre</span>
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Géolocalisation</h2>
        <p className="text-inkSoft text-sm">
          Propose une routine quand tu entres dans une zone (app ouverte).
        </p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={state.geo.enabled}
            onChange={(e) => { tap(); setGeoEnabled(e.target.checked); }}
          />
          <span>Activer les déclencheurs de zone</span>
        </label>

        <label className="flex items-center gap-3">
          <span className="text-sm text-inkSoft">Cooldown (min)</span>
          <input
            type="number"
            min={1}
            className="field !w-24"
            value={state.geo.cooldownMin}
            onChange={(e) => setGeoCooldownMin(Number(e.target.value || '1'))}
          />
        </label>

        <div className="card-soft space-y-2">
          <div className="font-semibold">Ajouter une zone</div>
          <input
            className="field"
            placeholder="Nom (ex: Collège)"
            value={zone.name}
            onChange={(e) => setZone((z) => ({ ...z, name: e.target.value }))}
          />

          <label className="block">
            <span className="text-sm text-inkSoft">Routine</span>
            <select
              className="field"
              value={zone.routineId}
              onChange={(e) => setZone((z) => ({ ...z, routineId: e.target.value }))}
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <input
              className="field"
              placeholder="Latitude"
              value={zone.lat}
              onChange={(e) => setZone((z) => ({ ...z, lat: e.target.value }))}
            />
            <input
              className="field"
              placeholder="Longitude"
              value={zone.lng}
              onChange={(e) => setZone((z) => ({ ...z, lng: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-3">
            <span className="text-sm text-inkSoft">Rayon (m)</span>
            <input
              type="number"
              min={30}
              className="field !w-24"
              value={zone.radiusM}
              onChange={(e) => setZone((z) => ({ ...z, radiusM: e.target.value }))}
            />
          </label>

          <div className="flex gap-2 flex-wrap">
            <button className="btn" onClick={onUseCurrentPosition}>📍 Utiliser ma position</button>
            <button className="btn btn-primary" onClick={onAddZone}>➕ Ajouter zone</button>
          </div>
        </div>

        {geoMsg && <p className="text-sm text-inkSoft">{geoMsg}</p>}

        <div className="space-y-2">
          {state.geofences.length === 0 && (
            <p className="text-sm text-inkMuted">Aucune zone configurée.</p>
          )}
          {state.geofences.map((z) => {
            const rr = routines.find((r) => r.id === z.routineId);
            return (
              <div key={z.id} className="card-soft flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={z.enabled}
                    onChange={(e) => setGeofenceEnabled(z.id, e.target.checked)}
                  />
                  <span className="font-semibold">{z.name}</span>
                </label>
                <span className="text-xs text-inkSoft">
                  {rr ? `${rr.icon} ${rr.name}` : z.routineId} · {Math.round(z.radiusM)}m
                </span>
                <span className="flex-1" />
                <button
                  className="iconbtn"
                  onClick={() => { if (confirm('Supprimer cette zone ?')) deleteGeofence(z.id); }}
                  aria-label="Supprimer la zone"
                >🗑️</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-inkSoft text-sm">
          État : <b>{state.permissions.notification}</b>
        </p>
        <button className="btn btn-primary btn-block" onClick={onPermission}>
          Demander la permission
        </button>
        <button className="btn btn-block" onClick={onTest}>
          🔔 Tester (dans 10 s)
        </button>
        {testMsg && <p className="text-sm text-inkSoft">{testMsg}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mes routines</h2>
        {userCustomRoutines(state.customRoutines).length === 0 && (
          <p className="text-sm text-inkMuted">Aucune routine personnalisée.</p>
        )}
        <ul className="space-y-2">
          {userCustomRoutines(state.customRoutines).map((r) => (
            <li key={r.id} className="card-soft flex items-center gap-3">
              <span className="text-2xl">{r.icon}</span>
              <span className="flex-1 font-semibold">{r.name || 'Sans titre'}</span>
              <button className="iconbtn" onClick={() => navigate('/editor/' + r.id)} aria-label="Modifier">✏️</button>
              <button
                className="iconbtn"
                onClick={() => { if (confirm('Supprimer ?')) deleteCustomRoutine(r.id); }}
                aria-label="Supprimer"
              >🗑️</button>
            </li>
          ))}
        </ul>
        <button className="btn btn-primary btn-block" onClick={() => navigate('/editor/new')}>
          ➕ Nouvelle routine
        </button>
      </section>
    </main>
  );
}
