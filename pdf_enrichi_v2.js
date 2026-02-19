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
  canvas.width = 800;
  canvas.height = 300;
  
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
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
        }
      }
    }
  });
  
  // Attendre le rendu
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Convertir en image base64
  return canvas.toDataURL('image/png');
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
  const entrees = rawEntries.map(e => ({
    date: e.date,
    energie: e.energie,
    sommeil: e.qualite_sommeil,
    confort_physique: e.douleurs,
    clarte_mentale: e.clarte_mentale,
    note: e.note
  }));
  
  // Trier par date croissante
  entrees.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (entrees.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }
  
  // Période
  const dateDebut = new Date(entrees[0].date);
  const dateFin = new Date(entrees[entrees.length - 1].date);
  const nbJours = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)) + 1;
  
  // ====================================
  // PAGE 1 : VUE D'ENSEMBLE + GRAPHIQUES
  // ====================================
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BOUSSOLE — Suivi du bien-être quotidien', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période : ${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')} (${nbJours} jours)`, 105, 28, { align: 'center' });
  doc.text(`Jours renseignés : ${entrees.length}/${nbJours}`, 105, 34, { align: 'center' });
  
  // Préparer données pour graphiques
  const labels = entrees.map(e => new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
  const dataEnergie = entrees.map(e => e.energie);
  const dataSommeil = entrees.map(e => e.sommeil);
  const dataConfort = entrees.map(e => e.confort_physique);
  const dataClarte = entrees.map(e => e.clarte_mentale);
  
  let yPos = 45;
  
  // Graphique Énergie
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Énergie', 15, yPos);
  const graphEnergie = await genererGraphique(labels, dataEnergie, 'Énergie', '#e09c8a');
  doc.addImage(graphEnergie, 'PNG', 15, yPos + 2, 180, 40);
  yPos += 48;
  
  // Graphique Sommeil
  doc.text('Sommeil', 15, yPos);
  const graphSommeil = await genererGraphique(labels, dataSommeil, 'Sommeil', '#6b9bd1');
  doc.addImage(graphSommeil, 'PNG', 15, yPos + 2, 180, 40);
  yPos += 48;
  
  // Graphique Confort physique
  doc.text('Confort physique', 15, yPos);
  const graphConfort = await genererGraphique(labels, dataConfort, 'Confort', '#8bc34a');
  doc.addImage(graphConfort, 'PNG', 15, yPos + 2, 180, 40);
  yPos += 48;
  
  // Graphique Clarté mentale
  doc.text('Clarté mentale', 15, yPos);
  const graphClarte = await genererGraphique(labels, dataClarte, 'Clarté', '#ffa726');
  doc.addImage(graphClarte, 'PNG', 15, yPos + 2, 180, 40);
  
  // Footer page 1
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Document généré par Boussole (boussole.micronutriment.fr) - Outil de suivi descriptif', 105, 285, { align: 'center' });
  doc.text('Ne remplace pas un avis médical - Données stockées uniquement sur votre appareil', 105, 290, { align: 'center' });
  
  // ====================================
  // PAGE 2 : SYNTHÈSE STATISTIQUE
  // ====================================
  
  doc.addPage();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthèse statistique', 15, 20);
  
  yPos = 35;
  
  const statsEnergie = calculerStats(dataEnergie);
  const statsSommeil = calculerStats(dataSommeil);
  const statsConfort = calculerStats(dataConfort);
  const statsClarte = calculerStats(dataClarte);
  
  const indicateurs = [
    { nom: 'ÉNERGIE', stats: statsEnergie, couleur: '#e09c8a' },
    { nom: 'SOMMEIL', stats: statsSommeil, couleur: '#6b9bd1' },
    { nom: 'CONFORT PHYSIQUE', stats: statsConfort, couleur: '#8bc34a' },
    { nom: 'CLARTÉ MENTALE', stats: statsClarte, couleur: '#ffa726' }
  ];
  
  indicateurs.forEach(ind => {
    // Encadré
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 248, 248);
    doc.rect(15, yPos, 180, 35, 'FD');
    
    // Titre
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ind.couleur);
    doc.text(ind.nom, 20, yPos + 8);
    
    // Stats
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    if (ind.stats.moyenne !== null) {
      doc.text(`Moyenne : ${ind.stats.moyenne}/10`, 20, yPos + 16);
      doc.text(`Tendance : ${ind.stats.tendance}`, 20, yPos + 22);
      doc.text(`Variabilité : ${ind.stats.variabilite} (écart-type ${ind.stats.ecartType})`, 20, yPos + 28);
    } else {
      doc.text('Données insuffisantes', 20, yPos + 16);
    }
    
    yPos += 40;
  });
  
  // Footer page 2
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Page 2/5', 105, 290, { align: 'center' });
  
  // ====================================
  // PAGE 3 : CORRÉLATIONS
  // ====================================
  
  doc.addPage();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Patterns observés', 15, 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Note : Ces observations sont descriptives, pas des conclusions médicales.', 15, 30);
  
  yPos = 45;
  
  const correlations = detecterCorrelations(entrees);
  
  if (correlations.length > 0) {
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
  } else {
    doc.setFontSize(10);
    doc.text('Aucun pattern clair détecté sur cette période.', 20, yPos);
    doc.text('Continuez le suivi pour permettre une analyse plus approfondie.', 20, yPos + 7);
  }
  
  // Footer page 3
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Page 3/5', 105, 290, { align: 'center' });
  
  // ====================================
  // PAGE 4 : NOTES PERSONNELLES
  // ====================================
  
  doc.addPage();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Notes personnelles', 15, 20);
  
  yPos = 35;
  
  const entreesAvecNotes = entrees.filter(e => e.note && e.note.trim() !== '');
  
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
  doc.text('Page 4/5', 105, 290, { align: 'center' });
  
  // ====================================
  // PAGE 5 : POINTS À DISCUTER
  // ====================================
  
  doc.addPage();
  
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
  doc.text('Page 5/5', 105, 290, { align: 'center' });
  
  // ====================================
  // TÉLÉCHARGEMENT
  // ====================================
  
  const filename = `boussole-export-${dateFin.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// Export pour utilisation dans app.js
window.genererPDFEnrichi = genererPDFEnrichi;
