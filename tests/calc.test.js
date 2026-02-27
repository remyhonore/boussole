/**
 * Boussole+ v1.0 - Tests automatisés calc_v1
 * Utiliser avec Jest ou Vitest
 * 
 * Pour exécuter : npm test
 */

// Import des fonctions (adapter selon l'environnement de test)
// const { calculateSummary, calculateDayScore, DATASET_REF } = require('../calc.js');

/**
 * Tests avec DATASET_REF
 */
describe('calc_v1 - Dataset de référence', () => {
  
  test('Dataset contient 7 entrées', () => {
    expect(DATASET_REF.length).toBe(7);
  });
  
  test('Qualité données : < 5 jours insuffisant', () => {
    const subset = DATASET_REF.slice(0, 3); // 3 entrées
    const result = calculateSummary(subset, 14);
    expect(result.status).toBe('insufficient');
    expect(result.statusMessage).toContain('Données insuffisantes');
  });
  
  test('Qualité données : ≥ 5 jours OK', () => {
    const result = calculateSummary(DATASET_REF, 14);
    expect(result.status).toBe('ok');
    expect(result.statusMessage).toBeNull();
  });
  
  test('Moyennes calculées correctement', () => {
    const result = calculateSummary(DATASET_REF, 14);
    
    // Calcul manuel :
    // energie: (4+5+7+6+3+5+7)/7 = 37/7 = 5,29 → arrondi 5
    // sommeil: (4+5+7+6+4+6+7)/7 = 39/7 = 5,57 → arrondi 6
    // douleurs: (6+5+2+3+9+4+2)/7 = 31/7 = 4,43 → arrondi 4
    
    expect(result.energie.moyenne).toBe(5);
    expect(result.qualite_sommeil.moyenne).toBe(6);
    expect(result.douleurs.moyenne).toBe(4);
  });
  
  test('Tendances définies', () => {
    const result = calculateSummary(DATASET_REF, 14);
    
    expect(result.energie.tendance).toBeDefined();
    expect(result.qualite_sommeil.tendance).toBeDefined();
    expect(result.douleurs.tendance).toBeDefined();
    
    // Vérifier que ce sont des valeurs valides
    const validTrends = [
      'plutôt en amélioration',
      'plutôt en baisse',
      'plutôt stable',
      'plutôt fluctuant',
      'données insuffisantes'
    ];
    
    expect(validTrends).toContain(result.energie.tendance);
    expect(validTrends).toContain(result.qualite_sommeil.tendance);
    expect(validTrends).toContain(result.douleurs.tendance);
  });
  
  test('Variations détectées', () => {
    const result = calculateSummary(DATASET_REF, 14);
    
    // Il devrait y avoir au moins 1 variation
    // (07/02 a un score très différent de 05/02)
    expect(result.variations.length).toBeGreaterThan(0);
    
    // Vérifier la structure
    if (result.variations.length > 0) {
      const v = result.variations[0];
      expect(v.date).toBeDefined();
      expect(v.dateRef).toBeDefined();
      expect(v.scoreJ).toBeDefined();
      expect(v.scoreJMinus1).toBeDefined();
      expect(v.type).toMatch(/amélioration|chute/);
    }
  });
  
  test('Points marquants présents', () => {
    const result = calculateSummary(DATASET_REF, 14);
    
    expect(result.pointsMarquants).toBeDefined();
    expect(result.pointsMarquants.meilleurJour).toBeDefined();
    expect(result.pointsMarquants.jourLePlusBas).toBeDefined();
    
    // Meilleur jour devrait avoir un score
    expect(result.pointsMarquants.meilleurJour.date).toBeDefined();
    expect(result.pointsMarquants.meilleurJour.score).toBeGreaterThan(0);
    
    // Jour le plus bas devrait avoir un score
    expect(result.pointsMarquants.jourLePlusBas.date).toBeDefined();
    expect(result.pointsMarquants.jourLePlusBas.score).toBeGreaterThan(0);
  });
  
  test('Notes triées par date décroissante', () => {
    const result = calculateSummary(DATASET_REF, 14);
    
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.length).toBeLessThanOrEqual(3);
    
    // Vérifier ordre décroissant
    for (let i = 1; i < result.notes.length; i++) {
      expect(result.notes[i-1].date >= result.notes[i].date).toBe(true);
    }
  });
  
  test('Notes contiennent uniquement celles avec texte', () => {
    const result = calculateSummary(DATASET_REF, 14);
    
    result.notes.forEach(n => {
      expect(n.note).toBeTruthy();
      expect(n.note.trim()).not.toBe('');
    });
  });
  
});

