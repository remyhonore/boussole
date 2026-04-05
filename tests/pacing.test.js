/**
 * Tests unitaires — pacing.js
 * Couvre : MorningPace.calculer, EnergyEnvelope budget/log
 */

var pacing = require('../pacing.js');
var MorningPace = pacing.MorningPace;
var EnergyEnvelope = pacing.EnergyEnvelope;

beforeEach(() => {
  localStorage.clear();
  // Reset ScoreSNA si défini
  delete window.ScoreSNA;
});

// Helper : crée des entrées dans boussole_v1_data
function setEntries(entries) {
  localStorage.setItem('boussole_v1_data', JSON.stringify({ entries: entries }));
}

// ===== MorningPace.calculer =====

describe('MorningPace — calculer', () => {

  test('retourne null sans données', () => {
    expect(MorningPace.calculer()).toBeNull();
  });

  test('score élevé (8/8/8/8) → niveau 4 ou 5', () => {
    setEntries([{ date: '2026-04-05', energie: 8, qualite_sommeil: 8, douleurs: 8, clarte_mentale: 8 }]);
    var r = MorningPace.calculer();
    expect(r).not.toBeNull();
    expect(r.niveau).toBeGreaterThanOrEqual(4);
    expect(r.source).toBe('composite');
  });

  test('score bas (2/2/2/2) → niveau 1 ou 2', () => {
    setEntries([{ date: '2026-04-05', energie: 2, qualite_sommeil: 2, douleurs: 2, clarte_mentale: 2 }]);
    var r = MorningPace.calculer();
    expect(r).not.toBeNull();
    expect(r.niveau).toBeLessThanOrEqual(2);
  });

  test('score moyen (5/5/5/5) → niveau 3', () => {
    setEntries([{ date: '2026-04-05', energie: 5, qualite_sommeil: 5, douleurs: 5, clarte_mentale: 5 }]);
    var r = MorningPace.calculer();
    expect(r).not.toBeNull();
    expect(r.niveau).toBe(3);
    expect(r.blended).toBe(50);
  });

  test('crash 48h baisse le niveau de 1 cran', () => {
    setEntries([{ date: '2026-04-05', energie: 7, qualite_sommeil: 7, douleurs: 7, clarte_mentale: 7 }]);
    // Simuler un événement crash récent
    var now = new Date();
    var yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    var dateStr = yesterday.toISOString().split('T')[0];
    localStorage.setItem('boussole_event_' + dateStr, JSON.stringify({ date: dateStr, type: 'crash-pem' }));
    var r = MorningPace.calculer();
    expect(r).not.toBeNull();
    expect(r.crashRecent).toBe(true);
    // Sans crash, score 70 → niveau 4. Avec crash → niveau 3
    expect(r.niveau).toBe(3);
  });
});

// ===== EnergyEnvelope =====

describe('EnergyEnvelope — budget et log', () => {

  test('getBudget retourne le budget selon le niveau Morning Pace', () => {
    // Niveau 3 (score moyen) → budget 80
    setEntries([{ date: '2026-04-05', energie: 5, qualite_sommeil: 5, douleurs: 5, clarte_mentale: 5 }]);
    var budget = EnergyEnvelope.getBudget();
    expect(budget).toBe(80); // BUDGETS[3] = 80
  });

  test('getBudget retourne 80 par défaut sans données', () => {
    var budget = EnergyEnvelope.getBudget();
    expect(budget).toBe(80); // défaut niveau 3
  });

  test('getUsed retourne 0 si aucune activité loguée', () => {
    var used = EnergyEnvelope.getUsed();
    expect(used).toBe(0);
  });

  test('logActivity ajoute une activité et incrémente getUsed', () => {
    // Le catalogue par défaut a des activités, l'ID 'toilette' coûte 10
    EnergyEnvelope.logActivity('douche');
    var used = EnergyEnvelope.getUsed();
    expect(used).toBeGreaterThan(0);
  });

  test('removeActivity supprime une activité du log', () => {
    EnergyEnvelope.logActivity('douche');
    var usedBefore = EnergyEnvelope.getUsed();
    EnergyEnvelope.removeActivity(0);
    var usedAfter = EnergyEnvelope.getUsed();
    expect(usedAfter).toBeLessThan(usedBefore);
  });

  test('addCustomActivity crée une activité personnalisée', () => {
    var id = EnergyEnvelope.addCustomActivity('Yoga', 15, 'physique', '🧘');
    expect(id).toBeDefined();
    EnergyEnvelope.logActivity(id);
    var used = EnergyEnvelope.getUsed();
    expect(used).toBe(15);
  });

  test('deleteCustomActivity supprime une activité personnalisée', () => {
    var id = EnergyEnvelope.addCustomActivity('TestAct', 20, 'physique', '🏃');
    EnergyEnvelope.deleteCustomActivity(id);
    // Tenter de loguer l'activité supprimée ne devrait rien faire
    EnergyEnvelope.logActivity(id);
    expect(EnergyEnvelope.getUsed()).toBe(0);
  });
});
