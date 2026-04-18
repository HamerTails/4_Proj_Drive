# SUPFile - Documentation technique

## Qu'est-ce que SUPFile ?

SUPFile est un service de stockage de fichiers en ligne, dans la lignee de Google Drive ou Dropbox. Le projet a ete developpe dans le cadre du module 4PROJ a SUPINFO. Il permet a un utilisateur de stocker, organiser, partager et previsualiser ses fichiers depuis un navigateur web ou une application mobile.

Le projet se compose de trois briques principales : une API REST (Node.js/Express), un client web (React/Vite) et un client mobile (React Native). Le tout est orchestree par Docker Compose avec une base PostgreSQL.

---

## Prerequis

Pour faire tourner le projet en local, il faut :

- **Docker** version 20 ou superieure, avec **Docker Compose** v2+
- **Node.js** 18+ et **npm** 9+ (uniquement si on veut lancer sans Docker)
- **Git** pour cloner le depot

Sous Windows, Docker Desktop avec WSL2 fonctionne tres bien. Sur Mac, Docker Desktop egalement. Sous Linux, Docker Engine natif.

---

## Architecture du projet

Le projet suit une architecture 3-tiers assez classique :

```
Client Web (React/Vite)  ----->  API REST (Express)  ----->  PostgreSQL
     Port 3001                      Port 3000                  Port 5432
                                       |
                                  Stockage fichiers
                                   (volume Docker)
```

Le client web communique exclusivement avec l'API via des requetes HTTP. L'API gere la logique metier, l'authentification, et interagit avec la base de donnees PostgreSQL pour les metadonnees et avec le systeme de fichiers pour le stockage physique.

Les fichiers uploades sont stockes dans un volume Docker monte sur `/data` dans le conteneur API. Chaque utilisateur a son propre sous-dossier (`/data/user_1/`, `/data/user_2/`, etc.).

---

## Pourquoi ces technos ?

On a fait des choix pragmatiques pour ce projet :

**Node.js / Express** pour le backend, parce que c'est ce qu'on connait le mieux dans l'equipe et l'ecosysteme npm offre tout ce qu'il faut : multer pour les uploads, passport pour OAuth, archiver pour generer des ZIP a la volee, bcrypt pour le hachage. Express est simple, bien documente, et fait le boulot.

**PostgreSQL** plutot que MySQL ou MongoDB parce qu'on avait besoin des requetes recursives (CTE) pour gerer l'arborescence de fichiers. Quand un utilisateur navigue dans ses dossiers, qu'on genere un breadcrumb, ou qu'on supprime un dossier avec tout son contenu, les CTE simplifient enormement le code. PostgreSQL est aussi tres robuste en production.

**React avec Vite** pour le frontend web. React pour le modele a composants et la reactivite, Vite parce que c'est beaucoup plus rapide que Create React App, aussi bien en dev qu'en build de prod.

**JWT** pour l'authentification parce que c'est stateless : pas besoin de gerer des sessions cote serveur, le token contient toute l'info necessaire. On l'a couple avec Google OAuth2 via Passport.js pour offrir une connexion sociale.

**Docker Compose** pour que n'importe qui puisse lancer le projet avec une seule commande, peu importe son OS. Ca evite les galeres d'installation de PostgreSQL en local.

---

## Installation et lancement

### Avec Docker (recommande)

```bash
git clone <url_du_depot>
cd 4_Proj_Drive

# Configurer les variables d'environnement
cp api/.env.example api/.env
# Editer api/.env avec vos valeurs (voir section Variables d'environnement)

# Lancer tout le projet
docker compose up --build
```

Apres quelques secondes, les services sont accessibles :
- Frontend web : http://localhost:3001
- API : http://localhost:3000
- PostgreSQL : localhost:5432

### Sans Docker (developpement)

Si on veut travailler sans Docker, il faut un PostgreSQL installe localement.

```bash
# Creer la base
createdb supfile
psql supfile < api/database/schema.sql

# Terminal 1 - API
cd api
npm install
npm start

# Terminal 2 - Frontend web
cd web
npm install
npm run dev
```

---

## Variables d'environnement

Le fichier `api/.env` contient la configuration sensible. Un fichier `.env.example` est fourni comme modele. Voici ce que chaque variable fait :

| Variable | Exemple | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://supfile:supfile@db:5432/supfile | Chaine de connexion PostgreSQL |
| JWT_SECRET | (chaine aleatoire 64+ chars) | Cle de signature des tokens JWT |
| OAUTH_CLIENT_ID | 535719...apps.googleusercontent.com | ID client Google OAuth |
| OAUTH_CLIENT_SECRET | GOCSPX-... | Secret client Google OAuth |
| OAUTH_CALLBACK_URL | http://localhost:3000/api/auth/google/callback | URL de callback OAuth |
| WEB_URL | http://localhost:3001 | URL du frontend (pour les redirections OAuth) |
| API_URL | http://localhost:3000 | URL publique de l'API |
| STORAGE_PATH | /data | Repertoire de stockage des fichiers |
| NODE_ENV | development | Environnement (development/production) |
| PORT | 3000 | Port d'ecoute de l'API |

En production, il faut imperativement changer `JWT_SECRET` par une cle aleatoire forte et ne jamais commiter le `.env` dans Git.

---

## Schema de la base de donnees

La base contient 4 tables principales :

### users
Stocke les comptes utilisateurs. Le champ `password_hash` est null pour les comptes crees via Google OAuth. Le champ `storage_used` est mis a jour a chaque upload et suppression pour suivre le quota.

