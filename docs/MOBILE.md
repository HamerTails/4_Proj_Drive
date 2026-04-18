# SUPFile - Client Mobile

## Presentation

Le client mobile est une application React Native developpee avec Expo. Elle fournit un acces aux fichiers stockes sur SUPFile depuis un smartphone Android ou iOS, avec les fonctionnalites essentielles du client web adaptees a l'usage mobile.

---

## Stack technique

| Technologie | Usage |
|-------------|-------|
| React Native (Expo) | Framework mobile cross-platform |
| React Navigation | Navigation entre les ecrans (stack + tabs) |
| AsyncStorage | Stockage local du token JWT |
| Expo Document Picker | Selection de fichiers pour upload |
| Expo File System | Telechargement de fichiers |

---

## Installation et lancement

```bash
cd mobile
npm install
npx expo start
```

Scanner le QR code avec l'app Expo Go sur votre telephone, ou lancer l'emulateur Android/iOS.

---

## Configuration

L'URL de l'API est configuree dans le fichier de service API du client mobile. En developpement local, il faut utiliser l'adresse IP de la machine (pas localhost, car le telephone ne peut pas joindre localhost du PC).

---

## Ecrans

### Connexion / Inscription
Formulaire email + mot de passe. Le token JWT est stocke dans AsyncStorage pour persister entre les sessions.

### Fichiers
Liste des fichiers et dossiers avec navigation. Possibilite de creer des dossiers, uploader des fichiers, et les organiser.

### Dashboard
Jauge de quota et fichiers recents, similar au dashboard web.

### Corbeille
Liste des fichiers supprimes avec options de restauration et de suppression definitive.

### Recherche
Barre de recherche pour trouver des fichiers par nom, avec filtres.

### Partage
Generation de liens publics et partage interne par email.

### Parametres
Changement d'email, mot de passe et theme. Possibilite de basculer entre theme clair et sombre.

---

## Differences avec le client web

Certaines fonctionnalites avancees ne sont pas disponibles sur mobile :

- Pas de drag & drop (pas pertinent sur mobile)
- Pas de preview audio/video avec streaming (limitation Expo)
- Pas de telechargement ZIP de dossiers
- Pas d'upload d'avatar
- Pas de partage avec mot de passe et expiration
- Pas d'OAuth Google (necesiterait une configuration native specifique)

Ces fonctionnalites restent accessibles via le client web.
