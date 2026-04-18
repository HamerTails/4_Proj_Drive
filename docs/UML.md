# SUPFile - Diagrammes UML

Ce document contient les diagrammes du projet au format Mermaid. Ils sont renderables directement sur GitHub, GitLab, ou dans n'importe quel viewer Markdown compatible Mermaid.

---

## Diagramme de cas d'utilisation

Le systeme a deux types d'acteurs : l'utilisateur connecte (qui a un compte) et le visiteur (qui accede a un lien de partage public sans compte).

```mermaid
flowchart LR
    subgraph Acteurs
        U[Utilisateur connecte]
        V[Visiteur via lien public]
    end

    subgraph Authentification
        A1[S'inscrire par email]
        A2[Se connecter par email]
        A3[Se connecter via Google]
        A4[Se deconnecter]
    end

    subgraph Gestion des fichiers
        F1[Uploader un ou plusieurs fichiers]
        F3[Creer un dossier]
        F4[Renommer un element]
        F5[Deplacer un element]
        F6[Supprimer vers la corbeille]
        F7[Naviguer dans les dossiers]
        F8[Rechercher par nom avec filtres]
    end

    subgraph Previsualisation
        P1[Voir une image]
        P2[Voir un PDF]
        P3[Lire un fichier texte ou Markdown]
        P4[Ecouter un fichier audio]
        P5[Regarder une video]
    end

    subgraph Telechargement
        D1[Telecharger un fichier]
        D2[Telecharger un dossier en ZIP]
    end

    subgraph Partage
        S1[Generer un lien public]
        S2[Proteger un lien par mot de passe]
        S3[Definir une expiration sur un lien]
        S4[Partager avec un utilisateur par email]
        S5[Consulter les fichiers partages avec moi]
    end

    subgraph Corbeille
        T1[Voir la corbeille]
        T2[Restaurer un element]
        T3[Supprimer definitivement]
        T4[Vider la corbeille]
    end

    subgraph Parametres
        C1[Changer son email]
        C2[Changer son mot de passe]
        C3[Modifier son avatar]
        C4[Changer le theme clair/sombre]
        C5[Supprimer son compte]
    end

    subgraph Dashboard
        DB1[Consulter le quota de stockage]
        DB2[Voir la repartition par type]
        DB3[Voir les fichiers recents]
    end

    U --> A1 & A2 & A3 & A4
    U --> F1 & F3 & F4 & F5 & F6 & F7 & F8
    U --> P1 & P2 & P3 & P4 & P5
    U --> D1 & D2
    U --> S1 & S2 & S3 & S4 & S5
    U --> T1 & T2 & T3 & T4
    U --> C1 & C2 & C3 & C4 & C5
    U --> DB1 & DB2 & DB3

    V --> D1
    V --> P1 & P2 & P3 & P4 & P5
```

---

## Schema de la base de donnees

Les 4 tables et leurs relations. La table `nodes` utilise une auto-reference (`parent_id`) pour modeliser l'arborescence de fichiers.

```mermaid
erDiagram
    USERS {
        SERIAL id PK
        TEXT email UK
        TEXT password_hash
        TEXT provider
        TEXT provider_id
        BIGINT storage_used
        TEXT avatar_path
        TEXT theme
        TIMESTAMP created_at
    }

    NODES {
        SERIAL id PK
        INTEGER user_id FK
        INTEGER parent_id FK
        TEXT type
        TEXT name
        TEXT storage_path
        TEXT mime_type
        BIGINT size
        BOOLEAN is_trashed
        TIMESTAMP trashed_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    SHARES {
        SERIAL id PK
        INTEGER node_id FK
        TEXT token UK
        TEXT password_hash
        TIMESTAMP expires_at
        TIMESTAMP created_at
    }

    INTERNAL_SHARES {
        SERIAL id PK
        INTEGER node_id FK
        INTEGER from_user_id FK
        INTEGER to_user_id FK
        TIMESTAMP created_at
    }

    USERS ||--o{ NODES : "possede"
    NODES ||--o{ NODES : "contient"
    NODES ||--o{ SHARES : "partage via lien"
    NODES ||--o{ INTERNAL_SHARES : "partage entre utilisateurs"
    USERS ||--o{ INTERNAL_SHARES : "envoie"
    USERS ||--o{ INTERNAL_SHARES : "recoit"
```

---

## Sequence : upload d'un fichier

Ce diagramme montre ce qui se passe quand un utilisateur uploade un fichier, de la requete HTTP jusqu'a l'ecriture sur disque et en base.

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Express
    participant M as Multer
    participant DB as PostgreSQL
    participant FS as Disque

    C->>A: POST /api/files/upload (multipart + JWT)
    A->>A: Verifier le token JWT
    A->>M: Traiter le fichier
    M->>FS: Ecrire dans /data/user_X/
    M-->>A: req.file pret
    A->>DB: Lire storage_used de l'utilisateur
    A->>A: Verifier que used + size <= 30 Go
    alt Quota depasse
        A->>FS: Supprimer le fichier ecrit
        A-->>C: 413 Quota depasse
    else OK
        A->>DB: INSERT INTO nodes
        A->>DB: UPDATE users SET storage_used += size
        A-->>C: 201 Fichier cree
    end
```

---

## Sequence : partage public avec mot de passe

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant DB as PostgreSQL

    Note over C,A: Creation du lien
    C->>A: POST /api/shares { node_id, password }
    A->>A: Hasher le mot de passe (bcrypt)
    A->>DB: INSERT INTO shares
    A-->>C: 201 { link }

    Note over C,A: Acces au lien
    C->>A: GET /shares/public/:token?password=xxx
    A->>DB: SELECT share + node
    A->>A: Verifier l'expiration
    A->>A: Comparer le mot de passe (bcrypt)
    alt Correct
        A-->>C: 200 Contenu du partage
    else Incorrect
        A-->>C: 403 Mot de passe incorrect
    end
```

---

## Sequence : suppression et corbeille

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant DB as PostgreSQL
    participant FS as Disque

    Note over C,A: Suppression douce
    C->>A: DELETE /api/nodes/:id
    A->>DB: SET is_trashed = TRUE
    A-->>C: 200 Mis en corbeille

    Note over C,A: Suppression definitive
    C->>A: DELETE /api/trash/:id/permanent
    A->>DB: Requete recursive pour trouver tous les enfants
    loop Chaque fichier
        A->>FS: Supprimer du disque
    end
    A->>DB: DELETE FROM nodes
    A->>DB: Mettre a jour le quota
    A-->>C: 200 Supprime

    Note over A: Nettoyage automatique (toutes les 24h)
    A->>DB: Chercher les elements en corbeille depuis +30 jours
    loop Chaque element expire
        A->>FS: Supprimer du disque
        A->>DB: Supprimer de la base
    end
```
