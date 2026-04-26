import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { GeofenceTask } from '../state';

type GeoCenterStatus =
  | { phase: 'idle'; accuracyM: null }
  | { phase: 'searching'; accuracyM: number | null }
  | { phase: 'done'; accuracyM: number }
  | { phase: 'fallback'; accuracyM: number | null };

interface Props {
  zones: GeofenceTask[];
  draftLat: number | null;
  draftLng: number | null;
  draftRadiusM: number;
  darkMode: boolean;
  onPick: (lat: number, lng: number) => void;
  onRadiusChange?: (m: number) => void;
}

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522];
const GOOD_ACCURACY_M = 50;
const MAX_ACCEPTABLE_ACCURACY_M = 500;
const GEO_SEARCH_MS = 8000;

function centerFromData(zones: GeofenceTask[]): [number, number] {
  const firstEnabled = zones.find((z) => z.enabled) || zones[0];
  if (firstEnabled) return [firstEnabled.lat, firstEnabled.lng];
  return DEFAULT_CENTER;
}

function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const didInit = useRef(false);

  useEffect(() => {
    if (lat === null || lng === null) return;
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.4 });
  }, [lat, lng, map]);
  return null;
}

function CenterOnUserAtStart({ onStatus }: { onStatus: (s: GeoCenterStatus) => void }) {
  const map = useMap();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    onStatus({ phase: 'searching', accuracyM: null });

    const startedAt = Date.now();
    let bestPos: GeolocationPosition | null = null;
    let bestAcc = Number.POSITIVE_INFINITY;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timerId);

      if (bestPos && bestAcc <= MAX_ACCEPTABLE_ACCURACY_M) {
        map.setView(
          [bestPos.coords.latitude, bestPos.coords.longitude],
          Math.max(map.getZoom(), 15),
          { animate: false }
        );
        onStatus({ phase: 'done', accuracyM: Math.round(bestAcc) });
      } else {
        onStatus({
          phase: 'fallback',
          accuracyM: Number.isFinite(bestAcc) ? Math.round(bestAcc) : null,
        });
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        if (Number.isFinite(acc) && acc < bestAcc) {
          bestAcc = acc;
          bestPos = pos;
          onStatus({ phase: 'searching', accuracyM: Math.round(acc) });
        }

        const elapsed = Date.now() - startedAt;
        if (bestAcc <= GOOD_ACCURACY_M || elapsed >= GEO_SEARCH_MS) {
          finish();
        }
      },
      () => {
        finish();
      },
      {
        enableHighAccuracy: true,
        timeout: GEO_SEARCH_MS,
        maximumAge: 0,
      }
    );

    const timerId: ReturnType<typeof setTimeout> = setTimeout(() => {
      finish();
    }, GEO_SEARCH_MS);

    return () => {
      finished = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timerId);
    };
  }, [map, onStatus]);

  return null;
}

export function GeofenceMap({ zones, draftLat, draftLng, draftRadiusM, darkMode, onPick, onRadiusChange }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoCenterStatus>({ phase: 'idle', accuracyM: null });
  const center = useMemo(() => centerFromData(zones), [zones]);
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const mapClass = darkMode ? 'map-canvas map-dark' : 'map-canvas';

  const geoStatusText =
    geoStatus.phase === 'searching'
      ? geoStatus.accuracyM
        ? `Recherche GPS... précision ${geoStatus.accuracyM} m`
        : 'Recherche GPS...'
      : geoStatus.phase === 'done'
        ? `Position centrée (précision ~${geoStatus.accuracyM} m)`
        : geoStatus.phase === 'fallback'
          ? geoStatus.accuracyM
            ? `Position GPS trop imprécise (~${geoStatus.accuracyM} m), centrage ignoré`
            : 'Position approximative ou indisponible (vérifie GPS/permissions)'
          : 'Prêt';

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  const renderMap = (key: string) => (
    <MapContainer
      key={key}
      center={center}
      zoom={13}
      scrollWheelZoom
      className={mapClass}
    >
      <TileLayer attribution="&copy; OpenStreetMap contributors" url={tileUrl} />
      <CenterOnUserAtStart onStatus={setGeoStatus} />
      <Picker onPick={onPick} />
      <Recenter lat={draftLat} lng={draftLng} />

      {zones.map((z) => (
        <Fragment key={`${z.id}:wrap`}>
          <Circle
            center={[z.lat, z.lng]}
            radius={Math.max(30, z.radiusM)}
            pathOptions={{
              color: z.enabled ? '#4b7da8' : '#8ea3b8',
              fillColor: z.enabled ? '#7aa2c8' : '#8ea3b8',
              fillOpacity: z.enabled ? 0.2 : 0.08,
              weight: z.enabled ? 2 : 1,
            }}
          >
            <Tooltip permanent direction="top" opacity={0.85}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {z.name}
              </span>
              <br />
              <span style={{ fontSize: '0.75em', opacity: 0.75 }}>
                {Math.round(z.radiusM)} m{!z.enabled ? ' · désactivée' : ''}
              </span>
            </Tooltip>
          </Circle>
          <CircleMarker
            center={[z.lat, z.lng]}
            radius={6}
            pathOptions={{
              color: z.enabled ? '#4b7da8' : '#8ea3b8',
              fillColor: z.enabled ? '#7aa2c8' : '#8ea3b8',
              fillOpacity: 0.95,
              weight: 2,
            }}
          />
        </Fragment>
      ))}

      {draftLat !== null && draftLng !== null && (
        <>
          <CircleMarker
            center={[draftLat, draftLng]}
            radius={8}
            pathOptions={{ color: '#4b7da8', fillColor: '#7aa2c8', fillOpacity: 0.95, weight: 2 }}
          />
          <Circle
            center={[draftLat, draftLng]}
            radius={Math.max(30, draftRadiusM)}
            pathOptions={{
              color: '#4b7da8',
              fillColor: '#7aa2c8',
              fillOpacity: 0.18,
              weight: 3,
              dashArray: '6 6',
            }}
          />
        </>
      )}
    </MapContainer>
  );

  return (
    <>
      {!isFullscreen && (
        <div className="map-shell">
          {renderMap('normal')}
          <div className="map-actions">
            <button type="button" className="btn" onClick={() => setIsFullscreen(true)}>
              ⛶ Plein écran
            </button>
            <span className="map-geo-status" aria-live="polite">{geoStatusText}</span>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="map-fullscreen" role="dialog" aria-modal="true" aria-label="Carte en plein écran">
          <div className="map-fullscreen-header">
            <strong>Choix de la zone</strong>
            <div className="flex items-center gap-2">
              <span className="map-geo-status" aria-live="polite">{geoStatusText}</span>
              <button type="button" className="btn" onClick={() => setIsFullscreen(false)}>
                Fermer
              </button>
            </div>
          </div>
          <div className="map-fullscreen-canvas">{renderMap('full')}</div>
          {onRadiusChange && (
            <div className="map-radius-bar">
              <span className="text-sm text-inkSoft" style={{ whiteSpace: 'nowrap' }}>Rayon</span>
              <input
                type="range"
                min={30}
                max={2000}
                step={10}
                value={draftRadiusM}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span className="text-sm font-semibold" style={{ whiteSpace: 'nowrap' }}>
                {draftRadiusM} m
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
