# SUPFILE — Plan de travail complet

> **État actuel :** Le projet possède un squelette fonctionnel (auth basique, upload, navigation dossiers, partage simple) mais reste loin du niveau attendu pour un rendu professionnel.
> Le client mobile est **totalement vide**. Le web manque de nombreuses fonctionnalités clés. L'API couvre ~40 % des besoins.

---

## Équipe

| Rôle | Périmètre |
|---|---|
| **B1** — Backend Core | Gestion fichiers, stockage, corbeille, prévisualisation, téléchargement ZIP, streaming, quota |
| **B2** — Backend Auth/Social | OAuth, partage avancé, recherche, dashboard data, paramètres utilisateur, sécurité, documentation |
| **F1** — Frontend Web | Toutes les fonctionnalités manquantes du client web, UX/UI professionnelle, thème clair/sombre |
| **F2** — Frontend Mobile | Application React Native complète depuis zéro (miroir fonctionnel du web) |

---

## ALERTE CRITIQUE — Secrets en clair

Le fichier `.env` contient les vrais `OAUTH_CLIENT_ID` et `OAUTH_CLIENT_SECRET` Google en clair. Même si `.env` est dans `.gitignore`, **vérifier impérativement** que ce fichier n'a jamais été commité dans l'historique Git. Si c'est le cas : révoquer les clés, en régénérer et nettoyer l'historique (`git filter-branch` ou `BFG`). Un secret en clair dans le repo = **ajournement possible**.

Le `JWT_SECRET` est aussi une valeur triviale (`supersecretjwtkey`). Il faut le remplacer par une clé aléatoire forte (≥ 64 caractères).

---

## 1. BACKEND

### 1.1 Ce qui existe déjà (✅)

- [x] Serveur Express + PostgreSQL + Docker
- [x] Inscription email/mot de passe avec validation + hachage bcrypt
- [x] Connexion email/mot de passe + JWT (7 jours)
- [x] Google OAuth2 (Passport) avec création automatique du compte
- [x] Middleware `authenticateToken` (Bearer + query param)
- [x] CRUD dossiers : création, listage, breadcrumbs
- [x] Upload fichier (multer, 100 Mo max, barre de progression côté client)
- [x] Renommage de node
- [x] Déplacement de node (avec protection contre les boucles)
- [x] Suppression de node (mais suppression définitive, pas de corbeille)
- [x] Téléchargement fichier unitaire (`res.download`)
- [x] Prévisualisation images et PDF (streaming)
- [x] Partage public : génération de lien unique + accès via token
- [x] Partage interne : partager un node avec un autre utilisateur par email
- [x] Table `shares` avec `expires_at`
- [x] Table `internal_shares`
- [x] Docker Compose avec 3 services + volumes persistants

### 1.2 Ce qui manque / doit être modifié

---

#### B1 — Backend Core (Fichiers, Stockage, Prévisualisation)

