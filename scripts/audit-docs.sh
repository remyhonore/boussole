#!/bin/bash
# audit-docs.sh — Vérifie la cohérence entre code, SW cache et documentation
# Usage : bash scripts/audit-docs.sh
# Exit 0 = OK, Exit 1 = incohérence détectée

set -euo pipefail
cd "$(dirname "$0")/.."

ERRORS=0
WARNINGS=0

echo "=== Audit docs Boussole ==="
echo ""

# -------------------------------------------------------
# 1. Vérifier que chaque .js racine est dans ASSETS_TO_CACHE
# -------------------------------------------------------
echo "① Vérification SW cache vs fichiers .js racine..."

# Fichiers JS à exclure de la vérification (pas des modules app)
EXCLUDE="validate-articles.js"

for jsfile in *.js; do
  [[ "$jsfile" == "sw.js" ]] && continue
  [[ "$EXCLUDE" == *"$jsfile"* ]] && continue
  if ! grep -q "/$jsfile" sw.js; then
    echo "  ❌ $jsfile manquant dans sw.js ASSETS_TO_CACHE"
    ERRORS=$((ERRORS + 1))
  fi
done

# Vérifier aussi que les assets listés dans sw.js existent
for asset in $(grep -oE "'/[^']+\.js'" sw.js | tr -d "'" | sed 's|^/||'); do
  if [[ ! -f "$asset" ]]; then
    echo "  ❌ $asset listé dans sw.js mais n'existe pas"
    ERRORS=$((ERRORS + 1))
  fi
done

if [[ $ERRORS -eq 0 ]]; then
  echo "  ✅ Tous les .js sont dans ASSETS_TO_CACHE"
fi
echo ""

# -------------------------------------------------------
# 2. Vérifier cohérence version SW ↔ footer index.html
# -------------------------------------------------------
echo "② Vérification version SW vs footer..."

SW_VERSION=$(grep -oE "boussole-v[0-9.]+" sw.js | head -1)
FOOTER_VERSION=$(grep -oE "Boussole v[0-9.]+" index.html | head -1)

# Normaliser pour comparaison
SW_NUM=$(echo "$SW_VERSION" | grep -oE "[0-9]+\.[0-9]+")
FOOTER_NUM=$(echo "$FOOTER_VERSION" | grep -oE "[0-9]+\.[0-9]+")

if [[ "$SW_NUM" != "$FOOTER_NUM" ]]; then
  echo "  ❌ Version désynchronisée : sw.js=$SW_VERSION vs footer=$FOOTER_VERSION"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ Versions synchronisées : $SW_VERSION"
fi
echo ""

# -------------------------------------------------------
# 3. Vérifier que chaque .js racine est dans CLAUDE.md
# -------------------------------------------------------
echo "③ Vérification CLAUDE.md vs fichiers .js racine..."

for jsfile in *.js; do
  [[ "$jsfile" == "sw.js" ]] && continue
  [[ "$EXCLUDE" == *"$jsfile"* ]] && continue
  if ! grep -q "$jsfile" CLAUDE.md; then
    echo "  ⚠️  $jsfile absent de CLAUDE.md"
    WARNINGS=$((WARNINGS + 1))
  fi
done

if [[ $WARNINGS -eq 0 ]]; then
  echo "  ✅ Tous les .js sont documentés dans CLAUDE.md"
fi
echo ""

# -------------------------------------------------------
# 4. Vérifier que CHANGELOG.md mentionne la version courante
# -------------------------------------------------------
echo "④ Vérification CHANGELOG.md vs version courante..."

if ! grep -q "$SW_NUM" CHANGELOG.md; then
  echo "  ⚠️  Version $SW_NUM absente de CHANGELOG.md"
  WARNINGS=$((WARNINGS + 1))
else
  echo "  ✅ CHANGELOG.md contient la version $SW_NUM"
fi
echo ""

# -------------------------------------------------------
# Résumé
# -------------------------------------------------------
echo "=== Résultat ==="
echo "Erreurs : $ERRORS · Warnings : $WARNINGS"

if [[ $ERRORS -gt 0 ]]; then
  echo "🚫 Audit ÉCHOUÉ — corriger avant de pousser"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo "⚠️  Audit OK avec warnings — vérifier manuellement"
  exit 0
else
  echo "✅ Audit OK — prêt à pousser"
  exit 0
fi
