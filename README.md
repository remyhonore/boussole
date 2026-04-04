# Boussole

Journal de santé quotidien pour personnes vivant avec une maladie chronique (Covid long, dysautonomie, DICV...). Transforme des données subjectives et objectives en PDF de consultation lisible par un médecin en < 90 secondes.

**App** : [app.myboussole.fr](https://app.myboussole.fr)  
**Vitrine** : [myboussole.fr](https://myboussole.fr)  
**Version** : v9.34 — Avril 2026  
**Déploiement** : Vercel (auto-deploy sur push main)

## Fonctionnalités

### Saisie quotidienne
- 4+ curseurs subjectifs (énergie, sommeil, douleurs, clarté mentale)
- Saisie des symptômes et notes libres
- Classification automatique Vert / Orange / Rouge (day-type)

### Mes mesures (objectifs)
- FC repos, TA systolique/diastolique, SpO2, température, poids
- Repos diurne (pacing) avec sparkline 14 jours
- Score SNA composite

### Traitements (T-MED)
- 4 catégories : 💊 Médicament · 🌿 Complément · ⚡ Stratégie · 🚫 Allergie
- Saisie rapide intelligente (parser regex)
- Historique des paliers de dose
- Migration automatique depuis l'ancien système

### Exports PDF
- **PDF enrichi** : multi-pages, graphiques Chart.js, corrélations, tendances 30 jours
- **PDF consultation** : 1 page synthétique + mode narratif IA + traitements actifs/pauses/arrêts récents

### Outils cliniques
- Détection PEM (malaise post-effort)
- Corrélations inter-métriques
- Suivi cycle menstruel (optionnel)
- Fiches pratiques hors-ligne

### Technique
- PWA installable (Service Worker, cache offline)
- 100% local-first : aucun serveur, aucun compte, localStorage uniquement
- Onboarding guidé pour première utilisation

## Installation

```bash
npm install          # Dépendances (Jest uniquement)
npm test             # Tests automatisés
npx serve .          # Serveur local → http://localhost:3000
```

## Structure

```
├── index.html           # Page unique PWA
├── app.js               # Contrôleur principal UI
├── storage.js           # Abstraction localStorage
├── calc.js              # Moteur de calcul (pur, déterministe)
├── daytype.js           # Classification Vert/Orange/Rouge
├── traitements.js       # T-MED : gestion traitements
├── pdf.js               # Export PDF enrichi multi-pages
├── pdf_consultation.js  # Export PDF consultation 1 page
├── pem_detector.js      # Détection malaise post-effort
├── score_sna.js         # Score SNA composite
├── cycle_tracker.js     # Suivi cycle menstruel
├── correlations.js      # Corrélations inter-métriques
├── onboarding.js        # Parcours première utilisation
├── share_profile.js     # Partage profil patient
├── fiches_data.js       # Données fiches pratiques
├── profil_data.js       # Données profil utilisateur
├── styles.css           # Styles (mobile-first, breakpoint 640px)
├── sw.js                # Service Worker (CACHE_NAME versionné)
├── tests/
│   └── calc.test.js     # Tests Jest
└── CLAUDE.md            # Guide Claude Code
```

## Principes

1. **Local-first absolu** : données sur l'appareil, aucun serveur, aucun compte
2. **Pas de diagnostic** : l'app décrit des mesures, ne conclut jamais
3. **Privacy-first** : aucune donnée ne quitte le device sans consentement explicite
4. **Reproductibilité** : mêmes données = mêmes résultats (tests automatisés)
5. **Zéro régression** : tout merge doit passer les tests (seuil couverture 80%)

## Licence

Copyright 2026 Dr Rémy Honoré — Tous droits réservés
