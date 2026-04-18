# SUPFile - Client Web

## Presentation

Le client web est une single-page application (SPA) developpee avec React 18 et bundlee avec Vite. Il communique avec l'API REST via des requetes HTTP (fetch natif, sans librairie tierce comme axios).

L'interface s'inspire des gestionnaires de fichiers classiques comme Google Drive, avec une sidebar de navigation, un header avec recherche et actions, et une zone principale pour la gestion des fichiers.

---

## Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.2 | Framework UI |
| Vite | 5.1 | Bundler et serveur de developpement |
| Recharts | 3.8 | Graphique camembert du dashboard |
| React Router | 6.22 | Routing SPA |
| CSS Variables | - | Theming clair/sombre |

Aucune librairie CSS externe (pas de Tailwind, pas de Material UI). Le design system est entierement en CSS custom avec des variables pour les couleurs, les arrondis, les ombres et les transitions.

---

## Lancer en developpement

```bash
cd web
npm install
npm run dev
```

Le serveur de dev Vite se lance sur http://localhost:3001 avec le hot reload.

---

## Build de production

```bash
npm run build
```

Le dossier `dist/` contient les fichiers statiques prets a etre servis par nginx ou n'importe quel serveur HTTP. Dans le docker-compose, le service web fait ce build automatiquement et sert le resultat via nginx.

---

## Organisation du code

```
src/
  App.jsx              # Layout principal : sidebar, routing, toggle theme, jauge quota
  main.jsx             # Point d'entree ReactDOM
  index.css            # Styles globaux, variables CSS, media queries responsive

  services/
    api.js             # Client HTTP centralise (fetch natif)
                       # Exporte : authService, fileService, storageService,
                       # trashService, shareService, userService

  components/
    Dashboard.jsx      # Gestionnaire de fichiers
                       # Vue liste et grille, drag & drop (upload + deplacement),
                       # selection multiple, modales (preview, details, partage, renommage)
    DashboardHome.jsx  # Tableau de bord : jauge quota, camembert, fichiers recents
    Settings.jsx       # Parametres : avatar, email, mot de passe, theme, suppression
    Trash.jsx          # Corbeille : restauration, suppression definitive, vidage
    Login.jsx          # Page de connexion (email + Google OAuth)
    Register.jsx       # Page d'inscription
    PublicView.jsx     # Acces aux liens de partage publics
    Skeleton.jsx       # Composants de chargement animes (skeleton loaders)
    Toast.jsx          # Systeme de notifications toast
```

---

## Architecture des appels API

Tous les appels HTTP passent par `services/api.js` qui centralise :
- L'ajout automatique du token JWT dans les headers
- La gestion des erreurs 401 (redirection vers /login)
- La gestion des erreurs reseau (notification toast)

Le fichier exporte des objets de service thematiques :

- `authService` : inscription, connexion, deconnexion
- `fileService` : CRUD fichiers/dossiers, URLs de preview/stream/download
- `storageService` : quota, repartition, fichiers recents
- `trashService` : corbeille
- `shareService` : partage public et interne
- `userService` : profil, avatar, preferences

Aucun composant ne fait d'appel HTTP directement : tout passe par ces services.

---

## Theming

Le theme clair/sombre est gere par des CSS variables definies dans `:root` et surchargees dans `[data-theme="dark"]`. Le toggle modifie l'attribut `data-theme` sur le `<html>`.

Le choix est sauvegarde en localStorage et optionnellement persiste en base via l'API `/users/preferences`.

---

## Responsive

L'interface s'adapte a 3 breakpoints :

- **1024px** : les colonnes Type et Date sont masquees dans le tableau
- **768px** : la sidebar disparait, la topbar se reorganise, la recherche passe en pleine largeur
- **480px** : les boutons se compactent, les icones dans les actions sont reduites

---

## Fonctionnalites principales

### Gestionnaire de fichiers (Dashboard.jsx)
Le composant le plus gros du projet. Il gere :
- L'affichage en vue liste ou grille
- La navigation dans les dossiers avec breadcrumbs
- L'upload par bouton ou par glisser-deposer
- Le drag & drop pour deplacer des fichiers entre dossiers
- La selection multiple avec checkbox
- La recherche avec filtres par type et par date
- Les modales de preview (image, PDF, texte, Markdown, CSV, audio, video)
- Les modales de details, renommage et partage

### Skeleton loaders
Pendant le chargement des donnees, des barres animees grises remplacent le contenu pour donner un feedback visuel. Le composant injecte sa propre animation CSS au montage pour ne dependre d'aucun fichier externe.

### Correction d'encodage
Une fonction `decodeName()` detecte et corrige les noms de fichiers mal encodes (double encodage latin-1/UTF-8) avant affichage. Elle est appliquee partout : liste, grille, breadcrumbs, modales.
