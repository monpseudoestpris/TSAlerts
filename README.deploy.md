Crée un repo GitHub (idéalement nommé TSAlertes)

Depuis ton projet local, pousse le code:
$ git init
$ git add .
$ git commit -m "Initial commit"
$ git branch -M main
$ git remote add origin https://github.com/TON_USER/TSAlertes.git
$ git push -u origin main

Sur GitHub:

Va dans Settings > Pages
Source: GitHub Actions
Sauvegarde
Vérifie l’onglet Actions:

Le workflow Deploy to GitHub Pages doit se lancer automatiquement au push sur main
Quand il est vert, ton site est en ligne
URL finale attendue:
https://TON_USER.github.io/TSAlertes/

Si ton repo a un autre nom que TSAlertes, il faut ajuster la base dans vite.config.ts (ou définir VITE_BASE dans le workflow). Je peux te préparer exactement la bonne valeur selon le nom de ton repo.