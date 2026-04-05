/**
 * Tests unitaires — symptom_tree.js
 * Couvre : PISTES, DOMAINS, computeScores, stockage, exportPourPDF
 */

const ST = require('../symptom_tree.js');

beforeEach(() => {
  localStorage.clear();
});

// ===== Structure =====

describe('SymptomTree — PISTES et DOMAINS', () => {

  test('6 pistes cliniques définies', () => {
    expect(Object.keys(ST._PISTES).length).toBe(6);
  });

  test('7 domaines de questions', () => {
    expect(ST._DOMAINS.length).toBe(7);
  });

  test('chaque piste a label, color, suggest', () => {
    Object.values(ST._PISTES).forEach(function(p) {
      expect(p.label).toBeDefined();
      expect(p.color).toBeDefined();
      expect(p.suggest).toBeDefined();
    });
  });

  test('chaque domaine a un id, label et items', () => {
    ST._DOMAINS.forEach(function(d) {
      expect(d.id).toBeDefined();
      expect(d.label).toBeDefined();
      expect(d.items.length).toBeGreaterThan(0);
    });
  });
});

// ===== computeScores =====

describe('SymptomTree — computeScores', () => {

  test('scores à zéro si toutes réponses vides', () => {
    var r = ST._computeScores({});
    r.forEach(function(s) { expect(s.pct).toBe(0); });
  });

  test('résultats triés par pct décroissant', () => {
    var answers = { fatigue_0: 3, ortho_0: 1 };
    var r = ST._computeScores(answers);
    for (var i = 1; i < r.length; i++) {
      expect(r[i].pct).toBeLessThanOrEqual(r[i-1].pct);
    }
  });

  test('fatigue max → EMSFC en tête', () => {
    var answers = { fatigue_0: 3, fatigue_1: 3, fatigue_2: 3, fatigue_3: 3 };
    var r = ST._computeScores(answers);
    expect(r[0].id).toBe('EMSFC');
    expect(r[0].pct).toBeGreaterThan(0);
  });

  test('ortho max → POTS en tête', () => {
    var answers = { ortho_0: 3, ortho_1: 3, ortho_2: 3 };
    var r = ST._computeScores(answers);
    expect(r[0].id).toBe('POTS');
  });

  test('douleurs max → FIBRO en tête', () => {
    var answers = { douleurs_0: 3, douleurs_1: 3, douleurs_2: 3 };
    var r = ST._computeScores(answers);
    expect(r[0].id).toBe('FIBRO');
  });

  test('retourne 6 résultats (un par piste)', () => {
    var r = ST._computeScores({ fatigue_0: 2 });
    expect(r.length).toBe(6);
  });
});

// ===== Stockage =====

describe('SymptomTree — stockage et export', () => {

  test('getLastResult null si vide', () => {
    expect(ST.getLastResult()).toBeNull();
  });

  test('exportPourPDF null si vide', () => {
    expect(ST.exportPourPDF()).toBeNull();
  });

  test('getLastResult retourne le plus récent', () => {
    localStorage.setItem('boussole_symptom_tree_2026-03-01',
      JSON.stringify({ date: '2026-03-01', results: [{ id: 'EMSFC', pct: 80, raw: 20, max: 25 }] }));
    localStorage.setItem('boussole_symptom_tree_2026-04-01',
      JSON.stringify({ date: '2026-04-01', results: [{ id: 'POTS', pct: 60, raw: 12, max: 20 }] }));
    var r = ST.getLastResult();
    expect(r.date).toBe('2026-04-01');
  });

  test('exportPourPDF retourne les top pistes', () => {
    localStorage.setItem('boussole_symptom_tree_2026-04-01',
      JSON.stringify({ date: '2026-04-01', results: [
        { id: 'EMSFC', pct: 85, raw: 20, max: 25 },
        { id: 'POTS', pct: 60, raw: 12, max: 20 },
        { id: 'FIBRO', pct: 30, raw: 6, max: 20 },
        { id: 'MCAS', pct: 0, raw: 0, max: 15 }
      ]}));
    var r = ST.exportPourPDF();
    expect(r).not.toBeNull();
    expect(r.date).toBe('2026-04-01');
    expect(r.pistes.length).toBe(3); // top 3 avec pct > 0
    expect(r.pistes[0].short).toBe('EM/SFC');
  });
});
