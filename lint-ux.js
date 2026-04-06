#!/usr/bin/env node
/**
 * Boussole — Lint UX
 * Vérifie les conventions visuelles avant chaque commit.
 * Exécuté automatiquement par `npm test`.
 *
 * Règles :
 *  0. Syntaxe JS valide (node -c)
 *  1. font-size interdit : rem (dans les .js). px autorisés (DS v2).
 *  2. Couleurs hex interdites : #999, #aaa, #4b5563, #1a2332
 *  3. Inline section-title : font-size:11px;font-weight:700;text-transform:uppercase
 *  4. Inline section-card : border-radius:12px;padding:14px;margin-bottom:12px
 */

const fs = require('fs');
const { execSync } = require('child_process');

const JS_FILES = fs.readdirSync('.').filter(f =>
  f.endsWith('.js') &&
  !f.startsWith('_') &&
  !f.endsWith('.test.js') &&
  f !== 'lint-ux.js' &&
  f !== 'sw.js'
);

let errors = 0;

// === RÈGLE 1 : font-size interdit (rem uniquement — px autorisés depuis DS v2) ===
const FONT_SIZE_BANNED = /font-size\s*:\s*[0-9.]+rem/g;
// Exceptions : margin, padding, width, height (faux positifs du grep)
const FONT_SIZE_CONTEXT = /font-size/;

// === RÈGLE 2 : couleurs hex interdites ===
const COLORS_BANNED = [
  { hex: '#999',    re: /#999(?![0-9a-fA-F])/g,  replacement: 'rgba(6,23,45,.42)' },
  { hex: '#aaa',    re: /#aaa(?![0-9a-fA-F])/g,  replacement: 'rgba(6,23,45,.42)' },
  { hex: '#4b5563', re: /#4b5563/g,               replacement: 'rgba(6,23,45,.55)' },
  { hex: '#1a2332', re: /#1a2332/g,               replacement: '#06172D' },
];

// === RÈGLE 3 : inline section-title ===
const INLINE_SECTION_TITLE = /font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:\.08em;/g;

// === RÈGLE 4 : inline section-card ===
const INLINE_SECTION_CARD = /border-radius:12px;padding:14px;margin-bottom:12px;/g;

function check(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const lineCtx = `${file}:${lineNum}`;

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // R1: font-size interdit
    if (FONT_SIZE_CONTEXT.test(line)) {
      let m;
      FONT_SIZE_BANNED.lastIndex = 0;
      while ((m = FONT_SIZE_BANNED.exec(line)) !== null) {
        console.error(`  ❌ R1 font-size interdit: ${m[0]}  →  ${lineCtx}`);
        errors++;
      }
    }

    // R2: couleurs interdites
    COLORS_BANNED.forEach(c => {
      c.re.lastIndex = 0;
      if (c.re.test(line)) {
        console.error(`  ❌ R2 couleur interdite: ${c.hex} → utiliser ${c.replacement}  →  ${lineCtx}`);
        errors++;
      }
    });

    // R3: inline section-title
    INLINE_SECTION_TITLE.lastIndex = 0;
    if (INLINE_SECTION_TITLE.test(line)) {
      console.error(`  ❌ R3 inline section-title: utiliser class="section-title"  →  ${lineCtx}`);
      errors++;
    }

    // R4: inline section-card
    INLINE_SECTION_CARD.lastIndex = 0;
    if (INLINE_SECTION_CARD.test(line)) {
      console.error(`  ❌ R4 inline section-card: utiliser class="section-card"  →  ${lineCtx}`);
      errors++;
    }
  });
}

// === EXÉCUTION ===
console.log(`\n🔍 Lint UX — ${JS_FILES.length} fichiers JS\n`);

// R0: Syntaxe JS valide
JS_FILES.forEach(file => {
  try {
    execSync(`node -c ${file}`, { stdio: 'pipe' });
  } catch (e) {
    const msg = e.stderr ? e.stderr.toString().split('\n')[0] : 'SyntaxError';
    console.error(`  ❌ R0 syntaxe invalide: ${file} — ${msg}`);
    errors++;
  }
});

// R1-R4: Conventions visuelles
JS_FILES.forEach(check);

if (errors === 0) {
  console.log('✅ Lint UX : 0 violation\n');
  process.exit(0);
} else {
  console.error(`\n❌ Lint UX : ${errors} violation(s) détectée(s)\n`);
  process.exit(1);
}
