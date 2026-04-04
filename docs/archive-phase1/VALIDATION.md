# Procédure de vérification Boussole+ v1.0 Phase 1

Cette procédure permet de valider que l'application fonctionne correctement avant de la déployer ou de passer à Phase 2.

---

## ✅ Pré-requis

- [ ] Navigateur moderne installé (Chrome, Safari, ou Firefox)
- [ ] Node.js installé (pour les tests)
- [ ] Tous les fichiers présents dans le dossier

---

## 📋 Étape 1 : Installation

### 1.1 Vérifier les fichiers
```bash
ls -la
```

Fichiers attendus :
- [ ] index.html
- [ ] app.js
- [ ] calc.js
- [ ] pdf.js
- [ ] storage.js
- [ ] styles.css
- [ ] tests/calc.test.js
- [ ] README.md
- [ ] CHANGELOG.md
- [ ] package.json

### 1.2 Ouvrir l'application
```bash
# Option A : Ouvrir directement
open index.html

# Option B : Serveur local
npx serve .
# Puis ouvrir http://localhost:3000
```

- [ ] La page se charge sans erreur
- [ ] Onglet "Aujourd'hui" est actif
- [ ] Aucune erreur dans la console (F12)

**❌ Si échec :** Vérifier que tous les fichiers sont présents et que les chemins sont corrects

---

## 📋 Étape 2 : Saisie basique

### 2.1 Premier curseur
- [ ] Déplacer le curseur "Énergie" à 5
- [ ] La valeur affichée à droite = 5
- [ ] Le curseur se colore (gradient rouge-orange-vert)

### 2.2 Enregistrement
- [ ] Cliquer sur "Enregistrer"
- [ ] Message "Enregistré ✓" apparaît (vert)
- [ ] Bouton "Annuler (30s)" apparaît
- [ ] En bas : "Dernière saisie : XX/XX/XXXX · Énergie 5"

### 2.3 Annulation
- [ ] Cliquer sur "Annuler (30s)"
- [ ] Message "Annulation effectuée" apparaît
- [ ] Curseur "Énergie" revient à position initiale (—)
- [ ] Bouton "Annuler" disparaît

**❌ Si échec :** Vérifier storage.js et app.js

---

## 📋 Étape 3 : Tests automatisés

### 3.1 Installer les dépendances
```bash
npm install
```

- [ ] Installation réussie sans erreur

### 3.2 Lancer les tests
```bash
npm test
```

Résultat attendu :
```
PASS  tests/calc.test.js
  calc_v1 - Dataset de référence
    ✓ Dataset contient 7 entrées
    ✓ Qualité données : < 5 jours insuffisant
    ✓ Qualité données : ≥ 5 jours OK
    ✓ Moyennes calculées correctement
    ✓ Tendances définies
    ✓ Variations détectées
    ✓ Points marquants présents
    ✓ Notes triées par date décroissante
    ✓ Notes contiennent uniquement celles avec texte
  ...

Test Suites: 1 passed, 1 total
Tests:       XX passed, XX total
```

- [ ] Tous les tests passent ✅
- [ ] Aucun test échoué

**❌ Si échec :** Vérifier calc.js et corriger les bugs

---

## 📋 Étape 4 : Dataset de référence

### 4.1 Charger le dataset
```bash
# Ouvrir l'URL avec paramètre debug
http://localhost:3000/?debug=dataset

# Ou si fichier direct
open "index.html?debug=dataset"
```

- [ ] Message "Dataset de référence chargé" apparaît

### 4.2 Aller sur l'onglet "Résumé"
- [ ] Cliquer sur l'onglet "Résumé"
- [ ] Le contenu se charge

### 4.3 Vérifier les moyennes
Section "1️⃣ TENDANCES" :
- [ ] Énergie : **5**/10
- [ ] Qualité sommeil : **6**/10
- [ ] Douleurs : **4**/10

**Calcul de référence :**
```
Énergie: (4+5+7+6+3+5+7)/7 = 37/7 = 5,29 → arrondi 5 ✓
Sommeil: (4+5+7+6+4+6+7)/7 = 39/7 = 5,57 → arrondi 6 ✓
Douleurs: (6+5+2+3+9+4+2)/7 = 31/7 = 4,43 → arrondi 4 ✓
```

