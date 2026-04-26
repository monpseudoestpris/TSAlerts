// Mini hash router — supporte des patterns "/foo/:id"
import { useEffect, useState } from 'react';

export type RouteMatch = { path: string; params: Record<string, string> };

function parseHash(): RouteMatch {
  const raw = window.location.hash || '#/';
  const path = raw.startsWith('#') ? raw.slice(1) : raw;
  return { path: path || '/', params: {} };
}

export function useHashRoute(): RouteMatch {
  const [route, setRoute] = useState<RouteMatch>(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  const target = '#' + path;
  if (window.location.hash === target) {
    // Force re-trigger
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

/** Match "/buffer/:id" against "/buffer/abc" → { id: 'abc' } or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const keys: string[] = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/\/:([^/]+)/g, (_, k) => {
        keys.push(k);
        return '/([^/]+)';
      }) +
      '/?$'
  );
  const m = path.match(re);
  if (!m) return null;
  const out: Record<string, string> = {};
  keys.forEach((k, i) => (out[k] = decodeURIComponent(m[i + 1])));
  return out;
}