| # | Tâche | Priorité | Points concernés | Détail |
|---|---|---|---|---|
| B1-1 | **Corbeille (soft delete + restauration)** | 🔴 Critique | 15 pts (Manipulation) | Ajouter `is_trashed BOOLEAN DEFAULT FALSE` et `trashed_at TIMESTAMP` à la table `nodes`. La suppression ne fait que marquer `is_trashed = true`. Ajouter `PUT /api/nodes/:id/restore` et `DELETE /api/nodes/:id/permanent`. Ajouter `GET /api/trash` pour lister la corbeille. Exclure les trashed des listings normaux. Vider la corbeille automatiquement après 30 jours (cron job ou vérification lazy). |
| B1-2 | **Prévisualisation texte (TXT, MD)** | 🔴 Critique | 20 pts (Visionneuse) | Le endpoint `/api/files/:id/preview` refuse tout sauf `image/*` et `application/pdf`. Ajouter le support de `text/plain`, `text/markdown`, `text/csv`, `text/html`. Retourner le contenu en texte brut avec le bon Content-Type. |
| B1-3 | **Streaming audio/vidéo** | 🔴 Critique | 20 pts (Visionneuse) | Ajouter le support des MIME `audio/*` et `video/*` dans le endpoint preview. Implémenter le **Range Request** (header `Range`) pour permettre le seek dans les lecteurs HTML5. Répondre avec `206 Partial Content`. |
| B1-4 | **Téléchargement d'un dossier en ZIP** | 🔴 Critique | 20 pts (Téléchargement) | Ajouter `npm install archiver`. Créer `GET /api/folders/:id/download` qui génère une archive ZIP à la volée avec l'arborescence récursive du dossier et stream la réponse (`Content-Type: application/zip`). |
| B1-5 | **Quota utilisateur (30 Go)** | 🟡 Important | Architecture | Ajouter `storage_used BIGINT DEFAULT 0` à la table `users`. Mettre à jour à chaque upload/suppression. Refuser l'upload si `storage_used + file.size > 30 * 1024^3`. Exposer `GET /api/storage/usage` retournant `{ used, total, breakdown }`. |
| B1-6 | **Calcul de la répartition par type** | 🟡 Important | 15 pts (Dashboard) | Endpoint `GET /api/storage/breakdown` retournant l'espace utilisé par catégorie MIME (Vidéos, Images, Documents, Audio, Autres) via une requête SQL `GROUP BY` sur le type MIME. |
| B1-7 | **Fichiers récents** | 🟡 Important | 15 pts (Dashboard) | Endpoint `GET /api/files/recent?limit=5` retournant les 5 derniers fichiers uploadés ou modifiés (trier par `created_at DESC`). |
| B1-8 | **Métadonnées fichier** | 🟢 Normal | Qualité code | Endpoint `GET /api/nodes/:id/details` retournant taille, date de modification (depuis le FS via `fs.stat`), type MIME, et chemin complet. |
| B1-9 | **Upload multiple** | 🟢 Normal | Bonus | Modifier le endpoint upload pour accepter `upload.array('files', 10)` et uploader plusieurs fichiers à la fois. |
| B1-10 | **Vérification intégrité fichiers physiques** | 🟢 Normal | Qualité code | Au démarrage ou via un endpoint admin, vérifier que tous les `storage_path` référencés en BDD existent réellement sur le disque. |

---

#### B2 — Backend Auth, Partage, Recherche, Paramètres