### 4.4 Vérifier les tendances
- [ ] Chaque curseur a une tendance affichée
- [ ] Tendance = l'une des valeurs :
  - "plutôt en amélioration"
  - "plutôt en baisse"
  - "plutôt stable"
  - "plutôt fluctuant"

### 4.5 Vérifier les variations
Section "2️⃣ VARIATIONS IMPORTANTES" :
- [ ] Au moins 1 variation affichée
- [ ] Format : "JJ/MM/AAAA : Forte amélioration" ou "Chute brutale"
- [ ] Sous-titre avec scores : "(X.X/10 vs Y.Y/10)"

### 4.6 Vérifier les points marquants
Section "3️⃣ POINTS MARQUANTS" :
- [ ] Meilleur jour affiché avec date et score
- [ ] Jour le plus bas affiché avec date et score
- [ ] Éventuellement : trous (jours non renseignés)

### 4.7 Vérifier les notes
Section "4️⃣ NOTES DU PATIENT" :
- [ ] 3 notes affichées maximum
- [ ] Format : "JJ/MM/AAAA : 'texte de la note'"
- [ ] Notes triées du plus récent au plus ancien

**❌ Si échec :** Vérifier calc.js

---

## 📋 Étape 5 : Génération PDF

### 5.1 Ouvrir l'aperçu
- [ ] Cliquer sur "Générer PDF"
- [ ] Modal s'ouvre avec aperçu
- [ ] Aperçu contient les 5 sections

### 5.2 Vérifier le contenu aperçu
- [ ] En-tête : "📊 RÉSUMÉ 14 JOURS"
- [ ] Jours renseignés : 7/14
- [ ] Section 1️⃣ TENDANCES présente
- [ ] Section 2️⃣ VARIATIONS (si applicable)
- [ ] Section 3️⃣ POINTS MARQUANTS présente
- [ ] Section 4️⃣ NOTES DU PATIENT présente
- [ ] Section 5️⃣ PRUDENCE présente

### 5.3 Comparer aperçu vs écran Résumé
- [ ] Ouvrir l'écran Résumé à côté de la modal
- [ ] Le contenu est **identique** entre les deux

### 5.4 Télécharger le PDF
- [ ] Cliquer sur "Télécharger"
- [ ] Fichier téléchargé : `boussole_YYYY-MM-DD.pdf`
- [ ] Message "PDF téléchargé : ..." apparaît
- [ ] Modal se ferme

### 5.5 Vérifier le PDF
- [ ] Ouvrir le PDF téléchargé
- [ ] **Nombre de pages = 1 exactement** ✓
- [ ] En-tête : "Boussole | Généré le JJ/MM/AAAA à HH:MM | v1.0.0"
- [ ] Les 5 sections sont présentes
- [ ] Pied de page : "⚠ Document généré par le patient..."
- [ ] Contenu PDF = identique à l'aperçu

### 5.6 Comparer PDF vs Écran
- [ ] Ouvrir le PDF à côté de l'écran Résumé
- [ ] Le contenu est **identique** (sauf mise en page)

**❌ Si échec :** Vérifier pdf.js et que jsPDF est bien chargé

---

## 📋 Étape 6 : Validation utilisateur

### 6.1 Test patient (chronométré)
Demander à 1 personne (pas développeur) de :
1. Ouvrir l'app
2. Remplir les 3 curseurs
3. Ajouter une note
4. Enregistrer

**Chronométrer ⏱️**

- [ ] Temps < 30 secondes
- [ ] Patient a compris les curseurs
- [ ] Patient a trouvé le bouton "Enregistrer" facilement
- [ ] Aucune confusion

**Feedback patient :**
```
(Noter ici les retours)
```

### 6.2 Test médecin (chronométré)
Demander à 1 médecin (ou professionnel de santé) de :
1. Lire le PDF généré (dataset de référence)
2. Identifier les informations clés

**Chronométrer ⏱️**

