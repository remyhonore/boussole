# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test               # Run Jest test suite
npm run test:watch     # Tests en mode watch
npm run test:coverage  # Rapport de couverture (seuil : 80%)
npm start              # Serveur local (npx serve .)
npx jest --testNamePattern="nom du test"  # Un seul test
```

## Architecture

Application PWA santé **locale-first** : zéro serveur, toutes les données dans le `localStorage` de l'utilisateur. Pas de bundler, pas de framework — scripts chargés directement dans `index.html`.

### Modules et responsabilités

| Fichier | Rôle |
|---|---|
| `storage.js` | Abstraction localStorage avec fallback mémoire (iOS Safari privé) |
| `calc.js` | Moteur de calcul **pur et déterministe** — aucun effet de bord |
| `daytype.js` | Classification Vert / Orange / Rouge selon le score du jour |
| `app.js` | Contrôleur UI, gestionnaire d'événements, état global `app` |
| `pdf.js` | Export PDF enrichi multi-pages (30j, Chart.js, corrélations) |
| `pdf_consultation.js` | Export PDF consultation 1 page + mode narratif IA |
| `traitements.js` | Feature T-MED : gestion structurée médicaments, compléments, stratégies, allergies |
| `import_mes.js` | Import Synthèse Médicale Mon Espace Santé (parser PDF CDA → patient + traitements + antécédents) |
| `onboarding.js` | Parcours de première utilisation |
| `score_sna.js` | Score composite SNA (système nerveux autonome) |
| `pacing.js` | Feature P (stabilité matinale) + B (enveloppe énergie) + E bis (corrélations activités→crash) |
| `pem_detector.js` | Détection malaise post-effort (PEM) |
| `cycle_tracker.js` | Suivi cycle menstruel |
| `correlations.js` | Analyse corrélations entre métriques |
| `charts.js` | Graphiques temporels interactifs in-app (7/14/30/90j, overlays traitements + événements) |
| `questionnaires.js` | Questionnaires PRO validés (PHQ-9, GAD-7, PCFS) — scoring auto, stockage local, intégration Résumé + PDF |
| `share_profile.js` | Partage profil patient |
| `fiches_data.js` | Données des fiches pratiques |
| `profil_data.js` | Données profil utilisateur |
| `sw.js` | Service Worker — cache statique, support hors-ligne |

### Ordre de chargement des scripts (index.html)

```
storage.js → calc.js → daytype.js → fiches_data.js → pdf.js → pdf_consultation.js
→ pem_detector.js → cycle_tracker.js → correlations.js → charts.js → score_sna.js → pacing.js → questionnaires.js
→ share_profile.js → profil_data.js → traitements.js → import_mes.js → app.js
```

`app.js` est chargé en dernier : il orchestre tout, charge les données via `storage.js`, les agrège via `calc.js`/`daytype.js`, met à jour le DOM, et déclenche les exports PDF.

### CDN (chargés dans `<head>`)

- Chart.js 4.4.1 (graphiques PDF enrichi)
- jsPDF 2.5.1 (génération PDF)

### Données stockées (localStorage)

| Clé | Contenu |
|---|---|
| `entries` | Tableau saisies quotidiennes `{ date, energie, qualite_sommeil, douleurs, clarte_mentale, note }` |
| `boussole_traitements` | Tableau structuré T-MED `{ id, categorie, nom, dci, dose, unite, frequence, statut, paliers[], ... }` |
| `boussole_pace_feedback` | Feedbacks stabilité matinale `[{ date, match: bool }]` (90j max) |
| `boussole_pacing_catalogue` | Activités personnalisées pour l'enveloppe énergie |
| `boussole_pacing_log_YYYY-MM-DD` | Log d'activités du jour `[{ id, nom, cout, emoji, heure }]` |
| `boussole_sections` | Sections actives `{ pacing: bool, mesures: bool }` (défaut : tout ON) |
| `boussole_q_PHQ-9_YYYY-MM-DD` | Résultat PHQ-9 `{ date, scale, answers, score, ts }` |
| `boussole_q_GAD-7_YYYY-MM-DD` | Résultat GAD-7 `{ date, scale, answers, score, ts }` |
| `boussole_q_PCFS_YYYY-MM-DD` | Résultat PCFS `{ date, scale, answers, score, ts }` |
| `version_seen` | Version modale changelog vue |
| `newsletter_done` | Email gate newsletter |
| `brevo_subscribed` | Statut abonnement Brevo |

Jamais de données personnelles identifiantes. Jamais de transmission réseau des données de santé.

### Conventions

- **Nommage** : fonctions en camelCase, champs de données en snake_case français (`qualite_sommeil`, `clarte_mentale`)
- **Fonctions pures** dans `calc.js` : toujours testables sans mock
- **HTML dynamique** généré par template literals (pas de framework de rendu)
- **CSS** : variables CSS centralisées à la racine, approche mobile-first, breakpoint unique à 640 px
- **Service Worker** : versionner `CACHE_NAME` dans `sw.js` à chaque release pour invalider le cache
- **Bump SW obligatoire** : tout commit modifiant `app.js`, `pdf_consultation.js`, `pdf.js` ou `index.html` doit aussi bumper `sw.js` CACHE_NAME + footer `index.html`

## Conventions UX

Toute nouvelle page HTML doit inclure la navigation principale complète avec les mêmes styles que `index.html`. La page active est indiquée visuellement (classe `.nav-btn.active`).

### PDF

- `pdf.js` : export enrichi multi-pages avec graphiques Chart.js. Canvas attaché au DOM, délai 300ms avant capture JPEG (600×220px, qualité 0.82).
- `pdf_consultation.js` : export 1 page consultation + mode narratif. Intègre automatiquement les traitements via `Traitements.exportPourPDF()`.
- Encodage Latin-1 (jsPDF). Substitutions : `→` → `->` · `•` → `-` · `⚠️` → `/!\` · `☐` → `[ ]`
- Police Helvetica uniquement. Emojis strippés pour compatibilité.
- Points publics : `window.generatePDF` · `window.downloadPDF` · `window.generatePDFPreview`
