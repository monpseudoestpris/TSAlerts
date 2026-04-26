// Scheduler — Notification Triggers + fallback setTimeout.
import { allRoutines, getScheduledTime } from './routines';
import { getState } from './state';
import { nextOccurrenceMs } from './utils';
import { PATTERNS } from './vibration';

const TAG_PREFIX = 'lancre:routine:';
const fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function supportsTriggers(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'showTrigger' in (Notification as any).prototype;
}

export function notifPermission(): NotificationPermission {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

export async function reschedule(): Promise<void> {
  await cancelAll();
  if (notifPermission() !== 'granted') return;

  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return;

  const state = getState();
  const useTriggers = supportsTriggers();

  for (const r of allRoutines(state)) {
    const hhmm = getScheduledTime(state, r.id);
    if (!hhmm) continue;
    const ts = nextOccurrenceMs(hhmm);
    if (!ts) continue;

    const title = `C'est l'heure : ${r.name}`;
    const options: NotificationOptions & { showTrigger?: any; vibrate?: number[] } = {
      body: 'Touche la notification pour démarrer.',
      tag: TAG_PREFIX + r.id,
      icon: 'icons/icon.svg',
      badge: 'icons/icon.svg',
      requireInteraction: true,
      vibrate: [...PATTERNS.pulse],
      silent: false,
      data: { routineId: r.id },
    };

    if (useTriggers) {
      try {
        await reg.showNotification(title, {
          ...options,
          showTrigger: new (window as any).TimestampTrigger(ts),
        } as NotificationOptions);
        continue;
      } catch { /* fallback below */ }
    }

    const delay = ts - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      const id = setTimeout(() => {
        reg.showNotification(title, options).catch(() => {});
      }, delay);
      fallbackTimers.set(r.id, id);
    }
  }
}

export async function cancelAll(): Promise<void> {
  for (const id of fallbackTimers.values()) clearTimeout(id);
  fallbackTimers.clear();
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return;
  try {
    const list = await reg.getNotifications({ includeTriggered: false } as any);
    for (const n of list) {
      if (n.tag && n.tag.startsWith(TAG_PREFIX)) n.close();
    }
  } catch {}
}

export async function scheduleTest(delaySec = 10): Promise<{ mode: 'trigger' | 'fallback' }> {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) throw new Error('Service worker non prêt');
  if (notifPermission() !== 'granted') throw new Error('Permission requise');

  const ts = Date.now() + delaySec * 1000;
  const title = "🔔 Test L'Ancre";
  const options: NotificationOptions & { showTrigger?: any; vibrate?: number[] } = {
    body: `Notification programmée dans ${delaySec}s.`,
    tag: TAG_PREFIX + 'test',
    icon: 'icons/icon.svg',
    requireInteraction: false,
    vibrate: [...PATTERNS.pulse],
    data: {},
  };
  if (supportsTriggers()) {
    try {
      await reg.showNotification(title, { ...options, showTrigger: new (window as any).TimestampTrigger(ts) } as NotificationOptions);
      return { mode: 'trigger' };
    } catch {}
  }
  setTimeout(() => reg.showNotification(title, options).catch(() => {}), delaySec * 1000);
  return { mode: 'fallback' };
}
