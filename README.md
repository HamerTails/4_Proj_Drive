# SUPFile

Plateforme de stockage cloud (style Dropbox/Drive) developpee dans le cadre du module 4PROJ a SUPINFO.
Web + mobile + API + Postgres, le tout containerise.

## Demo

- Web : https://supfile.hackthehydra.com
- API : https://api.supfile.hackthehydra.com
- Comptes de test : `alice.demo@supfile.test` / `Demo12345!` et `bob.demo@supfile.test` / `Demo12345!`
  (le second sert a tester les partages internes)

L'APK Android est dispo sur le profil Expo du projet (voir `mobile/eas.json`).

## Stack

- API : Node.js + Express + PostgreSQL 15
- Web : React + Vite
- Mobile : React Native + Expo (router file-based)
- Stockage fichiers : volume Docker en V1, prevu S3-compatible en V2
- Reverse proxy en prod : Caddy (HTTPS Let's Encrypt auto)

## Lancement local

```
cp .env.example .env
# editer .env (au minimum POSTGRES_PASSWORD et JWT_SECRET)
docker compose up --build
```

Une fois la stack up :

- API : http://localhost:3000
- Web : http://localhost:3001
- Expo Metro : http://localhost:8081 (QR code dans les logs)
- Postgres : localhost:5432

Pour le mobile on lance Expo en mode tunnel dans le compose pour scanner depuis le tel.
Alternative sans Docker : `cd mobile && npm install && npx expo start`.

## Prod

Le deploiement complet (VPS Alpine + Docker + Caddy) est decrit dans `INSTALLATION.md`.
La config reverse proxy est dans `Caddyfile`, le compose de prod (sans mobile, avec limites memoire)
est `docker-compose.prod.yml`.

## Documentation

- `INSTALLATION.md` : pre-requis et procedure d'installation
- `docs/technical_documentation.pdf` : doc technique (architecture, choix techno, UML)
- `docs/USER_MANUAL.pdf` : manuel utilisateur illustre
- `docs/API.md` : reference des endpoints
- `docs/UML.md` : diagrammes (cas d'usage, schema BDD)

## Equipe

Projet 4PROJ SUPINFO, janvier - mai 2026.

- Luka Karkashadze - chef de projet, archi technique, backend, deploiement
- Bastien Marcheron - lead fullstack (API, refonte web, finalisation mobile)
- Beatrice Beavogui - mobile (Expo, dashboard, navigation)
- Theo Monel - frontend / UX (previews, lecteurs media, charte)

## Depot

https://github.com/HamerTails/4_Proj_Drive