/**
 * Tests unitaires des fonctions de calcul
 */
describe('calc_v1 - Fonctions unitaires', () => {
  
  test('calculateDayScore avec tous les curseurs', () => {
    const entry = { energie: 5, qualite_sommeil: 7, douleurs: 3 };
    const score = calculateDayScore(entry);
    expect(score).toBe((5 + 7 + 3) / 3);
  });
  
  test('calculateDayScore avec 2 curseurs', () => {
    const entry = { energie: 6, qualite_sommeil: null, douleurs: 4 };
    const score = calculateDayScore(entry);
    expect(score).toBe((6 + 4) / 2);
  });
  
  test('calculateDayScore avec 1 curseur', () => {
    const entry = { energie: null, qualite_sommeil: 8, douleurs: null };
    const score = calculateDayScore(entry);
    expect(score).toBe(8);
  });
  
  test('calculateDayScore sans curseur', () => {
    const entry = { energie: null, qualite_sommeil: null, douleurs: null };
    const score = calculateDayScore(entry);
    expect(score).toBeNull();
  });
  
});

/**
 * Tests de reproductibilité
 */
describe('calc_v1 - Reproductibilité', () => {
  
  test('Résultats identiques sur plusieurs exécutions', () => {
    const result1 = calculateSummary(DATASET_REF, 14);
    const result2 = calculateSummary(DATASET_REF, 14);
    const result3 = calculateSummary(DATASET_REF, 14);
    
    // Moyennes identiques
    expect(result1.energie.moyenne).toBe(result2.energie.moyenne);
    expect(result2.energie.moyenne).toBe(result3.energie.moyenne);
    
    expect(result1.qualite_sommeil.moyenne).toBe(result2.qualite_sommeil.moyenne);
    expect(result2.qualite_sommeil.moyenne).toBe(result3.qualite_sommeil.moyenne);
    
    expect(result1.douleurs.moyenne).toBe(result2.douleurs.moyenne);
    expect(result2.douleurs.moyenne).toBe(result3.douleurs.moyenne);
    
    // Tendances identiques
    expect(result1.energie.tendance).toBe(result2.energie.tendance);
    expect(result2.energie.tendance).toBe(result3.energie.tendance);
    
    // Nombre de variations identique
    expect(result1.variations.length).toBe(result2.variations.length);
    expect(result2.variations.length).toBe(result3.variations.length);
  });
  
});

/**
 * Tests de robustesse
 */
describe('calc_v1 - Robustesse', () => {
  
  test('Gère les entrées vides', () => {
    const result = calculateSummary([], 14);
    expect(result.status).toBe('insufficient');
    expect(result.joursRenseignes).toBe(0);
    expect(result.energie.moyenne).toBeNull();
  });
  
  test('Gère les données partielles', () => {
    const partial = [
      { date: '2026-02-01', energie: 5, qualite_sommeil: null, douleurs: null },
      { date: '2026-02-02', energie: null, qualite_sommeil: 6, douleurs: null },
      { date: '2026-02-03', energie: null, qualite_sommeil: null, douleurs: 4 }
    ];
    
    const result = calculateSummary(partial, 14);
    expect(result.status).toBe('insufficient');
    expect(result.energie.moyenne).toBe(5);
    expect(result.qualite_sommeil.moyenne).toBe(6);
    expect(result.douleurs.moyenne).toBe(4);
  });
  
});

/**
 * Configuration Jest/Vitest
 * 
 * Pour exécuter ces tests, créer un fichier package.json avec :
 * 
 * {
 *   "scripts": {
 *     "test": "jest"
 *   },
 *   "devDependencies": {
 *     "jest": "^29.0.0"
 *   }
 * }
 * 
 * Puis : npm install && npm test
 */