- [ ] Temps de lecture < 90 secondes
- [ ] Médecin a identifié ≥ 1 info utile non spontanément mentionnée
- [ ] Médecin trouve le format utilisable
- [ ] Médecin préfère ce PDF vs photo de carnet

**Feedback médecin :**
```
Infos identifiées :
1. ...
2. ...
3. ...

Ce PDF est-il supérieur à une photo de carnet ? OUI / NON
Pourquoi ?
```

**❌ Si feedback négatif :** Retravailler la structure du PDF ou les calculs

---

## 📋 Étape 7 : Tests de robustesse

### 7.1 Données partielles
- [ ] Remplir seulement 1 curseur → Enregistrer
- [ ] Message : "Pour plus de fiabilité, renseigne au moins 2 repères"
- [ ] Données sauvegardées quand même

### 7.2 Aucune donnée
- [ ] Ne toucher aucun curseur → Enregistrer
- [ ] Message : "Renseigne au moins 1 repère pour enregistrer"
- [ ] Rien n'est sauvegardé

### 7.3 Note longue
- [ ] Écrire 200 caractères dans la note
- [ ] Compteur affiche "200/200"
- [ ] Impossible d'écrire plus

### 7.4 Reprendre dernières valeurs
- [ ] Enregistrer une saisie complète
- [ ] Rafraîchir la page
- [ ] Cliquer "Reprendre dernières valeurs"
- [ ] Les 3 curseurs se remplissent avec les valeurs précédentes

### 7.5 Navigation privée (Safari)
- [ ] Ouvrir en navigation privée
- [ ] Remplir et enregistrer
- [ ] Fermer et rouvrir la page
- [ ] Les données sont perdues (normal en navigation privée)
- [ ] Aucune erreur console

**❌ Si erreur :** Vérifier storage.js (fallback mémoire)

---

## 🎯 Checklist finale

### Critères bloquants ✅

Tous ces points DOIVENT être validés pour passer à Phase 2 :

- [ ] ✅ Tous les tests automatisés passent
- [ ] ✅ PDF = 1 page exactement
- [ ] ✅ Saisie patient < 30s (chronométré)
- [ ] ✅ Lecture PDF médecin < 90s (chronométré)
- [ ] ✅ Médecin identifie ≥ 1 info utile
- [ ] ✅ Contenu PDF = identique écran Résumé
- [ ] ✅ Contenu PDF = identique aperçu
- [ ] ✅ Aucune erreur console
- [ ] ✅ Fonctionne sur Safari iOS
- [ ] ✅ Fonctionne sur Chrome desktop

### Critères "Wow Threshold" 🚀

Le PDF doit être **objectivement supérieur** à une photo de carnet :

- [ ] 🎯 Médecin gagne du temps vs écoute du patient
- [ ] 🎯 Médecin détecte info que patient aurait oubliée
- [ ] 🎯 Tendances claires visibles en < 10s
- [ ] 🎯 Points marquants attirent l'œil immédiatement
- [ ] 🎯 Format utilisable en consultation (pas besoin de reformater)

**Si UN SEUL critère "Wow" n'est pas validé → retravailler avant Phase 2**

---

## ✅ Validation finale

**Répondre aux questions suivantes :**

1. Tous les tests automatisés passent-ils ? **OUI / NON**
2. Le PDF fait-il exactement 1 page ? **OUI / NON**
3. La saisie prend-elle < 30s ? **OUI / NON**
4. La lecture du PDF prend-elle < 90s ? **OUI / NON**
5. Le médecin a-t-il identifié ≥ 1 info utile ? **OUI / NON**
6. Le PDF est-il supérieur à une photo de carnet ? **OUI / NON**

**Si TOUTES les réponses sont OUI :**
```
✅ OK PHASE 1 - Prêt pour Phase 2
```

**Si AU MOINS UNE réponse est NON :**
```
❌ Phase 1 incomplète - Ne pas passer à Phase 2
Action requise : [décrire le problème et la solution]
```

---

**Date de validation :** _________________  
**Validé par :** _________________  
**Signature :** _________________
