# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test               # Run lint-ux + Jest test suite
npm run test:watch     # Tests en mode watch
npm run test:coverage  # Rapport de couverture (seuil : 80%)
npm start              # Serveur local (npx serve .)
npx jest --testNamePattern="nom du test"  # Un seul test
node lint-ux.js        # Lint UX seul (font-size, couleurs, inline patterns)
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
| `charts.js` | Graphiques temporels interactifs in-app (7/14/30/90j, overlays traitements + événements + questionnaires PRO) |
| `questionnaires.js` | Questionnaires PRO validés (PHQ-9, GAD-7, PCFS) — scoring auto, stockage local, intégration Résumé + PDF |
| `symptom_tree.js` | Arbre symptôme → piste clinique — questionnaire orienté par domaines, scoring pondéré vers 6 pistes (EM/SFC, POTS, fibro, MCAS, neuro-inflammation, déconditionnement) |
| `agenda_view.js` | Vue Agenda calendrier mensuel — grille lun-dim, pastilles couleur par spécialiste, navigation mois, détail RDV au clic |
| `journal.js` | Journal intime — CRUD entrées, 7 tags, 5 moods, vue chrono, export PDF, filtres, partage |
| `onboarding_guide.js` | Guide de démarrage — overlay 5 étapes, dots progression, clé boussole_guide_done |
| `share_profile.js` | Partage profil patient |
| `fiches_data.js` | Données des fiches pratiques |
| `profil_data.js` | Données profil utilisateur |
| `sw.js` | Service Worker — cache statique, support hors-ligne |

### Ordre de chargement des scripts (index.html)

```
storage.js → calc.js → daytype.js → fiches_data.js → pdf.js → pdf_consultation.js
→ pem_detector.js → cycle_tracker.js → correlations.js → charts.js → score_sna.js → pacing.js → questionnaires.js → symptom_tree.js → agenda_view.js → journal.js
→ share_profile.js → profil_data.js → traitements.js → import_mes.js → app.js
```

`app.js` est chargé en dernier : il orchestre tout, charge les données via `storage.js`, les agrège via `calc.js`/`daytype.js`, met à jour le DOM, et déclenche les exports PDF.

### CDN (chargés dans `<head>`)

- Chart.js 4.4.1 (graphiques PDF enrichi)
- jsPDF 2.5.1 (génération PDF)

### Données stockées (localStorage)

| Clé | Contenu |
|---|---|
| `entries` | Tableau saisies quotidiennes `{ date, energie, sommeil, confort, clarte, note, humeur, rmssd }` (schema v2 — ADR-047) |
| `boussole_traitements` | Tableau structuré T-MED `{ id, categorie, nom, dci, dose, unite, frequence, statut, paliers[], ... }` |
| `boussole_pace_feedback` | Feedbacks stabilité matinale `[{ date, match: bool }]` (90j max) |
| `boussole_pacing_catalogue` | Activités personnalisées pour l'enveloppe énergie |
| `boussole_pacing_log_YYYY-MM-DD` | Log d'activités du jour `[{ id, nom, cout, emoji, heure }]` |
| `boussole_sections` | Sections actives `{ pacing: bool, mesures: bool }` (défaut : tout ON) |
| `boussole_q_PHQ-9_YYYY-MM-DD` | Résultat PHQ-9 `{ date, scale, answers, score, ts }` |
| `boussole_q_GAD-7_YYYY-MM-DD` | Résultat GAD-7 `{ date, scale, answers, score, ts }` |
| `boussole_q_PCFS_YYYY-MM-DD` | Résultat PCFS `{ date, scale, answers, score, ts }` |
| `boussole_symptom_tree_YYYY-MM-DD` | Résultat arbre symptôme `{ date, answers, results, ts }` |
| `boussole_agenda_rdv` | Agenda consultations `[{ id, datetime, specialiste, lieu, notes }]` |
| `boussole_genre` | Genre utilisateur (`femme`, `homme`, `non_precise`) — unique clé depuis ADR-047 |
| `version_seen` | Version modale changelog vue |
| `newsletter_done` | Email gate newsletter |
| `brevo_subscribed` | Statut abonnement Brevo |

Jamais de données personnelles identifiantes. Jamais de transmission réseau des données de santé.

### Conventions

- **Nommage** : fonctions en camelCase, champs entry en snake_case court (`sommeil`, `confort`, `clarte`) — ADR-047 schema v2
- **Moment de prise** : stocké en comma-separated (`"matin,soir"`) — rétrocompatible avec l'ancien format string simple (`"matin"`)
- **Fonctions pures** dans `calc.js` : toujours testables sans mock
- **HTML dynamique** généré par template literals (pas de framework de rendu)
- **CSS** : variables CSS centralisées à la racine, approche mobile-first, breakpoint unique à 640 px
- **Service Worker** : versionner `CACHE_NAME` dans `sw.js` à chaque release pour invalider le cache
- **Bump SW obligatoire** : tout commit modifiant `app.js`, `pdf_consultation.js`, `pdf.js` ou `index.html` doit aussi bumper `sw.js` CACHE_NAME + footer `index.html`

## Conventions UX

