# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [10.44] - 2026-04-06

### ADR-2026-045 Sprint 2 — Module journal.js complet
- Nouveau module journal.js (IIFE, ~260 lignes)
- CRUD entrées journal : créer, modifier, supprimer
- 7 tags : Pensées, Santé, Victoire, Difficulté, Traitement, RDV, Autre
- 5 moods emoji optionnels par entrée
- Vue chronologique inversée groupée par jour
- Éditeur modale avec textarea 2000 car + dictée
- Tile accueil dynamique (nombre d'entrées)
- SW v10.44, changelog + footer synchronisés

## [10.43] - 2026-04-06

### ADR-2026-045 Sprint 1 — Onglet Journal + fusion tiles + renommages
- Nouvel onglet Journal dans la tab bar (remplace Articles)
- Nouveau panel journal avec placeholder (module en cours de développement)
- Nouvelle tile "Mon journal" sur l'accueil (remplace "Mon résumé")
- Renommage "Mon journal du jour" → "Mes remarques" dans Ma journée
- Renommage "Mon journal" → "Mes remarques" dans l'accordéon Suivi
- articles.html retiré du cache SW (toujours accessible via URL directe)
- SW v10.43, changelog + footer synchronisés

## [10.41] - 2026-04-06

### ADR-2026-044 Sprint 4 — Indicateur complétion jour + Saisie rapide améliorée
- Indicateur de complétion jour : barre de progression + pastilles É S C M H
- Affichage dans accueil (score + CTA) et panel Ma journée
- Nouveau bouton "Hier" pour reprendre les valeurs de la veille
- fillLastValues() inclut désormais la clarté mentale (4 repères)
- fillYesterdayValues() copie les 4 curseurs + humeur
- Classes CSS : completion-bar, completion-dots, btn-compact
- SW v10.41, changelog + footer synchronisés

## [10.25] - 2026-04-06

### ADR-2026-044 Sprint 2 — Guide de démarrage
- Nouveau module `onboarding_guide.js` (IIFE, ~170 lignes)
- Overlay plein écran, 5 étapes séquentielles avec dots de progression
- Boutons Retour/Suivant/Passer, animation d'entrée
- Clé localStorage `boussole_guide_done` (remplace `boussole_onboarded`)
- Bouton "Relancer le guide" dans Paramètres
- Ancien `onboarding.js` (jamais branché) supprimé
- SW v10.25, changelog + footer synchronisés

## [10.24] - 2026-04-06

### ADR-2026-044 Sprint 1 — Restructuration Accueil + Ma journée
- Accueil épurée : tiles dashboard + score du jour (ou CTA si pas de saisie)
- Formulaire de saisie quotidienne déplacé dans l'onglet "Ma journée" (ex-Résumé)
- Onglet Résumé renommé "Ma journée" (saisie en haut, résumé en dessous)
- Suppression code mort : panel-onboarding statique, welcome-banner, logique boussole_onboarded
- Fonction updateAccueilScoreCTA() : affichage conditionnel score/CTA sur l'accueil
- 5 onglets finaux : Accueil / Ma journée / Articles / Suivi / Paramètres

## [10.23] - 2026-04-06

### Corrigé — Arbre Ressentis : item.id undefined
- Bug critique : les items dans DOMAINS n'avaient pas de propriété `id`
- `item.id` → `undefined` pour tous → toutes les réponses écrasaient `_answers['undefined']`
- Symptôme : toutes les réponses s'alignaient sur la même valeur, "Voir les pistes" activé prématurément
- Fix : clé composite `domain.id + '_' + idx` (identique à `computeScores()`)
- 4 occurrences corrigées : rendu boutons radio + 3× `allAnswered` check
- 3 fichiers modifiés (symptom_tree.js, sw.js, index.html), 70/70 tests

## [10.22] - 2026-04-06

### Ajouté — Feature W : Vue Agenda calendrier mensuel
- Nouveau module `agenda_view.js` (IIFE, ~240 lignes)
- Grille mensuelle lun→dim avec navigation ← mois →
- Pastilles couleur auto-assignées par spécialiste (palette 6 couleurs)
- RDV passés : pastille muted (opacité 40%), futurs : pastille pleine
- Clic jour → liste RDV du jour sous le calendrier avec boutons Modifier/Suppr
- Bouton "+ Planifier un RDV" réutilise la modale existante
- Légende automatique en bas : pastille + nom spécialiste
- `renderAgendaRDV()` délègue à `AgendaView.render()` (fallback si module absent)
- Changelog modal mis à jour, footer → v10.22, SW bumped

## [10.19] - 2026-04-05

### Ajouté — Chantier B : Dashboard tiles Accueil (ADR-2026-043)
- Grid 2×2 dashboard : Ma journée (forest), Mon résumé (navy), Mon suivi (info), Agenda (orange)
- Previews dynamiques : score du jour, moyenne 7j, nb saisies, prochain RDV
- Tiles cliquables : scroll vers saisie, switch Résumé/Suivi, navigation Agenda
- `updateDashboardTiles()` appelée au switch panel et après enregistrement
- `navigateToAgenda()` : switch Suivi + ouverture accordéon Mes rendez-vous
- Dark mode support sur les 4 tiles
- 4 fichiers modifiés (index.html, styles.css, app.js, sw.js), 70/70 tests

## [10.18] - 2026-04-05

### Modifié — Chantier A : Bottom tab bar (ADR-2026-043)
- Navigation principale migrée du haut vers le bas (barre fixe 56px, position:fixed bottom:0)
- 4 onglets avec icônes SVG : Accueil / Résumé / Suivi / Paramètres
- Onglet actif : couleur forêt #2d6a4f, inactifs : rgba(6,23,45,.45)
- safe-area-inset-bottom pour iPhone X+ (encoche)
- Dark mode : fond #0d1b2a, actif #8aab9e
- Footer padding-bottom 72px pour compenser la barre fixe
- 3 fichiers modifiés (index.html, styles.css, app.js), 70/70 tests, lint UX 0 violation

## [10.15] - 2026-04-05

### Modifié — Sprint réglementaire (MDR 2017/745)
- **Feature B** : PEM → « Variation d'énergie » dans toute l'UI (app.js, pdf_consultation.js, pacing.js, charts.js, share_profile.js, symptom_tree.js, profil_data.js)
- **Feature N** : « Questions à poser au médecin » → « Points de réflexion personnels » (6 questions reformulées en observations non directives)
- **Feature C** : « Préparer ma consultation » → « Mon résumé personnel »
- **Feature P** : « Score de stabilité » → « Variabilité de ton ressenti »
- **Feature E** : « Corrélations » → « Observations » (titres UI)
- **Vocabulaire global** : symptôme→ressenti, clinique→personnel, rapport→résumé, détecté→observé
- **Disclaimers** : intended purpose ajouté CGU, PDF footer renforcé, Score VOR disclaimer dans Résumé
- **10 fichiers modifiés**, 70/70 tests, lint UX 0 violation

## [9.87] - 2026-04-05

### Ajouté
- **Arbre symptôme → piste clinique** (`symptom_tree.js`) : questionnaire interactif 7 domaines (23 items), scoring pondéré vers 6 pistes cliniques (EM/SFC, POTS, fibromyalgie, MCAS, neuro-inflammation, déconditionnement), barres de concordance, suggestions pour le médecin, stockage localStorage, intégration Résumé + export PDF

## [9.78–9.86] - 2026-04-04/05

### Ajouté
- **PDF consultation dual mode** : palette N&B clinique + palette couleur (vert forêt, navy, orange, rouge)
- **PDF couleur v2–v3** : calendrier coloré, labels vert forêt, QUESTIONS en page 3, narrative noir/titres verts
- **Card "Mon dossier"** : 5 accordéons Suivi regroupés dans une seule card
- **PDF clinique** : NIR patient, label période dynamique, titres bold, motif grossi

### Corrigé
- PDF Mes consultations s'ouvre dans un nouvel onglet (harmonisation `_pdfOpenTab`)
- Force redeploy Vercel v9.82 (webhook retry)

## [9.77] - 2026-04-04

### Ajouté
- **Graphiques temporels interactifs** (`charts.js`) : sélecteur 7/14/30/90j, overlay traitements + événements crash/PEM
- **Questionnaires PRO** (`questionnaires.js`) : PHQ-9 (dépression), GAD-7 (anxiété), PCFS (statut fonctionnel)
- **Year in Pixels** : calendrier annuel 365 cases colorées, 5 filtres (score, énergie, sommeil, confort, clarté)
- **Pacing dans le PDF médecin** : budget, coût moyen, jours dépassement, top 3 activités
- **Activités personnalisables** : formulaire création inline + suppression dans le picker enveloppe énergie
- Bouton "Reprendre dernières valeurs" pour Mes mesures

### Corrigé
- Fix critique : `</div>` en trop fermait le `.container` — 3 onglets sur 4 étirés sur desktop Chrome
- Fix : `pacing-alert-today` affiché vide (barre verte sans contenu)
- Mes mesures ouvert par défaut, label simplifié, refonte CSS

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
