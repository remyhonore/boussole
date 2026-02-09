#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION_FILE="VERSION.txt"
NEXT_FILE="NEXT_OBJECTIVE.md"
CHANGELOG_FILE="CHANGELOG.md"

fail() { echo "::error::$1"; exit 1; }
need_file() { [[ -f "$1" ]] || fail "Fichier manquant: $1"; }

semver_ok() { [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; }

bump_patch() {
  local v="$1"
  IFS='.' read -r major minor patch <<<"$v"
  patch=$((patch + 1))
  echo "${major}.${minor}.${patch}"
}

set_output() {
  local k="$1" v="$2"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "${k}=${v}" >>"$GITHUB_OUTPUT"
  fi
}

need_file "$VERSION_FILE"
need_file "$NEXT_FILE"
need_file "$CHANGELOG_FILE"

OLD_VERSION="$(tr -d '\r\n ' <"$VERSION_FILE")"
semver_ok "$OLD_VERSION" || fail "VERSION.txt doit contenir x.y.z (actuel: '$OLD_VERSION')"

READY="$(python3 - <<'PY'
import re, pathlib
txt = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace")
m = re.search(r"^\s*READY:\s*(yes|no)\s*$", txt, re.I | re.M)
print((m.group(1).lower() if m else ""))
PY
)"

if [[ "$READY" != "yes" ]]; then
  echo "READY != yes → aucune release."
  set_output "released" "no"
  set_output "version" "$OLD_VERSION"
  exit 0
fi

TARGET_VERSION="$(python3 - <<'PY'
import re, pathlib
txt = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace")
m = re.search(r"^\s*TARGET_VERSION:\s*([0-9]+\.[0-9]+\.[0-9]+)?\s*$", txt, re.I | re.M)
print(((m.group(1) or "").strip()) if m else "")
PY
)"

# Récupère la 1ère puce sous "## Objectif"
OBJECTIVE_TITLE="$(python3 - <<'PY'
import re, pathlib
lines = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace").splitlines()
title = "release"
in_obj = False
for line in lines:
    if re.match(r"^\s*##\s*Objectif\b", line, re.I):
        in_obj = True
        continue
    if in_obj:
        if re.match(r"^\s*##\s+", line):
            break
        m = re.match(r"^\s*-\s+(.*\S)\s*$", line)
        if m:
            title = m.group(1).strip()
            break
print(title)
PY
)"

# Toutes les puces (optionnel) sous Objectif → notes
OBJECTIVE_BULLETS="$(python3 - <<'PY'
import re, pathlib
lines = pathlib.Path("NEXT_OBJECTIVE.md").read_text(encoding="utf-8", errors="replace").splitlines()
out=[]
in_obj=False
for line in lines:
    if re.match(r"^\s*##\s*Objectif\b", line, re.I):
        in_obj=True
        continue
    if in_obj:
        if re.match(r"^\s*##\s+", line):
            break
        m=re.match(r"^\s*-\s+(.*\S)\s*$", line)
        if m:
            out.append("- " + m.group(1).strip())
print("\n".join(out))
PY
)"

NEW_VERSION="$TARGET_VERSION"
if [[ -z "$NEW_VERSION" ]]; then
  NEW_VERSION="$(bump_patch "$OLD_VERSION")"
fi
semver_ok "$NEW_VERSION" || fail "TARGET_VERSION invalide (attendu x.y.z). Reçu: '$NEW_VERSION'"

echo "Release ✅  OLD=$OLD_VERSION → NEW=$NEW_VERSION"
echo "$NEW_VERSION" >"$VERSION_FILE"

# Update cache-busting + occurrences vOLD -> vNEW dans html/js/css (hors dist/.git)
python3 - <<PY
import re, pathlib
new_v="${NEW_VERSION}"
old_v="${OLD_VERSION}"
root=pathlib.Path(".")

def skip(p):
    s=str(p).replace("\\\\","/")
    return s.startswith(".git/") or s.startswith("dist/")

targets=[]
for p in root.rglob("*"):
    if not p.is_file(): 
        continue
    if skip(p):
        continue
    if p.suffix.lower() in (".html",".js",".css"):
        targets.append(p)

for p in targets:
    data=p.read_text(encoding="utf-8", errors="replace")
    orig=data
    data=re.sub(r"\\?v=\\d+\\.\\d+\\.\\d+", f"?v={new_v}", data)
    data=data.replace(f"v{old_v}", f"v{new_v}")
    if data!=orig:
        p.write_text(data, encoding="utf-8")
PY

# Update CHANGELOG : insère en haut une entrée "## vX.Y.Z — YYYY-MM-DD"
python3 - <<PY
import datetime, pathlib, re
path=pathlib.Path("CHANGELOG.md")
txt=path.read_text(encoding="utf-8", errors="replace").lstrip()

date=datetime.datetime.utcnow().strftime("%Y-%m-%d")
ver="${NEW_VERSION}"
title="${OBJECTIVE_TITLE}".strip()
bullets="""${OBJECTIVE_BULLETS}""".strip()

entry = f"## v{ver} — {date}\\n"
if bullets:
    entry += bullets + "\\n\\n"
else:
    entry += f"- {title}\\n\\n"

if txt.startswith("#"):
    lines=txt.splitlines(True)
    # garde le header + éventuelle ligne vide après
    out=[]
    out.append(lines[0])
    i=1
    if i < len(lines) and lines[i].strip()=="":
        out.append(lines[i]); i+=1
    out.append(entry)
    out.extend(lines[i:])
    txt="".join(out)
else:
    txt = f"# Changelog — Boussole\\n\\n{entry}" + txt

path.write_text(txt, encoding="utf-8")
PY

# Reset READY: no + clear TARGET_VERSION
python3 - <<'PY'
import re, pathlib
p=pathlib.Path("NEXT_OBJECTIVE.md")
txt=p.read_text(encoding="utf-8", errors="replace")
txt=re.sub(r"^\s*READY:\s*yes\s*$","READY: no",txt,flags=re.I|re.M)
txt=re.sub(r"^\s*TARGET_VERSION:\s*.*$","TARGET_VERSION:",txt,flags=re.I|re.M)
p.write_text(txt, encoding="utf-8")
PY

# Build ZIP FULL in dist/
mkdir -p dist
ZIP_PATH="dist/boussole-v${NEW_VERSION}-full.zip"
rm -f "$ZIP_PATH"

zip -r "$ZIP_PATH" . \
  -x ".git/*" "dist/*" "__MACOSX/*" "*.DS_Store" "*/.DS_Store" >/dev/null

# Release notes
NOTES_PATH="dist/RELEASE_NOTES.md"
{
  echo "## Boussole v${NEW_VERSION}"
  echo
  echo "${OBJECTIVE_TITLE}"
  if [[ -n "${OBJECTIVE_BULLETS}" ]]; then
    echo
    echo "${OBJECTIVE_BULLETS}"
  fi
} >"$NOTES_PATH"

set_output "released" "yes"
set_output "version" "$NEW_VERSION"
set_output "zip_path" "$ZIP_PATH"
set_output "release_notes_path" "$NOTES_PATH"

echo "OK ✅ ZIP: $ZIP_PATH"
