# Audit complet App Boussole — 04/04/2026
**Version prod :** SW v9.47 · **Audits source :** fonctionnel (v9.43), approfondi (v9.45), benchmark 5 concurrents
**Analyse critique :** filtrage faux positifs, biais de priorisation, faisabilité stack PWA

---

## PARTIE 0 — Analyse critique des audits

### 0.1 Faux positifs — signalés comme manquants mais déjà implémentés

| Point signalé | Statut réel |
|---|---|
| "Pas de confirmation avant suppression" (audit fonctionnel §5) | ✅ Déployé session 04/04 — audit réalisé sur v9.43 avant les fix |
| "Corrélations automatiques : ⚠️ basique" (benchmark matrice) | ✅ Feature E corrélations traitements×score déployée v9.45 |
| "Ressources psychoéducatives : ❌ aucune" (benchmark matrice) | ⚠️ Partiellement faux — mini-fiches contextuelles existantes (PEM, score récup, modales "En savoir plus") |
| "Version footer v9.43 ≠ cache v9.45" (audit approfondi §2.4) | ✅ Corrigé — prod à v9.47, footer synchronisé |
| "Welcome-banner bug" (audit approfondi) | ✅ Fix `</div>` manquant déployé v9.46 |

**Impact :** ~30% des "critiques" et "majeurs" listés ne s'appliquent plus en v9.47.

### 0.2 Priorisation incorrecte

| Feature benchmark | Prio audit | Prio corrigée | Justification |
|---|---|---|---|
| F2 — Indicateurs personnalisables | P0 | **P3** (Boussole+ optionnel) | Les 4 curseurs fixes = différenciateur UX (saisie 30s, zéro config, fatigue cognitive). Ajouter 50+ symptômes = devenir Bearable. |
| F1 — Graphiques temporels in-app | P0 | **P1** | Manque visible mais courbes déjà dans les PDF (Chart.js). Cosmétique in-app, pas bloquant. |
| F5 — Moteur corrélations intelligent | P1 | **P2** | V1 déjà livrée (Feature E). Itérations suivantes = P2. |
| F3 — Connexion wearables | P1 | **P4** | iOS HealthKit = app native obligatoire. Incompatible PWA. Changement de stack. |
| F10 — Multi-entrées par jour | P2 | **Rejeté** | Contradictoire avec "1 saisie, 30 secondes". Public cible en fatigue ne veut pas tracker 3×/jour. |
| F11 — Gamification / streaks | P3 | **Rejeté** | Streak brisé = culpabilisant pour patient chronique à 2/10. Anti-pattern clinique. |

### 0.3 Biais rattrapage vs différenciation

Sur 16 features proposées, 7 sont étiquetées "Rattrapage" → biais structurel vers la copie des concurrents plutôt que le renforcement des piliers uniques.

**Piliers Boussole ignorés par l'audit :**
- Détection PEM → aucune recommandation d'approfondissement (précision, seuils adaptatifs, patterns multi-jour)
- Score de récupération personnalisé → aucune itération proposée
- PDF consultation structuré → aucune amélioration du contenu ou de la mise en page
- Mode médecin plein écran → découplage flux suggéré (bon point) mais pas de vision d'évolution

**Concurrents dont le modèle est incomparable :**
- Bearable/Visible/Long COVID Companion = apps natives + cloud + backend. Comparer feature-par-feature sans pondérer la stack est trompeur.
- Daylio = journal d'humeur grand public bien-portant. Pas le même public ni le même besoin clinique.

### 0.4 Faisabilité technique — incompatible avec la stack PWA vanilla JS local-first

| Feature | Problème technique |
|---|---|
| F3 — Wearables | iOS HealthKit = app native obligatoire. Android Health Connect = API limitée en PWA. Nécessite fork Capacitor/Ionic = changement de stack fondamental. |
| F13 — Analyse vocale biomarqueurs | Jitter/shimmer/MFCC en WebAssembly client-side = expérimental, aucune lib mature en browser. LCC le fait côté serveur (modèles LIH). |
| F14 — IA prédictive locale (TF.js) | Dataset d'entraînement insuffisant (1 utilisateur, 30-90j). TF.js + localStorage = problèmes mémoire. Pas assez de signal statistique. |
| F15 — Mode aidant P2P sans serveur | WebRTC sans STUN/TURN = non fiable. "Chiffré E2E sans serveur" = fantasme technique pour une PWA. Serveur de signalisation minimum requis. |
| F16 — Contribution recherche opt-in | Nécessite un backend pour recevoir les données anonymisées. Contradiction avec "zéro serveur". |

