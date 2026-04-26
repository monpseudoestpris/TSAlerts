import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { getState } from './state';
import { reschedule } from './scheduler';
import { findRoutine, routineMode } from './routines';
import { navigate } from './router';

const RESUME_GRACE_SEC = 30;

function decideBootRoute(): void {
  // Si le hash est déjà significatif (deep-link), on ne touche pas
  const h = window.location.hash || '';
  if (h && h !== '#/' && h !== '#') return;

  const s = getState();
  const a = s.active;
  if (!a) return;
  const r = findRoutine(s.customRoutines, a.routineId);
  if (!r) return;

  // Mode flexible : retour direct à la liste (ou au step focus si une étape est ouverte)
  if (routineMode(r) === 'flexible') {
    if (a.currentStepId && r.steps.some((st) => st.id === a.currentStepId)) {
      navigate(`/step/${r.id}/${a.currentStepId}`);
    } else {
      navigate('/checklist/' + r.id);
    }
    return;
  }

  // Mode séquentiel : check-point classique
  const step = r.steps[a.stepIndex];
  if (!step) return;
  const elapsed = (Date.now() - a.stepStartedAt) / 1000;
  if (elapsed > step.durationSec + RESUME_GRACE_SEC) {
    navigate('/resume');
  } else {
    navigate('/routine/' + r.id);
  }
}

async function registerSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const base = import.meta.env.BASE_URL;
    await navigator.serviceWorker.register(base + 'sw.js', { scope: base });
    await navigator.serviceWorker.ready;
    reschedule().catch(() => {});
  } catch (e) {
    console.warn('SW registration failed', e);
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

decideBootRoute();
registerSW();
