#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/release.sh 0.7.21
#
# What it does:
#   - updates version strings in:
#       - app/app.js (const APP_VERSION = 'x.y.z';)
#       - app/dashboard.js (const DASH_VERSION = "x.y.z"; + header comment)
#       - app/index.html and root index.html (vX.Y.Z mentions and cache-busting params if present)
#       - VERSION.txt
#       - CHANGELOG.md (if has "## [Unreleased]" -> keeps, no auto edits unless you do)
#   - commits, tags, and (optionally) prepares a release artifact elsewhere

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <new_version> (e.g., 0.7.21)"
  exit 1
fi

NEW_VERSION="$1"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_JS="${ROOT_DIR}/app/app.js"
DASH_JS="${ROOT_DIR}/app/dashboard.js"
APP_INDEX="${ROOT_DIR}/app/index.html"
ROOT_INDEX="${ROOT_DIR}/index.html"
VERSION_TXT="${ROOT_DIR}/VERSION.txt"

echo "Releasing version: ${NEW_VERSION}"
echo "Root: ${ROOT_DIR}"

require_file() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Missing file: $f"
    exit 1
  fi
}

require_file "$APP_JS"
require_file "$DASH_JS"
require_file "$APP_INDEX"
require_file "$ROOT_INDEX"
require_file "$VERSION_TXT"

# Update: const APP_VERSION = 'x.y.z';
update_app_version_const() {
  perl -pi -e "s/(const\\s+APP_VERSION\\s*=\\s*['\"])\\d+\\.\\d+\\.\\d+(['\"];)/\\\$1${NEW_VERSION}\\\$2/g" "$APP_JS"
}

# Update dashboard: const DASH_VERSION = "x.y.z";
update_dash_version_const() {
  perl -pi -e "s/(const\\s+DASH_VERSION\\s*=\\s*[\"])(\\d+\\.\\d+\\.\\d+)([\"];)/\\\$1${NEW_VERSION}\\\$3/g" "$DASH_JS"
}

# Update header comment like: /* Boussole — Tableau de bord (v0.7.21)
update_dash_header_comment() {
  perl -pi -e "s/(\\/\\*\\s*Boussole\\s+—\\s+Tableau\\s+de\\s+bord\\s*\\(v)\\d+\\.\\d+\\.\\d+(\\))/\\\$1${NEW_VERSION}\\\$2/g" "$DASH_JS"
}

# Update HTML "v0.x.y.z" occurrences (display)
update_html_vprefix() {
  local f="$1"
  perl -pi -e "s/v\\d+\\.\\d+\\.\\d+/v${NEW_VERSION}/g" "$f"
}

# Update cache-busting params like ?v=0.x.y.z
update_html_cache_param() {
  local f="$1"
  perl -pi -e "s/\\?v=\\d+\\.\\d+\\.\\d+/\\?v=${NEW_VERSION}/g" "$f"
}

# VERSION.txt contains "0.7.21" only
update_version_txt() {
  echo "${NEW_VERSION}" > "$VERSION_TXT"
}

update_app_version_const
update_dash_version_const
update_dash_header_comment
update_html_vprefix "$APP_INDEX"
update_html_vprefix "$ROOT_INDEX"
update_html_cache_param "$APP_INDEX"
update_html_cache_param "$ROOT_INDEX"
update_version_txt

# Quick sanity: ensure the expected tokens exist after replacement
if ! grep -q "const APP_VERSION" "$APP_JS"; then
  echo "Sanity check failed: const APP_VERSION missing in app/app.js"
  exit 1
fi
if ! grep -q "const DASH_VERSION" "$DASH_JS"; then
  echo "Sanity check failed: const DASH_VERSION missing in app/dashboard.js"
  exit 1
fi

echo "OK: versions updated."

git add "$APP_JS" "$DASH_JS" "$APP_INDEX" "$ROOT_INDEX" "$VERSION_TXT"

git commit -m "chore(release): v${NEW_VERSION}" || true
git tag "v${NEW_VERSION}" || true

echo "Done. Commit + tag created (if changes existed)."
