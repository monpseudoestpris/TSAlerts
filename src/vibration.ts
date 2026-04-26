// Vibration helpers — patterns doux, jamais continus.
export const PATTERNS = {
  tap: 40,
  pulse: [200, 500, 200, 500, 1000],
  done:  [100, 200, 100],
} as const;

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(pattern: number | number[]): boolean {
  if (!canVibrate()) return false;
  try { return navigator.vibrate(pattern); } catch { return false; }
}

export const tap   = () => vibrate(PATTERNS.tap);
export const pulse = () => vibrate([...PATTERNS.pulse]);
export const done  = () => vibrate([...PATTERNS.done]);
