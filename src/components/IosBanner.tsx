import { useAppState } from '../useAppState';
import { dismissIosBanner } from '../state';
import { isIOS, isStandalone } from '../utils';

export function IosBanner() {
  const state = useAppState();
  if (!isIOS() || isStandalone() || state.flags.iosBannerDismissed) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 card-soft flex items-start gap-3 text-sm">
      <span className="text-2xl">📲</span>
      <div className="flex-1">
        <div className="font-semibold">Installe L'Ancre sur l'écran d'accueil</div>
        <div className="text-inkSoft">
          Appuie sur <b>Partager</b> puis <b>« Sur l'écran d'accueil »</b> pour les rappels.
        </div>
      </div>
      <button className="iconbtn !w-10 !h-10 !text-base" onClick={dismissIosBanner} aria-label="Fermer">✕</button>
    </div>
  );
}
