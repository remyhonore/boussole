/**
 * BOUSSOLE — Export PDF enrichi v2.0
 *
 * Génère un PDF multi-pages avec :
 * - Graphiques de tendances
 * - Analyses statistiques
 * - Corrélations simples
 * - Notes personnelles
 * - Points à discuter
 *
 * Dépendances :
 * - jsPDF (déjà utilisé)
 * - Chart.js (à ajouter)
 */

// ============================================
// 1. CALCULS STATISTIQUES
// ============================================

function calculerStats(valeurs) {
  // Filtre les valeurs null/undefined
  const vals = valeurs.filter(v => v !== null && v !== undefined);

  if (vals.length === 0) {
    return {
      moyenne: null,
      ecartType: null,
      tendance: 'indéterminée',
      variabilite: 'indéterminée'
    };
  }

  // Moyenne
  const moyenne = vals.reduce((sum, v) => sum + v, 0) / vals.length;

  // Écart-type
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - moyenne, 2), 0) / vals.length;
  const ecartType = Math.sqrt(variance);

  // Tendance (régression linéaire simple)
  let tendance = 'stable';
  if (vals.length >= 5) {
    const n = vals.length;
    const x = Array.from({length: n}, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = vals.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * vals[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.15) tendance = 'en amélioration';
    else if (slope < -0.15) tendance = 'en baisse';
    else tendance = 'stable';
  }

  // Variabilité
  let variabilite = 'faible';
  if (ecartType > 2.0) variabilite = 'élevée';
  else if (ecartType > 1.2) variabilite = 'modérée';

  return {
    moyenne: Math.round(moyenne * 10) / 10,
    ecartType: Math.round(ecartType * 10) / 10,
    tendance,
    variabilite
  };
}

// ============================================
// 2. DÉTECTION CORRÉLATIONS
// ============================================

function detecterCorrelations(entrees) {
  const correlations = [];

  // Corrélation sommeil → énergie (jour suivant)
  for (let i = 0; i < entrees.length - 1; i++) {
    const e1 = entrees[i];
    const e2 = entrees[i + 1];

    if (e1.sommeil !== null && e2.energie !== null) {
      if (e1.sommeil < 5 && e2.energie < e1.energie - 1) {
        correlations.push({
          pattern: 'Sommeil bas => Énergie baisse le lendemain',
          occurrences: 1
        });
      }
    }
  }

  // Corrélation confort physique ↔ clarté mentale
  let countLowBoth = 0;
  let countTotal = 0;

  entrees.forEach(e => {
    if (e.confort_physique !== null && e.clarte_mentale !== null) {
      countTotal++;
      if (e.confort_physique <= 3 && e.clarte_mentale <= 4) {
        countLowBoth++;
      }
    }
  });

  if (countTotal > 5 && countLowBoth / countTotal > 0.6) {
    correlations.push({
      pattern: 'Confort physique bas => Clarté mentale souvent basse aussi',
      pourcentage: Math.round(100 * countLowBoth / countTotal)
    });
  }

  return correlations;
}

// ============================================
// 3. GÉNÉRATION GRAPHIQUES (Chart.js)
// ============================================

