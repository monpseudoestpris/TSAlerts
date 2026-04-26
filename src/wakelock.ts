// WakeLock — empêche l'écran de s'éteindre pendant une routine.
let sentinel: WakeLockSentinel | null = null;
let shouldHold = false;
let keepAliveAttached = false;

async function tryAcquire(): Promise<WakeLockSentinel | null> {
  if (!('wakeLock' in navigator)) return null;
  try {
    const s = await (navigator as Navigator & { wakeLock: { request(t: 'screen'): Promise<WakeLockSentinel> } })
      .wakeLock.request('screen');
    return s;
  } catch {
    return null;
  }
}

function attachKeepAlive(): void {
  if (keepAliveAttached) return;
  keepAliveAttached = true;
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && sentinel === null && shouldHold) {
      sentinel = await tryAcquire();
    }
  });
}

export async function acquire(): Promise<WakeLockSentinel | null> {
  shouldHold = true;
  attachKeepAlive();
  if (sentinel) return sentinel;
  sentinel = await tryAcquire();
  return sentinel;
}

export async function release(): Promise<void> {
  shouldHold = false;
  if (sentinel) {
    try { await sentinel.release(); } catch {}
    sentinel = null;
  }
}
