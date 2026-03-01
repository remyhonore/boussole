# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test               # Run Jest test suite
npm run test:watch     # Tests en mode watch
npm run test:coverage  # Rapport de couverture (seuil : 80%)
npm start              # Serveur local (npx serve .)
```

Pour lancer un seul test :
```bash
npx jest --testNamePattern="nom du test"
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
| `pdf.js` | Génération PDF une page via jsPDF (chargé depuis CDN) |
| `sw.js` | Service Worker — cache statique, support hors-ligne |

### Flux de données

```
storage.js → calc.js → daytype.js → app.js → pdf.js
```

`app.js` orchestre tout : il charge les données via `storage.js`, les agrège via `calc.js`/`daytype.js`, met à jour le DOM, et déclenche la génération PDF.

### Données stockées

Structure localStorage :
```json
{ "version": "1.0.0", "entries": [...] }
```
Chaque entrée : `{ date, energie, qualite_sommeil, douleurs, clarte_mentale, note }` — scores de 1 à 10, date en ISO 8601 (`YYYY-MM-DD`).

### Conventions

- **Nommage** : fonctions en camelCase, champs de données en snake_case français (`qualite_sommeil`, `clarte_mentale`)
- **Fonctions pures** dans `calc.js` : toujours testables sans mock, même dataset de référence `DATASET_REF` utilisé dans les tests
- **HTML dynamique** généré par template literals (pas de framework de rendu)
- **CSS** : variables CSS centralisées à la racine, approche mobile-first, breakpoint unique à 640 px
- **Service Worker** : versionner `CACHE_NAME` dans `sw.js` à chaque release pour invalider le cache

### PDF

`pdf.js` requiert jsPDF (CDN). Toujours vérifier la disponibilité avant appel. Les emojis sont strippés pour compatibilité PDF.

`pdf_enrichi_v2.js` est en cours de développement (pas encore intégré dans l'UI).
