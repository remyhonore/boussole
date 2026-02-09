## v0.7.15
- Notes de version : ajout d’un lien “Voir tout” (modale) pour lire le changelog complet, tout en gardant l’affichage principal limité aux 10 dernières versions.

## v0.7.14
- Maintenance : bump version/cache-busting (aucun changement fonctionnel).

## v0.7.13
- À propos / Aide : ajout d’un bouton “Copier” (version + navigateur + état du stockage local + lien signalement), sans données personnelles.

## v0.7.11
- Réglages : ajout d’un lien “À propos / Aide” (modale) avec les infos essentielles (zéro tracking, données locales, export PDF, sauvegarde, signalement bug).

## v0.7.10
- Maintenance : bump version + cache-busting uniquement (aucun changement fonctionnel).

## v0.7.09

- PWA /app : manifest aligné (start_url/scope/id) + couleurs (#fff7f4).
- /app + dashboard : meta iOS (apple-web-app) + icônes/manifest cohérents.

## v0.7.08
- PWA landing : ajout d’icônes “maskable” dans le manifest (meilleur rendu sur Android) + start_url/scope plus propres.

## v0.7.07
- Identité : nouvelle icône “Boussole” (favicon + icônes PWA) plus flatteuse, cohérente et lisible.

## v0.7.05
- Aide curseurs (ⓘ) : ajout d’une ligne “Exemples de symptômes” (2–3 puces) pour clarifier l’interprétation sans alourdir l’écran.

## v0.7.04
- Correctif : bump version pour rafraîchir le cache (aucun changement fonctionnel).

## v0.7.03
- Curseurs : ajout d’un bouton ⓘ (définition courte) pour comprendre à quoi correspond chaque curseur.
- Libellé : “Confort (douleur faible)” devient “Confort” (la nuance est expliquée via ⓘ).
- Toujours 100% local : aucun suivi, aucune donnée.

## v0.7.02
- Notes de version : ajout d’un bouton “Copier” (copie texte des 10 dernières entrées).
- Toujours 100% local : aucun suivi, aucune donnée.

## v0.7.01
- Notes de version : ajout d’un badge “Nouveau” tant que la modale n’a pas été ouverte depuis la mise à jour.
- Stockage local uniquement : mémorise la dernière version vue (best-effort en mode privé).

## v0.7.00
- App : ajout d’un lien “Notes de version” (modale) avec les 10 dernières versions max.
- Zéro suivi : le texte est chargé localement depuis `CHANGELOG.md`.

## v0.6.99
- Landing : affichage de la version (FR/EN) mis à jour.
- App + dashboard : bump version + cache-busting ?v=0.6.99.

## v0.6.98
- Tableau de bord : version unifiée (affichage + export status.json) sur la version réelle de l’app.
- Aucun changement de contenu : uniquement la version affichée/exportée.

## v0.6.96
- Uniformisation de l’horodatage (nom de fichier) pour tous les exports : JSON / PDF / PNG / TXT.
- Aucun changement de contenu : uniquement les noms de fichiers exportés.
## v0.6.95
- Export .txt “Signaler un problème” : utilise désormais `downloadBlob` (même mécanisme que les autres exports) pour fiabiliser le téléchargement et le nettoyage d’URL.

## v0.6.94
- Exports .txt : noms de fichiers uniformisés (préfixe unique, version incluse) pour “Support PDF” et “Signaler un problème”.

## v0.6.93
- Export .txt support : correction du nom de fichier (inclut la version, évite `v_.txt`).

## v0.6.92
- PDF : diagnostic ultra simple → ajoute stockage local + modes test PDF + service worker (sans données).

## v0.6.91
- Signalement de problème : enrichissement des infos techniques (sans données) dans l’email/copie (stockage local, modes test PDF, service worker).

## v0.6.90
- Accessibilité : le lien « Aller au contenu » évite désormais les barres sticky (topbar + onglets) pour que le contenu ciblé ne soit pas masqué.

## v0.6.89
- Accessibilité : ajout d’un lien « Aller au contenu » (skip link) sur l’app et le tableau de bord pour sauter l’en-tête au clavier.

## v0.6.86

- Restyle UI (app) vers une identité "micronutriment.fr" : thème clair, accent #e0aa99, composants harmonisés (CSS uniquement).

## v0.6.85
- Contacts (médecin/pharmacie) : ajout d’un bouton “Copier” pour récupérer en 1 clic les coordonnées (bloc multi-lignes), utile quand la sauvegarde est bloquée (mode privé) ou pour partager.

## v0.6.81
- Contacts (médecin/pharmacie) : indicateur de sauvegarde plus fiable (retour réel de persistance) + debounce des écritures pour éviter de reprober localStorage à chaque frappe, tout en gardant l’UI comme source de vérité pour le PDF/aperçu.

## v0.6.80
- Stockage (Safari iOS / navigation privée) : toutes les lectures/écritures critiques passent par le stockage robuste (fallback mémoire) pour éviter qu’une exception localStorage casse la persistance (contacts/PDF, brouillons, erreurs, onglets, etc.).

## v0.6.78
- Stockage (Safari iOS / navigation privée) : objectif de consultation sauvegardé via le même stockage robuste que le reste des paramètres, pour éviter qu’une exception localStorage casse des sauvegardes silencieuses (contacts/PDF).

## v0.6.76
- Contacts (médecin/pharmacie) : normalisation téléphone FR lors de la synchronisation (y compris auto-remplissage silencieux), pour garantir un PDF/aperçu et une sauvegarde cohérents.

## v0.6.75
- Contacts (médecin/pharmacie) : re-synchronisation automatique au retour au premier plan (focus/pageshow) pour couvrir Safari iOS + bfcache et garantir un PDF/aperçu toujours à jour.

## v0.6.74
- Contacts (médecin/pharmacie) : détection renforcée de l’autoremplissage “silencieux” via vérification après interactions globales (sélection d’une proposition navigateur sans événement de saisie).

## v0.6.73
- Contacts (médecin/pharmacie) : unification de la persistance depuis l’UI (input/change/blur) + masque téléphone sauvegardé via la même synchronisation, pour éviter les sauvegardes partielles et garantir un aperçu/PDF à jour.

## v0.6.72
- Contacts (médecin/pharmacie) : centralisation de la détection + sauvegarde temporisée (2 passes) pour limiter les ratés d’autoremplissage silencieux et éviter les sauvegardes trop fréquentes.

## v0.6.71
- PDF : en entrant dans l’onglet PDF, synchronisation silencieuse des contacts Médecin/Pharmacie (autoremplissage navigateur) pour garantir un aperçu et un PDF à jour.

## v0.6.70
- Contacts (médecin/pharmacie) : activation réelle du hook autofill WebKit (Safari/Chrome) en ajoutant la classe CSS `hc-autofill` sur les champs.

## v0.6.69
- Contacts (médecin/pharmacie) : ajout des attributs HTML (name + autocomplete par section) pour améliorer l’auto-remplissage navigateur.

## v0.6.68
- Contacts (médecin/pharmacie) : pour le PDF et l’aperçu, priorité à l’état visible des champs (autoremplissage silencieux / stockage bloqué) + persistance best-effort.

## 0.6.66

## v0.6.67
- Fiabilisation autofill navigateur (Safari/Chrome) pour Médecin/Pharmacie : détection via hook WebKit (animationstart) en plus des écouteurs/polling.
- Contacts (médecin/pharmacie) : sauvegarde de sécurité lors du passage en arrière-plan / fermeture (pagehide, beforeunload, visibilitychange).

## 0.6.65
- Contacts santé (Médecin / Pharmacie) : fiabilisation auto-remplissage navigateur + sauvegarde silencieuse avant génération PDF.

## 0.6.64
- Modales “copie manuelle” (PDF + signalement) : ajout du bouton “Copier tout” (objet + corps).

## 0.6.63
- “Aide PDF : copie manuelle” : affichage en 2 champs (Objet + Corps) avec boutons “Copier l’objet / Copier le corps” (et sélection automatique si la copie est bloquée).

## 0.6.62
- Modale “Aide : copie manuelle” (signalement) : boutons “Copier l’objet / Copier le corps” (avec sélection automatique si la copie est bloquée).
- Synchronisation du code JS avec la modale (Objet + Corps).

## 0.6.61
- Modale “Aide : copie manuelle” : champs séparés (Objet + Corps).

## v0.6.60

- (Aide) Dans les messages à copier (PDF + signalement), ajout du repère "Corps :" après "Objet :" pour faciliter la copie manuelle.

## v0.6.59
- “Signaler un problème” : ajout d’un bouton “Copier” (message complet objet + corps) avec fallback “Copie manuelle” + téléchargement (.txt).

## v0.6.52
- Harmonisation des boutons d’action : libellés en verbes courts (Copier / Télécharger / Importer / Exporter / Annuler) avec info-bulles.

# Boussole - Changelog

## v0.6.51
- Terminologie interne : "toast" renommé en "message" (appMessage) pour cohérence FR (aucun changement fonctionnel).

## v0.6.50
- Diagnostic : "viewport" → "zone visible" ; "DPR" → "densité de pixels".

## v0.6.49
- Diagnostic : "UA" renommé en "agent utilisateur" dans le diagnostic complet (modale + message copie/colle).

## v0.6.48
- Audit "zéro anglicisme" côté interface : remplacement des libellés visibles en anglais.
  - "bug" -> "problème" (boutons + aide + email pré-rempli).
  - "tracking" -> "suivi".
  - "Exporter/Importer status.json" -> "Exporter/Importer l’état (status.json)" (nom de fichier inchangé).

## v0.6.47
- Terminologie : uniformisation en "données locales" sur la page d'accueil et dans l'application.

## v0.6.45
- Aide PDF : dans "Copie manuelle", bouton "Télécharger (.txt)" pour récupérer le message complet (objet + corps) sans presse-papiers.

## v0.6.54
- Texte : correctifs mineurs de cohérence (accents) sur les libellés non critiques.

## v0.6.55
- Texte : harmonisation systématique des accents dans les textes internes (diagnostic / aide PDF / changelog) pour éviter les formes mixtes (ex. probleme/problème, etat/état).

## v0.6.38
- Aide PDF : l'email "Problème PDF" inclut un diagnostic ultra simple (navigateur, OS, taille écran, langue, heure locale, URL) + champ pré-rempli.

## v0.6.34
- PDF : si debugPdfFail=1 est actif, ajoute "Erreur simulée (test)" dans le message d'erreur.

## v0.6.33
- Aide PDF : bouton "Copier l'URL test erreur" (ajoute debugPdfFail=1).

## v0.6.31
- PDF : si debugPdfSlow=1 est actif, badge discret "Mode test PDF lent" dans l'onglet PDF.

## v0.6.30
- PDF : dans le bloc "Aide PDF", bouton "Copier l'URL de test" (ajoute automatiquement debugPdfSlow=1).

## v0.6.25
- Au retour dans l'onglet pendant un export PDF : affiche "Reprise..." + met en évidence l'étape en cours ~1 s.

## v0.6.22
- PDF : si le 2e message "Toujours en cours..." s'affiche, ajoute une astuce courte "laisse l'app ouverte (pas de changement d'onglet)".

## v0.6.21
- PDF : après le message "Ça prend un peu plus de temps...", affiche une mini estimation ("En général : 3-6 secondes.").

## v0.6.20
- PDF : si "Encore 1 seconde..." est affiché et que la micro-cooldown se termine, bascule immédiatement sur "Prêt".

## v0.6.19
- PDF : si clic pendant la micro-cooldown, affiche "Encore 1 seconde..." (sans relancer l'export), puis retour à l’état normal.

## v0.6.18
- PDF : après succès ou annulation, micro-cooldown ~1 s (anti double-clic Safari).

## v0.6.17
- Feedback après export PDF réussi : affiche "PDF téléchargé" ~1,5 s.

## v0.6.16
- PDF : si la génération dépasse ~8-10 s, affiche un 2e message rassurant "Toujours en cours..." (Annuler reste visible).

## v0.6.15
- PDF : si l'utilisateur annule, masque immédiatement le message "Ça prend un peu plus de temps..." (et annule le timer pour éviter qu'il re-apparaisse).

## v0.6.14
- PDF : après clic sur "Annuler", affiche "Export annulé" (~1,5 s), puis retour à l’état normal.

## v0.6.13
- PDF : si la génération dépasse ~3-4 s, affiche un message rassurant ("Ça prend un peu plus de temps...").
- PDF : micro-yields pendant la génération pour garder l'UI réactive (message + Annuler visibles).

## v0.6.12
- PDF : ajout d'une micro progression (Étape 1/2 -> 2/2) pendant la génération.
- PDF : ajout du bouton "Annuler" (annule l'UI et évite le téléchargement si la génération finit).
