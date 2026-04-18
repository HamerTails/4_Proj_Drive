# SUPFile - Guide utilisateur

Ce guide explique comment utiliser SUPFile au quotidien. L'application est accessible depuis un navigateur web a l'adresse http://localhost:3001 (ou l'adresse fournie par votre administrateur).

---

## Premiere connexion

### Creer un compte

Depuis la page de connexion, cliquez sur "S'inscrire" en bas. Renseignez votre email et un mot de passe (6 caracteres minimum), confirmez-le, puis validez.

Vous pouvez aussi utiliser votre compte Google en cliquant sur "Continuer avec Google".

### Se connecter

Entrez votre email et mot de passe puis cliquez sur "Se connecter". Apres connexion, vous arrivez sur le tableau de bord.

---

## Le tableau de bord

C'est la premiere page que vous voyez apres connexion. Elle donne une vue d'ensemble de votre espace :

- La jauge de stockage indique combien d'espace vous utilisez sur les 30 Go disponibles
- Le graphique en camembert montre la repartition de vos fichiers par type (images, videos, documents, etc.)
- La section "Fichiers recents" liste vos 5 derniers ajouts pour y acceder rapidement

Pour aller dans vos fichiers, cliquez sur "Mes fichiers" en haut a droite ou dans la barre laterale.

---

## Gerer ses fichiers

### Naviguer dans les dossiers

Cliquez sur un dossier pour l'ouvrir. En haut de la page, le fil d'Ariane (Accueil > Dossier > Sous-dossier) permet de remonter d'un ou plusieurs niveaux en un clic.

### Changer de vue

Deux boutons en haut a droite permettent de basculer entre la vue liste (avec les colonnes taille, type et date) et la vue grille (vignettes plus grandes, pratique pour les images).

### Ajouter des fichiers

Deux manieres de faire :
- Cliquer sur le bouton "Uploader" et selectionner vos fichiers
- Glisser-deposer des fichiers directement depuis votre bureau vers la zone de fichiers

Une barre de progression apparait pendant l'envoi. La taille max par fichier est de 100 Mo.

### Creer un dossier

Cliquez sur "Nouveau dossier", donnez-lui un nom et validez. Le dossier apparait immediatement dans la liste.

### Renommer

Survolez un element et cliquez sur l'icone crayon dans les actions a droite. Tapez le nouveau nom et validez.

### Deplacer

Cliquez et maintenez un element, puis faites-le glisser vers un dossier de destination. Le dossier cible s'illumine en bleu pour indiquer qu'il est pret a recevoir l'element. Vous pouvez aussi glisser vers "Accueil" dans le fil d'Ariane pour remettre un element a la racine.

### Supprimer

Survolez l'element et cliquez sur l'icone poubelle. L'element part dans la corbeille, il n'est pas supprime immediatement.

Pour supprimer plusieurs elements d'un coup, cochez les cases a gauche de chaque element, puis utilisez le bouton "Supprimer" qui apparait dans l'en-tete du tableau.

---

## Previsualiser des fichiers

Cliquez sur un fichier pour ouvrir la visionneuse integree. Le type de rendu depend du format :

- **Images** (JPG, PNG, GIF, WebP) : affichage plein ecran
- **PDF** : visionneuse integree avec zoom et navigation
- **Fichiers texte** (TXT) : affichage texte brut
- **Markdown** (MD) : rendu formate avec titres, listes, liens et blocs de code
- **CSV** : tableau interactif avec en-tetes et lignes alternees
- **Audio** (MP3, WAV, OGG) : lecteur avec controles et barre de progression
- **Video** (MP4, WebM) : lecteur video avec possibilite de se deplacer dans la timeline

Pour les autres types de fichiers, un clic ouvre les details du fichier.

---

## Telecharger

### Un fichier

Survolez-le et cliquez sur l'icone de telechargement (fleche vers le bas).

### Un dossier entier

Meme manipulation : survolez le dossier et cliquez sur l'icone de telechargement. L'application genere un fichier ZIP contenant tout le contenu du dossier, sous-dossiers inclus.

---

## Rechercher et filtrer

La barre de recherche en haut permet de trouver des fichiers par nom. En tapant, les resultats se filtrent en temps reel.

Deux menus deroulants supplementaires permettent de filtrer par :
- **Type** : Images, Videos, Audio, PDF, Texte
- **Date** : Aujourd'hui, Cette semaine, Ce mois

Un badge bleu indique les filtres actifs. Pour tout reinitialiser, cliquez sur "Effacer les filtres".

---

## Partager des fichiers

### Lien public

1. Survolez un fichier ou dossier et cliquez sur l'icone de partage
2. Dans l'onglet "Lien public", vous pouvez optionnellement definir un mot de passe et une date d'expiration
3. Cliquez sur "Generer le lien"
4. Copiez le lien et envoyez-le a qui vous voulez

N'importe qui ayant le lien pourra acceder au fichier, meme sans compte SUPFile. Si vous avez defini un mot de passe, il sera demande a l'ouverture du lien.

### Partage avec un utilisateur

1. Toujours depuis l'icone de partage, allez dans l'onglet "Utilisateur"
2. Entrez l'adresse email d'un autre utilisateur SUPFile
3. Cliquez sur "Partager"

Le fichier apparaitra dans la section "Partages avec moi" de la barre laterale du destinataire.

---

## La corbeille

Accessible depuis la barre laterale, la corbeille contient tous les elements que vous avez supprimes. Depuis cette page vous pouvez :

- **Restaurer** un element pour le remettre a sa place d'origine
- **Supprimer definitivement** pour le retirer du disque (irreversible)
- **Vider la corbeille** pour tout supprimer d'un coup

Les elements en corbeille sont automatiquement supprimes apres 30 jours.

---

## Parametres

La page Parametres est accessible depuis la barre laterale. Elle permet de :

### Photo de profil
Cliquer sur "Choisir une image" pour uploader un avatar (JPG, PNG ou WebP, max 5 Mo).

### Theme
Basculer entre le mode clair et le mode sombre. Le choix est sauvegarde et persiste entre les sessions. On peut aussi changer de theme rapidement via le bouton soleil/lune en bas de la barre laterale.

### Changer d'email
Entrer la nouvelle adresse et confirmer avec le mot de passe actuel.

### Changer de mot de passe
Entrer le mot de passe actuel, puis le nouveau (10 caracteres minimum) et le confirmer.

### Supprimer son compte
Dans la zone de danger en bas de la page. Il faut retaper son adresse email pour confirmer. Cette action est irreversible : tous les fichiers, dossiers et partages sont supprimes definitivement.

---

## Astuces

- La **selection multiple** (cocher plusieurs fichiers) permet de supprimer un lot d'elements d'un coup
- Le **glisser-deposer** fonctionne aussi bien pour uploader des fichiers depuis le bureau que pour deplacer des elements entre dossiers
- La **vue grille** est plus pratique quand on a beaucoup d'images
- En cliquant sur n'importe quel niveau du **fil d'Ariane**, on revient directement a ce dossier sans avoir a remonter etape par etape
