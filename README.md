# L'Ancre ⚓

PWA 100% front-end conçue comme un « cerveau externe » pour les routines quotidiennes
d'un adolescent avec un profil TSA. Pas de backend, pas de compte.

## Caractéristiques

- **Interface focus unique** — une seule étape à la fois, cercle SVG anti-stress.
- **4 routines par défaut** : Matin, Midi, Soir, Coucher (étapes & durées en dur).
- **Routines personnalisées** : ajout / édition / suppression depuis l'écran Réglages.
- **Buffer de transition** de 10 s avant chaque routine (skippable).
- **Vibration pulse graduelle** `[200, 500, 200, 500, 1000]` au lieu d'un son strident.
- **Check-point de reprise** si une étape a expiré : reprendre / passer / arrêter.
- **WakeLock** pendant la routine (l'écran ne s'éteint pas).
- **Notifications programmées** via `Notification Triggers` (Chrome Android), avec
  fallback `setTimeout` ailleurs + bannière « Ajouter à l'écran d'accueil » sur iOS.
- **Persistance localStorage** — l'état de la routine survit aux fermetures.

## Développement

```bash
npm install
npm run dev      # serveur Vite
npm run build    # bundle dans dist/
npm run preview  # sert dist/ localement
```

## Déploiement GitHub Pages

1. Renommer le dépôt `TSAlertes` (ou ajuster `base` dans `vite.config.js`).
2. Activer GitHub Pages → Source : *GitHub Actions*.
3. Push sur `main` → le workflow `.github/workflows/deploy.yml` build & déploie.

## iOS

iOS n'autorise les notifications web qu'en mode *standalone*.
Demander à l'utilisateur d'utiliser **Partager → Sur l'écran d'accueil**, puis
relancer l'application depuis l'icône ainsi créée pour activer les rappels.
