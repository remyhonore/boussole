---
name: boussole-dev-js-pwa
description: Développer, modifier ou déboguer du code pour l'application Boussole (app.myboussole.fr).
---

# Skill : Développement App Boussole (PWA Vanilla JS)

L'app Boussole est une PWA vanilla JavaScript, privacy-first, avec données stockées uniquement en localStorage.

---

## 0. Avant tout code

1. Vérifier les ADR actifs dans Notion (page 02)
2. Vérifier le feature-framework (page 06)
3. Vérifier la roadmap produit (page 18)
4. Checker le code existant sur GitHub : github.com/remyhonore/boussole

---

## 1. Stack technique
```
Langage        : Vanilla JavaScript (ES6+), HTML5, CSS3
Stockage       : localStorage uniquement (privacy-first)
PDF            : jsPDF (window.jspdf.jsPDF)
Graphiques     : Chart.js
Déploiement    : Vercel (auto-deploy sur git push origin main)
Repo app       : github.com/remyhonore/boussole
Dev local      : ~/Projects/boussole
SW en prod     : v8.31 (17/03/2026)
```

---

## 2. Workflow obligatoire — 2 blocs séparés

Bloc 1 — TERMINAL : cd ~/Projects/boussole && claude
Bloc 2 — CLAUDE CODE : [le prompt]

Pour git simple → commande TERMINAL directe (économie crédits API).

---

## 3. Règles git

Format commit : [type]: [description courte en français]
Types : fix, feat, style, refactor, docs, chore

---

## 4. Service Worker — règles de versioning

- Incrémenter CACHE_NAME à chaque déploiement : boussole-vX.Y
- X = version majeure, Y = patch

---

## 4b. Règle 13 — Bump SW obligatoire dans le même prompt (17/03/2026)

RÈGLE ABSOLUE : tout prompt qui modifie app.js, pdf_consultation.js, pdf_enrichi_v2.js ou index.html doit inclure à la fin :

"À la fin, incrémente CACHE_NAME dans sw.js (boussole-vX.Y → boussole-vX.Y+1) et le label version dans le footer de index.html. Inclus sw.js et index.html dans le même commit que les autres fichiers modifiés."

❌ Ne jamais laisser sw.js ou index.html en "Changes not staged" après un commit de code.
✅ Vérification : git status ne doit pas montrer sw.js ou index.html comme "modified".

---

## 5. localStorage — conventions

Clés standards :
- boussole_entries_YYYY-MM-DD : saisie quotidienne
- boussole_post_consultation_YYYY-MM-DD : fiche post-consultation
- boussole_mesures_YYYY-MM-DD : mesures objectives
- boussole_param-* : paramètres utilisateur

Jamais de transmission réseau des données de santé.

---

## 6. jsPDF — encodage Latin-1 obligatoire

Remplacer tous les caractères Unicode :
→ devient ->
- devient -
⚠️ devient /!\
≥ devient >=
≤ devient <=

Police : Helvetica uniquement.

Points publics à préserver : window.generatePDF, window.downloadPDF, window.generatePDFPreview

---

## 7. Palette couleurs (ADR-2026-027)

--forest      : #2d6a4f   (couleur primaire unique)
--forest-dark : #1e4d38
--navy        : #06172D
--surface     : #F8F6F0

---

## 8. Fichiers clés

app.js              — Logique principale, localStorage, UI
sw.js               — Service Worker, versioning cache
pdf_enrichi_v2.js   — Export PDF 30j (Chart.js, corrélations)
pdf_consultation.js — Export PDF consultation 1 page
index.html          — Structure app, footer version

Règle : ne jamais modifier pdf_enrichi_v2.js et pdf_consultation.js dans la même session sans vérification croisée.

---

## 9. Anti-régression — checklist avant tout commit touchant app.js ou index.html

1. Tous les scripts sont listés dans index.html (daytype.js, pem_detector.js, cycle_tracker.js, calc.js)
2. Sections TYPE DE JOURNÉES et calendrier 14j présentes dans refreshSummary()
3. Sections TYPE DE JOURNÉES et QUESTIONS A POSER présentes dans pdf_consultation.js
4. sw.js et index.html bumpés et inclus dans le commit (Règle 13)

---
