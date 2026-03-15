/**
 * Boussole — PDF Consultation
 * Charte clinique v4 — lecture medecin 5 secondes
 *
 * Dependances : jsPDF (deja charge dans index.html)
 */

// ============================================
// PALETTE CHARTE CLINIQUE v4
// ============================================
const ANTHRACITE  = [26,  26,  26];
const TAUPE       = [138, 126, 110];
const TAUPE_LIGHT = [200, 196, 188];
const WARM_BG     = [247, 244, 240];
const LIGHT_BG    = [245, 245, 242];
const MUTED       = [153, 153, 153];
const DARK_WARM   = [122, 92,  58];
const GREEN_SOFT  = [74,  122, 90];
const SEP         = [232, 229, 224];

// ============================================
// UTILITAIRES CALCUL
// ============================================

function _moyenne(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/**
 * Tendance J1-J3 vs J5-J7 sur un tableau chronologique.
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

function _joursBasPct(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  if (v.length === 0) return 0;
  return v.filter(x => x < 5).length;
}

function _stripEmoji(str) {
  return (str || '').replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[^\x00-\x7F\u00C0-\u024F]/g, '').trim();
}

function _dateLocale(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return d + '/' + m + '/' + y;
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
  let rawEntries = (data.entries || []).map(function(e) {
    return {
      date:             e.date,
      energie:          e.energie,
      sommeil:          e.qualite_sommeil,
      confort_physique: e.douleurs,
      clarte_mentale:   e.clarte_mentale,
      note:             e.note,
      humeur:           e.humeur
    };
  });

  rawEntries.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

  const aujourd_hui = new Date();
  aujourd_hui.setHours(0, 0, 0, 0);
  const cutoff = new Date(aujourd_hui);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const entrees = rawEntries.filter(function(e) { return e.date >= cutoffStr; });

  if (entrees.length === 0) {
    alert('Aucune donnee sur les 7 derniers jours.');
    return;
  }

  // ---- CALCULS ----
  const dataEnergie = entrees.map(function(e) { return e.energie; });
  const dataSommeil = entrees.map(function(e) { return e.sommeil; });
  const dataConfort = entrees.map(function(e) { return e.confort_physique; });
  const dataClarte  = entrees.map(function(e) { return e.clarte_mentale; });

  const moyEnergie = _moyenne(dataEnergie);
  const moySommeil = _moyenne(dataSommeil);
  const moyConfort = _moyenne(dataConfort);
  const moyClarte  = _moyenne(dataClarte);

  const metriques = [
    { label: 'Energie',          moy: moyEnergie, vals: dataEnergie },
    { label: 'Sommeil',          moy: moySommeil, vals: dataSommeil },
    { label: 'Confort physique', moy: moyConfort, vals: dataConfort },
    { label: 'Clarte mentale',   moy: moyClarte,  vals: dataClarte  }
  ].map(function(m) {
    return {
      label:    m.label,
      moy:      m.moy,
      vals:     m.vals,
      tendance: _tendance7j(m.vals),
      joursBas: _joursBasPct(m.vals),
      nbJours:  m.vals.filter(function(x) { return x !== null && x !== undefined; }).length
    };
  });

  const metriquesSorted = metriques
    .filter(function(m) { return m.moy !== null; })
    .slice()
    .sort(function(a, b) { return a.moy - b.moy; });

  const pointAttention = metriquesSorted.length > 0
    && metriquesSorted[0].moy !== null
    && metriquesSorted[0].moy < 7
    ? metriquesSorted[0]
    : null;

  const derniereSaisie = entrees[entrees.length - 1].date;

  // ---- IDENTITE PATIENT ----
  const idPrenom = (localStorage.getItem('boussole_prenom') || '').trim();
  const idNom    = (localStorage.getItem('boussole_nom')    || '').trim().toUpperCase();
  const idDdn    = (localStorage.getItem('boussole_ddn')    || '').trim();
  const idTel    = (localStorage.getItem('boussole_tel')    || '').trim();

  // ---- DONNEES MEDICALES ----
  const txMed  = _stripEmoji((localStorage.getItem('boussole_medicaments') || '').trim());
  const txComp = _stripEmoji((localStorage.getItem('boussole_complements') || '').trim());
  const txAll  = _stripEmoji((localStorage.getItem('boussole_allergies')   || '').trim());

  const medLines = txMed
    ? txMed.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; })
    : [];

  const compLines = txComp
    ? txComp.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; })
    : [];

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
  const PAGE_MAX_Y = 270;
  let y = 0;

  // ---- helpers ----
  function tc(rgb, bold) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  function drawSep(yPos) {
    doc.setDrawColor(SEP[0], SEP[1], SEP[2]);
    doc.setLineWidth(0.5);
    doc.line(marginL, yPos, marginL + contentW, yPos);
  }

  function checkPage(neededH) {
    if (y + neededH > PAGE_MAX_Y) {
      doc.addPage();
      y = 15;
    }
  }

  function drawFooters() {
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      const fy = 283;
      drawSep(fy - 3);

      doc.setFontSize(8.5);
      tc(MUTED, false);
      doc.text(
        "Document d'information personnelle \xB7 Donn\xe9es auto-\xe9valu\xe9es \xB7 Pas un avis m\xe9dical",
        marginL, fy + 2
      );
      if (idTel) {
        doc.setFontSize(8);
        tc(MUTED, false);
        doc.text('Urgence : ' + idTel, marginL, fy + 6.5);
      }
      doc.setFontSize(8);
      tc(MUTED, false);
      doc.text('myboussole.fr', marginL + contentW, fy + 2, { align: 'right' });
    }
  }

  // ============================================================
  // 1. EN-TETE
  // ============================================================
  y = 14;

  // Gauche
  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('NOTE DE PRE-CONSULTATION', marginL, y);

  y += 6;
  const nomPrenom = [idPrenom, idNom].filter(Boolean).join(' ');
  doc.setFontSize(14);
  tc(ANTHRACITE, true);
  doc.text(nomPrenom || 'Patient', marginL, y);

  y += 5.5;
  const idParts = [];
  if (idDdn) {
    const ddnParts = idDdn.split('-');
    if (ddnParts.length === 3) idParts.push('N\xe9(e) le ' + ddnParts[2] + '/' + ddnParts[1] + '/' + ddnParts[0]);
  }
  if (idTel) idParts.push(idTel);
  if (idParts.length > 0) {
    doc.setFontSize(11);
    tc(MUTED, false);
    doc.text(idParts.join('  \xB7  '), marginL, y);
  }

  // Droite
  const rightX = marginL + contentW;
  doc.setFontSize(10);
  tc(MUTED, false);
  doc.text(
    'Synth\xe8se 7 jours \xB7 derni\xe8re saisie ' + _dateLocale(derniereSaisie),
    rightX, 14, { align: 'right' }
  );
  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('myboussole.fr \xB7 scores auto-\xe9valu\xe9s 0-10', rightX, 19.5, { align: 'right' });

  y += 6;
  drawSep(y);
  y += 5;

  // ============================================================
  // 2. MOTIF DE CONSULTATION
  // ============================================================
  checkPage(20);

  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('MOTIF DE CONSULTATION', marginL, y);
  y += 5;

  if (noteTrimmed.length === 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Non renseign\xe9', marginL, y);
    y += 8;
  } else {
    const noteLines = doc.splitTextToSize(noteTrimmed, contentW);
    doc.setFontSize(13);
    tc(ANTHRACITE, false);
    noteLines.forEach(function(l, li) { doc.text(l, marginL, y + li * 6.5); });
    y += noteLines.length * 6.5 + 2;
  }

  drawSep(y);
  y += 5;

  // ============================================================
  // 3. TRAITEMENT EN COURS
  // ============================================================
  checkPage(30);

  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('TRAITEMENT EN COURS', marginL, y);
  y += 5;

  const colTW = (contentW - 8) / 2;
  const colLX = marginL;
  const colRX = marginL + colTW + 8;
  const lineH  = 5.5;
  const padV   = 6;
  const labelH = 5.5;

  // Preparer lignes col gauche (medicaments + allergies)
  const leftItems = [];
  if (medLines.length === 0) {
    leftItems.push({ text: 'Non renseign\xe9', italic: true, color: MUTED, bold: false });
  } else {
    medLines.forEach(function(ml) {
      doc.setFontSize(11.5);
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(ml, colTW - 8);
      wrapped.forEach(function(wl) { leftItems.push({ text: wl, italic: false, color: ANTHRACITE, bold: false }); });
    });
  }
  if (txAll && txAll.toUpperCase() !== 'RAS') {
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    const wrapped = doc.splitTextToSize('Allergies : ' + txAll, colTW - 8);
    wrapped.forEach(function(wl) { leftItems.push({ text: wl, italic: false, color: DARK_WARM, bold: true }); });
  }

  // Preparer lignes col droite (complements)
  const rightItems = [];
  if (compLines.length === 0) {
    rightItems.push({ text: 'Non renseign\xe9', italic: true, color: MUTED, bold: false });
  } else {
    compLines.forEach(function(cl) {
      doc.setFontSize(11.5);
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(cl, colTW - 8);
      wrapped.forEach(function(wl) { rightItems.push({ text: wl, italic: false, color: ANTHRACITE, bold: false }); });
    });
  }

  const leftH  = padV + labelH + leftItems.length  * lineH + padV;
  const rightH = padV + labelH + rightItems.length * lineH + padV;
  const traitH = Math.max(leftH, rightH, 20);

  checkPage(traitH + 5);

  // Col gauche — medicaments
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.rect(colLX, y, colTW, traitH, 'F');
  doc.setDrawColor(TAUPE[0], TAUPE[1], TAUPE[2]);
  doc.setLineWidth(2);
  doc.line(colLX, y, colLX, y + traitH);
  doc.setLineWidth(0.1);
  doc.setFontSize(10);
  tc(MUTED, false);
  doc.text('M\xe9dicaments', colLX + 5, y + padV);
  let lty = y + padV + labelH;
  leftItems.forEach(function(item) {
    doc.setFontSize(11.5);
    doc.setFont('helvetica', item.bold ? 'bold' : (item.italic ? 'italic' : 'normal'));
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.text, colLX + 5, lty);
    lty += lineH;
  });

  // Col droite — complements
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.rect(colRX, y, colTW, traitH, 'F');
  doc.setDrawColor(TAUPE_LIGHT[0], TAUPE_LIGHT[1], TAUPE_LIGHT[2]);
  doc.setLineWidth(2);
  doc.line(colRX, y, colRX, y + traitH);
  doc.setLineWidth(0.1);
  doc.setFontSize(10);
  tc(MUTED, false);
  doc.text('Compl\xe9ments', colRX + 5, y + padV);
  let rty = y + padV + labelH;
  rightItems.forEach(function(item) {
    doc.setFontSize(11.5);
    doc.setFont('helvetica', item.bold ? 'bold' : (item.italic ? 'italic' : 'normal'));
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.text, colRX + 5, rty);
    rty += lineH;
  });

  y += traitH + 5;
  drawSep(y);
  y += 5;

  // ============================================================
  // 4. PROBLEME PRINCIPAL — BLOC DOMINANT
  // ============================================================
  checkPage(40);

  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('PROBLEME PRINCIPAL', marginL, y);
  y += 5;

  if (pointAttention === null) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Aucun probl\xe8me identifi\xe9 cette semaine', marginL, y);
    y += 8;
  } else {
    const titreMap = {
      'Energie':          'Fatigue persistante',
      'Sommeil':          'Sommeil insuffisant malgr\xe9 traitement',
      'Confort physique': 'G\xeane physique persistante',
      'Clarte mentale':   'Brouillard mental persistant'
    };
    const titreBloc = titreMap[pointAttention.label] || (pointAttention.label + ' alt\xe9r\xe9');

    // Retentissement : les autres metriques
    const autresM = metriques.filter(function(m) {
      return m.label !== pointAttention.label && m.moy !== null;
    });
    const retentParts = autresM.map(function(m) {
      const ms  = (Math.round(m.moy * 10) / 10).toFixed(1);
      const q   = m.moy >= 7 ? 'correcte' : (m.moy >= 4 ? 'mod. alt\xe9r\xe9e' : 'alt\xe9r\xe9e');
      const lbl = m.label === 'Confort physique' ? 'Confort' : m.label;
      return lbl + ' ' + ms + '/10 ' + q;
    });
    const retentText = retentParts.join(' \xB7 ');

    // Pre-calculer wraps
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    const titreLines = doc.splitTextToSize(titreBloc, contentW - 18);

    const inlineW    = contentW - 18;
    const inlineColW = Math.floor(inlineW / 3);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const retentWrapped = doc.splitTextToSize(retentText, inlineColW - 4);

    const inlineH   = 5 + 12 + Math.max(0, retentWrapped.length - 1) * 5;
    const blocDomH  = 10 + titreLines.length * 8 + 6 + inlineH + 10;

    checkPage(blocDomH + 5);

    // Fond + bordure gauche
    doc.setFillColor(WARM_BG[0], WARM_BG[1], WARM_BG[2]);
    doc.rect(marginL, y, contentW, blocDomH, 'F');
    doc.setDrawColor(TAUPE[0], TAUPE[1], TAUPE[2]);
    doc.setLineWidth(3);
    doc.line(marginL, y, marginL, y + blocDomH);
    doc.setLineWidth(0.1);

    // Titre
    let ty2 = y + 10;
    doc.setFontSize(15);
    tc(ANTHRACITE, true);
    titreLines.forEach(function(l, li) { doc.text(l, marginL + 12, ty2 + li * 8); });
    ty2 += titreLines.length * 8 + 6;

    // 3 blocs inline
    const inlineStartX = marginL + 12;

    // Col 1 : Moyenne 7 jours
    const col1X = inlineStartX;
    const col2X = inlineStartX + inlineColW;
    const col3X = inlineStartX + inlineColW * 2;

    const moyValStr      = (Math.round(pointAttention.moy * 10) / 10).toFixed(1);
    const joursMauvaisStr = String(pointAttention.joursBas);

    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('Moyenne 7 jours', col1X, ty2);
    doc.setFontSize(20);
    tc(DARK_WARM, true);
    doc.text(moyValStr, col1X, ty2 + 10);
    doc.setFontSize(12);
    tc(MUTED, false);
    doc.text('/10', col1X + doc.getTextWidth(moyValStr) + 1, ty2 + 10);

    // Col 2 : Jours mauvais
    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('Jours mauvais', col2X, ty2);
    doc.setFontSize(20);
    tc(DARK_WARM, true);
    doc.text(joursMauvaisStr, col2X, ty2 + 10);
    doc.setFontSize(12);
    tc(MUTED, false);
    doc.text('/7', col2X + doc.getTextWidth(joursMauvaisStr) + 1, ty2 + 10);

    // Col 3 : Retentissement
    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('Retentissement', col3X, ty2);
    doc.setFontSize(11);
    tc(ANTHRACITE, false);
    retentWrapped.forEach(function(l, li) { doc.text(l, col3X, ty2 + 7 + li * 5); });

    y += blocDomH + 5;
  }

  drawSep(y);
  y += 5;

  // ============================================================
  // 5. SYNTHESE FONCTIONNELLE
  // ============================================================
  checkPage(50);

  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('SYNTHESE FONCTIONNELLE - 7 JOURS', marginL, y);
  y += 5;

  const tabX      = marginL;
  const tabW      = contentW;
  const colDomW   = tabW * 0.26;
  const colMoyW2  = tabW * 0.13;
  const colJoursW = tabW * 0.15;
  const colTendW2 = tabW * 0.20;
  const colComW   = tabW * 0.26;
  const rowH2     = 7.5;

  checkPage(rowH2 + metriques.length * rowH2 + 4);

  // En-tete — fond blanc, labels MUTED
  doc.setFillColor(255, 255, 255);
  doc.rect(tabX, y, tabW, rowH2, 'F');
  doc.setFontSize(10);
  tc(MUTED, false);
  doc.text('Domaine',     tabX + 2,                                                                    y + 5);
  doc.text('Moy.',        tabX + colDomW + colMoyW2 / 2,                                               y + 5, { align: 'center' });
  doc.text('J. mauvais',  tabX + colDomW + colMoyW2 + colJoursW / 2,                                   y + 5, { align: 'center' });
  doc.text('Tendance',    tabX + colDomW + colMoyW2 + colJoursW + colTendW2 / 2,                        y + 5, { align: 'center' });
  doc.text('Commentaire', tabX + colDomW + colMoyW2 + colJoursW + colTendW2 + colComW / 2,              y + 5, { align: 'center' });
  y += rowH2;

  metriques.forEach(function(m, idx) {
    const isProb = !!(pointAttention && m.label === pointAttention.label);
    const bg = isProb ? WARM_BG : (idx % 2 === 0 ? [255, 255, 255] : LIGHT_BG);

    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(tabX, y, tabW, rowH2, 'F');

    const moyStr2   = m.moy !== null ? (Math.round(m.moy * 10) / 10).toFixed(1) : 'n/a';
    const joursStr2 = m.joursBas + '/' + m.nbJours;

    let tendTxt, tendColor;
    if      (m.tendance === 'Hausse') { tendTxt = 'am\xe9lioration'; tendColor = GREEN_SOFT; }
    else if (m.tendance === 'Baisse') { tendTxt = 'aggravation';    tendColor = DARK_WARM;  }
    else                              { tendTxt = 'stable';         tendColor = MUTED;      }

    let comTxt, comColor, comBold;
    if      (m.moy === null) { comTxt = '-';             comColor = MUTED;      comBold = false; }
    else if (m.moy < 4)      { comTxt = 'alt\xe9r\xe9';  comColor = DARK_WARM;  comBold = true;  }
    else if (m.moy < 7)      { comTxt = 'mod. alt\xe9r\xe9'; comColor = MUTED; comBold = false; }
    else                     { comTxt = 'correct';       comColor = GREEN_SOFT; comBold = false; }

    const domBold = isProb;
    doc.setFontSize(8.5);
    tc(isProb ? DARK_WARM : ANTHRACITE, domBold);
    doc.text(m.label, tabX + 2, y + 5);

    tc(isProb ? DARK_WARM : ANTHRACITE, domBold);
    doc.text(moyStr2, tabX + colDomW + colMoyW2 / 2, y + 5, { align: 'center' });

    tc(isProb ? DARK_WARM : ANTHRACITE, domBold);
    doc.text(joursStr2, tabX + colDomW + colMoyW2 + colJoursW / 2, y + 5, { align: 'center' });

    tc(tendColor, false);
    doc.text(tendTxt, tabX + colDomW + colMoyW2 + colJoursW + colTendW2 / 2, y + 5, { align: 'center' });

    tc(comColor, comBold);
    doc.text(comTxt, tabX + colDomW + colMoyW2 + colJoursW + colTendW2 + colComW / 2, y + 5, { align: 'center' });

    y += rowH2;
  });

  y += 4;
  drawSep(y);
  y += 5;

  // ============================================================
  // 6. BLOC SOMMEIL CIBLE (conditionnel)
  // ============================================================

  const noteLC = noteTrimmed.toLowerCase();
  const triggerSommeil = noteLC.indexOf('sommeil') !== -1
    || noteLC.indexOf('quviviq') !== -1
    || noteLC.indexOf('hypnotique') !== -1
    || noteLC.indexOf('insomnie') !== -1
    || (pointAttention !== null && pointAttention.label === 'Sommeil');

  if (triggerSommeil) {
    checkPage(25);

    const somBlocH = 22;
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(marginL, y, contentW, somBlocH, 'F');
    doc.setDrawColor(TAUPE_LIGHT[0], TAUPE_LIGHT[1], TAUPE_LIGHT[2]);
    doc.setLineWidth(0.5);
    doc.rect(marginL, y, contentW, somBlocH, 'S');
    doc.setLineWidth(0.1);

    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('DETAIL SOMMEIL - DONN\xc9ES D\xc9CLARATIVES', marginL + 5, y + 7);

    const somMoyStr  = moySommeil !== null
      ? (Math.round(moySommeil * 10) / 10).toFixed(1) + '/10'
      : 'n/a';
    const somJoursStr = _joursBasPct(dataSommeil) + '/7';

    let plainteTxt = 'insomnie de maintien';
    if (noteLC.indexOf('endormissement') !== -1)         plainteTxt = "insomnie d'endormissement";
    else if (noteLC.indexOf('r\xe9veil') !== -1 || noteLC.indexOf('reveil') !== -1) plainteTxt = 'r\xe9veils nocturnes';
    else if (moySommeil !== null && moySommeil < 5)      plainteTxt = 'insomnie de maintien';

    doc.setFontSize(11);
    tc(ANTHRACITE, false);
    doc.text(
      'Score moyen : ' + somMoyStr
      + '   \xB7   Jours mauvais : ' + somJoursStr
      + '   \xB7   Plainte : ' + plainteTxt,
      marginL + 5, y + 16
    );

    y += somBlocH + 5;
    drawSep(y);
    y += 5;
  }

  // ============================================================
  // 7. DONNEES OBJECTIVES DECLARATIVES (conditionnelle)
  // ============================================================

  const mesuresParJour = [];
  entrees.forEach(function(e) {
    const raw = localStorage.getItem('boussole_mesures_' + e.date);
    if (!raw) return;
    let m;
    try { m = JSON.parse(raw); } catch (ex) { return; }
    const vals  = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(function(v) { return v !== null && v !== undefined; });
    const score = vals.length ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
    mesuresParJour.push({
      fc:            (m.fc            !== undefined && m.fc            !== null) ? m.fc            : null,
      sommeil_duree: (m.sommeil_duree !== undefined && m.sommeil_duree !== null) ? m.sommeil_duree : null,
      ta_sys:        (m.ta_sys        !== undefined && m.ta_sys        !== null) ? m.ta_sys        : null,
      ta_dia:        (m.ta_dia        !== undefined && m.ta_dia        !== null) ? m.ta_dia        : null,
      rmssd:         (m.rmssd         !== undefined && m.rmssd         !== null) ? m.rmssd         : null,
      poids:         (m.poids         !== undefined && m.poids         !== null) ? m.poids         : null,
      score: score
    });
  });

  const fcValsAll           = mesuresParJour.map(function(d) { return d.fc; }).filter(function(v) { return v !== null; });
  const sommeilDureeValsAll = mesuresParJour.map(function(d) { return d.sommeil_duree; }).filter(function(v) { return v !== null; });
  const taValsAll           = mesuresParJour.filter(function(d) { return d.ta_sys !== null && d.ta_dia !== null; });
  const rmssdValsAll        = mesuresParJour.map(function(d) { return d.rmssd; }).filter(function(v) { return v !== null; });
  const poidsValsAll        = mesuresParJour.map(function(d) { return d.poids; }).filter(function(v) { return v !== null; });

  const hasFc           = fcValsAll.length >= 3;
  const hasSommeilDuree = sommeilDureeValsAll.length >= 3;
  const hasTa           = taValsAll.length >= 3;
  const hasRmssd        = rmssdValsAll.length >= 3;
  const hasPoids        = poidsValsAll.length >= 3;
  const hasAnyMesure    = hasFc || hasSommeilDuree || hasTa || hasRmssd || hasPoids;

  if (hasAnyMesure) {
    let mesBlockH = 12;
    if (hasFc)           mesBlockH += 6;
    if (hasSommeilDuree) mesBlockH += 6;
    if (hasTa)           mesBlockH += 6;
    if (hasRmssd)        mesBlockH += 6;
    if (hasPoids)        mesBlockH += 6;
    if (hasFc)           mesBlockH += 12;
    mesBlockH += 8;

    checkPage(mesBlockH + 10);

    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('DONN\xc9ES OBJECTIVES D\xc9CLARATIVES', marginL, y);
    y += 5;

    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(marginL, y, contentW, mesBlockH, 'F');
    let my = y + 8;

    doc.setFontSize(11);
    if (hasFc) {
      const fcMoy = Math.round(_moyenne(fcValsAll));
      const fcMin = Math.min.apply(null, fcValsAll);
      const fcMax = Math.max.apply(null, fcValsAll);
      tc(ANTHRACITE, false);
      doc.text('FC repos : ' + fcMoy + ' bpm moy. (min ' + fcMin + ' - max ' + fcMax + ')', marginL + 5, my);
      my += 6;
    }
    if (hasSommeilDuree) {
      const sdMoy = _moyenne(sommeilDureeValsAll).toFixed(1);
      tc(ANTHRACITE, false);
      doc.text('Dur\xe9e sommeil : ' + sdMoy + 'h moy.', marginL + 5, my);
      my += 6;
    }
    if (hasTa) {
      const taSVals = taValsAll.map(function(d) { return d.ta_sys; });
      const taDVals = taValsAll.map(function(d) { return d.ta_dia; });
      const taSMoy  = Math.round(_moyenne(taSVals));
      const taDMoy  = Math.round(_moyenne(taDVals));
      const taSMin  = Math.min.apply(null, taSVals); const taDMin = Math.min.apply(null, taDVals);
      const taSMax  = Math.max.apply(null, taSVals); const taDMax = Math.max.apply(null, taDVals);
      tc(ANTHRACITE, false);
      doc.text(
        'Tension : ' + taSMoy + '/' + taDMoy + ' mmHg moy. (min ' + taSMin + '/' + taDMin + ' - max ' + taSMax + '/' + taDMax + ')',
        marginL + 5, my
      );
      my += 6;
    }
    if (hasRmssd) {
      const rMoy = Math.round(_moyenne(rmssdValsAll));
      const rMin = Math.min.apply(null, rmssdValsAll);
      const rMax = Math.max.apply(null, rmssdValsAll);
      tc(ANTHRACITE, false);
      doc.text('VFC/RMSSD : ' + rMoy + ' ms moy. (min ' + rMin + ' - max ' + rMax + ')', marginL + 5, my);
      my += 6;
    }
    if (hasPoids) {
      const pMoy = _moyenne(poidsValsAll).toFixed(1);
      const pMin = Math.min.apply(null, poidsValsAll).toFixed(1);
      const pMax = Math.max.apply(null, poidsValsAll).toFixed(1);
      tc(ANTHRACITE, false);
      doc.text('Poids : ' + pMoy + ' kg moy. (min ' + pMin + ' - max ' + pMax + ')', marginL + 5, my);
      my += 6;
    }

    // Correlation FC x score
    if (hasFc) {
      const fcParJour   = mesuresParJour.filter(function(d) { return d.fc !== null; });
      const aJourFaible = fcParJour.some(function(d) { return d.score !== null && d.score < 5; });
      const aJourHaut   = fcParJour.some(function(d) { return d.score !== null && d.score >= 7; });
      if (aJourFaible && aJourHaut) {
        const fcFaibles    = fcParJour.filter(function(d) { return d.score !== null && d.score < 5; }).map(function(d) { return d.fc; });
        const fcFavorables = fcParJour.filter(function(d) { return d.score !== null && d.score >= 5; }).map(function(d) { return d.fc; });
        if (fcFaibles.length > 0 && fcFavorables.length > 0) {
          const moyFaibles    = Math.round(_moyenne(fcFaibles));
          const moyFavorables = Math.round(_moyenne(fcFavorables));
          const diff          = Math.abs(moyFaibles - moyFavorables);
          if (diff >= 5) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            const corrLines = doc.splitTextToSize(
              'FC \xe9lev\xe9e les jours de score faible (' + moyFaibles + ' bpm vs ' + moyFavorables + ' bpm les jours favorables).',
              contentW - 10
            );
            corrLines.forEach(function(l, li) { doc.text(l, marginL + 5, my + li * 4.5); });
            my += corrLines.length * 4.5 + 2;
          }
        }
      }
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Mesures d\xe9claratives - pas de valeur diagnostique', marginL + 5, my + 4);

    y += mesBlockH + 5;
    drawSep(y);
    y += 5;
  }

  // ============================================================
  // 8. EPISODES DE CRASH (conditionnel)
  // ============================================================

  if (typeof window.detectPEMEvents === 'function') {
    const days7jPEM = entrees.map(function(e) {
      const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
        .filter(function(v) { return v !== null && v !== undefined; });
      const score = vals.length ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
      return { date: e.date, score: score };
    }).filter(function(d) { return d.score !== null; });

    const mesures7jMapPEM = {};
    entrees.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jMapPEM['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });

    const pemEvents7j = window.detectPEMEvents(days7jPEM, mesures7jMapPEM);
    if (pemEvents7j.length > 0) {
      checkPage(25);

      doc.setFontSize(9);
      tc(MUTED, false);
      doc.text('\xc9PISODES DE CRASH', marginL, y);
      y += 5;

      const pemSum7j    = (typeof window.getPEMSummary === 'function')
        ? window.getPEMSummary(pemEvents7j)
        : { count: pemEvents7j.length, avgDelta: null };
      const avgDeltaStr = pemSum7j.avgDelta !== null ? pemSum7j.avgDelta.toFixed(1) : '-';

      doc.setFontSize(11);
      tc(ANTHRACITE, false);
      doc.text(
        pemSum7j.count + ' \xe9pisode(s) d\xe9tect\xe9(s) sur 7 jours. Chute moyenne : ' + avgDeltaStr + ' points.',
        marginL, y + 3.5
      );
      y += 7;

      const fcEvents7j = pemEvents7j.filter(function(ev) { return ev.fcJ !== null && ev.fcCrash !== null; });
      if (fcEvents7j.length > 0) {
        const avgFcDelta = fcEvents7j.reduce(function(a, ev) { return a + ev.fcDelta; }, 0) / fcEvents7j.length;
        const sign       = avgFcDelta >= 0 ? '+' : '';
        doc.text(
          'FC repos associ\xe9e : ' + sign + Math.round(avgFcDelta) + ' bpm en moyenne lors des \xe9pisodes.',
          marginL, y + 3.5
        );
        y += 7;
      }

      drawSep(y);
      y += 5;
    }
  }

  // ============================================================
  // CYCLE HORMONAL (conditionnel — logique conservee)
  // ============================================================

  if (typeof window.collectCycleData === 'function' && typeof window.analyzeCycleCorrelation === 'function') {
    const days7jCycle = entrees.map(function(e) {
      const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
        .filter(function(v) { return v !== null && v !== undefined; });
      const score = vals.length ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
      return { date: e.date, score: score };
    }).filter(function(d) { return d.score !== null; });

    const mesures7jCycle = {};
    entrees.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jCycle['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });

    const cyclePhases7j   = window.collectCycleData(days7jCycle, mesures7jCycle, 7);
    const cycleAnalysis7j = window.analyzeCycleCorrelation(cyclePhases7j);
    const daysWithCycle7j = Object.values(cyclePhases7j).reduce(function(sum, arr) { return sum + arr.length; }, 0);

    if (cycleAnalysis7j !== null && daysWithCycle7j >= 3) {
      checkPage(30);

      doc.setFontSize(9);
      tc(MUTED, false);
      doc.text('CYCLE ET BIEN-\xcaTRE', marginL, y);
      y += 5;

      const cyclePhaseLabels = {
        folliculaire:  'Folliculaire',
        ovulation:     'Ovulation',
        luteale:       'Lut\xe9ale',
        menstruation:  'R\xe8gles',
        perimenopause: 'Irr\xe9gulier'
      };

      let phaseDominante7j = null;
      let maxCount7j = 0;
      Object.keys(cyclePhases7j).forEach(function(phase) {
        if (cyclePhases7j[phase].length > maxCount7j) {
          maxCount7j = cyclePhases7j[phase].length;
          phaseDominante7j = phase;
        }
      });

      const phaseDomLabel = phaseDominante7j ? (cyclePhaseLabels[phaseDominante7j] || phaseDominante7j) : '-';
      const avgScoreDom   = phaseDominante7j && cyclePhases7j[phaseDominante7j].length
        ? cyclePhases7j[phaseDominante7j].reduce(function(a, b) { return a + b; }, 0) / cyclePhases7j[phaseDominante7j].length
        : null;
      const avgStr        = avgScoreDom !== null ? (Math.round(avgScoreDom * 10) / 10).toFixed(1) : '-';
      const line1         = 'Phase dominante cette semaine : ' + phaseDomLabel
        + ' (' + maxCount7j + ' jour' + (maxCount7j > 1 ? 's' : '') + ').'
        + ' Score moyen : ' + avgStr + '/10.';

      doc.setFontSize(11);
      tc(ANTHRACITE, false);
      doc.text(line1, marginL, y + 3.5);
      y += 7;

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
        const ds30  = d30.toISOString().split('T')[0];
        const raw30 = localStorage.getItem('boussole_mesures_' + ds30);
        if (!raw30) continue;
        try { mesures30jCycle['boussole_mesures_' + ds30] = JSON.parse(raw30); } catch(ex) {}
      }
      const days30jCycle = rawEntries.filter(function(e) { return e.date >= cutoff30jStr; }).map(function(e) {
        const vals = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
          .filter(function(v) { return v !== null && v !== undefined; });
        const score = vals.length ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
        return { date: e.date, score: score };
      }).filter(function(d) { return d.score !== null; });
      const cyclePhases30j   = window.collectCycleData(days30jCycle, mesures30jCycle, 30);
      const cycleAnalysis30j = window.analyzeCycleCorrelation(cyclePhases30j);
      if (cycleAnalysis30j !== null && cycleAnalysis30j.significant) {
        checkPage(10);
        const phaseMinLabel = cyclePhaseLabels[cycleAnalysis30j.phaseMin] || cycleAnalysis30j.phaseMin;
        const phaseMaxLabel = cyclePhaseLabels[cycleAnalysis30j.phaseMax] || cycleAnalysis30j.phaseMax;
        const deltaStr      = (Math.round(cycleAnalysis30j.delta * 10) / 10).toFixed(1);
        const line2         = 'Historiquement, la phase ' + phaseMinLabel
          + ' est associ\xe9e \xe0 des scores plus bas (-' + deltaStr
          + ' points vs phase ' + phaseMaxLabel + ').';
        doc.text(line2, marginL, y + 3.5);
        y += 7;
      }

      drawSep(y);
      y += 5;
    }
  }

  // ============================================================
  // FOOTER (toutes les pages)
  // ============================================================
  drawFooters();

  doc.autoPrint();
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl, '_blank');
}

// Export global
window.genererPDFConsultation = genererPDFConsultation;
