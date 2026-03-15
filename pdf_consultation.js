/**
 * Boussole — PDF Consultation
 * Structure "medecin remplacant 5 secondes"
 *
 * PAGE 1 : LECTURE RAPIDE (traitement + objectifs consultation)
 * PAGE 1/2 suite : Donnees Boussole (second plan)
 *
 * Dependances : jsPDF (deja charge dans index.html)
 */

// ============================================
// COULEURS CHARTE
// ============================================
const NAVY   = [6, 23, 45];
const SAGE   = [110, 135, 125];
const VERT   = [76, 175, 80];
const ORANGE = [255, 152, 0];
const ROUGE  = [244, 67, 54];
const GREY   = [130, 130, 130];
const LIGHT  = [245, 247, 246];

// Blocs "lecture rapide"
const VERT_DARK  = [45, 106, 79];    // #2d6a4f — titre + bordure traitement
const BG_VERT    = [240, 247, 244];  // #F0F7F4 — fond traitement
const JAUNE      = [212, 160, 23];   // #D4A017 — titre + bordure objectifs
const BG_JAUNE   = [255, 251, 240];  // #FFFBF0 — fond objectifs
const ROUGE_ALL  = [220, 38, 38];    // rouge allergies/CI

// ============================================
// UTILITAIRES CALCUL
// ============================================

function _moyenne(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/**
 * Tendance J1-J3 vs J5-J7 sur un tableau chronologique de valeurs.
 * Retourne 'Hausse', 'Baisse' ou 'Stable' (ASCII, compatible Helvetica/Latin-1)
 */
function _tendance7j(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  if (v.length < 5) return 'Stable';
  const debut = v.slice(0, 3);
  const fin   = v.slice(-3);
  const delta = _moyenne(fin) - _moyenne(debut);
  if (delta > 0.5)  return 'Hausse';
  if (delta < -0.5) return 'Baisse';
  return 'Stable';
}

/**
 * Compte le nombre de jours ou une valeur est < 5
 */
function _joursBasPct(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  if (v.length === 0) return 0;
  return v.filter(x => x < 5).length;
}

function _colorVOR(score) {
  if (score === null) return GREY;
  if (score >= 7)  return VERT;
  if (score >= 4)  return ORANGE;
  return ROUGE;
}

function _stripEmoji(str) {
  return (str || '').replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[^\x00-\x7F\u00C0-\u024F]/g, '').trim();
}

