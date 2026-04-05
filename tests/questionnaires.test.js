/**
 * Tests unitaires — questionnaires.js
 * Couvre : SCALES, interpret, stockage, getLastResult, exportPourPDF
 */

const Q = require('../questionnaires.js');

beforeEach(() => {
  localStorage.clear();
});

// ===== SCALES =====

describe('Questionnaires — SCALES définitions', () => {

  test('PHQ-9 existe avec 9 items', () => {
    expect(Q.SCALES['PHQ-9']).toBeDefined();
    expect(Q.SCALES['PHQ-9'].items.length).toBe(9);
    expect(Q.SCALES['PHQ-9'].maxScore).toBe(27);
  });

  test('GAD-7 existe avec 7 items', () => {
    expect(Q.SCALES['GAD-7']).toBeDefined();
    expect(Q.SCALES['GAD-7'].items.length).toBe(7);
    expect(Q.SCALES['GAD-7'].maxScore).toBe(21);
  });

  test('PCFS existe', () => {
    expect(Q.SCALES['PCFS']).toBeDefined();
  });
});

// ===== interpret =====

describe('Questionnaires — PHQ-9 interpret', () => {

  var interpret = Q.SCALES['PHQ-9'].interpret;

  test('score 0-4 = minimal (vert)', () => {
    var r = interpret(3);
    expect(r.level).toBe('minimal');
    expect(r.color).toBe('#2d6a4f');
  });

  test('score 5-9 = léger', () => {
    expect(interpret(7).level).toBe('leger');
  });

  test('score 10-14 = modéré', () => {
    expect(interpret(12).level).toBe('modere');
  });

  test('score 15-19 = modérément sévère', () => {
    expect(interpret(17).level).toBe('modere-severe');
  });

  test('score 20+ = sévère', () => {
    expect(interpret(24).level).toBe('severe');
  });
});

describe('Questionnaires — GAD-7 interpret', () => {

  var interpret = Q.SCALES['GAD-7'].interpret;

  test('score 0-4 = minimal', () => {
    expect(interpret(2).level).toBe('minimal');
  });

  test('score 15+ = sévère', () => {
    expect(interpret(18).level).toBe('severe');
  });
});

// ===== getLastResult =====

describe('Questionnaires — getLastResult', () => {

  test('retourne null si aucun résultat', () => {
    expect(Q.getLastResult('PHQ-9')).toBeNull();
  });

  test('retourne le résultat le plus récent', () => {
    localStorage.setItem('boussole_q_PHQ-9_2026-03-01', JSON.stringify({ date: '2026-03-01', scale: 'PHQ-9', score: 8, answers: [], ts: 1000 }));
    localStorage.setItem('boussole_q_PHQ-9_2026-03-15', JSON.stringify({ date: '2026-03-15', scale: 'PHQ-9', score: 12, answers: [], ts: 2000 }));
    var result = Q.getLastResult('PHQ-9');
    expect(result).not.toBeNull();
    expect(result.date).toBe('2026-03-15');
    expect(result.score).toBe(12);
  });
});

// ===== exportPourPDF =====

describe('Questionnaires — exportPourPDF', () => {

  test('retourne tableau vide si aucun résultat', () => {
    var r = Q.exportPourPDF();
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(0);
  });

  test('inclut les résultats existants avec interprétation', () => {
    localStorage.setItem('boussole_q_PHQ-9_2026-04-01', JSON.stringify({ date: '2026-04-01', scale: 'PHQ-9', score: 14, answers: [], ts: 1000 }));
    localStorage.setItem('boussole_q_GAD-7_2026-04-01', JSON.stringify({ date: '2026-04-01', scale: 'GAD-7', score: 6, answers: [], ts: 1000 }));
    var r = Q.exportPourPDF();
    expect(r.length).toBe(2);
    var phq = r.find(function(x) { return x.scale === 'PHQ-9'; });
    expect(phq.score).toBe(14);
    expect(phq.label).toBe('Modéré');
  });
});
