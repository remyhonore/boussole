# myBoussole — Benchmark concurrentiel & Propositions features
**Date :** 04/04/2026 · **Version auditée :** v9.43 · **Source :** Audit IA

## Concurrents analysés
- Long COVID Companion (LIH/ApresJ20) — web+natif, gratuit, compte obligatoire
- Jardin Mental (CNAM) — natif, gratuit, anonyme, santé mentale
- Bearable — natif, freemium ~$50/an, maladies chroniques
- Visible — natif + bracelet Polar, ~$25/mois, ME/CFS/POTS
- Daylio — natif, freemium, journal d'humeur grand public

## Position unique myBoussole
3 piliers que personne ne combine : privacy by design (100% local) +
préparation consultation structurée (PDF/mode médecin/message IA) +
détection PEM automatisée.

## Gaps critiques identifiés
1. Graphiques temporels in-app (TOUS les concurrents en ont)
2. Connexion wearables (3/5 concurrents)
3. Questionnaires PRO standardisés (Long COVID Companion seul)

## Critique de l'audit (Dr Honoré / Claude, 04/04/2026)
- Feature "Indicateurs personnalisables" P0 = ERREUR — les 4 curseurs fixes
  sont un choix de design, pas une lacune. Feature D (profils) résout déjà.
- Biais "rattrapage" vs "renforcement différenciation" — Boussole ne gagne
  pas en devenant Bearable.
- Feature E corrélations V1 déjà déployée (v9.45).
- Mini-fiches contextuelles (fiches_data.js) déjà en place.
- Mode aidant P2P casse le modèle local-first.

## Hiérarchie corrigée
P0 : Graphiques temporels (Feature K)
P1 : Questionnaires PRO · Pacing assistant · Year in Pixels
P2 : Wearables (après Capacitor) · Corrélations V2
P3 : 1-2 indicateurs custom max · Gamification douce
P4 : Vocal · IA prédictive · Mode aidant

_Benchmark complet : voir fichier uploadé session 04/04/2026._