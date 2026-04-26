/* L'Ancre — Service Worker
 * - Cache shell minimal pour mode hors-ligne basique
 * - Réception notifications (Notification Triggers ou push manuel)
 * - notificationclick : focus / ouverture du buffer de la routine
 */

const CACHE_NAME = 'lancre-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first pour la navigation, cache-first pour le reste.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // Met en cache les assets statiques opportunément
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});

// Click sur notification : focus une fenêtre existante OU ouvre le buffer.
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const routineId = data.routineId;
  const baseScope = self.registration.scope; // ex: https://user.github.io/TSAlertes/
  const target = routineId
    ? `${baseScope}#/buffer/${encodeURIComponent(routineId)}`
    : baseScope;

  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.startsWith(baseScope)) {
        await client.focus();
        // Demande à l'app de naviguer
        client.postMessage({ type: 'open-routine', routineId });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

// Permet à l'app de re-programmer une notif depuis la page (Triggers requiert le SW).
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'schedule-notification') {
    const { title, options } = msg.payload;
    try {
      self.registration.showNotification(title, options);
    } catch (e) {
      // showTrigger non supporté ou autre erreur — silencieux côté SW.
    }
  } else if (msg.type === 'cancel-notifications') {
    const { tagPrefix } = msg.payload || {};
    self.registration.getNotifications().then((nots) => {
      for (const n of nots) {
        if (!tagPrefix || (n.tag && n.tag.startsWith(tagPrefix))) {
          n.close();
        }
      }
    });
  }
});
