# RELEASE GUIDE — Boussole (Étape A)

## Déclencher une release (UI GitHub)
1) Ouvrir `NEXT_OBJECTIVE.md`
2) Remplir :
- READY: yes
- TARGET_VERSION: (laisser vide = bump patch auto)
- ## Objectif (1 idée) : 1 seule puce
3) Commit sur `main`

## Vérifier que c’est OK
1) Actions → dernier run → doit être vert
2) Summary → Artifacts : `boussole-vX.Y.Z-full`
3) Releases : `Boussole vX.Y.Z` avec `boussole-vX.Y.Z-full.zip`

## Résultats attendus dans le repo
- `NEXT_OBJECTIVE.md` repasse en `READY: no`
- `VERSION.txt` mis à jour
- `CHANGELOG.md` mis à jour
- Aucun dossier `dist/` committé

## Règles
- 1 idée par version
- Packaging/release uniquement (pas de feature dans l’automation)