function _dateLocale(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ============================================
// GENERATION PDF
// ============================================

function genererPDFConsultation(noteLibre) {
  if (typeof window.jspdf === 'undefined') {
    alert('jsPDF non disponible - verifiez votre connexion internet.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ---- DONNEES ----
  const data = loadEntries();
  let rawEntries = (data.entries || []).map(e => ({
    date:             e.date,
    energie:          e.energie,
    sommeil:          e.qualite_sommeil,
    confort_physique: e.douleurs,
    clarte_mentale:   e.clarte_mentale,
    note:             e.note,
    humeur:           e.humeur
  }));

  rawEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const aujourd_hui = new Date();
  aujourd_hui.setHours(0, 0, 0, 0);
  const cutoff = new Date(aujourd_hui);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const entrees = rawEntries.filter(e => e.date >= cutoffStr);

  if (entrees.length === 0) {
    alert('Aucune donnee sur les 7 derniers jours.');
    return;
  }

  // ---- CALCULS ----
  const dataEnergie = entrees.map(e => e.energie);
  const dataSommeil = entrees.map(e => e.sommeil);
  const dataConfort = entrees.map(e => e.confort_physique);
  const dataClarte  = entrees.map(e => e.clarte_mentale);

  const moyEnergie = _moyenne(dataEnergie);
  const moySommeil = _moyenne(dataSommeil);
  const moyConfort = _moyenne(dataConfort);
  const moyClarte  = _moyenne(dataClarte);

  const moyennesValides = [moyEnergie, moySommeil, moyConfort, moyClarte].filter(v => v !== null);
  const scoreGlobal = moyennesValides.length
    ? moyennesValides.reduce((a, b) => a + b, 0) / moyennesValides.length
    : null;

  const metriques = [
    { label: 'Energie',          moy: moyEnergie, vals: dataEnergie },
    { label: 'Sommeil',          moy: moySommeil, vals: dataSommeil },
    { label: 'Confort physique', moy: moyConfort, vals: dataConfort },
    { label: 'Clarte mentale',   moy: moyClarte,  vals: dataClarte  }
  ].map(m => ({
    ...m,
    tendance: _tendance7j(m.vals),
    joursBas: _joursBasPct(m.vals),
    nbJours:  m.vals.filter(x => x !== null && x !== undefined).length
  }));

  const metriquesSorted = [...metriques]
    .filter(m => m.moy !== null)
    .sort((a, b) => a.moy - b.moy);
  const pointsAAborder = metriquesSorted.slice(0, 3);

  let meilleurJour = null, pireJour = null;
  entrees.forEach(e => {
    const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(v => v !== null && v !== undefined);
    if (vals.length === 0) return;
    const score = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (meilleurJour === null || score > meilleurJour.score) meilleurJour = { date: e.date, score };
    if (pireJour    === null || score < pireJour.score)    pireJour    = { date: e.date, score };
  });

  const joursRenseignes = entrees.length;
  const derniereSaisie  = entrees[entrees.length - 1].date;

  let nbVert = 0, nbOrange = 0, nbRouge = 0;
  entrees.forEach(e => {
    const scoreJour = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(v => v !== null && v !== undefined);
    if (scoreJour.length === 0) return;
    const s = scoreJour.reduce((a, b) => a + b, 0) / scoreJour.length;
    if (s >= 7) nbVert++;
    else if (s >= 4) nbOrange++;
    else nbRouge++;
  });
  const totalJoursVOR = nbVert + nbOrange + nbRouge;
  const pctVert   = totalJoursVOR ? Math.round(nbVert   / totalJoursVOR * 100) : 0;
  const pctOrange = totalJoursVOR ? Math.round(nbOrange / totalJoursVOR * 100) : 0;
  const pctRouge  = totalJoursVOR ? Math.round(nbRouge  / totalJoursVOR * 100) : 0;

  const dateAujourdhui = aujourd_hui.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // ---- IDENTITE PATIENT ----
  const idPrenom = (localStorage.getItem('boussole_prenom') || '').trim();
  const idNom    = (localStorage.getItem('boussole_nom')    || '').trim().toUpperCase();
  const idDdn    = (localStorage.getItem('boussole_ddn')    || '').trim();
  const idTel    = (localStorage.getItem('boussole_tel')    || '').trim();

  // ---- DONNEES MEDICALES ----
  const txMed  = _stripEmoji((localStorage.getItem('boussole_medicaments') || '').trim());
  const txComp = _stripEmoji((localStorage.getItem('boussole_complements') || '').trim());
  const txAll  = _stripEmoji((localStorage.getItem('boussole_allergies')   || '').trim());

  // Medicaments : une ligne par medicament (split \n)
  const medLines = txMed
    ? txMed.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    : [];

  // Note consultation
  const noteTrimmed = _stripEmoji(
    (noteLibre || localStorage.getItem('boussole_note_consultation') || '').trim()
  );

  // ============================================
  // RENDU PDF
  // ============================================

  const pageW    = 210;
  const marginL  = 15;
  const marginR  = 15;
  const contentW = pageW - marginL - marginR;
  const PAGE_MAX_Y = 270; // seuil saut de page (footer a ~282)
  let y = 0;

  // --- helpers typographie ---
  function setNavy(bold) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  }
  function setSage(bold) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
  }
  function setGrey(bold) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  }

  // --- pagination ---
  function checkPage(neededH) {
    if (y + neededH > PAGE_MAX_Y) {
      doc.addPage();
      y = 15;
    }
  }

  // --- footer (dessine sur toutes les pages a la fin) ---
  function drawFooters() {
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      const footerY = 282;
      doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
      doc.setLineWidth(0.3);
      doc.line(marginL, footerY - 3, marginL + contentW, footerY - 3);
      doc.setFontSize(7.5);
      setGrey(false);
      doc.text(
        "Document d'information personnelle - Pas un avis medical - myboussole.fr",
        pageW / 2, footerY + 2, { align: 'center' }
      );
      if (idTel) {
        doc.setFontSize(7.5);
        setGrey(false);
        doc.text(
          "En cas d'urgence ou de doute : contacter le patient au " + idTel,
          pageW / 2, footerY + 7, { align: 'center' }
        );
      }
    }
  }

  // ============================================================
  // HEADER 2 COLONNES
  // ============================================================

  const colGaucheW = 105;
  const colDroiteW = contentW - colGaucheW - 5;
  const colDroiteX = marginL + colGaucheW + 5;

  // Bandeau score (colonne droite)
  const scoreColorHdr = _colorVOR(scoreGlobal);
  doc.setFillColor(scoreColorHdr[0], scoreColorHdr[1], scoreColorHdr[2]);
  doc.roundedRect(colDroiteX, 4, colDroiteW, 30, 3, 3, 'F');

  const scoreStrHdr = scoreGlobal !== null
    ? (Math.round(scoreGlobal * 10) / 10).toFixed(1) + '/10'
    : 'n/a';
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Score Boussole', colDroiteX + colDroiteW / 2, 10, { align: 'center' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(scoreStrHdr, colDroiteX + colDroiteW / 2, 21, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  const hdrNoteLines = doc.splitTextToSize(
    'Score de bien-etre subjectif 0-10 (outil de suivi personnel, pas de valeur diagnostique)',
    colDroiteW - 4
  );
  hdrNoteLines.forEach((l, li) => {
    doc.text(l, colDroiteX + colDroiteW / 2, 27 + li * 3.5, { align: 'center' });
  });

  // Colonne gauche
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('PREPARER MA CONSULTATION', marginL, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
  doc.text('myboussole.fr', marginL, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text('Genere le ' + dateAujourdhui, marginL, 22);

  if (idPrenom || idNom) {
    const partsId = [];
    const nomPrenom = [idPrenom, idNom].filter(Boolean).join(' ');
    if (nomPrenom) partsId.push(nomPrenom);
    if (idDdn) {
      const [ddnY, ddnM, ddnD] = idDdn.split('-');
      if (ddnY && ddnM && ddnD) partsId.push('Ne le ' + ddnD + '/' + ddnM + '/' + ddnY);
    }
    if (idTel) partsId.push(idTel);
    const idLine = partsId.join('  \xB7  ');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(idLine, marginL, 29);
  }

  // Ligne separatrice header
  doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
  doc.setLineWidth(0.4);
  doc.line(0, 37, pageW, 37);
  y = 43;

  // ============================================================
  // SECTION LECTURE RAPIDE
  // ============================================================

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('LECTURE RAPIDE -- 3 POINTS ESSENTIELS', marginL, y);
  // Souligne manuel
  const lrW = doc.getTextWidth('LECTURE RAPIDE -- 3 POINTS ESSENTIELS');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginL, y + 1.2, marginL + lrW, y + 1.2);
  y += 8;

  // ============================================================
  // BLOC 1 : TRAITEMENT ACTUEL (vert)
  // ============================================================

  // Construire les lignes de contenu avec wrapping
  const traitItems = [];
  medLines.forEach(m => {
    const wrapped = doc.splitTextToSize('- ' + m, contentW - 12);
    traitItems.push({ lines: wrapped, isAllergy: false });
  });
  if (txComp) {
    const wrapped = doc.splitTextToSize('Complements : ' + txComp, contentW - 12);
    traitItems.push({ lines: wrapped, isAllergy: false });
  }
  if (txAll && txAll.toUpperCase() !== 'RAS') {
    const wrapped = doc.splitTextToSize('Allergies/CI : ' + txAll, contentW - 12);
    traitItems.push({ lines: wrapped, isAllergy: true });
  }
  const aucunTraitement = traitItems.length === 0;

  // Calcul hauteur bloc
  let traitContentH = 0;
  if (aucunTraitement) {
    traitContentH = 6;
  } else {
    traitItems.forEach(item => { traitContentH += item.lines.length * 5.5; });
  }
  const traitBlocH = 7 + traitContentH + 5;

  checkPage(traitBlocH + 5);

  // Fond + bordure gauche
  doc.setFillColor(BG_VERT[0], BG_VERT[1], BG_VERT[2]);
  doc.rect(marginL, y, contentW, traitBlocH, 'F');
  doc.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  doc.setLineWidth(4);
  doc.line(marginL, y, marginL, y + traitBlocH);
  doc.setLineWidth(0.1);

  // Titre
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  doc.text('TRAITEMENT ACTUEL', marginL + 7, y + 5.5);

  let ty = y + 5.5 + 4;

  if (aucunTraitement) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Non renseigne dans Parametres', marginL + 7, ty);
  } else {
    traitItems.forEach(item => {
      doc.setFontSize(8.5);
      if (item.isAllergy) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(ROUGE_ALL[0], ROUGE_ALL[1], ROUGE_ALL[2]);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      }
      item.lines.forEach((l, li) => {
        doc.text(l, marginL + 7, ty + li * 5.5);
      });
      ty += item.lines.length * 5.5;
    });
  }

  y += traitBlocH + 5;

  // ============================================================
  // BLOC 2 : OBJECTIFS DE CETTE CONSULTATION (jaune)
  // ============================================================

  // Construire lignes contenu
  let objLines = [];
  if (noteTrimmed.length > 0) {
    objLines = doc.splitTextToSize(noteTrimmed, contentW - 12);
  }
  const objContentH = noteTrimmed.length > 0 ? objLines.length * 5.5 : 6;
  const objBlocH    = 7 + objContentH + 5;

  checkPage(objBlocH + 5);

  // Fond + bordure gauche
  doc.setFillColor(BG_JAUNE[0], BG_JAUNE[1], BG_JAUNE[2]);
  doc.rect(marginL, y, contentW, objBlocH, 'F');
  doc.setDrawColor(JAUNE[0], JAUNE[1], JAUNE[2]);
  doc.setLineWidth(4);
  doc.line(marginL, y, marginL, y + objBlocH);
  doc.setLineWidth(0.1);

  // Titre
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(JAUNE[0], JAUNE[1], JAUNE[2]);
  doc.text('OBJECTIFS DE CETTE CONSULTATION', marginL + 7, y + 5.5);

  let oy = y + 5.5 + 4;

  if (noteTrimmed.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Aucun motif saisi', marginL + 7, oy);
  } else {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    objLines.forEach((l, li) => {
      doc.text(l, marginL + 7, oy + li * 5.5);
    });
  }

  y += objBlocH + 7;

  // ============================================================
  // SEPARATEUR VISUEL
  // ============================================================

  checkPage(12);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(marginL, y, marginL + contentW, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text(
    '-- Donnees de suivi personnel Boussole (second plan) --',
    pageW / 2, y, { align: 'center' }
  );
  y += 7;

  // ============================================================
  // SECTION : MON ETAT - 7 DERNIERS JOURS
  // ============================================================

  checkPage(20);

  setSage(true);
  doc.setFontSize(10);
  doc.text('MON ETAT - 7 DERNIERS JOURS', marginL, y);
  doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
  doc.setLineWidth(0.4);
  doc.line(marginL, y + 1.5, marginL + contentW, y + 1.5);
  y += 6;

  // Score global
  const scoreStr   = scoreGlobal !== null
    ? (Math.round(scoreGlobal * 10) / 10).toFixed(1) + '/10'
    : 'n/a';
  const scoreColor = _colorVOR(scoreGlobal);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(scoreStr, marginL + 22, y + 8, { align: 'center' });

  doc.setFontSize(8);
  setGrey(false);
  doc.text('Score global moyen', marginL + 22, y + 13, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  const scoreExplTxt = 'Boussole mesure 4 indicateurs subjectifs : Energie - Sommeil - Confort physique - Clarte mentale (0-10 chacun). Ces donnees sont declaratives et personnelles.';
  const scoreExplLines = doc.splitTextToSize(scoreExplTxt, contentW - 50);
  scoreExplLines.forEach((l, li) => {
    doc.text(l, marginL + 46, y + 4 + li * 4);
  });

  y += 18;

  // ---- DONNEES DE LA PERIODE ----
  checkPage(20);

  doc.setFontSize(7.5);
  setSage(true);
  doc.text('DONNEES DE LA PERIODE', marginL, y);
  doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
  doc.setLineWidth(0.2);
  doc.line(marginL, y + 1, marginL + contentW, y + 1);
  y += 5;

  doc.setFontSize(8);
  setNavy(false);
  doc.text(
    'Jours renseignes : ' + joursRenseignes + '/7  \xB7  Derniere saisie : ' + _dateLocale(derniereSaisie),
    marginL, y + 3.5
  );
  y += 7;

  const vorItems = [
    { label: 'Hauts : '   + nbVert   + 'j (' + pctVert   + '%)', color: VERT   },
    { label: 'Moyens : '  + nbOrange + 'j (' + pctOrange + '%)', color: ORANGE },
    { label: 'Bas : '     + nbRouge  + 'j (' + pctRouge  + '%)', color: ROUGE  }
  ];
  let vorX = marginL;
  vorItems.forEach(item => {
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.circle(vorX + 2, y + 1.5, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, vorX + 6, y + 3.5);
    vorX += doc.getTextWidth(item.label) + 12;
  });
  y += 7;

  // ---- POINT D'ATTENTION ----
  const ROUGE_ALERTE = [226, 75, 74];
  const BG_ALERTE    = [254, 242, 242];
  const pointAttention = metriquesSorted.length > 0
    && metriquesSorted[0].moy !== null
    && metriquesSorted[0].moy < 7
    ? metriquesSorted[0]
    : null;

  if (pointAttention !== null) {
    checkPage(26);
    const valStr   = (Math.round(pointAttention.moy * 10) / 10).toFixed(1);
    const valColor = pointAttention.moy < 4 ? ROUGE_ALERTE
                   : pointAttention.moy < 7 ? ORANGE
                   : VERT;
    const attnH = 22;

    doc.setFillColor(BG_ALERTE[0], BG_ALERTE[1], BG_ALERTE[2]);
    doc.rect(marginL, y, contentW, attnH, 'F');
    doc.setDrawColor(ROUGE_ALERTE[0], ROUGE_ALERTE[1], ROUGE_ALERTE[2]);
    doc.setLineWidth(3);
    doc.line(marginL, y, marginL, y + attnH);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ROUGE_ALERTE[0], ROUGE_ALERTE[1], ROUGE_ALERTE[2]);
    doc.text("POINT D'ATTENTION", marginL + 5, y + 5.5);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(valColor[0], valColor[1], valColor[2]);
    doc.text(pointAttention.label + ' -- ' + valStr + '/10', marginL + 5, y + 13);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Metrique la plus faible sur les 7 derniers jours', marginL + 5, y + 19);

    y += attnH + 4;
  }

  // ---- TABLEAU DES 4 METRIQUES ----
  checkPage(40);

  const tabX       = marginL;
  const tabW       = contentW;
  const colLabW    = tabW * 0.34;
  const colMoyW    = tabW * 0.17;
  const colTendW   = tabW * 0.14;
  const colBasW    = tabW * 0.13;
  const colInterpW = tabW * 0.22;
  const rowH       = 7;

  function _interpretation(moy) {
    if (moy === null) return '';
    if (moy >= 7) return 'Correct';
    if (moy >= 5) return 'Mod. altere';
    return 'Altere';
  }

  // En-tete tableau
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(tabX, y, tabW, rowH - 1, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Metrique',       tabX + 2,                                                                   y + 4.5);
  doc.text('Moyenne',        tabX + colLabW + colMoyW / 2,                                               y + 4.5, { align: 'center' });
  doc.text('Tendance',       tabX + colLabW + colMoyW + colTendW / 2,                                    y + 4.5, { align: 'center' });
  doc.text('Jours < 5',      tabX + colLabW + colMoyW + colTendW + colBasW / 2,                          y + 4.5, { align: 'center' });
  doc.text('Interpretation', tabX + colLabW + colMoyW + colTendW + colBasW + colInterpW / 2,             y + 4.5, { align: 'center' });
  y += rowH - 1;

  metriques.forEach((m, idx) => {
    const bg = idx % 2 === 0 ? LIGHT : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(tabX, y, tabW, rowH, 'F');

    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.2);
    doc.rect(tabX, y, tabW, rowH, 'S');

    const moyStr    = m.moy !== null ? (Math.round(m.moy * 10) / 10).toFixed(1) + '/10' : 'n/a';
    const moyColor  = _colorVOR(m.moy);
    const interpStr = _interpretation(m.moy);

    doc.setFontSize(8);
    setNavy(false);
    doc.text(m.label, tabX + 2, y + 4.5);

    doc.setTextColor(moyColor[0], moyColor[1], moyColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(moyStr, tabX + colLabW + colMoyW / 2, y + 4.5, { align: 'center' });

    setNavy(false);
    doc.text(m.tendance, tabX + colLabW + colMoyW + colTendW / 2, y + 4.5, { align: 'center' });

    const joursBasStr = m.joursBas + '/' + m.nbJours;
    doc.text(joursBasStr, tabX + colLabW + colMoyW + colTendW + colBasW / 2, y + 4.5, { align: 'center' });

    doc.setTextColor(moyColor[0], moyColor[1], moyColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(interpStr, tabX + colLabW + colMoyW + colTendW + colBasW + colInterpW / 2, y + 4.5, { align: 'center' });

    y += rowH;
  });

  y += 2;

  // Humeur moyenne 7j
  const humeurVals7j  = entrees.map(e => e.humeur).filter(v => v !== null && v !== undefined);
  const avgHumeurPDF  = humeurVals7j.length ? _moyenne(humeurVals7j) : null;
  if (avgHumeurPDF !== null) {
    function _humeurTexte(val) {
      if (val <= 2) return 'Tres difficile';
      if (val <= 4) return 'Difficile';
      if (val <= 6) return 'Moyen';
      if (val <= 8) return 'Bien';
      return 'Excellent';
    }
    checkPage(10);
    doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, marginL + contentW, y);
    y += 4;
    doc.setFontSize(9);
    setNavy(false);
    doc.text('Ressenti general : ' + _humeurTexte(Math.round(avgHumeurPDF)), pageW / 2, y, { align: 'center' });
    y += 5;
  }

  y += 5;

  // ============================================================
  // SECTION : MES 3 POINTS A ABORDER
  // ============================================================

  checkPage(20);

  setSage(true);
  doc.setFontSize(10);
  doc.text('MES 3 POINTS A ABORDER', marginL, y);
  doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
  doc.setLineWidth(0.4);
  doc.line(marginL, y + 1.5, marginL + contentW, y + 1.5);
  y += 7;

  pointsAAborder.forEach((m, idx) => {
    const numStr       = (idx + 1) + '.';
    const couleurLabel = _colorVOR(m.moy);
    const moyStr       = m.moy !== null ? (Math.round(m.moy * 10) / 10).toFixed(1) : 'n/a';
    const niveau       = m.moy !== null
      ? (m.moy < 4 ? 'bas' : (m.moy < 7 ? 'modere' : 'correct'))
      : 'n/a';
    const joursBasStr  = m.joursBas > 0
      ? ' - ' + m.joursBas + ' jour' + (m.joursBas > 1 ? 's' : '') + ' sur ' + m.nbJours + ' en orange/rouge'
      : ' - aucun jour bas';
    const ligne = m.label + ' ' + niveau + ' (moy. ' + moyStr + '/10)' + joursBasStr;

    const lignes = doc.splitTextToSize(ligne, contentW - 14);
    checkPage(8 + (lignes.length - 1) * 5);

    doc.setFillColor(couleurLabel[0], couleurLabel[1], couleurLabel[2]);
    doc.circle(marginL + 3, y + 1.5, 2, 'F');

    doc.setFontSize(8.5);
    setNavy(true);
    doc.text(numStr, marginL + 7, y + 2.5);
    setNavy(false);
    lignes.forEach((l, li) => {
      doc.text(l, marginL + 12, y + 2.5 + li * 5);
    });
    y += 5 + (lignes.length - 1) * 5 + 3;
  });

  y += 3;

  // ============================================================
  // SECTION : JOURS REMARQUABLES
  // ============================================================

  checkPage(30);

  setSage(true);
  doc.setFontSize(10);
  doc.text('JOURS REMARQUABLES', marginL, y);
  doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
  doc.setLineWidth(0.4);
  doc.line(marginL, y + 1.5, marginL + contentW, y + 1.5);
  y += 7;

  const halfW = (contentW - 6) / 2;

  // Meilleur jour
  doc.setFillColor(VERT[0], VERT[1], VERT[2]);
  doc.roundedRect(marginL, y, halfW, 16, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Meilleur jour', marginL + halfW / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  if (meilleurJour) {
    doc.text(_dateLocale(meilleurJour.date), marginL + halfW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Score ' + (Math.round(meilleurJour.score * 10) / 10).toFixed(1) + '/10', marginL + halfW / 2, y + 14.5, { align: 'center' });
  }

  // Pire jour
  const pireX = marginL + halfW + 6;
  doc.setFillColor(ROUGE[0], ROUGE[1], ROUGE[2]);
  doc.roundedRect(pireX, y, halfW, 16, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Jour le plus difficile', pireX + halfW / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  if (pireJour) {
    doc.text(_dateLocale(pireJour.date), pireX + halfW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Score ' + (Math.round(pireJour.score * 10) / 10).toFixed(1) + '/10', pireX + halfW / 2, y + 14.5, { align: 'center' });
  }

  y += 19;

  if (meilleurJour && pireJour) {
    const ecart    = Math.abs(meilleurJour.score - pireJour.score);
    const ecartStr = (Math.round(ecart * 10) / 10).toFixed(1);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Ecart max sur la periode : ' + ecartStr + ' points', pageW / 2, y + 3, { align: 'center' });
    y += 7;
  }

  // ============================================================
  // SECTION PEM : EPISODES DE CRASH (conditionnelle)
  // ============================================================

  if (typeof window.detectPEMEvents === 'function') {
    const days7jPEM = entrees.map(e => {
      const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
        .filter(v => v !== null && v !== undefined);
      const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { date: e.date, score };
    }).filter(d => d.score !== null);

    const mesures7jMapPEM = {};
    entrees.forEach(e => {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jMapPEM['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });

    const pemEvents7j = window.detectPEMEvents(days7jPEM, mesures7jMapPEM);
    if (pemEvents7j.length > 0) {
      checkPage(25);
      y += 3;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text('EPISODES DE CRASH', marginL, y);
      doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
      doc.setLineWidth(0.4);
      doc.line(marginL, y + 1.5, marginL + contentW, y + 1.5);
      y += 7;

      const pemSum7j    = (typeof window.getPEMSummary === 'function')
        ? window.getPEMSummary(pemEvents7j)
        : { count: pemEvents7j.length, avgDelta: null };
      const avgDeltaStr = pemSum7j.avgDelta !== null ? pemSum7j.avgDelta.toFixed(1) : '-';
      const pemLine1    = pemSum7j.count + ' episode(s) detecte(s) sur 7 jours. Chute moyenne : ' + avgDeltaStr + ' points.';
      doc.setFontSize(8.5);
      setNavy(false);
      doc.text(pemLine1, marginL, y + 3.5);
      y += 6;

      const fcEvents7j = pemEvents7j.filter(ev => ev.fcJ !== null && ev.fcCrash !== null);
      if (fcEvents7j.length > 0) {
        const avgFcDelta = fcEvents7j.reduce((a, ev) => a + ev.fcDelta, 0) / fcEvents7j.length;
        const sign       = avgFcDelta >= 0 ? '+' : '';
        const pemLine2   = 'FC repos associee : ' + sign + Math.round(avgFcDelta) + ' bpm en moyenne lors des episodes.';
        doc.text(pemLine2, marginL, y + 3.5);
        y += 6;
      }

      y += 2;
    }
  }

  // ============================================================
  // SECTION CYCLE ET BIEN-ETRE (conditionnelle)
  // ============================================================

  if (typeof window.collectCycleData === 'function' && typeof window.analyzeCycleCorrelation === 'function') {
    const days7jCycle = entrees.map(e => {
      const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
        .filter(v => v !== null && v !== undefined);
      const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { date: e.date, score };
    }).filter(d => d.score !== null);

    const mesures7jCycle = {};
    entrees.forEach(e => {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jCycle['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });

    const cyclePhases7j   = window.collectCycleData(days7jCycle, mesures7jCycle, 7);
    const cycleAnalysis7j = window.analyzeCycleCorrelation(cyclePhases7j);
    const daysWithCycle7j = Object.values(cyclePhases7j).reduce((sum, arr) => sum + arr.length, 0);

    if (cycleAnalysis7j !== null && daysWithCycle7j >= 3) {
      checkPage(30);
      y += 3;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text('CYCLE ET BIEN-ETRE', marginL, y);
      doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
      doc.setLineWidth(0.4);
      doc.line(marginL, y + 1.5, marginL + contentW, y + 1.5);
      y += 7;

      const cyclePhaseLabels = {
        folliculaire:  'Folliculaire',
        ovulation:     'Ovulation',
        luteale:       'Luteale',
        menstruation:  'Regles',
        perimenopause: 'Irregulier'
      };

      let phaseDominante7j = null;
      let maxCount7j = 0;
      Object.keys(cyclePhases7j).forEach(phase => {
        if (cyclePhases7j[phase].length > maxCount7j) {
          maxCount7j = cyclePhases7j[phase].length;
          phaseDominante7j = phase;
        }
      });

      const phaseDomLabel = phaseDominante7j ? (cyclePhaseLabels[phaseDominante7j] || phaseDominante7j) : '-';
      const avgScoreDom   = phaseDominante7j && cyclePhases7j[phaseDominante7j].length
        ? (cyclePhases7j[phaseDominante7j].reduce((a, b) => a + b, 0) / cyclePhases7j[phaseDominante7j].length)
        : null;
      const avgStr        = avgScoreDom !== null ? (Math.round(avgScoreDom * 10) / 10).toFixed(1) : '-';
      const line1         = 'Phase dominante cette semaine : ' + phaseDomLabel
        + ' (' + maxCount7j + ' jour' + (maxCount7j > 1 ? 's' : '') + ').'
        + ' Score moyen : ' + avgStr + '/10.';

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(line1, marginL, y + 3.5);
      y += 6;

      // Historique 30j
      const mesures30jCycle = {};
      const today30j        = new Date();
      today30j.setHours(0, 0, 0, 0);
      const cutoff30j    = new Date(today30j);
      cutoff30j.setDate(cutoff30j.getDate() - 29);
      const cutoff30jStr = cutoff30j.toISOString().split('T')[0];
      for (let i = 29; i >= 0; i--) {
        const d30  = new Date(today30j);
        d30.setDate(d30.getDate() - i);
        const ds30 = d30.toISOString().split('T')[0];
        const raw30 = localStorage.getItem('boussole_mesures_' + ds30);
        if (!raw30) continue;
        try { mesures30jCycle['boussole_mesures_' + ds30] = JSON.parse(raw30); } catch(ex) {}
      }
      const days30jCycle     = rawEntries.filter(e => e.date >= cutoff30jStr).map(e => {
        const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
          .filter(v => v !== null && v !== undefined);
        const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { date: e.date, score };
      }).filter(d => d.score !== null);
      const cyclePhases30j   = window.collectCycleData(days30jCycle, mesures30jCycle, 30);
      const cycleAnalysis30j = window.analyzeCycleCorrelation(cyclePhases30j);
      if (cycleAnalysis30j !== null && cycleAnalysis30j.significant) {
        checkPage(10);
        const phaseMinLabel = cyclePhaseLabels[cycleAnalysis30j.phaseMin] || cycleAnalysis30j.phaseMin;
        const phaseMaxLabel = cyclePhaseLabels[cycleAnalysis30j.phaseMax] || cycleAnalysis30j.phaseMax;
        const deltaStr      = (Math.round(cycleAnalysis30j.delta * 10) / 10).toFixed(1);
        const line2         = 'Historiquement, la phase ' + phaseMinLabel
          + ' est associee a des scores plus bas (-' + deltaStr
          + ' points vs phase ' + phaseMaxLabel + ').';
        doc.text(line2, marginL, y + 3.5);
        y += 6;
      }

      y += 2;
    }
  }

  // ============================================================
  // SECTION : MESURES OBJECTIVES (conditionnelle)
  // ============================================================

  const mesuresParJour = [];
  entrees.forEach(e => {
    const raw = localStorage.getItem('boussole_mesures_' + e.date);
    if (!raw) return;
    let m;
    try { m = JSON.parse(raw); } catch (ex) { return; }
    const vals  = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(v => v !== null && v !== undefined);
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    mesuresParJour.push({
      fc:            (m.fc            !== undefined && m.fc            !== null) ? m.fc            : null,
      sommeil_duree: (m.sommeil_duree !== undefined && m.sommeil_duree !== null) ? m.sommeil_duree : null,
      ta_sys:        (m.ta_sys        !== undefined && m.ta_sys        !== null) ? m.ta_sys        : null,
      ta_dia:        (m.ta_dia        !== undefined && m.ta_dia        !== null) ? m.ta_dia        : null,
      rmssd:         (m.rmssd         !== undefined && m.rmssd         !== null) ? m.rmssd         : null,
      poids:         (m.poids         !== undefined && m.poids         !== null) ? m.poids         : null,
      score
    });
  });

  const fcValsAll           = mesuresParJour.map(d => d.fc).filter(v => v !== null);
  const sommeilDureeValsAll = mesuresParJour.map(d => d.sommeil_duree).filter(v => v !== null);
  const taValsAll           = mesuresParJour.filter(d => d.ta_sys !== null && d.ta_dia !== null);
  const rmssdValsAll        = mesuresParJour.map(d => d.rmssd).filter(v => v !== null);
  const poidsValsAll        = mesuresParJour.map(d => d.poids).filter(v => v !== null);

  const hasFc           = fcValsAll.length >= 3;
  const hasSommeilDuree = sommeilDureeValsAll.length >= 3;
  const hasTa           = taValsAll.length >= 3;
  const hasRmssd        = rmssdValsAll.length >= 3;
  const hasPoids        = poidsValsAll.length >= 3;
  const hasAnyMesure    = hasFc || hasSommeilDuree || hasTa || hasRmssd || hasPoids;

  if (hasAnyMesure) {
    const EAF0EE = [234, 240, 238];
    let mesuresBlockH = 12;
    if (hasFc)           mesuresBlockH += 6;
    if (hasSommeilDuree) mesuresBlockH += 6;
    if (hasTa)           mesuresBlockH += 6;
    if (hasRmssd)        mesuresBlockH += 6;
    if (hasPoids)        mesuresBlockH += 6;
    if (hasFc)           mesuresBlockH += 12; // correlation eventuelle
    mesuresBlockH += 8;

    checkPage(mesuresBlockH + 5);

    y += 3;
    doc.setFillColor(EAF0EE[0], EAF0EE[1], EAF0EE[2]);
    doc.rect(marginL, y, contentW, mesuresBlockH, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('DONNEES OBJECTIVES (declaratives)', marginL + 2, y + 6);
    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setLineWidth(0.2);
    doc.line(marginL, y + 8, marginL + contentW, y + 8);
    y += 12;

    doc.setFontSize(8);

    if (hasFc) {
      const fcMoy = Math.round(_moyenne(fcValsAll));
      const fcMin = Math.min(...fcValsAll);
      const fcMax = Math.max(...fcValsAll);
      setNavy(false);
      doc.text('FC repos : ' + fcMoy + ' bpm en moyenne (min ' + fcMin + ' - max ' + fcMax + ')', marginL + 2, y + 3.5);
      y += 6;
    }

    if (hasSommeilDuree) {
      const sdMoy = (_moyenne(sommeilDureeValsAll)).toFixed(1);
      setNavy(false);
      doc.text('Duree sommeil (h) - moy 7j : ' + sdMoy + 'h', marginL + 2, y + 3.5);
      y += 6;
    }

    if (hasTa) {
      const taSVals = taValsAll.map(d => d.ta_sys);
      const taDVals = taValsAll.map(d => d.ta_dia);
      const taSMoy  = Math.round(_moyenne(taSVals));
      const taDMoy  = Math.round(_moyenne(taDVals));
      const taSMin  = Math.min(...taSVals);
      const taDMin  = Math.min(...taDVals);
      const taSMax  = Math.max(...taSVals);
      const taDMax  = Math.max(...taDVals);
      setNavy(false);
      doc.text(
        'Tension : ' + taSMoy + '/' + taDMoy + ' mmHg en moyenne (min ' + taSMin + '/' + taDMin + ' - max ' + taSMax + '/' + taDMax + ')',
        marginL + 2, y + 3.5
      );
      y += 6;
    }

    if (hasRmssd) {
      const rMoy = Math.round(_moyenne(rmssdValsAll));
      const rMin = Math.min(...rmssdValsAll);
      const rMax = Math.max(...rmssdValsAll);
      setNavy(false);
      doc.text('VFC/RMSSD : ' + rMoy + ' ms en moyenne (min ' + rMin + ' - max ' + rMax + ')', marginL + 2, y + 3.5);
      y += 6;
    }

    if (hasPoids) {
      const pMoy = (_moyenne(poidsValsAll)).toFixed(1);
      const pMin = Math.min(...poidsValsAll).toFixed(1);
      const pMax = Math.max(...poidsValsAll).toFixed(1);
      setNavy(false);
      doc.text('Poids : ' + pMoy + ' kg en moyenne (min ' + pMin + ' - max ' + pMax + ')', marginL + 2, y + 3.5);
      y += 6;
    }

    // Correlation FC x score
    if (hasFc) {
      const fcParJour    = mesuresParJour.filter(d => d.fc !== null);
      const aJourFaible  = fcParJour.some(d => d.score !== null && d.score < 5);
      const aJourHaut    = fcParJour.some(d => d.score !== null && d.score >= 7);

      if (aJourFaible && aJourHaut) {
        const fcFaibles    = fcParJour.filter(d => d.score !== null && d.score < 5).map(d => d.fc);
        const fcFavorables = fcParJour.filter(d => d.score !== null && d.score >= 5).map(d => d.fc);

        if (fcFaibles.length > 0 && fcFavorables.length > 0) {
          const moyFaibles    = Math.round(_moyenne(fcFaibles));
          const moyFavorables = Math.round(_moyenne(fcFavorables));
          const diff          = Math.abs(moyFaibles - moyFavorables);

          if (diff >= 5) {
            const corrPhrase =
              'Les jours de score faible coincident avec une FC plus elevee'
              + ' (' + moyFaibles + ' bpm vs ' + moyFavorables + ' bpm les jours favorables).';
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(85, 85, 85);
            const corrLines = doc.splitTextToSize(corrPhrase, contentW - 4);
            corrLines.forEach((l, li) => {
              doc.text(l, marginL + 2, y + 3.5 + li * 5);
            });
            y += 3.5 + corrLines.length * 5 + 1;
          }
        }
      }
    }

    // Disclaimer compact
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Mesures declaratives - pas de valeur diagnostique', marginL + 2, y + 3.5);
    y += 6;
  }

  // ============================================================
  // FOOTER (toutes les pages)
  // ============================================================

  drawFooters();

  // ---- OUVERTURE ----
  doc.autoPrint();
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl, '_blank');
}

// Export global
window.genererPDFConsultation = genererPDFConsultation;
