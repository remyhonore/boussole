# Boussole+ v1.0 Phase 1

Journal de santé quotidien qui transforme 3 curseurs/jour en un PDF avec tendances et points marquants, lisible par un médecin en < 90 secondes.

## ✨ Fonctionnalités Phase 1

### Patient - Écran "Aujourd'hui"
- ✅ 3 curseurs (Énergie, Qualité sommeil, Douleurs physiques)
- ✅ Note optionnelle (200 caractères max)
- ✅ 1 saisie par jour (minimum 1 curseur)
- ✅ Bouton "Reprendre dernières valeurs"
- ✅ Bouton "Annuler" (30s après enregistrement)

### Médecin - Écran "Résumé"
- ✅ Période 14 jours glissants
- ✅ Structure fixe 5 blocs :
  1. Tendances + moyennes
  2. Variations importantes
  3. Points marquants
  4. Notes du patient
  5. Prudence

### PDF
- ✅ Génération 100% locale (aucun serveur)
- ✅ Aperçu avant téléchargement
- ✅ 1 page exactement
- ✅ Contenu identique à l'écran Résumé
- ✅ Nom de fichier : `boussole_YYYY-MM-DD.pdf`

### Calcul (calc_v1)
- ✅ Moyennes arrondies (0-10)
- ✅ Tendances (amélioration/baisse/stable/fluctuant)
- ✅ Variations notables (écart ≥ 3 points)
- ✅ Points marquants (meilleur jour, jour le plus bas, trous)
- ✅ Avertissement "données insuffisantes" (< 5 jours)

## 🚀 Installation

### Option 1 : Ouvrir directement
```bash
# Ouvrir index.html dans un navigateur moderne
open index.html
```

### Option 2 : Serveur local
```bash
# Avec Node.js
npx serve .
# Puis ouvrir http://localhost:3000

# Ou avec Python
python3 -m http.server 8000
# Puis ouvrir http://localhost:8000
```

## 🧪 Tests

```bash
# Installer les dépendances
npm install

# Lancer les tests
npm test
```

Tous les tests doivent passer ✅ avant toute mise en production.

## 📋 Validation Phase 1

### Étape 1 : Installation
- [ ] Ouvrir index.html → app se charge sans erreur
- [ ] Aucune erreur console

### Étape 2 : Saisie basique
- [ ] Déplacer curseur "Énergie" à 5 → valeur affichée = 5
- [ ] Clic "Enregistrer" → toast "Enregistré ✓" apparaît
- [ ] Bouton "Annuler" visible pendant 30s
- [ ] Clic "Annuler" → curseur revient à état initial

### Étape 3 : Tests automatisés
```bash
npm test
```
- [ ] Tous les tests passent ✅

### Étape 4 : Dataset de référence
```bash
# Ouvrir l'app avec ?debug=dataset
open index.html?debug=dataset
```
- [ ] Écran Résumé affiche :
  - [ ] Moyennes : Énergie 5, Sommeil 6, Douleurs 4
  - [ ] Tendances présentes pour les 3 curseurs
  - [ ] Au moins 1 variation détectée
  - [ ] 3 notes affichées

### Étape 5 : PDF
- [ ] Clic "Générer PDF" → aperçu s'affiche
- [ ] Contenu aperçu = identique écran Résumé
- [ ] Clic "Télécharger" → fichier téléchargé
- [ ] Ouvrir PDF → 1 page exactement
- [ ] Contenu PDF = identique aperçu

### Étape 6 : Validation utilisateur
- [ ] 1 patient teste la saisie
- [ ] Temps de saisie < 30s ✅
- [ ] Patient comprend les curseurs ✅
- [ ] 1 médecin lit le PDF
- [ ] Temps de lecture < 90s ✅
- [ ] Médecin identifie ≥ 1 info utile ✅

**Répondre "OK Phase 1" si tous les points sont ☑️**

## 📁 Structure du projet

```
/
├── index.html          # Page unique
├── app.js             # Logique principale (~500 lignes)
├── calc.js            # Moteur calc_v1 (~200 lignes)
├── pdf.js             # Génération PDF (~150 lignes)
├── storage.js         # localStorage avec fallback (~100 lignes)
├── styles.css         # Styles (~400 lignes)
├── tests/
│   └── calc.test.js   # Tests automatisés
├── README.md          # Ce fichier
├── CHANGELOG.md       # Historique des versions
└── package.json       # Configuration npm
```

**Total : ~1500 lignes**

## 🔒 Principes respectés

1. ✅ **Local-first absolu** : données sur l'appareil, aucun serveur, aucun compte
2. ✅ **Pas de diagnostic** : l'app décrit des mesures, ne conclut jamais
3. ✅ **Simplicité radicale** : 3 curseurs fixes, 2 onglets, aucune option
4. ✅ **Reproductibilité** : mêmes données = mêmes résultats (tests automatisés)
5. ✅ **Zéro régression** : toute modification doit passer les tests

## 🌐 Compatibilité

- ✅ Chrome/Edge (desktop + mobile)
- ✅ Safari (desktop + iOS)
- ✅ Firefox (desktop + mobile)

Testé sur :
- macOS Safari 17+
- iOS Safari 17+
- Chrome 120+

## 📊 Dataset de référence

Pour charger le dataset de test :
```
http://localhost:3000/?debug=dataset
```

Contient 7 entrées couvrant différents scénarios :
- Jours avec tous les curseurs renseignés
- Jours avec données partielles
- Variations importantes
- Notes du patient

## ⚠️ Ce qui n'est PAS dans Phase 1

Les fonctionnalités suivantes seront ajoutées UNIQUEMENT si validées par des utilisateurs réels :

❌ Saisies multiples par jour (Matin/Soir)  
❌ Curseurs optionnels supplémentaires  
❌ Sélection de période (7/14/30 jours)  
❌ Coordonnées médecin/pharmacie  
❌ Contexte cycle menstruel  
❌ Objectif de consultation (champ libre)  
❌ Assistant de démarrage  
❌ Pré-réglages ("Covid long", etc.)  
❌ Graphiques de tendances  
❌ Export JSON/CSV  
❌ Dark mode  
❌ Multilingue  

## 📞 Support

Pour signaler un bug ou proposer une amélioration :
1. Vérifier que tous les tests passent
2. Reproduire le bug de manière systématique
3. Fournir les étapes de reproduction
4. Inclure le navigateur et la version

## 📝 Licence

Copyright 2026 - Tous droits réservés

---

**Version :** 1.0.0-phase1  
**Date :** Février 2026  
**Statut :** MVP en validation
