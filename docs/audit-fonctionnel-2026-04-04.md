# Audit fonctionnel — myBoussole (v9.43)
**Date de l'audit :** 04/04/2026
**URL :** https://app.myboussole.fr/
**Type d'application :** PWA (Progressive Web App) — 100 % local, sans compte, sans cloud
**Profil audité :** Utilisateur / Patient

---

## Vue d'ensemble

myBoussole est un journal de bien-être personnel destiné aux patients souffrant de maladies chroniques (fatigue chronique, Covid long, brouillard mental, troubles du sommeil, etc.). L'application se positionne comme un **outil de suivi personnel**, non un dispositif médical. Toutes les données sont stockées localement sur l'appareil de l'utilisateur (localStorage / IndexedDB), sans serveur ni compte requis.

## Points forts identifiés

1. **Privacy by design** : aucune donnée transmise à un serveur, stockage 100 % local.
2. **Orientation médecin** : toute la logique de l'app converge vers la préparation et l'amélioration des consultations médicales.
3. **Détection de PEM** : fonctionnalité rare et cliniquement pertinente pour les patients atteints de fatigue chronique / Covid long.
4. **Gestion des traitements avancée** : historique de paliers de dose, effets indésirables, notion de statut — niveau de détail médical élevé.
5. **Score de récupération personnalisé** : basé sur la baseline individuelle plutôt que des normes externes.
6. **Accessibilité de la saisie** : dictée vocale, "Reprendre les dernières valeurs", saisie pour les 7 derniers jours.
7. **Export PDF structuré** : pensé pour un médecin remplaçant ou non familier du patient.

## Points d'amélioration potentiels

1. Pas de graphique temporel visuel dans l'app (uniquement via les PDF).
2. Pas de rappel natif configurable (notification push).
3. Import/export limité au format JSON.
4. Gestion de la date de saisie limitée à J-7.
5. Pas de confirmation avant suppression des traitements ou événements.
6. Score de récupération nécessite 5 jours minimum de mesures.
7. Profil IA message médecin : clarté sur la nature "IA" à préciser.

_Audit complet : voir fichier uploadé dans la session du 04/04/2026._