/**
 * Boussole+ v1.0 - Moteur de calcul calc_v1
 * Calculs déterministes : tendances, moyennes, points marquants
 */

/**
 * Calcule le score global d'une journée
 * = moyenne des curseurs renseignés
 */
function calculateDayScore(entry) {
  const values = [];
  if (entry.energie !== null && entry.energie !== undefined) values.push(entry.energie);
  if (entry.qualite_sommeil !== null && entry.qualite_sommeil !== undefined) values.push(entry.qualite_sommeil);
  if (entry.douleurs !== null && entry.douleurs !== undefined) values.push(entry.douleurs);
  if (entry.clarte_mentale !== null && entry.clarte_mentale !== undefined) values.push(entry.clarte_mentale);
  
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calcule la moyenne d'un tableau de valeurs
 */
function average(values) {
  const filtered = values.filter(v => v !== null && v !== undefined);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

/**
 * Calcule l'écart-type
 */
function standardDeviation(values) {
  const filtered = values.filter(v => v !== null && v !== undefined);
  if (filtered.length === 0) return 0;
  
  const mean = average(filtered);
  const squareDiffs = filtered.map(v => Math.pow(v - mean, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Détermine la tendance d'un curseur
 */
function calculateTrend(values) {
  // values = tableau de valeurs triées chronologiquement
  const filtered = values.filter(v => v !== null && v !== undefined);
  
  if (filtered.length < 5) {
    return 'données insuffisantes';
  }
  
  // Groupe 1 : 5 premiers jours
  const group1 = filtered.slice(0, 5);
  // Groupe 2 : 5 derniers jours
  const group2 = filtered.slice(-5);
  
  const mean1 = average(group1);
  const mean2 = average(group2);
  const delta = mean2 - mean1;
  
  const sd = standardDeviation(filtered);
  
  // Règles de tendance
  if (delta >= 1.0) return 'plutôt en amélioration';
  if (delta <= -1.0) return 'plutôt en baisse';
  if (sd > 2.0) return 'plutôt fluctuant';
  return 'plutôt stable';
}

/**
 * Détecte les variations importantes
 */
function detectVariations(entries) {
  const variations = [];
  
  for (let i = 1; i < entries.length; i++) {
    const scoreJ = calculateDayScore(entries[i]);
    const scoreJMinus1 = calculateDayScore(entries[i - 1]);
    
    if (scoreJ === null || scoreJMinus1 === null) continue;
    
    const ecart = Math.abs(scoreJ - scoreJMinus1);
    
    if (ecart >= 3.0) {
      variations.push({
        date: entries[i].date,
        dateRef: entries[i - 1].date,
        scoreJ: scoreJ,
        scoreJMinus1: scoreJMinus1,
        ecart: ecart,
        type: scoreJ > scoreJMinus1 ? 'amélioration' : 'chute'
      });
    }
  }
  
  // Retourne les 2 variations les plus récentes
  return variations.slice(-2).reverse();
}

/**
 * Trouve les trous (jours non renseignés consécutifs)
 */
function findGaps(entries, windowDays) {
  if (entries.length === 0) return null;
  
  // Créer un tableau de toutes les dates dans la fenêtre
  const lastDate = new Date(entries[0].date); // Entrées triées par date décroissante
  const allDates = [];
  
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() - i);
    allDates.push(d.toISOString().split('T')[0]);
  }
  
  // Trouver les dates manquantes
  const entriesSet = new Set(entries.map(e => e.date));
  const missingDates = allDates.filter(d => !entriesSet.has(d));
  
  // Trouver les trous de 2+ jours consécutifs
  const gaps = [];
  let currentGap = [];
  
  for (let i = 0; i < missingDates.length; i++) {
    if (currentGap.length === 0) {
      currentGap.push(missingDates[i]);
    } else {
      const lastDate = new Date(currentGap[currentGap.length - 1]);
      const currentDate = new Date(missingDates[i]);
      const diffDays = Math.abs((currentDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentGap.push(missingDates[i]);
      } else {
        if (currentGap.length >= 2) {
          gaps.push([...currentGap]);
        }
        currentGap = [missingDates[i]];
      }
    }
  }
  
  if (currentGap.length >= 2) {
    gaps.push(currentGap);
  }
  
  // Retourner le trou le plus récent
  if (gaps.length === 0) return null;
  
  const mostRecentGap = gaps[0]; // Le premier dans la liste (dates décroissantes)
  return {
    start: mostRecentGap[mostRecentGap.length - 1],
    end: mostRecentGap[0],
    count: mostRecentGap.length
  };
}

/**
 * Calcule le résumé complet sur une fenêtre
 */
function calculateSummary(allEntries, windowDays = 14) {
  // Trier par date décroissante
  const sorted = [...allEntries].sort((a, b) => b.date.localeCompare(a.date));
  
  // Prendre les entrées dans la fenêtre
  const lastDate = sorted.length > 0 ? new Date(sorted[0].date) : new Date();
  const windowStart = new Date(lastDate);
  windowStart.setDate(windowStart.getDate() - windowDays + 1);
  
  const entries = sorted.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= windowStart && entryDate <= lastDate;
  });
  
  // Compter les jours renseignés
  const joursRenseignes = entries.length;
  
  // Vérifier la qualité des données
  let status = 'ok';
  let statusMessage = null;
  
  if (joursRenseignes < 5) {
    status = 'insufficient';
    statusMessage = '⚠️ Données insuffisantes (< 5 jours)\nLes moyennes ci-dessous ont une fiabilité limitée.';
  }
  
  // Trier par date croissante pour les calculs de tendances
  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculer moyennes
  const energieValues = chronological.map(e => e.energie);
  const sommeilValues = chronological.map(e => e.qualite_sommeil);
  const douleursValues = chronological.map(e => e.douleurs);
  const clarteMentaleValues = chronological.map(e => e.clarte_mentale);
  
  const energieMoyenne = average(energieValues);
  const sommeilMoyenne = average(sommeilValues);
  const douleursMoyenne = average(douleursValues);
  const clarteMentaleMoyenne = average(clarteMentaleValues);
  
  // Calculer tendances
  const energieTendance = calculateTrend(energieValues);
  const sommeilTendance = calculateTrend(sommeilValues);
  const douleursTendance = calculateTrend(douleursValues);
  const clarteMentaleTendance = calculateTrend(clarteMentaleValues);
  
  // Détecter variations
  const variations = detectVariations(chronological);
  
  // Points marquants
  let meilleurJour = null;
  let jourLePlusBas = null;
  
  if (entries.length > 0) {
    meilleurJour = chronological.reduce((best, entry) => {
      const scoreBest = calculateDayScore(best);
      const scoreEntry = calculateDayScore(entry);
      if (scoreEntry === null) return best;
      if (scoreBest === null) return entry;
      return scoreEntry > scoreBest ? entry : best;
    });
    
    jourLePlusBas = chronological.reduce((worst, entry) => {
      const scoreWorst = calculateDayScore(worst);
      const scoreEntry = calculateDayScore(entry);
      if (scoreEntry === null) return worst;
      if (scoreWorst === null) return entry;
      return scoreEntry < scoreWorst ? entry : worst;
    });
  }
  
  // Trous
  const gap = findGaps(entries, windowDays);
  
  // Notes
  const notes = entries
    .filter(e => e.note && e.note.trim() !== '')
    .slice(0, 3)
    .map(e => ({ date: e.date, note: e.note }));
  
  return {
    status,
    statusMessage,
    windowDays,
    joursRenseignes,
    totalJours: windowDays,
    lastDate: entries.length > 0 ? entries[0].date : null,
    
    energie: {
      moyenne: energieMoyenne !== null ? Math.round(energieMoyenne) : null,
      tendance: energieTendance
    },
    
    qualite_sommeil: {
      moyenne: sommeilMoyenne !== null ? Math.round(sommeilMoyenne) : null,
      tendance: sommeilTendance
    },
    
    douleurs: {
      moyenne: douleursMoyenne !== null ? Math.round(douleursMoyenne) : null,
      tendance: douleursTendance
    },
    
    clarte_mentale: {
      moyenne: clarteMentaleMoyenne !== null ? Math.round(clarteMentaleMoyenne) : null,
      tendance: clarteMentaleTendance
    },
    
    variations,
    
    pointsMarquants: {
      meilleurJour: meilleurJour ? {
        date: meilleurJour.date,
        score: calculateDayScore(meilleurJour)
      } : null,
      jourLePlusBas: jourLePlusBas ? {
        date: jourLePlusBas.date,
        score: calculateDayScore(jourLePlusBas)
      } : null,
      gap
    },
    
    notes
  };
}

/**
 * Dataset de référence pour les tests
 */
const DATASET_REF = [
  {date:"2026-02-01", energie:4, qualite_sommeil:4, douleurs:6, clarte_mentale:4, note:"Insomnie 2 nuits"},
  {date:"2026-02-02", energie:5, qualite_sommeil:5, douleurs:5, clarte_mentale:5, note:null},
  {date:"2026-02-03", energie:7, qualite_sommeil:7, douleurs:7, clarte_mentale:7, note:"Mieux depuis marche quotidienne"},
  {date:"2026-02-05", energie:6, qualite_sommeil:6, douleurs:6, clarte_mentale:6, note:null},
  {date:"2026-02-07", energie:3, qualite_sommeil:4, douleurs:2, clarte_mentale:3, note:"Crise migraine"},
  {date:"2026-02-08", energie:5, qualite_sommeil:6, douleurs:5, clarte_mentale:5, note:"Mal de tête après écrans"},
  {date:"2026-02-10", energie:7, qualite_sommeil:7, douleurs:7, clarte_mentale:8, note:null}
];
