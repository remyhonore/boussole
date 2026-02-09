#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION_FILE="VERSION.txt"
NEXT_FILE="NEXT_OBJECTIVE.md"
CHANGELOG_FILE="CHANGELOG.md"

fail() {
  echo "::error::$1"
  exit 1
}

need_file() {
  [[ -f "$1" ]] || fail "Fichier manquant: $1"
}

semver_ok() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

bump_patch() {
  local v="$1"
  IFS='.' read -r major minor patch <<<"$v"
  patch=$((patch + 1))
  echo "${major}.${minor}.${patch}"
}

set_output() {
  local k="$1"
  local v="$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "${k}=${v}" >>"$GITHUB_OUTPUT"
  fi
}

need_file "$VERSION_FILE"
need_file "$NEXT_FILE"
need_file "$CHANGELOG_FILE"

OLD_VERSION="$(tr -d '\r\n ' <"$VERSION_FILE")"
semver_ok "$OLD_VERSION" || fail "VERSION.txt doit contenir x.y.z (actuel: '$OLD_VERSION')"

# Parse NEXT_OBJECTIVE.md (READY/TARGET_VERSION/TITLE/DETAILS)
READY="$(python3 - <<'PY'
import re, pathlib
p = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace").splitlines()
ready = ""
for line in p:
    m = re.match(r"^\s*READY:\s*(yes|no)\s*$", line, re.I)
    if m:
        ready = m.group(1).lower()
        break
print(ready)
PY
)"

if [[ "${READY}" != "yes" ]]; then
  echo "READY != yes → aucune release. (READY='${READY:-absent}')"
  set_output "released" "no"
  set_output "version" "$OLD_VERSION"
  exit 0
fi

TARGET_VERSION="$(python3 - <<'PY'
import re, pathlib
txt = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace")
m = re.search(r"^\s*TARGET_VERSION:\s*([0-9]+\.[0-9]+\.[0-9]+)?\s*$", txt, re.I | re.M)
print((m.group(1) or "").strip() if m else "")
PY
)"

TITLE="$(python3 - <<'PY'
import re, pathlib
txt = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace")
m = re.search(r"^\s*TITLE:\s*(.+?)\s*$", txt, re.I | re.M)
print((m.group(1).strip() if m else "release"))
PY
)"

DETAILS="$(python3 - <<'PY'
import pathlib
lines = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace").splitlines()
out = []
in_details = False
for line in lines:
    if line.strip().lower() == "details:":
        in_details = True
        continue
    if in_details:
        if line.strip() == "" or (":" in line and not line.lstrip().startswith("-")):
            break
        if line.lstrip().startswith("-"):
            out.append(line.strip())
print("\n".join(out))
PY
)"

NEW_VERSION="$TARGET_VERSION"
if [[ -z "$NEW_VERSION" ]]; then
  NEW_VERSION="$(bump_patch "$OLD_VERSION")"
fi
semver_ok "$NEW_VERSION" || fail "TARGET_VERSION invalide (attendu x.y.z). Reçu: '$NEW_VERSION'"

echo "Release déclenchée ✅  OLD=$OLD_VERSION → NEW=$NEW_VERSION"
echo "$NEW_VERSION" >"$VERSION_FILE"

# Update cache-busting ?v=... + occurrences vOLD -> vNEW
python3 - <<PY
import re, pathlib

new_v = "${NEW_VERSION}"
old_v = "${OLD_VERSION}"

root = pathlib.Path(".")
targets = []
for p in root.rglob("*"):
    if not p.is_file():
        continue
    s = str(p)
    if s.startswith(".git/") or s.startswith("dist/"):
        continue
    if p.suffix.lower() in (".html", ".js", ".css"):
        targets.append(p)

for p in targets:
    data = p.read_text(encoding="utf-8", errors="replace")
    orig = data

    # 1) remplace toute forme ?v=x.y.z par ?v=NEW
    data = re.sub(r"\?v=\d+\.\d+\.\d+", f"?v={new_v}", data)

    # 2) remplace vOLD -> vNEW (si affichage version / noms de cache)
    data = data.replace(f"v{old_v}", f"v{new_v}")

    if data != orig:
        p.write_text(data, encoding="utf-8")
PY

# Update CHANGELOG.md : insertion sous [Unreleased]
python3 - <<PY
import re, pathlib, datetime

path = pathlib.Path("CHANGELOG.md")
txt = path.read_text(encoding="utf-8", errors="replace")

if "## [Unreleased]" not in txt:
    txt = "# Changelog\n\n## [Unreleased]\n\n" + txt.lstrip()

date = datetime.datetime.utcnow().strftime("%Y-%m-%d")
new_ver = "${NEW_VERSION}"
title = "${TITLE}".strip()

details = """${DETAILS}""".strip()
detail_block = ""
if details:
    detail_block = "\n" + details + "\n"

entry = f"## [{new_ver}] - {date}\n- {title}{detail_block}\n"

# insère juste après la section Unreleased (après sa ligne + éventuels blancs)
m = re.search(r"(## \[Unreleased\]\s*\n)", txt)
if not m:
    txt = txt + "\n" + entry
else:
    insert_at = m.end()
    # saute les lignes blanches après Unreleased
    while insert_at < len(txt) and txt[insert_at:insert_at+1] in "\n\r":
        insert_at += 1
    txt = txt[:insert_at] + entry + txt[insert_at:]

path.write_text(txt, encoding="utf-8")
PY

# Reset READY: no + clear TARGET_VERSION
python3 - <<'PY'
import re, pathlib
p = pathlib.Path("NEXT_OBJECTIVE.md")
txt = p.read_text(encoding="utf-8", errors="replace")

txt = re.sub(r"^\s*READY:\s*yes\s*$", "READY: no", txt, flags=re.I|re.M)
# force TARGET_VERSION line to exist and empty
if re.search(r"^\s*TARGET_VERSION:", txt, flags=re.I|re.M):
    txt = re.sub(r"^\s*TARGET_VERSION:\s*.*$", "TARGET_VERSION:", txt, flags=re.I|re.M)
else:
    # insère après READY
    txt = re.sub(r"^(READY:\s*(?:yes|no)\s*)$", r"\1\nTARGET_VERSION:", txt, flags=re.I|re.M)

p.write_text(txt, encoding="utf-8")
PY

# Build ZIP FULL in dist/
mkdir -p dist
ZIP_PATH="dist/boussole-v${NEW_VERSION}-full.zip"
rm -f "$ZIP_PATH"

# zip exclude: .git + dist (dist se regénère)
zip -r "$ZIP_PATH" . -x ".git/*" "dist/*" >/dev/null

# Release notes
NOTES_PATH="dist/RELEASE_NOTES.md"
{
  echo "## Boussole v${NEW_VERSION}"
  echo
  echo "- ${TITLE}"
  if [[ -n "${DETAILS}" ]]; then
    echo
    echo "${DETAILS}"
  fi
} >"$NOTES_PATH"

set_output "released" "yes"
set_output "version" "$NEW_VERSION"
set_output "zip_path" "$ZIP_PATH"
set_output "release_notes_path" "$NOTES_PATH"

echo "OK ✅ ZIP: $ZIP_PATH"
