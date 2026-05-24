#!/usr/bin/env bash
# ============================================================
# SUPFile — Génère l'archive ZIP de rendu Moodle
# ============================================================
# Exclut : node_modules, .git, .env (secrets), .expo, dist, build,
# docs/_internal (notes internes), BUGS.md, reste_todo.md, etc.
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-/mnt/c/Users/lukak/Desktop}"
ZIP_NAME="SUPFile_rendu_$(date +%Y%m%d).zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

echo "=== SUPFile - Archive de rendu Moodle ==="
echo "Source : $PROJECT_DIR"
echo "Sortie : $ZIP_PATH"
echo ""

cd "$PROJECT_DIR"

# Supprimer l'ancien ZIP si présent
[ -f "$ZIP_PATH" ] && rm "$ZIP_PATH"

# Liste des exclusions
EXCLUDES=(
  # Dossiers générés
  "*/node_modules/*"
  "node_modules/*"
  "*/.expo/*"
  ".expo/*"
  "*/dist/*"
  "*/build/*"
  ".git/*"
  "*/.git/*"

  # Secrets (ne JAMAIS inclure)
  ".env"
  ".env.local"
  "*/.env"

  # Notes internes (pas pour le jury)
  "docs/_internal/*"
  "BUGS.md"
  "reste_todo.md"
  "TODO.md"
  "oral.txt"
  "sujet.txt"
  "4Proj Dev Oral.pdf"

  # Packs Overleaf (sources pour re-compilation perso, pas pour le jury)
  "docs/overleaf_tech/*"
  "docs/overleaf_manual/*"
  "docs/overleaf_tech.zip"
  "docs/overleaf_manual.zip"

  # Lock files (lourds et regenerables)
  "*/package-lock.json"
  "package-lock.json"

  # OS / éditeurs
  "*.DS_Store"
  "Thumbs.db"
  "*.swp"
  ".vscode/*"
  ".idea/*"

  # Logs
  "*.log"
  "logs/*"

  # Backups locaux
  "*.bak"
  "*.old"

  # Le script lui-meme
  "scripts/build_rendu_zip.sh"

  # Le ZIP de sortie (si genere ici)
  "$ZIP_NAME"
)

# Construit les flags -x pour zip
EXCLUDE_FLAGS=()
for e in "${EXCLUDES[@]}"; do
  EXCLUDE_FLAGS+=("-x" "$e")
done

# Crée le ZIP
zip -r -q "$ZIP_PATH" . "${EXCLUDE_FLAGS[@]}"

echo ""
echo "✅ Archive créée : $ZIP_PATH"
echo ""
echo "=== Contenu ==="
unzip -l "$ZIP_PATH" | tail -5

echo ""
echo "=== Taille ==="
ls -lh "$ZIP_PATH" | awk '{print $5}'

echo ""
echo "=== Vérification : aucun secret ==="
unzip -l "$ZIP_PATH" | grep -E "\.env$|/\.env$" && {
  echo "⚠️  ATTENTION : .env trouvé dans l'archive, supprimer manuellement !"
  exit 1
} || echo "✅ Aucun .env dans l'archive"

echo ""
echo "=== Pret pour Moodle ! ==="
echo "Tu peux uploader : $ZIP_PATH"
