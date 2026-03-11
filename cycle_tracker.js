/**
 * Boussole — Cycle Tracker
 * Corrélation cycle hormonal / scores de bien-être
 * ADR-2026-023 — Feature A Phase 2
 */

window.getCyclePhaseLabel = function(phaseKey) {
  var labels = {
    folliculaire: 'Folliculaire',
    ovulation: 'Ovulation',
    luteale: 'Lutéale',
    menstruation: 'Règles',
    perimenopause: 'Irrégulier'
  };
  return labels[phaseKey] || phaseKey;
};

window.getCyclePhaseColor = function(phaseKey) {
  var colors = {
    menstruation: '#e88ca5',
    folliculaire: '#7bc89b',
    ovulation: '#f0c75e',
    luteale: '#b088c9',
    perimenopause: '#a0a0a0'
  };
  return colors[phaseKey] || '#cccccc';
};

window.collectCycleData = function(days, mesures, windowDays) {
  var phases = {
    folliculaire: [],
    ovulation: [],
    luteale: [],
    menstruation: [],
    perimenopause: []
  };

  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));
  var cutoffStr = cutoff.toISOString().split('T')[0];

  days.forEach(function(d) {
    if (d.date < cutoffStr) return;
    var key = 'boussole_mesures_' + d.date;
    var mesure = mesures[key];
    if (!mesure) return;
    var phase = mesure.cycle_phase;
    if (!phase || phase === 'aucun') return;
    if (phases.hasOwnProperty(phase)) {
      phases[phase].push(d.score);
    }
  });

  return phases;
};

window.analyzeCycleCorrelation = function(phaseScores) {
  var result = {};
  var validPhases = [];

  Object.keys(phaseScores).forEach(function(phase) {
    var scores = phaseScores[phase];
    if (scores.length < 3) return;

    var sum = scores.reduce(function(a, b) { return a + b; }, 0);
    var avg = sum / scores.length;
    var joursRouges = scores.filter(function(s) { return s < 4; }).length;
    var joursVerts = scores.filter(function(s) { return s >= 7; }).length;

    result[phase] = {
      avg: avg,
      count: scores.length,
      joursRouges: joursRouges,
      joursVerts: joursVerts
    };
    validPhases.push(phase);
  });

  if (validPhases.length < 2) return null;

  var phaseMin = validPhases[0];
  var phaseMax = validPhases[0];

  validPhases.forEach(function(phase) {
    if (result[phase].avg < result[phaseMin].avg) phaseMin = phase;
    if (result[phase].avg > result[phaseMax].avg) phaseMax = phase;
  });

  var delta = result[phaseMax].avg - result[phaseMin].avg;
  var significant = delta >= 1.5;

  return {
    phases: result,
    phaseMin: phaseMin,
    phaseMax: phaseMax,
    delta: delta,
    significant: significant
  };
};
