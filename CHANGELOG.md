# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.0-phase1] - 2026-02-10

### Ajouté
- Écran "Aujourd'hui" avec 3 curseurs fixes (Énergie, Qualité sommeil, Douleurs physiques)
- Écran "Résumé" avec structure 5 blocs :
  1. Tendances + moyennes
  2. Variations importantes
  3. Points marquants (meilleur jour, jour le plus bas, trous)
  4. Notes du patient (3 dernières)
  5. Prudence
- Génération PDF 1 page avec aperçu avant téléchargement
- Moteur calc_v1 avec tendances et détection variations
- Tests automatisés avec dataset de référence
- Règle "données insuffisantes" (< 5 jours)
- Système de stockage local avec fallback mémoire
- Bouton "Reprendre dernières valeurs"
- Bouton "Annuler" (30s après enregistrement)
- Note optionnelle (200 caractères max)

### Décisions de design

**Vocabulaire :**
- "Douleurs physiques" (au lieu de "Confort" ou "Inconfort")
- Échelle claire : 0 = aucune douleur, 10 = insupportables
- "Qualité du sommeil" (au lieu de "Sommeil" ou "Sommeil réparateur")

**Seuils calc_v1 (à valider avec données réelles) :**
- Delta ≥ ±1.0 pour tendance amélioration/baisse
- Écart-type > 2.0 pour tendance fluctuant
- Variation notable : écart ≥ 3.0 points score global
- Données insuffisantes : < 5 jours
- Groupes de comparaison : 5 premiers vs 5 derniers jours

**Architecture :**
- Période fixe 14 jours (pas de sélecteur en Phase 1)
- 1 seule saisie par jour (éditer = remplacer)
- Minimum 1 curseur pour enregistrer
- Curseurs non touchés = valeur null (pas sauvegardé)

### Non inclus (Phase 2+)
- Fiches pratiques
- Sélection de période (7/14/30 jours)
- Curseurs optionnels
- Saisies multiples par jour
- Coordonnées médecin/pharmacie
- Contexte cycle menstruel
- Dark mode
- Multilingue

### Tests
- ✅ Tests automatisés avec Jest
- ✅ Dataset de référence embarqué
- ✅ Assertions exactes (moyennes, tendances, variations)
- ✅ Tests de reproductibilité
- ✅ Tests de robustesse (données partielles, vides)

### Critères de succès Phase 1
- Patient : saisie < 30s
- Médecin : lecture PDF < 90s
- Technique : tous les tests passent
- PDF : 1 page exactement
- Validation : 1 patient + 1 médecin OK

---

## [À venir] - Phase 2

### Prévu
- Fiches pratiques (5 guides visuels hors ligne)
- Système de favoris
- 3ᵉ onglet "Fiches"

### Conditionnel (si validé par utilisateurs)
- Sélection de période
- Curseurs optionnels
- Export JSON/CSV
- Graphiques de tendances

---

**Format :** Ce changelog suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)  
**Versioning :** Ce projet suit [Semantic Versioning](https://semver.org/)
