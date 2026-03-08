#!/usr/bin/env node
/**
 * validate-articles.js — Boussole
 * Valide articles.json avant chaque push en prod.
 * Usage : node validate-articles.js [chemin/vers/articles.json]
 * Hook   : déclenché automatiquement par .git/hooks/pre-commit
 *
 * Schéma attendu par article :
 * {
 *   id       : number (unique)
 *   slug     : string (unique, kebab-case)
 *   date     : string YYYY-MM-DD
 *   title    : string
 *   excerpt  : string (>30 chars recommandé)
 *   cover    : string commençant par /img/, extension .jpg|.jpeg|.png|.webp
 *   category : string parmi VALID_CATEGORIES
 *   access   : "public" | "inscrit"
 *   readtime : number (minutes)
 *   content  : string (optionnel pour accès inscrit)
 * }
 */

const fs = require("fs");
const path = require("path");

const ARTICLES_PATH    = process.argv[2] || path.join(__dirname, "articles.json");
const REQUIRED_FIELDS  = ["id", "slug", "date", "title", "excerpt", "cover", "category", "access", "readtime"];
const VALID_ACCESS     = ["public", "inscrit"];
const VALID_CATEGORIES = ["Covid long", "Maladies", "Biologie", "Micronutrition", "Fibromyalgie", "Fatigue", "Sommeil", "Douleur"];
const COVER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const DATE_REGEX       = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_REGEX       = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const C = {
  reset : "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m",
  yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};
const ok   = (msg) => console.log(`  ${C.green}✅${C.reset} ${msg}`);
const err  = (msg) => console.log(`  ${C.red}❌${C.reset} ${msg}`);
const warn = (msg) => console.log(`  ${C.yellow}⚠️ ${C.reset} ${msg}`);
const sep  = ()    => console.log(`${C.dim}${"─".repeat(54)}${C.reset}`);

console.log(`\n${C.bold}${C.cyan}Boussole — Validation articles.json${C.reset}`);
sep();

if (!fs.existsSync(ARTICLES_PATH)) { err(`Fichier introuvable : ${ARTICLES_PATH}`); process.exit(1); }
ok(`Fichier trouvé : ${path.basename(ARTICLES_PATH)}`);

let articles;
try {
  articles = JSON.parse(fs.readFileSync(ARTICLES_PATH, "utf8"));
} catch (e) { err(`JSON invalide : ${e.message}`); process.exit(1); }
ok("JSON valide");

if (!Array.isArray(articles) || articles.length === 0) { err("Doit être un tableau non vide"); process.exit(1); }
ok(`${articles.length} article(s) trouvé(s)`);
sep();

let totalErrors = 0, totalWarns = 0;
const ids = new Set(), slugs = new Set();

for (const article of articles) {
  const label = `Article id:${article.id ?? "?"} — "${String(article.title ?? "sans titre").substring(0, 40)}"`;
  console.log(`\n${C.bold}${label}${C.reset}`);
  let articleErrors = 0;

  // Champs obligatoires
  for (const field of REQUIRED_FIELDS) {
    if (article[field] === undefined || article[field] === null || article[field] === "") {
      err(`Champ obligatoire manquant ou vide : '${field}'`); articleErrors++;
    }
  }

  // id : nombre unique
  if (typeof article.id !== "number") {
    err(`'id' doit être un nombre (reçu : ${typeof article.id})`); articleErrors++;
  } else if (ids.has(article.id)) {
    err(`ID dupliqué : ${article.id}`); articleErrors++;
  } else { ids.add(article.id); }

  // slug : kebab-case unique
  if (article.slug) {
    if (!SLUG_REGEX.test(article.slug)) {
      err(`'slug' invalide : '${article.slug}' — format attendu : kebab-case`); articleErrors++;
    } else if (slugs.has(article.slug)) {
      err(`Slug dupliqué : '${article.slug}'`); articleErrors++;
    } else { slugs.add(article.slug); }
  }

  // date : YYYY-MM-DD
  if (article.date && !DATE_REGEX.test(article.date)) {
    err(`Format date invalide : '${article.date}' — attendu YYYY-MM-DD`); articleErrors++;
  }

  // cover : /img/ + extension valide
  if (article.cover) {
    if (!article.cover.startsWith("/img/")) {
      err(`'cover' doit commencer par '/img/' : '${article.cover}'`); articleErrors++;
    }
    const ext = path.extname(article.cover).toLowerCase();
    if (!COVER_EXTENSIONS.includes(ext)) {
      err(`Extension cover invalide : '${ext}' — attendu : ${COVER_EXTENSIONS.join(", ")}`); articleErrors++;
    }
  }

  // access : public | inscrit
  if (article.access && !VALID_ACCESS.includes(article.access)) {
    err(`'access' invalide : '${article.access}' — valeurs : ${VALID_ACCESS.join(", ")}`); articleErrors++;
  }

  // readtime : nombre positif
  if (article.readtime !== undefined && (typeof article.readtime !== "number" || article.readtime <= 0)) {
    err(`'readtime' doit être un nombre positif (reçu : ${article.readtime})`); articleErrors++;
  }

  // category : connue (warning)
  if (article.category && !VALID_CATEGORIES.includes(article.category)) {
    warn(`Catégorie inconnue : '${article.category}'`); totalWarns++;
  }

  // excerpt court (warning)
  if (article.excerpt && article.excerpt.length < 30) {
    warn(`Excerpt court (${article.excerpt.length} chars)`); totalWarns++;
  }

  // article public sans content (warning)
  if (article.access === "public" && (!article.content || article.content.trim() === "")) {
    warn(`Article public sans 'content'`); totalWarns++;
  }

  if (articleErrors === 0) ok("OK");
  totalErrors += articleErrors;
}

sep();
console.log(`\n${C.bold}Résumé${C.reset}`);
console.log(`  Articles    : ${articles.length}  |  IDs uniques : ${ids.size}  |  Slugs uniques : ${slugs.size}`);
console.log(`  Publics     : ${articles.filter(a => a.access === "public").length}  |  Inscrits : ${articles.filter(a => a.access === "inscrit").length}`);

if (totalErrors === 0 && totalWarns === 0) {
  console.log(`\n${C.green}${C.bold}✅ Tout est propre — push autorisé.${C.reset}\n`);
  process.exit(0);
} else if (totalErrors === 0) {
  console.log(`\n${C.yellow}⚠️  ${totalWarns} avertissement(s) — push autorisé.${C.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${C.red}❌ ${totalErrors} erreur(s) critique(s) — push bloqué.${C.reset}`);
  if (totalWarns > 0) console.log(`${C.yellow}⚠️  ${totalWarns} avertissement(s).${C.reset}`);
  console.log();
  process.exit(1);
}