### 0.5 Quick wins actionnables — prochaine session dev

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | **Contraste bannière PEM** : `color: #355E4D` sur `#E8F5F0` (ratio 3.46→>7:1) | 1 ligne CSS | Accessibilité — alerte médicale la plus importante lisible |
| 2 | **`step="1"` sur tous les sliders indicateurs** | 4 attributs HTML | Empêche valeurs décimales parasites |
| 3 | **Sync version footer ↔ CACHE_NAME** | Automatiser au bump | Fin des incohérences de version |
| 4 | **`theme-color` manifest → `#2d6a4f`** | 1 ligne manifest.json | Supprime flash de couleur au lancement |
| 5 | **Tutoiement manifest.json + aria-label bouton médecin** | 2 strings | Cohérence rédactionnelle |
| 6 | **`aria-labelledby` sur les 8 dialogs** | 8 attributs | Gros gain accessibilité lecteur d'écran |

---

## PARTIE 1 — Audit fonctionnel (source : v9.43)

### Architecture — 4 onglets

| Onglet | Rôle |
|---|---|
| Aujourd'hui | Saisie quotidienne : humeur (0-10), 4 indicateurs (Énergie, Sommeil, Confort, Clarté), journal libre 1000 car., dictée vocale, mesures biométriques optionnelles |
| Résumé | Dashboard analytique : synthèse 7j, score stabilité 30j, calendrier 14j, type de journées, score récupération, corrélations, PEM détectés |
| Suivi | Hub médical : préparer consultation (PDF), montrer au médecin (plein écran), message IA, journal, événements, traitements (paliers dose), essais, consultations |
| Paramètres | Profil symptomatique, informations PDF, export/import JSON, genre |

### Points forts validés

1. **Privacy by design** : 100% local, zéro serveur, zéro compte
2. **Orientation médecin** : toute la logique converge vers la préparation de consultation
3. **Détection PEM** : fonctionnalité rare, cliniquement pertinente (niveaux de confiance Probable/Confirmé/Renforcé)
4. **Gestion traitements avancée** : paliers de dose, DCI, effets indésirables, timeline titration
5. **Score de récupération personnalisé** : baseline individuelle 30j, pas de normes externes
6. **Saisie accessible** : dictée vocale, "Reprendre dernières valeurs", saisie J-7
7. **Export PDF structuré** : optimisé N&B, pensé pour médecin remplaçant

### Points d'amélioration retenus (après filtrage faux positifs)