async function genererGraphique(labels, data, titre, couleur) {
  // Créer un canvas temporaire
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 220;
  canvas.style.position = 'fixed';
  canvas.style.top = '-9999px';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'line',
    plugins: [{
      id: 'whiteBackground',
      beforeDraw: (chart) => {
        const ctx = chart.canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
        ctx.restore();
      }
    }],
    data: {
      labels: labels,
      datasets: [{
        label: titre,
        data: data,
        borderColor: couleur,
        backgroundColor: couleur + '20',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: couleur
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { stepSize: 2 }
        },
        x: {
          ticks: {
            maxTicksLimit: 10,
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });

  // Attendre le rendu
  await new Promise(resolve => setTimeout(resolve, 300));

  // Convertir en image base64
  const imgData = canvas.toDataURL('image/jpeg', 0.82);
  document.body.removeChild(canvas);
  return imgData;
}

// ============================================
// 3.5. COLLECTE MESURES OBJECTIVES 30 JOURS
// ============================================

function collectMesures30j() {
  const fcVals = [], taSysVals = [], taDiaVals = [], rmssdVals = [], poidsVals = [];
  let daysWithMesures = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const raw = localStorage.getItem('boussole_mesures_' + dateStr);
    if (!raw) continue;

    let m;
    try { m = JSON.parse(raw); } catch (e) { continue; }

    let hasAny = false;
    if (m.fc !== undefined)     { fcVals.push(m.fc);        hasAny = true; }
    if (m.ta_sys !== undefined) { taSysVals.push(m.ta_sys); hasAny = true; }
    if (m.ta_dia !== undefined) { taDiaVals.push(m.ta_dia); hasAny = true; }
    if (m.rmssd !== undefined)  { rmssdVals.push(m.rmssd);  hasAny = true; }
    if (m.poids !== undefined)  { poidsVals.push(m.poids);  hasAny = true; }
    if (hasAny) daysWithMesures++;
  }

  function _stats(vals) {
    if (vals.length < 3) return null;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    let trend = 'Stable';
    if (vals.length >= 5) {
      const m1 = vals.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const m2 = vals.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const pct = (m2 - m1) / m1 * 100;
      if (pct > 5) trend = 'Hausse';
      else if (pct < -5) trend = 'Baisse';
    }
    return { count: vals.length, avg, min, max, trend };
  }

  return {
    daysWithMesures,
    fc:     _stats(fcVals),
    ta_sys: _stats(taSysVals),
    ta_dia: _stats(taDiaVals),
    rmssd:  _stats(rmssdVals),
    poids:  _stats(poidsVals)
  };
}

// ============================================
// 4. GÉNÉRATION PDF ENRICHI
// ============================================

async function genererPDFEnrichi() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Récupérer les données via loadEntries()
  const data = loadEntries();
  const rawEntries = data.entries || [];

  // Mapper les champs au format attendu
  let entrees = rawEntries.map(e => ({
    date: e.date,
    energie: e.energie,
    sommeil: e.qualite_sommeil,
    confort_physique: e.douleurs,
    clarte_mentale: e.clarte_mentale,
    note: e.note,
    rmssd: e.rmssd ?? null
  }));

  // Trier par date croissante
  entrees.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Filtrer les 30 derniers jours calendaires
  const aujourd_hui = new Date();
  aujourd_hui.setHours(0, 0, 0, 0);
  const cutoff = new Date(aujourd_hui);
  cutoff.setDate(cutoff.getDate() - 29);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  entrees = entrees.filter(e => e.date >= cutoffStr);

  if (entrees.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // Période
  const dateDebut = new Date(entrees[0].date);
  const dateFin = new Date(entrees[entrees.length - 1].date);
  const nbJours = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)) + 1;
  const pctRemplissage = Math.round((entrees.length / nbJours) * 100);

  // ====================================
  // PAGE 1 : VUE D'ENSEMBLE + STATISTIQUES
  // ====================================

  // — Titre principal
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 23, 45);
  doc.text('BOUSSOLE', 105, 20, { align: 'center' });

  // — Sous-titre
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text('Suivi du bien-être quotidien', 105, 28, { align: 'center' });

  // — Ligne de séparation sage
  doc.setDrawColor(110, 135, 125);
  doc.setLineWidth(0.4);
  doc.line(15, 31, 195, 31);
  doc.setLineWidth(0.5);

  // — Période et taux de remplissage
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Période : ${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')} (${nbJours} jours)`, 105, 37, { align: 'center' });
  doc.text(`Jours renseignés : ${entrees.length}/${nbJours} (${pctRemplissage}%)`, 105, 43, { align: 'center' });

  // Préparer données pour graphiques
  const labels = entrees.map(e => new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
  const dataEnergie = entrees.map(e => e.energie);
  const dataSommeil = entrees.map(e => e.sommeil);
  const dataConfort = entrees.map(e => e.confort_physique);
  const dataClarte = entrees.map(e => e.clarte_mentale);
  const dataRmssd = entrees.map(e => e.rmssd).filter(v => v !== null && v !== undefined);

  // Fonctions locales pour PDF
  function pdfMoyenne(arr) {
    const v = arr.filter(x => x !== null && x !== undefined);
    return v.length ? v.reduce((a,b) => a+b, 0) / v.length : null;
  }
  function pdfEcartType(arr) {
    const v = arr.filter(x => x !== null && x !== undefined);
    if (v.length < 2) return null;
    const m = pdfMoyenne(v);
    return Math.sqrt(v.reduce((a,b) => a + (b-m)**2, 0) / v.length);
  }
  function pdfTendance(arr) {
    const v = arr.filter(x => x !== null && x !== undefined);
    if (v.length < 5) return 'données insuffisantes';
    const g1 = v.slice(0, 5);
    const g2 = v.slice(-5);
    const m1 = pdfMoyenne(g1), m2 = pdfMoyenne(g2);
    const delta = m2 - m1;
    const sd = pdfEcartType(v);
    if (delta >= 1.0) return 'plutôt en amélioration';
    if (delta <= -1.0) return 'plutôt en baisse';
    if (sd > 2.0) return 'plutôt fluctuant';
    return 'plutôt stable';
  }
  function pdfVariabilite(ecartType) {
    if (ecartType === null) return 'non calculée';
    if (ecartType > 2.5) return 'élevée';
    if (ecartType > 1.5) return 'modérée';
    return 'faible';
  }

  const tendanceEnergie = pdfTendance(dataEnergie);
  const tendanceSommeil = pdfTendance(dataSommeil);
  const tendanceConfort = pdfTendance(dataConfort);
  const tendanceClarte = pdfTendance(dataClarte);
  const sdEnergie = pdfEcartType(dataEnergie);
  const sdSommeil = pdfEcartType(dataSommeil);
  const sdConfort = pdfEcartType(dataConfort);
  const sdClarte = pdfEcartType(dataClarte);

  // TYPE DE JOURNÉES
  let joursHauts = 0, joursMoyens = 0, joursBas = 0;
  entrees.forEach(e => {
    const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale].filter(v => v !== null && v !== undefined);
    if (vals.length === 0) return;
    const score = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    if (score >= 7) joursHauts++;
    else if (score >= 4) joursMoyens++;
    else joursBas++;
  });

  // — Séparateur fin avant score global
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(15, 47, 195, 47);

  // — SCORE GLOBAL
  const moyEnergie = pdfMoyenne(dataEnergie);
  const moySommeil = pdfMoyenne(dataSommeil);
  const moyConfort = pdfMoyenne(dataConfort);
  const moyClarte = pdfMoyenne(dataClarte);
  const moyennesValides = [moyEnergie, moySommeil, moyConfort, moyClarte].filter(v => v !== null);
  const scoreGlobal = moyennesValides.length > 0
    ? moyennesValides.reduce((a, b) => a + b, 0) / moyennesValides.length
    : null;
  const scoreGlobalStr = scoreGlobal !== null
    ? `${(Math.round(scoreGlobal * 10) / 10).toFixed(1)}/10`
    : 'n/a';

  let scoreColor = [244, 67, 54]; // rouge <4
  if (scoreGlobal !== null) {
    if (scoreGlobal >= 7) scoreColor = [76, 175, 80];       // vert ≥7
    else if (scoreGlobal >= 4) scoreColor = [255, 152, 0];  // orange 4–6.9
  }

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(scoreGlobalStr, 105, 60, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text('Score composite \u2014 moyenne des 4 indicateurs', 105, 68, { align: 'center' });

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(15, 73, 195, 73);

  let yPos = 80;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TYPE DE JOURNÉES', 15, yPos);
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const pctHauts  = Math.round((joursHauts  / entrees.length) * 100);
  const pctMoyens = Math.round((joursMoyens / entrees.length) * 100);
  const pctBas    = Math.round((joursBas    / entrees.length) * 100);

  // Jours hauts
  doc.setFillColor(76, 175, 80);
  doc.rect(20, yPos - 3, 4, 4, 'F');
  doc.setTextColor(34, 139, 34);
  doc.text(`Jours hauts (vert) : ${joursHauts} (${pctHauts}%)`, 27, yPos);
  yPos += 5;

  // Jours moyens
  doc.setFillColor(255, 152, 0);
  doc.rect(20, yPos - 3, 4, 4, 'F');
  doc.setTextColor(255, 140, 0);
  doc.text(`Jours moyens (orange) : ${joursMoyens} (${pctMoyens}%)`, 27, yPos);
  yPos += 5;

  // Jours bas
  doc.setFillColor(244, 67, 54);
  doc.rect(20, yPos - 3, 4, 4, 'F');
  doc.setTextColor(220, 50, 50);
  doc.text(`Jours bas (rouge) : ${joursBas} (${pctBas}%)`, 27, yPos);
  yPos += 10;

  // Synthèse stats — tableau structuré à 4 colonnes
  const statsEnergie = calculerStats(dataEnergie);
  const statsSommeil = calculerStats(dataSommeil);
  const statsConfort = calculerStats(dataConfort);
  const statsClarte = calculerStats(dataClarte);

  const correlations = detecterCorrelations(entrees);

  // Mesures objectives
  const mesures30j = collectMesures30j();
  const hasMesuresSection = mesures30j.daysWithMesures >= 3;

  // Detection PEM (30 jours)
  const days30jPEM = entrees.map(e => {
    const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(v => v !== null && v !== undefined);
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { date: e.date, score };
  }).filter(d => d.score !== null);

  const mesures30jMapPEM = {};
  (() => {
    const todayPEM = new Date();
    todayPEM.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const dPEM = new Date(todayPEM);
      dPEM.setDate(dPEM.getDate() - i);
      const dateStrPEM = dPEM.toISOString().split('T')[0];
      const rawPEM = localStorage.getItem('boussole_mesures_' + dateStrPEM);
      if (!rawPEM) continue;
      try { mesures30jMapPEM['boussole_mesures_' + dateStrPEM] = JSON.parse(rawPEM); } catch(ePEM) {}
    }
  })();

  const pemEvents30j = (typeof window.detectPEMEvents === 'function')
    ? window.detectPEMEvents(days30jPEM, mesures30jMapPEM)
    : [];
  const hasPEMSection = pemEvents30j.length > 0;

  // Collecte donnees cycle 30j pour le PDF
  const cyclePhaseScores30j = (typeof window.collectCycleData === 'function')
    ? window.collectCycleData(days30jPEM, mesures30jMapPEM, 30)
    : {};
  const cycleAnalysis30j = (typeof window.analyzeCycleCorrelation === 'function')
    ? window.analyzeCycleCorrelation(cyclePhaseScores30j)
    : null;
  const hasCycleSection = cycleAnalysis30j !== null;

  let totalPages = 4;
  if (correlations.length > 0) totalPages++;
  if (hasMesuresSection) totalPages++;
  if (hasPEMSection) totalPages++;
  if (hasCycleSection) totalPages++;
  let pageNum = 1;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SYNTHÈSE', 15, yPos);
  yPos += 5;

  // Définition des colonnes du tableau
  const colX  = [15, 68, 100, 155]; // x de départ de chaque colonne
  const colW  = [53, 32,  55,  40]; // largeur de chaque colonne
  const rowH  = 8;
  const tableW = 180; // largeur totale = somme colW

  // Fonction utilitaire : dessine une ligne du tableau
  // cellColors : tableau optionnel de [r,g,b] par cellule (null = noir par défaut)
  function drawTableRow(y, cells, isHeader, isEven, cellColors) {
    // Fond
    if (isHeader) {
      doc.setFillColor(240, 240, 240);
    } else if (isEven) {
      doc.setFillColor(250, 250, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(15, y, tableW, rowH, 'F');

    // Bordure extérieure + séparateurs verticaux
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(15, y, tableW, rowH, 'S');
    colX.forEach((x, i) => {
      if (i > 0) {
        doc.line(x, y, x, y + rowH);
      }
    });

    // Texte
    doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
    doc.setFontSize(9);
    cells.forEach((text, i) => {
      const col = cellColors && cellColors[i];
      if (col) {
        doc.setTextColor(col[0], col[1], col[2]);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.text(String(text), colX[i] + 2, y + 5.5);
    });
    doc.setTextColor(0, 0, 0); // reset
  }

  // En-tête du tableau
  drawTableRow(yPos, ['Métrique', 'Moyenne', 'Tendance', 'Variabilité'], true, false);
  yPos += rowH;

  // Lignes de données — couleurs Chart.js réutilisées (même ordre que les graphiques page 2)
  const metriques = [
    {
      label: 'Énergie',
      stats: statsEnergie,
      tendance: tendanceEnergie,
      sd: sdEnergie,
      color: [224, 156, 138]  // #e09c8a
    },
    {
      label: 'Sommeil',
      stats: statsSommeil,
      tendance: tendanceSommeil,
      sd: sdSommeil,
      color: [107, 155, 209]  // #6b9bd1
    },
    {
      label: 'Confort physique',
      stats: statsConfort,
      tendance: tendanceConfort,
      sd: sdConfort,
      color: [139, 195, 74]   // #8bc34a
    },
    {
      label: 'Clarté mentale',
      stats: statsClarte,
      tendance: tendanceClarte,
      sd: sdClarte,
      color: [255, 167, 38]   // #ffa726
    }
  ];

  metriques.forEach((m, idx) => {
    const moyenne = m.stats.moyenne !== null ? `${m.stats.moyenne}/10` : 'n/a';
    const variab = `${pdfVariabilite(m.sd)} (ET ${m.sd !== null ? m.sd.toFixed(1) : 'n/a'})`;
    const varColor = pdfVariabilite(m.sd) === 'élevée' ? [211, 47, 47] : null;
    drawTableRow(yPos, [m.label, moyenne, m.tendance, variab], false, idx % 2 === 1, [m.color, null, null, varColor]);
    yPos += rowH;
  });

  yPos += 5;

  // — Bloc VFC (RMSSD) — affiché uniquement si au moins 3 mesures
  if (dataRmssd.length >= 3) {
    const moyRmssd = pdfMoyenne(dataRmssd);
    const sdRmssd = pdfEcartType(dataRmssd);
    const tendRmssd = pdfTendance(dataRmssd);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('VARIABILITÉ CARDIAQUE (RMSSD)', 15, yPos);
    yPos += 5;

    // En-tête tableau VFC (3 colonnes)
    const vfcColX = [15, 85, 140];
    const vfcColW = [70, 55, 55];
    const vfcTableW = 180;
    function drawVfcRow(y, cells, isHeader) {
      doc.setFillColor(isHeader ? 240 : 255, isHeader ? 240 : 255, isHeader ? 240 : 255);
      doc.rect(15, y, vfcTableW, rowH, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(15, y, vfcTableW, rowH, 'S');
      vfcColX.forEach((x, i) => { if (i > 0) doc.line(x, y, x, y + rowH); });
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      cells.forEach((text, i) => doc.text(String(text), vfcColX[i] + 2, y + 5.5));
    }

    drawVfcRow(yPos, ['Moyenne RMSSD (ms)', 'Tendance', 'Écart-type (ms)'], true);
    yPos += rowH;
    const rmssdMoyStr = moyRmssd !== null ? `${Math.round(moyRmssd)} ms (${dataRmssd.length} mesures)` : 'n/a';
    const rmssdSdStr = sdRmssd !== null ? `${Math.round(sdRmssd)} ms` : 'n/a';
    drawVfcRow(yPos, [rmssdMoyStr, tendRmssd, rmssdSdStr], false);
    yPos += rowH + 3;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Ref. : RMSSD 20-50 ms typique au repos. Valeur élevée = bonne récupération.', 15, yPos);
    yPos += 7;
  }

  // — Phrase résumé automatique
  const tendances = [tendanceEnergie, tendanceSommeil, tendanceConfort, tendanceClarte];
  const nomsMetriques = ['Énergie', 'Sommeil', 'Confort physique', 'Clarté mentale'];
  const varLabels = [pdfVariabilite(sdEnergie), pdfVariabilite(sdSommeil), pdfVariabilite(sdConfort), pdfVariabilite(sdClarte)];
  const idxEnBaisse = tendances.findIndex(t => t === 'plutôt en baisse');
  const idxElevee = varLabels.findIndex(v => v === 'élevée');

  let phraseResume = 'Période globalement stable.';
  if (idxEnBaisse >= 0 && idxElevee >= 0) {
    phraseResume = `Attention : ${nomsMetriques[idxEnBaisse]} en baisse. Vigilance sur la variabilité de ${nomsMetriques[idxElevee]}.`;
  } else if (idxEnBaisse >= 0) {
    phraseResume = `Attention : ${nomsMetriques[idxEnBaisse]} en baisse sur la période.`;
  } else if (idxElevee >= 0) {
    phraseResume = `Période en amélioration. Vigilance sur la variabilité du ${nomsMetriques[idxElevee]}.`;
  } else if (tendances.every(t => t === 'plutôt en amélioration' || t === 'plutôt stable' || t === 'données insuffisantes')) {
    phraseResume = "Période globalement stable avec tendance à l'amélioration.";
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(85, 85, 85);
  const lignesResume = doc.splitTextToSize(phraseResume, 170);
  lignesResume.forEach(ligne => {
    doc.text(ligne, 15, yPos);
    yPos += 5;
  });

  // Footer page 1
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNum}/${totalPages}`, 105, 280, { align: 'center' });
  doc.text('Document généré par Boussole (myboussole.fr) - Outil de suivi descriptif', 105, 285, { align: 'center' });
  doc.text('Ne remplace pas un avis médical - Données stockées uniquement sur votre appareil', 105, 290, { align: 'center' });

  doc.addPage();
  pageNum++;

  // ====================================
  // PAGE (CONDITIONNELLE) : DONNEES OBJECTIVES
  // ====================================

  if (hasMesuresSection) {
    // Titre de section
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 23, 45);
    doc.text('DONNEES OBJECTIVES', 105, 14, { align: 'center' });

    doc.setDrawColor(110, 135, 125);
    doc.setLineWidth(0.4);
    doc.line(15, 17, 195, 17);
    doc.setLineWidth(0.5);

    let yMes = 26;

    // Colonnes : Mesure | Moyenne | Min | Max | Tendance
    const mesColX  = [15, 75, 105, 130, 155];
    const mesRowH  = 8;
    const mesTableW = 180;

    function drawMesRow(y, cells, isHeader, isEven) {
      if (isHeader) {
        doc.setFillColor(240, 240, 240);
      } else if (isEven) {
        doc.setFillColor(250, 250, 250);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, y, mesTableW, mesRowH, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(15, y, mesTableW, mesRowH, 'S');
      mesColX.forEach((x, i) => { if (i > 0) doc.line(x, y, x, y + mesRowH); });
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(isHeader ? 110 : 6, isHeader ? 135 : 23, isHeader ? 125 : 45);
      cells.forEach((text, i) => doc.text(String(text), mesColX[i] + 2, y + 5.5));
      doc.setTextColor(0, 0, 0);
    }

    drawMesRow(yMes, ['Mesure', 'Moyenne', 'Min', 'Max', 'Tendance'], true, false);
    yMes += mesRowH;

    // Construire les lignes
    const mesRows = [];

    if (mesures30j.fc) {
      const s = mesures30j.fc;
      mesRows.push([
        'FC repos (bpm)',
        `${Math.round(s.avg)} bpm`,
        `${Math.round(s.min)}`,
        `${Math.round(s.max)}`,
        s.trend
      ]);
    }

    if (mesures30j.ta_sys && mesures30j.ta_dia) {
      const ss = mesures30j.ta_sys;
      const sd = mesures30j.ta_dia;
      mesRows.push([
        'Tension (mmHg)',
        `${Math.round(ss.avg)}/${Math.round(sd.avg)}`,
        `${Math.round(ss.min)}/${Math.round(sd.min)}`,
        `${Math.round(ss.max)}/${Math.round(sd.max)}`,
        ss.trend
      ]);
    }

    if (mesures30j.rmssd) {
      const s = mesures30j.rmssd;
      mesRows.push([
        'VFC/RMSSD (ms)',
        `${Math.round(s.avg)} ms`,
        `${Math.round(s.min)}`,
        `${Math.round(s.max)}`,
        s.trend
      ]);
    }

    if (mesures30j.poids) {
      const s = mesures30j.poids;
      mesRows.push([
        'Poids (kg)',
        `${s.avg.toFixed(1)} kg`,
        `${s.min.toFixed(1)}`,
        `${s.max.toFixed(1)}`,
        s.trend
      ]);
    }

    mesRows.forEach((row, idx) => {
      drawMesRow(yMes, row, false, idx % 2 === 1);
      yMes += mesRowH;
    });

    yMes += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Mesures declaratives saisies par l\'utilisateur. Pas de valeur diagnostique.',
      15, yMes
    );

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${pageNum}/${totalPages}`, 105, 280, { align: 'center' });
    doc.text('Document genere par Boussole (myboussole.fr) - Outil de suivi descriptif', 105, 285, { align: 'center' });
    doc.text('Ne remplace pas un avis medical - Donnees stockees uniquement sur votre appareil', 105, 290, { align: 'center' });

    doc.addPage();
    pageNum++;
  }

  // ====================================
  // PAGE 2 : ÉVOLUTION SUR 30 JOURS (graphiques)
  // ====================================

  // Titre de section
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 23, 45);
  doc.text('ÉVOLUTION SUR 30 JOURS', 105, 14, { align: 'center' });

  // Filet décoratif sous le titre
  doc.setDrawColor(110, 135, 125);
  doc.setLineWidth(0.4);
  doc.line(15, 17, 195, 17);
  doc.setLineWidth(0.5);

  let yPos2 = 26;

  // Graphique Énergie
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Énergie', 15, yPos2);
  const graphEnergie = await genererGraphique(labels, dataEnergie, 'Énergie', '#e09c8a');
  doc.addImage(graphEnergie, 'JPEG', 15, yPos2 + 2, 180, 38);
  yPos2 += 46;

  // Graphique Sommeil
  doc.text('Sommeil', 15, yPos2);
  const graphSommeil = await genererGraphique(labels, dataSommeil, 'Sommeil', '#6b9bd1');
  doc.addImage(graphSommeil, 'JPEG', 15, yPos2 + 2, 180, 38);
  yPos2 += 46;

  // Graphique Confort physique
  doc.text('Confort physique', 15, yPos2);
  const graphConfort = await genererGraphique(labels, dataConfort, 'Confort', '#8bc34a');
  doc.addImage(graphConfort, 'JPEG', 15, yPos2 + 2, 180, 38);
  yPos2 += 46;

  // Graphique Clarté mentale
  doc.text('Clarté mentale', 15, yPos2);
  const graphClarte = await genererGraphique(labels, dataClarte, 'Clarté', '#ffa726');
  doc.addImage(graphClarte, 'JPEG', 15, yPos2 + 2, 180, 38);

  // Footer page 2
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNum}/${totalPages}`, 105, 280, { align: 'center' });
  doc.text('Document généré par Boussole (myboussole.fr) - Outil de suivi descriptif', 105, 285, { align: 'center' });
  doc.text('Ne remplace pas un avis médical - Données stockées uniquement sur votre appareil', 105, 290, { align: 'center' });

  // ====================================
  // PAGE 3 : CORRÉLATIONS (conditionnelle)
  // ====================================

  if (correlations.length > 0) {
    doc.addPage();
    pageNum++;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Patterns observés', 15, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Note : Ces observations sont descriptives, pas des conclusions médicales.', 15, 30);

    yPos = 45;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    correlations.forEach(corr => {
      doc.text(`- ${corr.pattern}`, 20, yPos);
      if (corr.pourcentage) {
        doc.text(`  (observé dans ${corr.pourcentage}% des cas)`, 25, yPos + 5);
        yPos += 10;
      } else {
        yPos += 7;
      }
    });

    // Footer page patterns
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${pageNum}/${totalPages}`, 105, 290, { align: 'center' });
  }

  // ====================================
  // PAGE EPISODES DE CRASH POST-EFFORT (conditionnelle)
  // ====================================

  if (hasPEMSection) {
    doc.addPage();
    pageNum++;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 23, 45);
    doc.text('EPISODES DE CRASH POST-EFFORT', 105, 14, { align: 'center' });

    doc.setDrawColor(110, 135, 125);
    doc.setLineWidth(0.4);
    doc.line(15, 17, 195, 17);
    doc.setLineWidth(0.5);

    let yPEM = 26;

    // Colonnes : Date crash | Avant | Crash | Delta | FC | Niveau
    const pemColX   = [15, 37, 62, 87, 107, 157];
    const pemTableW = 180;
    const pemRowH   = 8;

    function drawPEMRow(y, cells, isHeader, isEven) {
      if (isHeader)      { doc.setFillColor(240, 240, 240); }
      else if (isEven)   { doc.setFillColor(250, 250, 250); }
      else               { doc.setFillColor(255, 255, 255); }
      doc.rect(15, y, pemTableW, pemRowH, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(15, y, pemTableW, pemRowH, 'S');
      pemColX.forEach((x, i) => { if (i > 0) doc.line(x, y, x, y + pemRowH); });
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(8);
      cells.forEach((cell, i) => {
        const text  = (cell && typeof cell === 'object') ? cell.text  : cell;
        const color = (cell && typeof cell === 'object') ? cell.color : null;
        if (color) { doc.setTextColor(color[0], color[1], color[2]); }
        else        { doc.setTextColor(0, 0, 0); }
        doc.text(String(text), pemColX[i] + 2, y + 5.5);
      });
      doc.setTextColor(0, 0, 0);
    }

    drawPEMRow(yPEM, ['Date crash', 'Avant', 'Crash', 'Delta', 'FC', 'Niveau'], true, false);
    yPEM += pemRowH;

    const pemSlice = pemEvents30j.slice(0, 10);
    pemSlice.forEach((ev, idx) => {
      const parts = ev.dateCrash.split('-');
      const dateCrashJJMM = parts[2] + '/' + parts[1];
      const deltaCell = { text: '-' + ev.delta.toFixed(1), color: [211, 47, 47] };

      let fcText = '-';
      if (ev.fcJ !== null && ev.fcCrash !== null) {
        const sign = ev.fcDelta >= 0 ? '+' : '';
        fcText = ev.fcJ + ' puis ' + ev.fcCrash + ' (' + sign + ev.fcDelta + ')';
      }

      let levelText = 'Probable';
      if (ev.level === 'confirmed')  levelText = 'Confirme (FC)';
      if (ev.level === 'reinforced') levelText = 'Renforce (FC+VFC)';

      drawPEMRow(yPEM, [
        dateCrashJJMM,
        ev.scoreJ.toFixed(1),
        ev.scoreCrash.toFixed(1),
        deltaCell,
        fcText,
        levelText
      ], false, idx % 2 === 1);
      yPEM += pemRowH;
    });

    yPEM += 5;

    // Synthese automatique
    const pemSum = (typeof window.getPEMSummary === 'function')
      ? window.getPEMSummary(pemSlice)
      : { count: pemSlice.length, avgDelta: null, avgDelay: null };
    const synthText = pemSum.count + ' episode(s) de crash post-effort identifie(s) sur la periode.'
      + ' Chute moyenne de score : ' + (pemSum.avgDelta !== null ? pemSum.avgDelta.toFixed(1) : '-') + ' points.'
      + ' Delai moyen : ' + (pemSum.avgDelay !== null ? pemSum.avgDelay.toFixed(1) : '-') + ' jour(s).';
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const synthLines = doc.splitTextToSize(synthText, 170);
    synthLines.forEach(l => { doc.text(l, 15, yPEM); yPEM += 5; });

    yPEM += 3;

    // Disclaimer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    const discText = 'Detection algorithmique basee sur les variations de score. Information personnelle, pas une evaluation medicale.';
    const discLines = doc.splitTextToSize(discText, 170);
    discLines.forEach(l => { doc.text(l, 15, yPEM); yPEM += 4; });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Page ' + pageNum + '/' + totalPages, 105, 280, { align: 'center' });
    doc.text('Document genere par Boussole (myboussole.fr) - Outil de suivi descriptif', 105, 285, { align: 'center' });
    doc.text('Ne remplace pas un avis medical - Donnees stockees uniquement sur votre appareil', 105, 290, { align: 'center' });
  }

  // ====================================
  // PAGE CYCLE HORMONAL ET BIEN-ETRE (conditionnelle)
  // ====================================

  if (hasCycleSection) {
    doc.addPage();
    pageNum++;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 23, 45);
    doc.text('CYCLE HORMONAL ET BIEN-ETRE', 105, 14, { align: 'center' });

    doc.setDrawColor(110, 135, 125);
    doc.setLineWidth(0.4);
    doc.line(15, 17, 195, 17);
    doc.setLineWidth(0.5);

    let yCycle = 26;

    // Tableau 4 colonnes : Phase | Score moyen | Jours | Jours rouges
    const cycleColX = [15, 75, 115, 150];
    const cycleTableW = 180;
    const cycleRowH = 8;

    function drawCycleRow(y, cells, isHeader, isEven) {
      if (isHeader)     { doc.setFillColor(240, 240, 240); }
      else if (isEven)  { doc.setFillColor(250, 250, 250); }
      else              { doc.setFillColor(255, 255, 255); }
      doc.rect(15, y, cycleTableW, cycleRowH, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(15, y, cycleTableW, cycleRowH, 'S');
      cycleColX.forEach((x, i) => { if (i > 0) doc.line(x, y, x, y + cycleRowH); });
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(9);
      cells.forEach((text, i) => {
        doc.setTextColor(0, 0, 0);
        doc.text(String(text), cycleColX[i] + 2, y + 5.5);
      });
    }

    drawCycleRow(yCycle, ['Phase', 'Score moyen', 'Jours', 'Jours rouges'], true, false);
    yCycle += cycleRowH;

    const phaseLabels = {
      folliculaire: 'Folliculaire',
      ovulation: 'Ovulation',
      luteale: 'Luteale',
      menstruation: 'Regles',
      perimenopause: 'Irregulier'
    };

    const cyclePhases = cycleAnalysis30j.phases;
    let rowIdx = 0;
    Object.keys(cyclePhases).forEach(phase => {
      const p = cyclePhases[phase];
      const label = phaseLabels[phase] || phase;
      drawCycleRow(yCycle, [
        label,
        (Math.round(p.avg * 10) / 10).toFixed(1) + '/10',
        String(p.count),
        String(p.joursRouges)
      ], false, rowIdx % 2 === 1);
      yCycle += cycleRowH;
      rowIdx++;
    });

    yCycle += 6;

    // Synthese automatique
    const phaseMinLabel = phaseLabels[cycleAnalysis30j.phaseMin] || cycleAnalysis30j.phaseMin;
    const phaseMaxLabel = phaseLabels[cycleAnalysis30j.phaseMax] || cycleAnalysis30j.phaseMax;
    const phaseMinData = cyclePhases[cycleAnalysis30j.phaseMin];
    const phaseMaxData = cyclePhases[cycleAnalysis30j.phaseMax];
    const synthCycleText = 'La phase ' + phaseMinLabel
      + ' est associee aux scores les plus bas (moyenne '
      + (Math.round(phaseMinData.avg * 10) / 10).toFixed(1)
      + '/10) avec ' + phaseMinData.joursRouges + ' jour(s) en zone rouge.'
      + ' La phase ' + phaseMaxLabel
      + ' presente les scores les plus eleves (moyenne '
      + (Math.round(phaseMaxData.avg * 10) / 10).toFixed(1)
      + '/10). Ecart moyen : '
      + (Math.round(cycleAnalysis30j.delta * 10) / 10).toFixed(1) + ' points.';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const synthCycleLines = doc.splitTextToSize(synthCycleText, 170);
    synthCycleLines.forEach(l => { doc.text(l, 15, yCycle); yCycle += 5; });

    yCycle += 4;

    // Disclaimer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    const discCycleText = 'Correlation observee sur les donnees declaratives. Information personnelle, pas une analyse medicale.';
    const discCycleLines = doc.splitTextToSize(discCycleText, 170);
    discCycleLines.forEach(l => { doc.text(l, 15, yCycle); yCycle += 4; });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Page ' + pageNum + '/' + totalPages, 105, 280, { align: 'center' });
    doc.text('Document genere par Boussole (myboussole.fr) - Outil de suivi descriptif', 105, 285, { align: 'center' });
    doc.text('Ne remplace pas un avis medical - Donnees stockees uniquement sur votre appareil', 105, 290, { align: 'center' });
  }

  // ====================================
  // PAGE NOTES PERSONNELLES
  // ====================================

  doc.addPage();
  pageNum++;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Notes personnelles', 15, 20);

  yPos = 35;

  // Filtrer les notes vides, "?" et "RAS"
  const notesExclues = ['?', 'ras'];
  const entreesAvecNotes = entrees.filter(e => {
    if (!e.note) return false;
    const trimmed = e.note.trim();
    if (trimmed === '') return false;
    if (notesExclues.includes(trimmed.toLowerCase())) return false;
    return true;
  });

  if (entreesAvecNotes.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    entreesAvecNotes.forEach(e => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const dateStr = new Date(e.date).toLocaleDateString('fr-FR');
      doc.setFont('helvetica', 'bold');
      doc.text(`${dateStr} :`, 20, yPos);
      doc.setFont('helvetica', 'normal');

      // Découper la note si trop longue
      const lignes = doc.splitTextToSize(e.note, 170);
      lignes.forEach(ligne => {
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(ligne, 25, yPos);
      });

      yPos += 8;
    });
  } else {
    doc.setFontSize(10);
    doc.text('Aucune note enregistrée sur cette période.', 20, yPos);
  }

  // Footer page 4
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNum}/${totalPages}`, 105, 290, { align: 'center' });

  // ====================================
  // PAGE POINTS À DISCUTER
  // ====================================

  doc.addPage();
  pageNum++;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Points à discuter avec votre professionnel de santé', 15, 20);

  yPos = 35;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Points automatiques basés sur les données
  const points = [];

  if (statsEnergie.tendance === 'en baisse') {
    points.push('Énergie en baisse progressive sur la période');
  }
  if (statsConfort.variabilite === 'élevée') {
    points.push('Variabilité importante du confort physique');
  }
  if (correlations.some(c => c.pattern.includes('Sommeil'))) {
    points.push('Impact du sommeil sur l\'énergie du lendemain observé');
  }

  points.forEach(point => {
    doc.text(`[ ] ${point}`, 20, yPos);
    yPos += 8;
  });

  // Espace libre pour notes
  yPos += 10;
  doc.text('[ ] Autre : _______________________________________________________', 20, yPos);
  yPos += 8;
  doc.text('_________________________________________________________________', 20, yPos);

  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Questions pour le professionnel de santé :', 20, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < 8; i++) {
    doc.text('_________________________________________________________________', 20, yPos);
    yPos += 8;
  }

  // Footer page 5
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNum}/${totalPages}`, 105, 290, { align: 'center' });

  // ====================================
  // TÉLÉCHARGEMENT
  // ====================================

  // Génère le blob
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  // Ouvre dans un onglet pour impression
  window.open(blobUrl, '_blank');

  // Téléchargement direct via lien <a>
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `boussole-rapport-${dateStr}.pdf`;
  const dlLink = document.createElement('a');
  dlLink.href = blobUrl;
  dlLink.download = filename;
  document.body.appendChild(dlLink);
  dlLink.click();
  document.body.removeChild(dlLink);

  // Libère la mémoire après 60s
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

// Export pour utilisation dans app.js
window.genererPDFEnrichi = genererPDFEnrichi;
