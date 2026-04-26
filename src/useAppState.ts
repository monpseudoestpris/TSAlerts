import { useSyncExternalStore } from 'react';
import { getState, subscribe, type AppState } from './state';

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
