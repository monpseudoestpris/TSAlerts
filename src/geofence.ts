import type { AppState, GeofenceTask } from './state';

function toRad(v: number): number {
  return (v * Math.PI) / 180;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isValidZone(z: GeofenceTask): boolean {
  return Number.isFinite(z.lat) && Number.isFinite(z.lng) && Number.isFinite(z.radiusM) && z.radiusM > 10;
}

export function startGeofenceWatcher(
  getSnapshot: () => AppState,
  onEnterZone: (zone: GeofenceTask, pos: GeolocationPosition) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return () => {};

  const inside = new Set<string>();
  const lastTriggerAt = new Map<string, number>();

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const s = getSnapshot();
      if (!s.geo.enabled) return;

      const now = Date.now();
      const cooldownMs = Math.max(1, s.geo.cooldownMin || 30) * 60 * 1000;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      for (const zone of s.geofences) {
        if (!zone.enabled || !isValidZone(zone)) continue;

        const d = distanceMeters(lat, lng, zone.lat, zone.lng);
        const isInside = d <= zone.radiusM;

        if (isInside && !inside.has(zone.id)) {
          const last = lastTriggerAt.get(zone.id) || 0;
          if (now - last >= cooldownMs) {
            lastTriggerAt.set(zone.id, now);
            onEnterZone(zone, pos);
          }
          inside.add(zone.id);
        }

        if (!isInside && inside.has(zone.id)) {
          inside.delete(zone.id);
        }
      }
    },
    (err) => {
      console.warn('Geolocation watch error', err?.code, err?.message);
    },
    {
      enableHighAccuracy: false,
      maximumAge: 15000,
      timeout: 20000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