- Pas de graphique temporel in-app (courbes uniquement dans PDF) → **P1**
- Pas de rappel push configurable (dépend de l'installation PWA) → **P2** (limitation PWA iOS)
- Import/export limité JSON (pas d'interopérabilité Apple Health/Google Fit) → **P4** (stack)
- Saisie limitée J-7 → **P3** (extension à J-30 possible)
- Score récupération nécessite 5j minimum → acceptable (onboarding progressif)
- ~~Pas de confirmation suppression~~ → **Corrigé v9.46**

---

## PARTIE 2 — Audit approfondi UX / Technique / Accessibilité (source : v9.45)

### 2.1 UX mobile

| Constat | Sévérité | Statut |
|---|---|---|
| Navigation tabs déborde en mobile 390px — Suivi et Paramètres masqués | 🔴 Critique | **À investiguer** — vérifier si le problème persiste v9.47 |
| Espace blanc excessif entre humeur et indicateurs — impression de page terminée | 🟠 Majeur | À évaluer |
| Sliders sans valeur numérique pendant déplacement | 🟡 Mineur | Design choice (smiley = feedback suffisant) |
| Bouton "Signaler un événement" coupe le flux de saisie | 🟡 Mineur | Position intentionnelle (raccourci rapide) |
| Toggle thème 38×37px < 44×44 WCAG | 🟡 Mineur | Quick win |

### 2.2 Technique / Performance

| Métrique | Valeur | Verdict |
|---|---|---|
| Éléments DOM | 1 107 | ⚠️ Élevé (dialogs cachés) — lazy rendering possible mais non prioritaire |
| Scripts | 19 | ⚠️ Élevé pour single-page — architecture modulaire acceptée |
| HTML brut | 147 Ko | Modéré — single file by design |
| localStorage | 40 clés / 18 Ko | ✅ Sain |
| Storage API | 1.82 Mo / ~10 Go quota | ✅ 0.018% utilisé |
| PWA manifest/SW/cache | ✅ Complet | ✅ |
| Theme-color meta vs manifest | `#2d6a4f` vs `#6E877D` | **Quick win** — aligner |

**Risque localStorage long terme :** 730 clés après 2 ans, 1825 après 5 ans. Migration IndexedDB = P3 (pas urgent, quota OK à 0.018%).

### 2.3 Accessibilité WCAG 2.1 AA

**Contrastes :**
| Élément | Ratio | WCAG |
|---|---|---|
| Onglet actif | 6.39:1 | ✅ |
| Onglets inactifs | ~4.5:1 | ⚠️ Limite |
| **Bannière alerte PEM** | **3.46:1** | **❌ FAIL → Quick win #1** |
| Labels sliders 11px opacity 0.35 | ~2.5:1 | **❌ FAIL → Quick win** |

**Structure sémantique :**
- 12 H2 dont 10 cachés → lecteurs d'écran exposent tous les headings → à corriger avec `aria-hidden="true"` sur panels inactifs
- Sections onglet Suivi sans heading → ajouter H3
- 8 dialogs sans `aria-labelledby` → Quick win #6
- Tablist/tab/tabpanel correctement implémentés ✅
- Skip link présent ✅

**Cibles tactiles < 44px :** toggle thème (38×37), bouton "?" (20×20), liens footer (~26×15) — 7/97 éléments en échec.

### 2.4 Onboarding

- Time-to-first-value : **~45 secondes** → excellent
- Zéro barrière d'inscription
- Message "30 secondes par jour" = attente réaliste
- Sélecteur de profil symptomatique pourrait nécessiter scroll dans la modale → mineur

### 2.5 PDF consultation

- Optimisé N&B ✅, nommé prénom+nom+date ✅, hiérarchie clinique médecin remplaçant ✅
- Manque : numéro de version app sur le PDF → **Quick win**
- Manque : poids du fichier dans l'aperçu → cosmétique

### 2.6 Rédactionnel

- Tutoiement uniforme dans l'interface ✅
- Résidus vouvoiement : manifest.json description + aria-label bouton médecin → **Quick win #5**
- Microcopie de qualité (placeholder journal, compteur caractères, transparence "tes mots dans le PDF")

---

## PARTIE 3 — Benchmark concurrentiel (5 concurrents)

### 3.1 Positionnement comparé

| App | Modèle | Stack | Privacy | Orientation médicale |
|---|---|---|---|---|
| **myBoussole** | Gratuit, sans compte | PWA vanilla JS, local-first | ✅ 100% local | ✅ PDF consultation + mode médecin + message IA |
| Long COVID Companion | Gratuit, compte obligatoire | PWA + natif, cloud | ❌ Serveur | ⚠️ Questionnaires PRO mais pas de PDF structuré |
| Jardin Mental | Gratuit, anonyme | Natif iOS/Android | ✅ Local | ⚠️ Export PDF basique |
| Bearable | Freemium ~$50/an | Natif, cloud | ❌ Serveur | ❌ Pas de mode médecin |
| Visible | Payant ~$25/mois + bracelet | Natif, cloud | ❌ Serveur | ❌ Pas de PDF consultation |
| Daylio | Freemium | Natif | ❌ Cloud backup | ❌ Journal d'humeur, pas médical |

### 3.2 Avantages exclusifs Boussole (aucun concurrent ne combine)

1. Privacy by design + sans compte + 100% local
2. PDF consultation structuré + mode médecin plein écran
3. Détection PEM automatisée avec niveaux de confiance
4. Score de récupération personnalisé (baseline individuelle)
5. Gestion traitements avec paliers de dose + timeline titration
6. Message IA médecin généré localement
7. Corrélations traitements×score (Feature E v9.45)

### 3.3 Gaps réels après filtrage

| Gap | Prio corrigée | Commentaire |
|---|---|---|
| Graphiques temporels in-app | **P1** | Standard marché, manque visible. Chart.js déjà utilisé pour PDF → réutilisable. |
| Questionnaires PRO standardisés (PHQ-9, GAD-7, PCFS) | **P1** | Différenciation forte, crédibilité médicale. Faisable 100% local. |
| Year in Pixels / calendrier annuel | **P2** | Quick win, impact visuel fort, effort faible. |
| Pacing assistant & budget énergie (déclaratif) | **P2** | Version sans bracelet = différenciateur vs Visible. Faisable en local. |
| Ressources psychoéducatives | **P2** | Fiches courtes liées au profil. Contenu déjà partiellement sur myboussole.fr. |
| Saisie rétroactive étendue J-30 | **P3** | Quick win, effort faible. |

### 3.4 Features rejetées ou requalifiées

| Feature | Prio audit | Décision | Raison |
|---|---|---|---|
| F2 — Indicateurs personnalisables | P0 | **Rejeté socle / P3 premium** | 4 curseurs fixes = différenciateur, pas lacune |
| F3 — Connexion wearables | P1 | **P4** | Impossible PWA iOS sans fork natif |
| F10 — Multi-entrées/jour | P2 | **Rejeté** | Contre "30 secondes", contre public fatigué |
| F11 — Gamification streaks | P3 | **Rejeté** | Anti-pattern clinique, culpabilisant |
| F13 — Analyse vocale biomarqueurs | P4 | **R&D pure** | Aucune lib mature browser-side |
| F14 — IA prédictive locale | P4 | **R&D pure** | Dataset insuffisant en local-only |
| F15 — Mode aidant P2P | P3 | **P4** | Nécessite serveur signalisation minimum |
| F16 — Contribution recherche | P3 | **P4** | Nécessite backend = contradiction "zéro serveur" |

---

## PARTIE 4 — Roadmap corrigée post-audit

### Sprint immédiat (quick wins — prochaine session dev)

1. Contraste bannière PEM → `color: #355E4D` sur `#E8F5F0`
2. `step="1"` sur les 4 sliders indicateurs
3. Sync version footer ↔ CACHE_NAME (automatiser)
4. `theme-color` manifest.json → `#2d6a4f`
5. Tutoiement manifest.json + aria-label bouton médecin
6. `aria-labelledby` sur les 8 dialogs

### P1 — Court terme

- Graphiques temporels in-app (Chart.js, 7/14/30/90j, overlay traitements)
- Questionnaires PRO : PHQ-9 + GAD-7 + PCFS (stockage local, score auto, intégration PDF)
- Investiguer navigation mobile tronquée (vérifier si persistant v9.47)

### P2 — Moyen terme

- Year in Pixels / calendrier annuel
- Pacing assistant déclaratif (budget énergie, jauge, alerte 80%)
- Fiches psychoéducatives liées au profil symptomatique
- `aria-hidden` sur panels/dialogs inactifs + headings H3 dans Suivi
- Découplage flux "Montrer au médecin" (accès direct plein écran) vs "Préparer consultation"

### P3 — Backlog

- Saisie rétroactive J-30
- Indicateurs additionnels optionnels (module Boussole+ premium)
- Numéro de version sur les PDF
- Validation JSON + merge intelligent pour l'import
- Agrandir cibles tactiles < 44px

### P4 — Vision long terme (changement de stack requis)

- Connexion wearables (nécessite wrapper natif Capacitor/Ionic)
- Mode aidant (nécessite serveur signalisation)
- Contribution recherche opt-in (nécessite backend anonymisation)
- Migration IndexedDB (quand localStorage atteint ~2 Mo)

---

## PARTIE 5 — Matrice des gaps (mise à jour post-Feature E)

| Feature | Boussole v9.47 | LCC | Jardin Mental | Bearable | Visible | Daylio |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Privacy 100% local | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sans compte | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| 4 indicateurs fixes (socle) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Indicateurs personnalisables | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Questionnaires PRO | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Graphiques temporels in-app | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Corrélations traitements×score** | **✅** | ❌ | ❌ | ✅ | ❌ | ✅ |
| Gestion traitements (paliers) | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| Détection PEM / crash | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| Score récupération perso | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PDF consultation structuré | ✅ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ |
| Mode médecin plein écran | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Message IA médecin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dictée vocale | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| Connexion wearable | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Ressources psychoéducatives | ⚠️ mini-fiches | ✅ | ✅ | ❌ | ✅ | ❌ |

---

*Document généré le 04/04/2026 — Analyse critique par Claude (Boussole OS P5) sur base de 3 audits IA filtrés contre l'état réel v9.47.*