### nodes
C'est la table centrale du projet. Elle stocke a la fois les fichiers et les dossiers (distingues par le champ `type`). L'arborescence est geree par auto-reference via `parent_id` : un dossier a la racine a `parent_id = null`, un fichier dans un dossier pointe vers l'id de ce dossier.

Le soft delete est gere par `is_trashed` et `trashed_at`. Quand un utilisateur supprime un element, on ne le supprime pas vraiment, on le marque comme "en corbeille". Un cron tourne toutes les 24h pour supprimer definitivement les elements en corbeille depuis plus de 30 jours.

### shares
Les liens de partage publics. Chaque partage a un token unique (UUID), et peut optionnellement avoir un mot de passe (hashe avec bcrypt) et une date d'expiration.

### internal_shares
Les partages entre utilisateurs. Quand un utilisateur partage un fichier avec un autre par email, ca cree une entree dans cette table avec les IDs des deux utilisateurs et du fichier.

Les relations entre tables :
- Un utilisateur possede N fichiers/dossiers (users -> nodes)
- Un dossier contient N enfants (nodes -> nodes, auto-reference)
- Un fichier peut avoir N liens de partage (nodes -> shares)
- Un fichier peut etre partage avec N utilisateurs (nodes -> internal_shares)

---

## Structure du code

### Backend (api/)

```
api/
  index.js                # Point d'entree, configuration Express, montage des routes
  middleware/
    auth.js               # Verification des tokens JWT
    validate.js           # Validation des entrees (body, query params)
  routes/
    auth_logic.js         # Inscription, connexion, OAuth Google
    files.js              # Upload, telechargement, preview, streaming
    nodes.js              # CRUD fichiers/dossiers, breadcrumbs, deplacement
    trash.js              # Corbeille : listing, restauration, suppression definitive
    storage.js            # Quota, repartition par type, fichiers recents
    shares.js             # Partage public (lien + mdp + expiration) et interne
    search.js             # Recherche par nom avec filtres type/date
    users.js              # Profil, avatar, preferences, suppression de compte
  utils/
    integrity.js          # Verification de coherence entre BDD et systeme de fichiers
  database/
    schema.sql            # Schema SQL complet avec ALTER pour les colonnes ajoutees
```

### Frontend web (web/)

```
web/
  src/
    App.jsx               # Layout principal, sidebar, routing, toggle theme
    main.jsx              # Point d'entree React
    index.css             # Styles globaux, variables CSS, responsive
    services/
      api.js              # Client HTTP centralise (fetch natif, pas d'axios)
    components/
      Dashboard.jsx       # Gestionnaire de fichiers (liste, grille, drag&drop, modales)
      DashboardHome.jsx   # Page d'accueil (quota, graphique, fichiers recents)
      Settings.jsx        # Parametres utilisateur (email, mdp, avatar, theme)
      Trash.jsx           # Vue corbeille
      Login.jsx           # Page de connexion
      Register.jsx        # Page d'inscription
      PublicView.jsx      # Page d'acces aux liens publics
      Skeleton.jsx        # Composants de chargement (skeleton loaders)
      Toast.jsx           # Notifications toast
```

---

## Securite

Plusieurs mesures de securite sont en place :

- **Helmet** configure les headers HTTP de securite (CSP, HSTS, X-Frame-Options, etc.)
- **Rate limiting** sur les routes d'authentification : 5 requetes par minute en production pour empecher le bruteforce
- **CORS** restreint a une whitelist d'origines autorisees (pas de `cors()` ouvert)
- **Validation des entrees** sur toutes les routes critiques via un middleware maison
- **Hachage bcrypt** pour les mots de passe (10-12 rounds) et les mots de passe de partage
- **JWT** avec expiration a 7 jours, verification sur chaque route protegee

---

## Deploiement en production

Pour un deploiement en production, il faut :

1. Changer `JWT_SECRET` par une cle aleatoire d'au moins 64 caracteres
2. Mettre `NODE_ENV=production` pour activer le rate limiting strict
3. Configurer `WEB_URL` et `API_URL` avec les domaines publics
4. Utiliser un mot de passe fort pour PostgreSQL
5. Le frontend web est deja build et servi par nginx dans le conteneur Docker

Le `docker-compose.yml` actuel est pret pour la production : le service web fait un `npm run build` puis sert les fichiers statiques via nginx, et le service API tourne avec `node index.js`.

---

## Fonctionnalites implementees

| Fonctionnalite | Backend | Web | Mobile |
|----------------|---------|-----|--------|
| Inscription / Connexion | oui | oui | oui |
| OAuth Google | oui | oui | non |
| Upload fichier (100 Mo max) | oui | oui | oui |
| Creation de dossiers | oui | oui | oui |
| Navigation dans les dossiers | oui | oui | oui |
| Renommage | oui | oui | oui |
| Deplacement (drag & drop web) | oui | oui | non |
| Corbeille (soft delete 30j) | oui | oui | oui |
| Preview (image, PDF, texte, audio, video) | oui | oui | partiel |
| Streaming audio/video (Range) | oui | oui | non |
| Telechargement fichier | oui | oui | oui |
| Telechargement dossier ZIP | oui | oui | non |
| Quota utilisateur (30 Go) | oui | oui | oui |
| Dashboard (stats, graphique) | oui | oui | oui |
| Recherche + filtres | oui | oui | oui |
| Partage public (lien) | oui | oui | oui |
| Partage avec mot de passe | oui | oui | non |
| Partage avec expiration | oui | oui | non |
| Partage interne (par email) | oui | oui | oui |
| Parametres utilisateur | oui | oui | oui |
| Avatar | oui | oui | non |
| Theme clair/sombre | oui | oui | oui |
| Suppression de compte | oui | oui | non |
