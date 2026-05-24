# SUPFile - Installation

Procedure d'install pour dev local et pour deploiement VPS.

## Pre-requis dev

- Linux (Ubuntu 22+, Debian 12+), macOS 13+, ou Windows 10+ avec WSL2
- Docker 24+ et Docker Compose v2.20+ (la commande `docker compose`, sans tiret)
- 8 Go RAM minimum (16 confortable), 10 Go de disque libre
- Node 20 LTS + npm 10 si on veut lancer Expo hors Docker
- Un smartphone Android 8+ ou iOS 14+ avec Expo Go pour tester le mobile
- Un navigateur recent (Chrome 120+ / Firefox 121+ / Safari 17+ / Edge 120+)

## Pre-requis prod

- VPS 2 vCPU / 2 Go RAM / 30 Go (4 vCPU / 4 Go / 80 Go recommandes)
- Alpine 3.18+ ou Debian 12+ ou Ubuntu 22.04+
- Docker 24+, Caddy 2.7+ pour le HTTPS auto
- 2 sous-domaines pointes sur l'IP du VPS (un pour le web, un pour l'API)
- Ports 80, 443, 22 ouverts (SSH par cle uniquement)
- Compte Google Cloud avec un projet OAuth 2.0 et les URLs de callback whitelistees

## Install locale

### 1. Cloner

```
git clone https://github.com/HamerTails/4_Proj_Drive.git supfile
cd supfile
```

### 2. .env

```
cp .env.example .env
```

A remplir :

- `POSTGRES_PASSWORD` : `openssl rand -base64 24 | tr -d '/+='`
- `JWT_SECRET` : `openssl rand -hex 32`
- `OAUTH_CLIENT_ID` et `OAUTH_CLIENT_SECRET` : Google Cloud Console > Credentials
- Le reste peut rester par defaut

Bien penser a mettre la meme valeur de `POSTGRES_PASSWORD` dans `DATABASE_URL`.

### 3. Up

```
docker compose up --build
```

Ce qui demarre :

- API sur http://localhost:3000
- Web sur http://localhost:3001
- Expo Metro sur http://localhost:8081 (le QR code apparait dans les logs)
- Postgres sur localhost:5432

### 4. Premier compte

Ouvrir http://localhost:3001 et s'inscrire via le formulaire. Ou tester avec un compte demo
deja seede en prod.

## Mobile sur telephone

### Avec Expo Go (dev)

1. Installer Expo Go (Play Store / App Store)
2. Scanner le QR code des logs `docker compose up`
3. L'app se lance avec hot reload

### APK signe (preview)

```
cd mobile
eas build -p android --profile preview
```

Le lien APK est affiche en fin de build.

## Deploiement prod

### 1. VPS

OVH, IONOS, Contabo, Hetzner... peu importe. 2 vCPU / 4 Go / 80 Go NVMe avec IP publique dediee.
Ports 80, 443, 22 ouverts au firewall.

### 2. Docker + Caddy

```
ssh root@<IP_VPS>
apk update && apk upgrade -a
apk add docker docker-cli-compose git curl openssl caddy
rc-update add docker boot
service docker start
```

### 3. Clone + env

```
mkdir -p /opt && cd /opt
git clone https://github.com/HamerTails/4_Proj_Drive.git supfile
cd supfile

JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')

cat > .env << EOF
POSTGRES_DB=supfile
POSTGRES_USER=supfile
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://supfile:$POSTGRES_PASSWORD@db:5432/supfile
JWT_SECRET=$JWT_SECRET
OAUTH_CLIENT_ID=<votre_id>
OAUTH_CLIENT_SECRET=<votre_secret>
OAUTH_CALLBACK_URL=https://api.votre-domaine.fr/api/auth/google/callback
OAUTH_SUCCESS_REDIRECT=https://votre-domaine.fr/login
WEB_URL=https://votre-domaine.fr
NODE_ENV=production
QUOTA_BYTES=32212254720
EOF
```

### 4. DNS Cloudflare

Deux A records en mode "DNS only" (nuage gris, pas en proxied) :

- `votre-domaine.fr` -> IP VPS
- `api.votre-domaine.fr` -> IP VPS

### 5. Up

```
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Caddy

```
cp /opt/supfile/Caddyfile /etc/caddy/Caddyfile
# editer pour mettre les vrais noms de domaine
mkdir -p /var/log/caddy
nohup caddy run --config /etc/caddy/Caddyfile &
```

Caddy genere les certificats Let's Encrypt tout seul via ACME TLS-ALPN-01.

### 7. Sanity check

```
curl https://api.votre-domaine.fr/api/health
# doit retourner {"status":"ok","timestamp":"..."}

curl -I https://votre-domaine.fr
# doit retourner HTTP/2 200
```

## Comptes demo (sur la prod deployee)

- `alice.demo@supfile.test` / `Demo12345!`
- `bob.demo@supfile.test` / `Demo12345!` (pour tester les partages internes)

URL : https://supfile.hackthehydra.com

## Depannage

### Caddy refuse de demarrer / port 443 occupe

```
ss -tlnp | grep :443
# voir qui squatte le port, puis sur Alpine : rc-service <nom> stop
```

### docker compose up : "permission denied"

```
chmod +x api/database/*.sql
# ou ajouter son user au groupe docker :
addgroup $USER docker
newgrp docker
```

### Le QR code Expo n'apparait pas

Verifier que le port 8081 est libre et que `CHOKIDAR_USEPOLLING` est bien dans le compose.

### Quota atteint trop vite en demo

Reduire `QUOTA_BYTES` dans `.env` (1 Go = 1073741824).

### Backup nightly

```
0 3 * * * docker compose -f /opt/supfile/docker-compose.prod.yml exec -T db pg_dump -U supfile supfile | gzip > /opt/backups/supfile-$(date +\%Y\%m\%d).sql.gz
```

## Plus de doc

- `docs/technical_documentation.pdf` (architecture, choix techno, UML)
- `docs/USER_MANUAL.pdf` (manuel utilisateur)
- `docs/API.md` (reference endpoints)
- `docs/UML.md` (diagrammes)
