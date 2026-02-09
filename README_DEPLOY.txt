Boussole v0.5.0 — Déploiement local

1) Ouvrir l’app
- Ouvre "index.html" (racine) → page d’accueil (bouton “Tester la démo” → /app/)
- Ou ouvre directement /app/index.html

Astuce : dans “Aujourd’hui”, le bouton “Reprendre les dernières valeurs” pré-remplit les curseurs avec la dernière entrée enregistrée.

2) Mode diagnostic (100% local)
- Bouton "Exporter diagnostic" : télécharge un JSON (version, navigateur, réglages, erreurs récentes)
- Réglages : bouton "Copier diagnostic (JSON)" : copie le JSON dans le presse‑papiers (pratique pour coller dans un email)
- Bouton "Signaler un bug (avec erreurs)" : ouvre un email pré-rempli en ajoutant les erreurs locales (rien n’est envoyé automatiquement)
- Option "Inclure les données" : OFF par défaut ; si ON → 20 dernières entrées anonymisées (date + scores)
- Réglages : indicateur “Erreurs locales : X” + bouton “Voir” (liste copiable des 20 dernières erreurs)
- Bouton "Réinitialiser uniquement le diagnostic" : efface les erreurs locales + remet “Inclure les données” à OFF

3) Données
- Stockées uniquement dans le navigateur (localStorage). Aucun compte. Aucun envoi.

Note : le dossier /cgi-bin est laissé uniquement pour compatibilité d’arborescence (non utilisé en données locales).