| # | Tâche | Priorité | Points concernés | Détail |
|---|---|---|---|---|
| B2-1 | **Recherche par nom/extension** | 🔴 Critique | 15 pts (Recherche) | Créer `GET /api/search?q=xxx&type=image&date=week`. Recherche `ILIKE '%xxx%'` sur `nodes.name`. Filtrage par MIME (`type`) et par date (`created_at > NOW() - interval`). Exclure les nodes trashed. |
| B2-2 | **Partage public avec mot de passe** | 🔴 Critique | Bonus (avancé) | Ajouter `password_hash TEXT` à la table `shares`. Lors de la création du lien : accepter un `password` optionnel, le hasher avec bcrypt. Sur `GET /api/public/:token` : si le share a un mot de passe, exiger un header ou query `?password=xxx`, le comparer. |
| B2-3 | **Partage public — expiration fonctionnelle** | 🟡 Important | 20 pts (Liens publics) | L'expiration existe en BDD mais le frontend ne permet pas de la définir. S'assurer que le endpoint `POST /api/shares` accepte `expires_at` (ISO date) et que `GET /api/public/:token` rejette bien les links expirés (c'est déjà fait en SQL mais ajouter un message clair). |
| B2-4 | **Paramètres utilisateur — Changement de mot de passe** | 🔴 Critique | Qualité + UX | Créer `PUT /api/auth/password` (authentifié). Accepter `{ currentPassword, newPassword }`. Vérifier l'ancien mot de passe, hasher le nouveau, mettre à jour. |
| B2-5 | **Paramètres utilisateur — Modification email** | 🟡 Important | Paramètres | Créer `PUT /api/auth/email` (authentifié). Accepter `{ newEmail, password }` (vérifier le mot de passe avant de changer). Vérifier unicité du nouvel email. |
| B2-6 | **Paramètres utilisateur — Avatar** | 🟡 Important | Paramètres | Ajouter `avatar_path TEXT` à la table `users`. Créer `POST /api/auth/avatar` (upload multer d'une image) et `GET /api/auth/avatar/:userId`. |
| B2-7 | **Préférence de thème** | 🟢 Normal | Paramètres | Ajouter `theme TEXT DEFAULT 'light'` à la table `users`. Créer `PUT /api/auth/preferences` pour sauvegarder, `GET /api/auth/me` le retourne déjà (ajouter le champ). |
| B2-8 | **Sécurité — Helmet + Rate Limiting** | 🔴 Critique | Qualité code | `npm install helmet express-rate-limit`. Ajouter `app.use(helmet())` et un rate limiter sur `/api/auth/*` (5 req/min pour login). Protège contre bruteforce et headers malveillants. |
| B2-9 | **Sécurité — Validation des entrées** | 🔴 Critique | Malus possible | `npm install express-validator` ou `joi`. Valider proprement tous les body/params de chaque route (pas juste des `if`). Protège contre les injections. |
| B2-10 | **Sécurité — CORS restreint** | 🟡 Important | Qualité code | Remplacer `app.use(cors())` (tout autorisé) par une whitelist : `cors({ origin: ['http://localhost:3001', process.env.WEB_URL] })`. |
| B2-11 | **Refactoring — Séparer les routes en modules** | 🟡 Important | Qualité code | Le fichier `index.js` fait 809 lignes. Créer `routes/auth.js`, `routes/nodes.js`, `routes/shares.js`, `routes/search.js`, `routes/settings.js`. Utiliser `express.Router()`. Créer `middleware/auth.js` pour le middleware JWT. |
| B2-12 | **Refactoring — Variables d'environnement** | 🟡 Important | Architecture | Créer un `.env.example` avec toutes les variables requises (sans les valeurs secrètes). Documenter chaque variable. Le mettre dans le repo. |
| B2-13 | **Documentation API complète** | 🔴 Critique | 30 pts (Doc technique) | Documenter chaque endpoint dans `docs/API.md` : méthode, URL, headers requis, body attendu, réponses possibles (succès + erreurs), exemples curl. |
| B2-14 | **Documentation technique complète** | 🔴 Critique | 30 pts (Doc technique) | `docs/DOCS.md` doit contenir : prérequis, procédure d'installation, guide de déploiement, justification des choix technologiques, diagrammes UML (cas d'utilisation, schéma BDD), architecture API. |
| B2-15 | **Manuel utilisateur** | 🔴 Critique | 20 pts (Manuel) | Créer `docs/USER_MANUAL.md` avec captures d'écran et guide pas-à-pas pour chaque fonctionnalité (inscription, upload, partage, etc.). |
| B2-16 | **Diagrammes UML** | 🔴 Critique | Doc technique | Créer les diagrammes : cas d'utilisation (PlantUML ou draw.io), schéma relationnel BDD (toutes les tables avec relations). Les inclure dans la doc. |

---

## 2. FRONTEND WEB

### 2.1 Ce qui existe déjà (✅)

- [x] Login / Register avec validation basique
- [x] Bouton Google OAuth
- [x] Récupération automatique du token OAuth depuis l'URL
- [x] Dashboard : liste des fichiers/dossiers
- [x] Création de dossier (modal)
- [x] Upload fichier avec barre de progression
- [x] Navigation breadcrumbs
- [x] Renommage (modal)
- [x] Suppression (confirm)
- [x] Prévisualisation images + PDF (modal)
- [x] Partage public (génération de lien)
- [x] Partage interne (par email)
- [x] Section "Partagés avec moi"
- [x] Page `/public/:token` pour accès public
- [x] Service API centralisé (`api.js`)

### 2.2 Ce qui manque / doit être modifié

#### F1 — Frontend Web

| # | Tâche | Priorité | Points concernés | Détail |
|---|---|---|---|---|
| F1-1 | **Refonte UI/UX professionnelle** | 🔴 Critique | 20 pts (UX) | L'interface actuelle est un prototype basique (noir/blanc, pas de design). Installer une librairie UI (ex: `@shadcn/ui`, `Tailwind CSS`, ou `Mantine`). Créer un vrai design system avec sidebar, header, couleurs, icônes (`lucide-react`). L'app doit ressembler à Google Drive / Dropbox. |
| F1-2 | **Thème Clair / Sombre** | 🟡 Important | Paramètres | Implémenter un toggle dark/light mode. Utiliser CSS variables ou le theming de la librairie UI choisie. Sauvegarder la préférence via l'API et localement. |
| F1-3 | **Page Dashboard dédiée** | 🔴 Critique | 15 pts (Dashboard) | Créer un vrai composant `DashboardHome.jsx` séparé du gestionnaire de fichiers. Afficher : graphique répartition espace disque (utiliser `recharts` ou `chart.js`), jauge du quota (X Go / 30 Go), 5 derniers fichiers modifiés avec accès rapide. |
| F1-4 | **Corbeille (vue + restauration)** | 🔴 Critique | 15 pts (Manipulation) | Créer un composant `Trash.jsx`. Lister les fichiers en corbeille via `GET /api/trash`. Boutons "Restaurer" et "Supprimer définitivement". Ajouter un lien dans la sidebar/nav. |
| F1-5 | **Prévisualisation texte (TXT, MD)** | 🔴 Critique | 20 pts (Visionneuse) | Dans le modal de preview, ajouter le rendu des fichiers texte : afficher le contenu brut dans un `<pre>` pour TXT, utiliser `react-markdown` pour les fichiers MD. |
| F1-6 | **Lecteur audio/vidéo intégré** | 🔴 Critique | 20 pts (Visionneuse) | Intégrer un player HTML5 (`<audio>` / `<video>`) dans le modal de preview pour les fichiers `audio/*` et `video/*`. Le streaming avec Range Requests permettra le seek. |
| F1-7 | **Téléchargement dossier (ZIP)** | 🔴 Critique | 20 pts (Téléchargement) | Ajouter un bouton "Télécharger" sur les dossiers qui appelle `GET /api/folders/:id/download` et déclenche le téléchargement du ZIP. |
| F1-8 | **Barre de recherche + filtres** | 🔴 Critique | 15 pts (Recherche) | Ajouter une barre de recherche dans le header/toolbar. Appeler `GET /api/search?q=...`. Ajouter des filtres déroulants : par type (Images, Vidéos, Documents, Audio), par date (Aujourd'hui, Cette semaine, Ce mois). Afficher les résultats dans une vue dédiée. |
| F1-9 | **Drag & Drop pour déplacement** | 🟡 Important | Bonus | Utiliser `react-dnd` ou `@dnd-kit/core` pour permettre de glisser-déposer des fichiers/dossiers pour les déplacer. Appeler `PUT /api/nodes/:id/move`. |
| F1-10 | **Drag & Drop pour upload** | 🟡 Important | Bonus | Permettre de glisser des fichiers depuis le bureau vers la zone de fichiers pour déclencher l'upload. Utiliser l'event `onDrop` natif. |
| F1-11 | **Détails techniques d'un fichier** | 🟡 Important | Qualité | Afficher dans un panneau latéral ou modal : taille, date de création, date de modification, type MIME. |
| F1-12 | **Page Paramètres utilisateur** | 🔴 Critique | Paramètres | Créer `Settings.jsx` avec : formulaire changement email, formulaire changement mot de passe, upload d'avatar (preview avant envoi), sélecteur de thème. Ajouter la route `/settings` dans le router. |
| F1-13 | **Bouton de téléchargement fichier** | 🟡 Important | 20 pts (Téléchargement) | Ajouter un bouton "Télécharger" explicite sur chaque fichier dans la liste (actuellement il faut cliquer sur le fichier et ça ouvre un onglet). Utiliser un vrai téléchargement avec `<a download>` ou fetch + blob. |
| F1-14 | **Icônes par type de fichier** | 🟢 Normal | UX | Remplacer les emoji 📁/📄 par de vraies icônes SVG selon le type MIME (image → icône photo, PDF → icône document, vidéo → icône film, etc.). |
| F1-15 | **Partage avancé (mot de passe + expiration)** | 🟡 Important | Bonus | Dans le modal de partage, ajouter : champ mot de passe optionnel, date picker pour l'expiration. Envoyer ces données à l'API. |
| F1-16 | **Grid view / List view toggle** | 🟢 Normal | UX | Permettre de basculer entre vue grille (avec thumbnails) et vue liste (actuelle). |
| F1-17 | **Responsive design** | 🟡 Important | UX | S'assurer que l'interface fonctionne bien sur tablette et petit écran (pas forcément mobile puisqu'il y a l'app). |
| F1-18 | **URLs hardcodées** | 🔴 Critique | Qualité code | Remplacer toutes les URLs `http://localhost:3000` hardcodées dans `Dashboard.jsx` et `PublicView.jsx` par le service API centralisé (`api.js`). Utiliser une variable d'environnement Vite (`VITE_API_URL`). |
| F1-19 | **Gestion d'erreurs globale** | 🟡 Important | Qualité code | Ajouter un intercepteur Axios global pour gérer les 401 (rediriger vers login), les erreurs réseau (toast notification). Utiliser un composant toast (`react-hot-toast` ou similaire). |
| F1-20 | **Loading states et squelettes** | 🟢 Normal | UX | Remplacer les simples "Chargement..." par des skeleton loaders pour un rendu plus professionnel. |

---

## 3. FRONTEND MOBILE

### 3.1 Ce qui existe (❌ RIEN)

Le dossier `mobile/` est **complètement vide**. L'application mobile doit être développée **intégralement**.

> ⚠️ **Rappel du sujet :** "Une fonctionnalité est considérée comme fonctionnelle si elle est implémentée sur le serveur ET sur les deux clients." Sans app mobile, **aucune fonctionnalité ne sera validée** dans le barème.

#### F2 — Frontend Mobile (React Native)

| # | Tâche | Priorité | Points concernés | Détail |
|---|---|---|---|---|
| F2-1 | **Initialisation du projet React Native** | 🔴 Critique | Prérequis | `npx react-native init SUPFile` ou Expo (`npx create-expo-app`). Configurer la navigation (`@react-navigation/native`), le client HTTP (`axios`), le stockage local (`@react-native-async-storage/async-storage`). |
| F2-2 | **Écran Login** | 🔴 Critique | 10 pts | Formulaire email/mot de passe, validation, gestion des erreurs, stockage du JWT en AsyncStorage. |
| F2-3 | **Écran Register** | 🔴 Critique | 10 pts | Formulaire inscription avec confirmation mot de passe. |
| F2-4 | **Login OAuth2 Google** | 🔴 Critique | 20 pts | Utiliser `expo-auth-session` ou `react-native-app-auth` pour le flux OAuth Google. Récupérer le token JWT depuis l'API. |
| F2-5 | **Écran gestionnaire de fichiers** | 🔴 Critique | 15 pts | Liste des fichiers/dossiers (`FlatList`), navigation dans les dossiers, breadcrumbs, création de dossier. |
| F2-6 | **Upload de fichiers** | 🔴 Critique | 20 pts | Utiliser `expo-document-picker` ou `react-native-document-picker`. Upload avec barre de progression (`onUploadProgress` d'Axios). |
| F2-7 | **Prévisualisation fichiers** | 🔴 Critique | 20 pts | Images : `<Image>` natif. PDF : `react-native-pdf`. Texte : `<ScrollView><Text>`. Audio/Vidéo : `expo-av`. |
| F2-8 | **Téléchargement de fichiers** | 🔴 Critique | 20 pts | Utiliser `expo-file-system` (`FileSystem.downloadAsync`) pour télécharger et ouvrir avec `expo-sharing` ou `Linking`. |
| F2-9 | **Téléchargement dossier ZIP** | 🟡 Important | 20 pts | Télécharger le ZIP généré par l'API et proposer de l'enregistrer. |
| F2-10 | **Partage public (génération lien)** | 🔴 Critique | 20 pts | Interface pour générer un lien public, le copier dans le presse-papier (`Clipboard`). |
| F2-11 | **Partage interne** | 🔴 Critique | 20 pts | Formulaire pour partager avec un email. Vue "Partagés avec moi". |
| F2-12 | **Recherche et filtres** | 🔴 Critique | 15 pts | Barre de recherche en haut de l'écran fichiers, filtres par type et date. |
| F2-13 | **Dashboard / Accueil** | 🔴 Critique | 15 pts | Jauge quota, fichiers récents, répartition stockage (graphique simple). |
| F2-14 | **Corbeille** | 🔴 Critique | 15 pts | Écran listant les fichiers supprimés, restauration et suppression définitive. |
| F2-15 | **Paramètres utilisateur** | 🟡 Important | Paramètres | Changement email, mot de passe, avatar, thème. |
| F2-16 | **Renommage, déplacement, suppression** | 🔴 Critique | 15 pts | Menu contextuel (long press) sur un fichier/dossier : Renommer, Déplacer (sélecteur de dossier destination), Supprimer (vers corbeille). |
| F2-17 | **Thème Clair / Sombre** | 🟡 Important | Paramètres | Supporter le dark mode via `useColorScheme` ou toggle manuel. |
| F2-18 | **Navigation** | 🔴 Critique | Architecture | Stack Navigator pour auth, Tab Navigator ou Drawer pour l'app principale (Fichiers, Partagés, Dashboard, Paramètres). |
| F2-19 | **Design professionnel** | 🟡 Important | 20 pts (UX) | Utiliser `react-native-paper` ou `nativewind` (Tailwind pour RN). L'app doit avoir un look propre et cohérent avec le web. |

---

## 4. DOCUMENTATION

| # | Tâche | Responsable | Priorité | Détail |
|---|---|---|---|---|
| D-1 | **Documentation technique complète** | B2 | 🔴 Critique (30 pts) | Prérequis (Docker, Node, etc.), procédure d'installation pas-à-pas, guide de déploiement (prod et dev), justification des choix technologiques (pourquoi Express, React, PostgreSQL, React Native), diagrammes UML. |
| D-2 | **Diagramme de cas d'utilisation** | B2 | 🔴 Critique | Acteurs : Utilisateur connecté, Visiteur (liens publics). Cas d'utilisation : toutes les fonctionnalités. Format PlantUML ou image. |
| D-3 | **Schéma relationnel BDD** | B2 | 🔴 Critique | Diagramme ER avec toutes les tables, colonnes, types, relations FK. Mettre à jour après les modifications du schéma. |
| D-4 | **Documentation API (endpoints)** | B2 | 🔴 Critique | Chaque route documentée : méthode, URL, auth requise, body JSON, réponses (200, 400, 401, 404, 500), exemples. |
| D-5 | **Manuel utilisateur** | F1 | 🔴 Critique (20 pts) | Guide illustré (captures d'écran) pour chaque fonctionnalité destiné à un nouvel utilisateur. Couvrir web ET mobile. |
| D-6 | **Corriger le README** | B2 | 🟡 Important | Le README indique "Next.js" pour le web (c'est Vite + React) et manque d'instructions complètes. |
| D-7 | **Créer .env.example** | B2 | 🔴 Critique | Fichier `.env.example` commité dans le repo avec toutes les variables requises, sans aucune valeur secrète. |

---

## 5. DOCKER / DÉPLOIEMENT

| # | Tâche | Responsable | Priorité | Détail |
|---|---|---|---|---|
| K-1 | **Vérifier docker compose up** | B1 | 🔴 Critique (20 pts) | S'assurer que `docker compose up --build` lance les 3 services et que tout fonctionne sans intervention manuelle. |
| K-2 | **Wait-for-it / healthcheck** | B1 | 🟡 Important | L'API démarre avant que PostgreSQL soit prêt → crash possible. Ajouter un script `wait-for-it.sh` ou un healthcheck Docker + `depends_on: condition: service_healthy`. |
| K-3 | **Build de production pour le web** | F1 | 🟡 Important | Le Dockerfile web utilise `npm run dev` (serveur de développement). En production : `npm run build` + servir avec `nginx` ou `serve`. Modifier le Dockerfile. |
| K-4 | **Variables d'environnement web** | F1 | 🟡 Important | Passer `VITE_API_URL` via le docker-compose pour ne pas hardcoder `localhost:3000`. |

---

## 6. MODIFICATIONS DE LA BASE DE DONNÉES

Voici le schéma SQL à ajouter/modifier (à intégrer dans `schema.sql`) :

```sql
-- Modifications table users
ALTER TABLE users ADD COLUMN avatar_path TEXT;
ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light';
ALTER TABLE users ADD COLUMN storage_used BIGINT DEFAULT 0;

-- Modifications table nodes (corbeille)
ALTER TABLE nodes ADD COLUMN is_trashed BOOLEAN DEFAULT FALSE;
ALTER TABLE nodes ADD COLUMN trashed_at TIMESTAMP;

-- Modifications table shares (mot de passe)
ALTER TABLE shares ADD COLUMN password_hash TEXT;
```

---

## 7. PACKAGES À INSTALLER

### Backend (`api/`)
```bash
npm install archiver helmet express-rate-limit joi
```

### Frontend Web (`web/`)
```bash
npm install tailwindcss @tailwindcss/vite lucide-react recharts react-markdown react-hot-toast
# OU alternative UI library :
# npm install @mantine/core @mantine/hooks
```

### Frontend Mobile (`mobile/`)
```bash
npx create-expo-app SUPFile
cd SUPFile
npx expo install expo-document-picker expo-file-system expo-sharing expo-av expo-auth-session expo-crypto
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs axios @react-native-async-storage/async-storage react-native-paper react-native-pdf
```

---

## 8. ORDRE DE PRIORITÉ RECOMMANDÉ

### Sprint 1 — Fondations (Semaine 1)
| Qui | Quoi |
|---|---|
| B1 | Corbeille (B1-1), Preview texte (B1-2), Streaming audio/vidéo (B1-3) |
| B2 | Refactoring modules (B2-11), Sécurité helmet+rate limit (B2-8), Validation inputs (B2-9), CORS (B2-10), `.env.example` (B2-12) |
| F1 | Refonte UI Tailwind (F1-1), Supprimer URLs hardcodées (F1-18), Gestion erreurs globale (F1-19) |
| F2 | Init React Native (F2-1), Navigation (F2-18), Login (F2-2), Register (F2-3), Service API |

### Sprint 2 — Fonctionnalités critiques (Semaine 2)
| Qui | Quoi |
|---|---|
| B1 | ZIP dossier (B1-4), Quota (B1-5), Répartition stockage (B1-6), Fichiers récents (B1-7) |
| B2 | Recherche (B2-1), Paramètres mot de passe (B2-4), Paramètres email (B2-5), Avatar (B2-6) |
| F1 | Dashboard page (F1-3), Corbeille (F1-4), Preview texte (F1-5), Player audio/vidéo (F1-6), Recherche (F1-8) |
| F2 | Gestionnaire fichiers (F2-5), Upload (F2-6), Preview (F2-7), Téléchargement (F2-8) |

### Sprint 3 — Partage & Finitions (Semaine 3)
| Qui | Quoi |
|---|---|
| B1 | Métadonnées (B1-8), Upload multiple (B1-9), Tests et stabilisation |
| B2 | Partage mot de passe (B2-2), Thème (B2-7), Documentation API (B2-13), Doc technique (B2-14) |
| F1 | ZIP download (F1-7), Settings page (F1-12), Partage avancé (F1-15), Drag & Drop (F1-9, F1-10), Thème (F1-2) |
| F2 | Partage (F2-10, F2-11), Recherche (F2-12), Dashboard (F2-13), Corbeille (F2-14), Renommage/suppression (F2-16) |

### Sprint 4 — Polish & Documentation (Semaine 4)
| Qui | Quoi |
|---|---|
| B1 | K-1, K-2 (Docker), Tests end-to-end, correctifs |
| B2 | Manuel utilisateur (B2-15), Diagrammes UML (B2-16), README (D-6), review sécurité finale |
| F1 | K-3, K-4 (Docker prod), Icônes (F1-14), Grid/List toggle (F1-16), Responsive (F1-17), Loading states (F1-20), Manuel utilisateur captures web (D-5) |
| F2 | Settings (F2-15), Thème (F2-17), Design pro (F2-19), ZIP download (F2-9), OAuth mobile (F2-4), Manuel utilisateur captures mobile |

---

## 9. RÉCAPITULATIF DES POINTS

| Catégorie | Points possibles | État estimé actuel | Objectif |
|---|---|---|---|
| Documentation | 50 | ~5/50 | 45/50 |
| UX/UI | 20 | ~5/20 | 18/20 |
| Déploiement | 50 | ~25/50 | 45/50 |
| Fonctionnalités | 190 | ~0/190 (rien validé sans mobile) | 170/190 |
| Qualité code | 190 | ~0/190 (miroir fonctionnalités) | 170/190 |
| **Bonus** | 50 | 0 | 30/50 |
| **TOTAL** | **500 + 50** | **~35** | **478/550** |

> ⚠️ **Note importante :** Le score actuel est estimé à ~35/500 car sans client mobile, **aucune fonctionnalité n'est considérée fonctionnelle** selon le barème. L'application mobile est la priorité absolue de F2.

---

## 10. AUDIT RÉEL DU CODE (24/03/2026)

> Mise à jour basée sur l'analyse du code actuel (backend/web/docs/docker/mobile) après le dernier pull.

### ✅ Tâches confirmées comme faites

- [x] **B1-1** Corbeille (soft delete + restauration + suppression définitive + purge 30 jours)
- [x] **B1-2** Prévisualisation texte (TXT/MD/CSV/HTML via `text/*`)
- [x] **B1-3** Streaming audio/vidéo avec support `Range` (`206 Partial Content`)
- [x] **B1-4** Téléchargement dossier ZIP
- [x] **B1-5** Quota utilisateur (30 Go) + refus upload si dépassement
- [x] **B1-6** Répartition stockage par type (`/api/storage/breakdown`)
- [x] **B1-7** Fichiers récents (`/api/storage/recent`)
- [x] **B1-8** Métadonnées fichier (`/api/nodes/:id/details`)
- [x] **B1-9** Upload multiple (`/api/files/upload-multiple`)
- [x] **B1-10** Vérification d’intégrité (utilitaire + endpoint admin)
- [x] **B2-3** Expiration des liens publics (acceptation `expires_at` + rejet des liens expirés)
- [x] **B2-8** Sécurité Helmet + Rate limiting auth
- [x] **B2-10** CORS restreint (whitelist)
- [x] **B2-11** Refactoring routes en modules + middleware séparé
- [x] **F1-3** Page Dashboard dédiée (`DashboardHome`)
- [x] **F1-4** Corbeille web (vue + restaurer + supprimer définitivement)
- [x] **F1-6** Lecteur audio/vidéo intégré
- [x] **F1-7** Téléchargement dossier ZIP côté web
- [x] **F1-9** Drag & Drop déplacement
- [x] **F1-10** Drag & Drop upload
- [x] **F1-12** Page Paramètres (`Settings`)
- [x] **F1-13** Bouton téléchargement fichier
- [x] **F1-14** Icônes SVG par type de fichier
- [x] **F1-16** Toggle vue grille/liste
- [x] **F1-19** Gestion d’erreurs globale (intercepteur Axios + toast réseau)
- [x] **K-2** Healthcheck/`depends_on: service_healthy` dans Docker Compose

### ⚠️ Tâches partiellement faites

- [ ] **B2-2** Partage public avec mot de passe (UI envoie un password mais backend ne le valide pas)
- [ ] **B2-4** Changement de mot de passe (endpoint existe, mais sans vérification `currentPassword`)
- [ ] **B2-5** Modification email (possible, mais la vérification mot de passe n’est pas faite dans l’endpoint)
- [ ] **B2-6** Avatar (upload OK, endpoint `GET /api/auth/avatar/:userId` manquant)
- [ ] **B2-7** Préférence de thème (champ DB présent, persistance API non finalisée)
- [ ] **F1-2** Thème clair/sombre (toggle local OK, sauvegarde API non finalisée)
- [ ] **F1-5** Preview texte (TXT/MD affichés, mais rendu Markdown dédié non implémenté)
- [ ] **F1-11** Détails techniques (UI existe, mais n’exploite pas pleinement les détails FS endpoint)
- [ ] **F1-15** Partage avancé (expiration OK, mot de passe non opérationnel côté backend)

### ❌ Tâches encore non faites (principales)

- [ ] **B2-1** Recherche API + filtres type/date
- [ ] **B2-9** Validation d’entrées avec lib dédiée (`joi` / `express-validator`)
- [ ] **B2-12** `.env.example`
- [ ] **B2-13** Documentation API complète
- [ ] **B2-14** Documentation technique complète
- [ ] **B2-15** Manuel utilisateur
- [ ] **B2-16** Diagrammes UML
- [ ] **F1-1** Refonte UI selon design system/librairie demandée
- [ ] **F1-8** Recherche + filtres connectés à l’API
- [ ] **F1-17** Responsive complet
- [ ] **F1-18** Suppression totale des URLs hardcodées / centralisation API complète
- [ ] **F1-20** Skeleton loaders effectivement branchés dans les vues
- [ ] **F2-1 → F2-19** Mobile (dossier `mobile/` vide)
- [ ] **D-1 → D-5, D-7** Documentation et manuel incomplets / manquants
- [ ] **D-6** README à corriger (mention Next.js incorrecte)
- [ ] **K-1** Vérification réelle `docker compose up --build`
- [ ] **K-3** Docker web en mode production (`build` + serveur statique)
- [ ] **K-4** Injection `VITE_API_URL` via Docker Compose

### ⚠️ Point de vigilance sécurité

- [ ] Vérifier l’historique Git pour secrets potentiellement déjà committés (OAuth/JWT).