Toute nouvelle page HTML doit inclure la navigation principale complète avec les mêmes styles que `index.html`. La navigation est une bottom tab bar fixe (`.bottom-tab-bar` + `.tab-btn`). L'onglet actif est indiqué visuellement (classe `.tab-btn.active`).

### Échelle typographique (Design System v2 — ADR-2026-046)

Le DS v2 autorise toutes les tailles en px. Seul `rem` est interdit (lint R1).

Tailles de référence : 9px (légendes, axes) / 10px (micro-labels) / 11px (titres section uppercase) / 12px (labels, dates, boutons compacts) / 13px (corps, boutons standard) / 14px (sous-titres cards) / 15px (titres accordéons) / 16px (pills valeur, titres modales) / 17-18px (scores, emojis) / 20-22px+ (score ring, hero).

Variables CSS disponibles : `--fs-section:11px` / `--fs-body:13px` / `--fs-label:12px` / `--fs-help:11px` / `--fs-tiny:9px` / `--text-base:14px` / `--text-md:16px` / `--text-lg:18px`.

Référence complète : skill `boussole-design-system-app`.

### Palette couleurs (harmonisée v10)

Ne jamais utiliser de gris hex directs (`#999`, `#aaa`, `#4b5563`). Utiliser les valeurs rgba du thème :

| Couleur | Valeur | Usage |
|---|---|---|
| Navy | `#06172D` | Texte principal |
| Vert forêt | `#2d6a4f` | Accents, CTA, positif |
| Muted fort | `rgba(6,23,45,.55)` | Texte secondaire, descriptions |
| Muted doux | `rgba(6,23,45,.42)` | Footnotes, placeholders, labels légers |
| Muted léger | `rgba(6,23,45,.18)` | Bordures très discrètes |
| Erreur | `#dc2626` | Alertes, crash, suppression |
| Warning | `#d97706` | Attention, problème principal |
| Info | `#3B82F6` | Sommeil, données objectives |

### Classes CSS utilitaires (v10.06)

| Classe | Usage | Propriétés |
|---|---|---|
| `.section-title` | Sous-titres de section dans les cards | `11px`, bold, uppercase, `letter-spacing:.08em`, `margin:0 0 10px`, color `#06172D` |
| `.section-card` | Conteneur de section (cards Résumé/Présentation) | `border-radius:12px`, `padding:14px`, `margin-bottom:12px` |
| `h2.summary-section` | Titres principaux du Résumé | `11px`, bold, uppercase, `letter-spacing:.08em`, color `#06172D`, `margin:0 0 12px` |
| `.card` / `.card-group` | Cards de base (définis dans `styles.css`) | padding/shadow/border via variables CSS |

Ne jamais réinliner les propriétés de `.section-title` ou `.section-card`. Ajouter la couleur en `style="color:X;"` si différente du défaut.

### Lint UX (`lint-ux.js`)

Exécuté automatiquement par `npm test`. Bloque le build si violation détectée. 5 règles :

| Règle | Ce qui est vérifié | Action si violation |
|---|---|---|
| R0 | Syntaxe JS valide (`node -c` sur chaque fichier) | Fix la SyntaxError avant de commiter |
| R1 | `font-size: Xrem` dans les .js (px toutes tailles autorisées depuis DS v2) | Utiliser px |
| R2 | Couleurs hex `#999`, `#aaa`, `#4b5563`, `#1a2332` | `rgba(6,23,45,.42)`, `.55`, `#06172D` |
| R3 | Inline `font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;` | `class="section-title"` |
| R4 | Inline `border-radius:12px;padding:14px;margin-bottom:12px;` | `class="section-card"` |

### Mobile overflow — Règle obligatoire

Tout layout multi-colonnes (grid, flex row) doit être testé mentalement pour un viewport de **320px** (plus petit iPhone SE). Si le nombre de colonnes × taille minimale dépasse 320px, appliquer systématiquement :

1. **Wrapper** : `overflow-x:auto;-webkit-overflow-scrolling:touch;`
2. **Colonnes fixes** : `repeat(N, Xpx)` au lieu de `repeat(N, 1fr)` pour les grids denses
3. **Jamais** de `flex-direction:column` en media query sur `.btn-row` — les boutons restent côte à côte (taille compacte `13px` / `10px 14px`)

Seuils de vigilance :
- **≥ 7 colonnes** : wrapper overflow-x obligatoire
- **≥ 14 colonnes** : colonnes fixes + wrapper obligatoire
- **Boutons inline** : `font-size:13px;padding:10px 14px;` — jamais plus gros

### PDF

- `pdf.js` : export enrichi multi-pages avec graphiques Chart.js. Canvas attaché au DOM, délai 300ms avant capture JPEG (600×220px, qualité 0.82).
- `pdf_consultation.js` : export 1 page consultation + mode narratif. Intègre automatiquement les traitements via `Traitements.exportPourPDF()`, les questionnaires PRO via `Questionnaires.exportPourPDF()`, et l'arbre symptôme via `SymptomTree.exportPourPDF()`.
- Encodage Latin-1 (jsPDF). Substitutions : `→` → `->` · `•` → `-` · `⚠️` → `/!\` · `☐` → `[ ]`
- Police Helvetica uniquement. Emojis strippés pour compatibilité.
- Points publics : `window.generatePDF` · `window.downloadPDF` · `window.generatePDFPreview`
