#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION_FILE="VERSION.txt"
NEXT_FILE="NEXT_OBJECTIVE.md"
CHANGELOG_FILE="CHANGELOG.md"

fail() { echo "::error::$1"; exit 1; }
need_file() { [[ -f "$1" ]] || fail "Fichier manquant: $1"; }

need_file "$VERSION_FILE"
need_file "$NEXT_FILE"

trim() { awk '{$1=$1;print}' <<< "${1:-}"; }

# --- Read current version
CURRENT_VERSION="$(tr -d ' \t\r\n' < "$VERSION_FILE")"
[[ "$CURRENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "VERSION.txt invalide: '$CURRENT_VERSION'"

# --- Read READY gate (defensive: workflow peut aussi le gérer)
READY_LINE="$(grep -E '^READY:' "$NEXT_FILE" || true)"
READY_VAL="$(trim "${READY_LINE#READY:}")"
READY_VAL="${READY_VAL,,}" # lowercase
if [[ "$READY_VAL" != "yes" ]]; then
  echo "READY != yes ($READY_VAL) : stop (exit 0)"
  exit 0
fi

# --- Read optional TARGET_VERSION
TARGET_LINE="$(grep -E '^TARGET_VERSION:' "$NEXT_FILE" || true)"
TARGET_VERSION="$(trim "${TARGET_LINE#TARGET_VERSION:}")"
if [[ -n "$TARGET_VERSION" ]]; then
  [[ "$TARGET_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "TARGET_VERSION invalide: '$TARGET_VERSION'"
  NEW_VERSION="$TARGET_VERSION"
else
  IFS='.' read -r MA MI PA <<< "$CURRENT_VERSION"
  PA=$((PA + 1))
  NEW_VERSION="${MA}.${MI}.${PA}"
fi

echo "Current: $CURRENT_VERSION"
echo "Next:    $NEW_VERSION"

# --- Helper: safe in-place replace (literal)
replace_literal() {
  local file="$1" from="$2" to="$3"
  [[ -f "$file" ]] || return 0
  perl -pi -e "s/\Q$from\E/$to/g" "$file"
}

# --- Helper: update APP_VERSION in app/app.js
update_app_version_const() {
  local file="app/app.js"
  [[ -f "$file" ]] || return 0
  # Remplace const APP_VERSION = 'x.y.z'; (ou "x.y.z")
  perl -0777 -pi -e "s/(const\\s+APP_VERSION\\s*=\\s*['\"])\\d+\\.\\d+\\.\\d+(['\"];)/\$1${NEW_VERSION}\$2/g" "$file"
}

# --- Capture objective (pour changelog) AVANT de remettre READY à no
OBJECTIVE_BLOCK="$(
  awk '
    BEGIN{in_obj=0}
    /^##[[:space:]]+Objectif/{in_obj=1; next}
    /^##[[:space:]]+/{if(in_obj){exit}}
    {if(in_obj) print}
  ' "$NEXT_FILE" | sed '/^[[:space:]]*$/d'
)"
if [[ -z "$OBJECTIVE_BLOCK" ]]; then
  OBJECTIVE_BLOCK="- (objectif non renseigné)"
fi

# --- Write VERSION.txt
printf "%s\n" "$NEW_VERSION" > "$VERSION_FILE"

# --- Update files: displayed version + cache-busting ?v=
FILES_TO_UPDATE=(
  "index.html"
  "en.html"
  "boussole_suivi_projet.html"
  "app/index.html"
  "app/dashboard.html"
  "app/dashboard.js"
  "app/app.js"
)

for f in "${FILES_TO_UPDATE[@]}"; do
  # v0.7.15 -> v0.7.20
  replace_literal "$f" "v$CURRENT_VERSION" "v$NEW_VERSION"
  # ?v=0.7.15 -> ?v=0.7.20
  replace_literal "$f" "?v=$CURRENT_VERSION" "?v=$NEW_VERSION"
done

# Ensure app/app.js constant is updated (the real source of your “revert”)
update_app_version_const

# --- Update CHANGELOG (insert entry near top)
if [[ ! -f "$CHANGELOG_FILE" ]]; then
  cat > "$CHANGELOG_FILE" <<'MD'
# Changelog

MD
fi

if ! grep -qE "^##[[:space:]]+v${NEW_VERSION}\b" "$CHANGELOG_FILE"; then
  ENTRY=$(
    cat <<EOF
## v${NEW_VERSION}

${OBJECTIVE_BLOCK}

EOF
  )
  tmp="$(mktemp)"
  awk -v entry="$ENTRY" '
    NR==1 {print; print ""; print entry; next}
    {print}
  ' "$CHANGELOG_FILE" > "$tmp"
  mv "$tmp" "$CHANGELOG_FILE"
fi

# --- Reset NEXT_OBJECTIVE gate: READY: no, clear TARGET_VERSION
perl -pi -e "s/^READY:\\s*.*\$/READY: no/m" "$NEXT_FILE"
perl -pi -e "s/^TARGET_VERSION:\\s*.*\$/TARGET_VERSION:/m" "$NEXT_FILE"

# --- Build ZIP FULL into dist/ (not committed; just artifact)
mkdir -p dist
ZIP_NAME="boussole-v${NEW_VERSION}-full.zip"
ZIP_PATH="dist/${ZIP_NAME}"

rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" . \
  -x ".git/*" ".git/**" \
  -x "dist/*" "dist/**"

# sha256 for traceability
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ZIP_PATH" | awk "{print \$1}" > "dist/${ZIP_NAME}.sha256"
fi

# Optional: release notes file for GH release body
cat > "dist/RELEASE_NOTES.md" <<EOF
Boussole v${NEW_VERSION}

${OBJECTIVE_BLOCK}
EOF

echo "OK: built $ZIP_PATH"
