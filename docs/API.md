# SUPFile - Documentation de l'API

## Informations generales

L'API est accessible sur `http://localhost:3000/api` en local.

La plupart des endpoints necessitent une authentification. Il y a deux facons de s'authentifier :
- Header HTTP : `Authorization: Bearer <token>`
- Query param : `?token=<token>` (pratique pour les liens de telechargement et preview)

Le token JWT est obtenu lors de la connexion ou l'inscription. Il expire au bout de 7 jours.

Toutes les reponses sont en JSON sauf les endpoints de telechargement et de streaming qui retournent directement le contenu du fichier.

---

## Authentification

### Inscription

`POST /auth/register`

Cree un nouveau compte. Le mot de passe doit faire au moins 6 caracteres.

```json
{
  "email": "utilisateur@example.com",
  "password": "monsupermotdepasse"
}
```

Retourne un status 201 avec le token JWT et les infos de l'utilisateur. Retourne 409 si l'email est deja pris, 400 si les donnees sont invalides.

### Connexion

`POST /auth/login`

```json
{
  "email": "utilisateur@example.com",
  "password": "monsupermotdepasse"
}
```

Retourne 200 avec le token. Retourne 401 si les identifiants sont mauvais.

### Connexion Google

`GET /auth/google` redirige vers la page de connexion Google. Apres authentification, Google rappelle `GET /auth/google/callback` qui redirige le navigateur vers le frontend avec le token en query param.

---

## Fichiers et dossiers

### Lister le contenu d'un dossier

`GET /nodes` ou `GET /nodes?parent_id=42`

Sans `parent_id`, retourne le contenu de la racine. Les elements en corbeille sont exclus automatiquement. Le resultat est trie : dossiers d'abord, puis fichiers, par ordre alphabetique.

### Breadcrumb (fil d'Ariane)

`GET /nodes/breadcrumb?id=42`

Retourne le chemin complet depuis la racine jusqu'au dossier demande. Utilise une requete recursive en SQL.

### Details d'un fichier

`GET /nodes/:id/details`

Retourne les metadonnees du fichier, y compris les infos du systeme de fichiers (taille reelle, date de derniere modification).

### Creer un dossier

`POST /nodes/folder`

```json
{
  "name": "Mon nouveau dossier",
  "parent_id": null
}
```

Le nom est obligatoire (max 255 caracteres). `parent_id` a null cree le dossier a la racine.

### Renommer

`PUT /nodes/:id/rename`

```json
{ "name": "Nouveau nom" }
```

### Deplacer

`PUT /nodes/:id/move`

```json
{ "parent_id": 42 }
```

Mettre `parent_id` a null pour deplacer a la racine. L'API verifie qu'on ne cree pas de boucle (deplacer un dossier dans un de ses propres sous-dossiers).

### Supprimer (vers la corbeille)

`DELETE /nodes/:id`

L'element n'est pas supprime du disque, il est marque comme "en corbeille" (soft delete).

---

## Upload et telechargement

### Uploader un fichier

`POST /files/upload`

Envoyer en `multipart/form-data` avec le champ `file`. Le champ optionnel `parent_id` indique dans quel dossier placer le fichier. Taille max : 100 Mo. Le quota utilisateur (30 Go) est verifie avant l'ecriture.

### Upload multiple

`POST /files/upload-multiple`

Meme principe, mais le champ `files` accepte jusqu'a 10 fichiers.

### Telecharger un fichier

`GET /files/:id/download?token=xxx`

Declenche le telechargement du fichier. L'authentification se fait via le query param.

### Previsualiser

`GET /files/:id/preview?token=xxx`

Retourne le contenu du fichier avec le bon Content-Type. Fonctionne pour les images, les PDF, et les fichiers texte.

### Streaming audio/video

`GET /files/:id/stream?token=xxx`

Supporte les Range Requests (header `Range: bytes=0-1024`). Retourne un status 206 Partial Content pour permettre le seek dans les lecteurs HTML5.

### Telecharger un dossier en ZIP

`GET /files/folder/:id/download?token=xxx`

Genere une archive ZIP a la volee avec tout le contenu du dossier (recursif) et la stream directement.

---

## Corbeille

### Lister la corbeille

`GET /trash`

Retourne tous les elements supprimes de l'utilisateur, tries par date de suppression.

### Restaurer un element

`PUT /trash/:id/restore`

Remet l'element dans son dossier d'origine.

### Supprimer definitivement

`DELETE /trash/:id/permanent`

Supprime le fichier du disque et de la base de donnees. Si c'est un dossier, supprime aussi tous ses enfants recursivement. Le quota utilisateur est mis a jour.

---

## Stockage et statistiques

### Usage global

`GET /storage/usage`

Retourne l'espace utilise, le quota total (30 Go), le pourcentage, et le nombre de fichiers/dossiers.

### Repartition par type

`GET /storage/breakdown`

Retourne la taille occupee par categorie : Images, Videos, Audio, Documents, Autres.

### Fichiers recents

`GET /storage/recent?limit=5`

Retourne les N derniers fichiers uploades (max 20).

---

## Recherche

### Rechercher des fichiers

`GET /search?q=rapport&type=document&date=month`

Le parametre `q` est obligatoire. Les filtres sont optionnels :
- `type` : image, video, audio, pdf, text, document
- `date` : today, week, month, year

La recherche est insensible a la casse et cherche le terme dans le nom du fichier.

---

## Partage

### Creer un lien public

`POST /shares`

```json
{
  "node_id": 42,
  "password": "optionnel",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

Retourne le lien de partage. Le mot de passe et l'expiration sont optionnels.

### Acceder a un partage public

`GET /shares/public/:token`

Si le partage a un mot de passe, il faut le fournir en query param `?password=xxx`. Retourne 403 si le mot de passe est faux, 410 si le lien a expire.

Pour un dossier, retourne la liste des enfants. Pour un fichier, retourne ses infos. Ajouter `?file=ID` pour telecharger un fichier specifique du partage.

### Partager avec un autre utilisateur

`POST /shares/internal`

```json
{
  "node_id": 42,
  "email": "collegue@example.com"
}
```

L'utilisateur cible doit avoir un compte SUPFile. Retourne 404 si l'email n'existe pas, 409 si le fichier est deja partage avec cette personne.

### Fichiers partages avec moi

`GET /shares/internal`

---

## Gestion du profil

### Mes informations

`GET /users/me`

Retourne l'id, l'email, l'avatar, le theme, le provider et la date de creation.

### Changer d'email

`PUT /users/email`

```json
{
  "email": "nouveau@email.com",
  "password": "mot_de_passe_actuel"
}
```

Le mot de passe est verifie avant d'appliquer le changement.

### Changer de mot de passe

`PUT /users/password`

```json
{
  "currentPassword": "ancien_mdp",
  "password": "nouveau_mot_de_passe"
}
```

Le nouveau mot de passe doit faire au moins 10 caracteres.

### Avatar

`POST /users/avatar` : upload en `multipart/form-data`, champ `avatar`. Max 5 Mo, formats JPG/PNG/WebP.

`GET /users/avatar/:userId` : recupere l'image de l'avatar.

### Preferences

`PUT /users/preferences`

```json
{ "theme": "dark" }
```

Valeurs acceptees : `light` ou `dark`.

### Supprimer son compte

`DELETE /users/account`

Supprime definitivement le compte, tous les fichiers, dossiers, partages et l'avatar. Irreversible.

---

## Sante

`GET /health` : retourne `{ "status": "ok" }` si l'API tourne.

`GET /admin/integrity` : verifie que tous les fichiers references en base existent bien sur le disque.
