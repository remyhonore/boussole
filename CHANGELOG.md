# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [9.34] - 2026-04-04

### Corrigé
- Service Worker : ajout des assets manquants dans ASSETS_TO_CACHE (`traitements.js`, `onboarding.js`, `score_sna.js`, `daytype.js`)
- Documentation : réécriture complète CLAUDE.md, README.md, CHANGELOG.md pour refléter l'architecture réelle

## [9.33] - 2026-04-04

### Ajouté
- **Feature T-MED** : gestion structurée des traitements
  - Saisie rapide intelligente (parser regex : "Brintellix 20mg 1/j matin")
  - 4 catégories : 💊 Médicament · 🌿 Complément · ⚡ Stratégie · 🚫 Allergie
  - Historique des paliers de dose avec dates
  - Migration automatique depuis l'ancien système `boussole_essais`
  - Export PDF automatique (actifs, pauses, arrêts < 90j, allergies)
  - Bloc HTML résumé dans le panel Paramètres

## [8.92] - 2026-03-04

### Ajouté
- **Pacing-Repos** : champ `repos_diurne` dans Mes Mesures
- Sparkline 14 jours repos diurne dans Résumé (`buildBlocRepos`)

## Jalons majeurs (résumé v1.0 → v8.x)

### v8.x — Mars 2026
- Mes Mesures : FC repos, TA, SpO2, température, poids, RMSSD
- Score SNA composite
- Détection PEM (malaise post-effort)
- Corrélations inter-métriques
- Suivi cycle menstruel

### v5.x–v7.x — Mars 2026
- PDF consultation 1 page + mode narratif IA
- Fiches pratiques hors-ligne
- Profil patient partageable
- Onboarding guidé
- Palette couleurs unifiée (#2d6a4f primaire)

### v2.x–v4.x — Février 2026
- 4ème curseur (clarté mentale)
- Notes de version (changelog modal)
- Newsletter Brevo (email gate)
- Service Worker + PWA installable
- PDF enrichi multi-pages avec Chart.js

### v1.0 — 2026-02-10
- MVP Phase 1 : 3 curseurs, résumé 14 jours, PDF 1 page
- Moteur calc_v1 (tendances, variations, points marquants)
- Tests Jest automatisés
- Stockage localStorage avec fallback mémoire

---

**Format :** [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
