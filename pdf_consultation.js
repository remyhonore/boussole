/**
 * Boussole — PDF Consultation
 * Charte clinique v4 — lecture medecin 5 secondes
 *
 * Dependances : jsPDF (deja charge dans index.html)
 */

// ============================================
// UTILS DATE LOCALE
// ============================================
function _localDateStr(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// ============================================
// PALETTE CHARTE CLINIQUE v4
// ============================================
const ANTHRACITE  = [26,  26,  26];
const TAUPE       = [120, 120, 120];
const TAUPE_LIGHT = [190, 190, 190];
const WARM_BG     = [235, 235, 235];
const LIGHT_BG    = [248, 248, 248];
const MUTED       = [153, 153, 153];
const DARK_WARM   = [80,  80,  80];
const GREEN_SOFT  = [100, 100, 100];
const SEP         = [220, 220, 220];

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

function genererPDFConsultation(motifItems, noteLibre) {
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
  const cutoffStr = _localDateStr(cutoff);
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

  // VOR -- repartition type de journees
  let nbVert = 0, nbOrange = 0, nbRouge = 0;
  entrees.forEach(function(e) {
    const vv = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(function(v) { return v !== null && v !== undefined; });
    if (vv.length === 0) return;
    const s = vv.reduce(function(a, b) { return a + b; }, 0) / vv.length;
    if (s >= 7) nbVert++;
    else if (s >= 4) nbOrange++;
    else nbRouge++;
  });
  const totalJoursVOR = nbVert + nbOrange + nbRouge;
  const pctVert   = totalJoursVOR ? Math.round(nbVert   / totalJoursVOR * 100) : 0;
  const pctOrange = totalJoursVOR ? Math.round(nbOrange / totalJoursVOR * 100) : 0;
  const pctRouge  = totalJoursVOR ? Math.round(nbRouge  / totalJoursVOR * 100) : 0;

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
        .map(function(ml) { return ml.replace(/(\d)(mg|µg|g|ml|mcg)/gi, '$1 $2'); })
    : [];

  const compLines = txComp
    ? txComp.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; })
    : [];

  // Normaliser motifItems et noteLibre
  let motifList = Array.isArray(motifItems) ? motifItems : [];
  let noteLibreTrimmed = _stripEmoji((noteLibre || '').trim());

  // Fallback localStorage si rien fourni (ex: appel direct sans modale)
  if (motifList.length === 0 && noteLibreTrimmed.length === 0) {
    const stored = _stripEmoji((localStorage.getItem('boussole_note_consultation') || '').trim());
    if (stored) {
      const dashIdx = stored.indexOf(' \u2014 ');
      const cocheesPart = dashIdx !== -1 ? stored.slice(0, dashIdx) : stored;
      const notePart    = dashIdx !== -1 ? stored.slice(dashIdx + 3) : '';
      motifList = cocheesPart ? cocheesPart.split(' \u00b7 ').map(function(s) { return s.trim(); }).filter(Boolean) : [];
      noteLibreTrimmed = notePart.trim();
    }
  }

  // noteTrimmed : texte combiné utilisé pour détection de mots-clés
  const noteTrimmed = [motifList.join(' '), noteLibreTrimmed].filter(Boolean).join(' ');

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
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('d\xe9clar\xe9 par le patient', marginL, y);
  y += 5;

  if (motifList.length === 0 && noteLibreTrimmed.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Aucun motif saisi', marginL, y);
    y += 7;
  } else {
    doc.setFontSize(9);
    motifList.forEach(function(item) {
      tc(ANTHRACITE, false);
      const itemLines = doc.splitTextToSize('- ' + item, contentW);
      itemLines.forEach(function(l) { doc.text(l, marginL, y); y += 5; });
    });
    if (noteLibreTrimmed.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(ANTHRACITE[0], ANTHRACITE[1], ANTHRACITE[2]);
      const precLines = doc.splitTextToSize(noteLibreTrimmed, contentW);
      precLines.forEach(function(l) { doc.text(l, marginL, y); y += 5; });
    }
    y += 2;
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
      const q   = m.moy >= 7 ? 'correcte' : (m.moy >= 4 ? 'mod\xe9r\xe9ment alt\xe9r\xe9e' : 'alt\xe9r\xe9e');
      const lbl = m.label === 'Confort physique' ? 'Confort' : m.label;
      return lbl + ' ' + ms + '/10 ' + q;
    });
    // Pre-calculer wraps
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    const titreLines = doc.splitTextToSize(titreBloc, contentW - 18);

    const inlineW    = contentW - 18;
    const inlineColW = Math.floor(inlineW / 3);

    const inlineH   = 5 + 12 + Math.max(0, retentParts.length - 1) * 5;
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
    var mw1 = doc.getTextWidth(moyValStr);
    doc.setFontSize(12);
    tc(MUTED, false);
    doc.text('/10', col1X + mw1 + 1, ty2 + 10);

    // Col 2 : Jours mauvais
    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('Jours mauvais', col2X, ty2);
    doc.setFontSize(20);
    tc(DARK_WARM, true);
    doc.text(joursMauvaisStr, col2X, ty2 + 10);
    var mw2 = doc.getTextWidth(joursMauvaisStr);
    doc.setFontSize(12);
    tc(MUTED, false);
    doc.text('/7', col2X + mw2 + 1, ty2 + 10);

    // Col 3 : Retentissement
    doc.setFontSize(9);
    tc(MUTED, false);
    doc.text('Retentissement', col3X, ty2);
    doc.setFontSize(9);
    tc(ANTHRACITE, false);
    retentParts.forEach(function(part, pi) {
      doc.text(part, col3X, ty2 + 7 + pi * 5);
    });

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
  doc.text('Impact', tabX + colDomW + colMoyW2 + colJoursW + colTendW2 + colComW / 2,              y + 5, { align: 'center' });
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
    else if (m.moy < 7)      { comTxt = 'mod\xe9r\xe9ment alt\xe9r\xe9'; comColor = MUTED; comBold = false; }
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

  // Ligne Stabilite 30j
  if (typeof window.computeStabilityScore === 'function') {
    var stabData = window.computeStabilityScore();
    if (stabData !== null) {
      checkPage(rowH2);
      var stabIdx = metriques.length;
      var stabBg = stabIdx % 2 === 0 ? [255, 255, 255] : LIGHT_BG;
      doc.setFillColor(stabBg[0], stabBg[1], stabBg[2]);
      doc.rect(tabX, y, tabW, rowH2, 'F');

      var stabValStr   = stabData.stdDev30.toFixed(1);
      var stabTendTxt, stabTendColor, stabComTxt, stabComColor, stabComBold;

      if (stabData.trend === 'amelioration') {
        stabTendTxt   = 'Bonne';     stabTendColor = GREEN_SOFT;
        stabComTxt    = '->';        stabComColor  = GREEN_SOFT; stabComBold = false;
      } else if (stabData.trend === 'stable') {
        stabTendTxt   = 'Stable';    stabTendColor = MUTED;
        stabComTxt    = '->';        stabComColor  = MUTED;      stabComBold = false;
      } else {
        stabTendTxt   = 'Variable';  stabTendColor = DARK_WARM;
        stabComTxt    = '/!\\';      stabComColor  = DARK_WARM;  stabComBold = true;
      }

      doc.setFontSize(8.5);
      tc(ANTHRACITE, false);
      doc.text('Stabilite 30j', tabX + 2, y + 5);

      tc(ANTHRACITE, false);
      doc.text(stabValStr, tabX + colDomW + colMoyW2 / 2, y + 5, { align: 'center' });

      tc(MUTED, false);
      doc.text('-', tabX + colDomW + colMoyW2 + colJoursW / 2, y + 5, { align: 'center' });

      tc(stabTendColor, false);
      doc.text(stabTendTxt, tabX + colDomW + colMoyW2 + colJoursW + colTendW2 / 2, y + 5, { align: 'center' });

      tc(stabComColor, stabComBold);
      doc.text(stabComTxt, tabX + colDomW + colMoyW2 + colJoursW + colTendW2 + colComW / 2, y + 5, { align: 'center' });

      y += rowH2;
    }
  }

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
        pemSum7j.count + ' \xe9pisode de d\xe9gradation fonctionnelle d\xe9tect\xe9 sur 7 jours. Chute moyenne : ' + avgDeltaStr + ' points.',
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
      const cutoff30jStr = _localDateStr(cutoff30j);
      for (let i = 29; i >= 0; i--) {
        const d30  = new Date(today30j);
        d30.setDate(d30.getDate() - i);
        const ds30  = _localDateStr(d30);
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
  // TYPE DE JOURNEES — repartition Vert / Orange / Rouge
  // ============================================================
  checkPage(22);

  const VOR_VERT   = [100, 100, 100];
  const VOR_ORANGE = [150, 150, 150];
  const VOR_ROUGE  = [60,  60,  60];

  doc.setFontSize(9);
  tc(MUTED, false);
  doc.text('TYPE DE JOURN\xc9ES - 7 JOURS', marginL, y);
  y += 5;

  const vorItems = [
    { label: 'Hauts : '  + nbVert   + 'j (' + pctVert   + '%)', color: VOR_VERT   },
    { label: 'Moyens : ' + nbOrange + 'j (' + pctOrange + '%)', color: VOR_ORANGE },
    { label: 'Bas : '    + nbRouge  + 'j (' + pctRouge  + '%)', color: VOR_ROUGE  }
  ];
  let vorX = marginL;
  vorItems.forEach(function(item) {
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.circle(vorX + 2, y + 1.5, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, vorX + 6, y + 3.5);
    vorX += doc.getTextWidth(item.label) + 14;
  });
  y += 8;

  drawSep(y);
  y += 5;

  // ============================================================
  // CALENDRIER 14 JOURS
  // ============================================================

  var aujourd_hui14 = new Date();
  aujourd_hui14.setHours(0, 0, 0, 0);
  var cutoff14 = new Date(aujourd_hui14);
  cutoff14.setDate(cutoff14.getDate() - 13);
  var cutoff14Str = _localDateStr(cutoff14);
  var entries14j = rawEntries.filter(function(e) { return e.date >= cutoff14Str; });

  if (entries14j.length >= 3) {
    checkPage(35);

    var NAVY_CAL = [26, 26, 26];

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY_CAL[0], NAVY_CAL[1], NAVY_CAL[2]);
    doc.text('CALENDRIER 14 JOURS', marginL, y);
    y += 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Niveau de gris = score composite (energie / sommeil / confort / clarte)', marginL, y);
    y += 5;

    var pastW    = 10;
    var pastH    = 10;
    var pastR    = 2;
    var pastGap  = 2;
    var pastStep = pastW + pastGap;
    var totalCalW = 14 * pastW + 13 * pastGap;
    var startCalX = marginL + (contentW - totalCalW) / 2;

    var entryMap14 = {};
    rawEntries.forEach(function(e) { entryMap14[e.date] = e; });

    for (var ci = 13; ci >= 0; ci--) {
      var cd    = new Date(aujourd_hui14);
      cd.setDate(cd.getDate() - ci);
      var cdStr = _localDateStr(cd);
      var px    = startCalX + (13 - ci) * pastStep;

      var entry14 = entryMap14[cdStr];
      if (!entry14) {
        doc.setFillColor(204, 204, 204);
      } else {
        var vals14 = [entry14.energie, entry14.qualite_sommeil, entry14.douleurs, entry14.clarte_mentale]
          .filter(function(v) { return v !== null && v !== undefined; });
        if (vals14.length === 0) {
          doc.setFillColor(204, 204, 204);
        } else {
          var score14 = vals14.reduce(function(a, b) { return a + b; }, 0) / vals14.length;
          if      (score14 >= 7) { doc.setFillColor(200, 200, 200); }
          else if (score14 >= 4) { doc.setFillColor(140, 140, 140); }
          else                   { doc.setFillColor(80,  80,  80);  }
        }
      }
      doc.roundedRect(px, y, pastW, pastH, pastR, pastR, 'F');

      var cdm = (cd.getDate() < 10 ? '0' : '') + cd.getDate();
      var cmm = (cd.getMonth() + 1 < 10 ? '0' : '') + (cd.getMonth() + 1);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(cdm + '/' + cmm, px + pastW / 2, y + pastH + 4, { align: 'center' });
    }

    y += pastH + 8;
    drawSep(y);
    y += 5;
  }

  // ============================================================
  // 9. QUESTIONS A POSER A MON MEDECIN (conditionnel)
  // ============================================================

  // Scores composites 7j pour les regles
  const scores7jQ = entrees.map(function(e) {
    const vvQ = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
      .filter(function(v) { return v !== null && v !== undefined; });
    return vvQ.length ? vvQ.reduce(function(a, b) { return a + b; }, 0) / vvQ.length : null;
  }).filter(function(v) { return v !== null; });

  const scoreMoy7jQ = _moyenne(scores7jQ);

  let scoreStdDevQ = 0;
  if (scores7jQ.length >= 2 && scoreMoy7jQ !== null) {
    const varQ = scores7jQ.reduce(function(acc, v) { return acc + (v - scoreMoy7jQ) * (v - scoreMoy7jQ); }, 0) / scores7jQ.length;
    scoreStdDevQ = Math.sqrt(varQ);
  }

  const humeurValsQ = entrees.map(function(e) { return e.humeur; }).filter(function(v) { return v !== null && v !== undefined; });
  const humeurMoy7jQ = _moyenne(humeurValsQ);

  let pemCount7jQ = 0;
  if (typeof window.detectPEMEvents === 'function') {
    const days7jQpem = entrees.map(function(e) {
      const vvQp = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
        .filter(function(v) { return v !== null && v !== undefined; });
      const scQp = vvQp.length ? vvQp.reduce(function(a, b) { return a + b; }, 0) / vvQp.length : null;
      return { date: e.date, score: scQp };
    }).filter(function(d) { return d.score !== null; });
    const mesures7jQpem = {};
    entrees.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jQpem['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });
    pemCount7jQ = window.detectPEMEvents(days7jQpem, mesures7jQpem).length;
  }

  let daysWithCycleQ = 0;
  if (typeof window.collectCycleData === 'function') {
    const days7jQcyc = entrees.map(function(e) {
      const vvQc = [e.energie, e.sommeil, e.confort_physique, e.clarte_mentale]
        .filter(function(v) { return v !== null && v !== undefined; });
      const scQc = vvQc.length ? vvQc.reduce(function(a, b) { return a + b; }, 0) / vvQc.length : null;
      return { date: e.date, score: scQc };
    }).filter(function(d) { return d.score !== null; });
    const mesures7jQcyc = {};
    entrees.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jQcyc['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });
    const cyclePhases7jQ = window.collectCycleData(days7jQcyc, mesures7jQcyc, 7);
    daysWithCycleQ = Object.values(cyclePhases7jQ).reduce(function(sum, arr) { return sum + arr.length; }, 0);
  }

  const fcMoyQ = hasFc ? _moyenne(fcValsAll) : null;

  const questionsQ = [];
  if (pemCount7jQ >= 1) {
    questionsQ.push('Mes donnees montrent des chutes de score apres les jours a bonne energie. Faut-il evoquer le malaise post-effort / PEM ?');
  }
  if (daysWithCycleQ >= 1) {
    questionsQ.push('Mon score varie selon les phases de mon cycle. Ce suivi merite-t-il une attention hormonale ?');
  }
  if (fcMoyQ !== null && fcMoyQ > 85) {
    questionsQ.push('Ma frequence cardiaque au repos est elevee sur cette periode. Faut-il evaluer une composante orthostatique ?');
  }
  if (scoreMoy7jQ !== null && scoreMoy7jQ < 5.0) {
    questionsQ.push('Mon score global est bas de facon persistante. Quels examens complementaires seraient pertinents a ce stade ?');
  }
  if (scoreStdDevQ > 2.5) {
    questionsQ.push('Ma variabilite est importante d un jour a l autre. Ce profil evoque-t-il quelque chose de specifique ?');
  }
  if (humeurMoy7jQ !== null && scoreMoy7jQ !== null && humeurValsQ.length >= 3 && Math.abs(humeurMoy7jQ - scoreMoy7jQ) > 2) {
    questionsQ.push('Mon ressenti global est souvent different de mon score composite. Cette dissociation est-elle un signal clinique ?');
  }
  const questionsAffQ = questionsQ.slice(0, 5);

  if (questionsAffQ.length > 0) {
    const NAVY_Q = [26, 26, 26];
    const SAGE_Q = [100, 100, 100];
    const GREY_Q = [110, 110, 110];

    const qBlocH = 10 + questionsAffQ.length * 6 + 10;
    checkPage(qBlocH);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY_Q[0], NAVY_Q[1], NAVY_Q[2]);
    doc.text('QUESTIONS A POSER A MON MEDECIN', marginL, y);
    y += 3;

    doc.setDrawColor(SAGE_Q[0], SAGE_Q[1], SAGE_Q[2]);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, marginL + contentW, y);
    doc.setLineWidth(0.1);
    y += 5;

    questionsAffQ.forEach(function(q) {
      const qLines = doc.splitTextToSize('- ' + q, contentW - 4);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(NAVY_Q[0], NAVY_Q[1], NAVY_Q[2]);
      qLines.forEach(function(l, li) { doc.text(l, marginL, y + li * 5); });
      y += qLines.length * 5 + 1;
    });

    y += 3;

    const discTxt = 'Ces questions sont des suggestions basees sur vos donnees. Elles ne constituent pas un avis medical.';
    const discLines = doc.splitTextToSize(discTxt, contentW);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY_Q[0], GREY_Q[1], GREY_Q[2]);
    discLines.forEach(function(l, li) { doc.text(l, marginL, y + li * 4); });
    y += discLines.length * 4 + 3;

    drawSep(y);
    y += 5;
  }

  // ============================================================
  // 9b. ÉVÉNEMENTS NOTABLES (30 derniers jours)
  // ============================================================
  const recentEvents = window.getRecentEvents ? window.getRecentEvents(30) : [];
  if (recentEvents.length > 0) {
    checkPage(40);
    y += 8;
    doc.setFontSize(9); doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.text('EVENEMENTS NOTABLES (30 derniers jours)', marginL, y);
    y += 5;
    doc.setDrawColor(26, 26, 26); doc.line(marginL, y, marginL + contentW, y);
    y += 6;
    const typeLabels = {
      'reaction-medicament': 'Reaction medicament',
      'symptome-inhabituel': 'Symptome inhabituel',
      'bonne-journee-exceptionnelle': 'Bonne journee exceptionnelle',
      'mauvaise-journee-exceptionnelle': 'Mauvaise journee exceptionnelle',
      'autre': 'Autre'
    };
    recentEvents.slice().reverse().forEach(ev => {
      checkPage(20);
      doc.setFontSize(8); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
      const typeLabel = ev.type ? ' [' + (typeLabels[ev.type] || ev.type) + ']' : '';
      const scoreTxt = ev.score !== null ? ' - Score ' + ev.score + '/10' : '';
      doc.text(ev.date + typeLabel + scoreTxt, marginL, y); y += 5;
      const descLines = doc.splitTextToSize(ev.description, contentW - 4);
      descLines.forEach(line => { checkPage(6); doc.text(line, marginL + 4, y); y += 5; });
      y += 2;
    });
    doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'italic');
    doc.text('Evenements declares par l\'utilisateur au moment ou ils se sont produits.', marginL, y);
    y += 8;
  }

  // ============================================================
  // 10. PLAN POST-CONSULTATION (conditionnel)
  // ============================================================
  var NAVY_PC = [26, 26, 26];
  var SAGE_PC = [100, 100, 100];
  var GREY_PC = [110, 110, 110];

  var postConsultData = null;
  var now30 = new Date();
  for (var d = 0; d < 30; d++) {
    var dd = new Date(now30);
    dd.setDate(dd.getDate() - d);
    var ddStr = _localDateStr(dd);
    var rawPC = localStorage.getItem('boussole_post_consultation_' + ddStr);
    if (rawPC) {
      try { postConsultData = JSON.parse(rawPC); break; } catch(ex) {}
    }
  }

  if (postConsultData) {
    var varLabelsPC = {
      energie: 'Energie', sommeil: 'Sommeil', confort: 'Confort physique',
      clarte: 'Clarte mentale', fc: 'Frequence cardiaque', poids: 'Poids'
    };

    var pcBlocH = 14;
    if (postConsultData.decisions) pcBlocH += 12;
    if (postConsultData.examens) pcBlocH += 12;
    if (postConsultData.traitement_teste) pcBlocH += 10;
    if (postConsultData.date_reevaluation) pcBlocH += 10;
    if (postConsultData.variable_suivie) pcBlocH += 10;
    if (postConsultData.signaux_stop) pcBlocH += 12;
    pcBlocH += 8;
    checkPage(pcBlocH);

    var dateRdvFmt = postConsultData.date_rdv || '';
    if (dateRdvFmt.length === 10 && dateRdvFmt[4] === '-') {
      dateRdvFmt = dateRdvFmt.slice(8, 10) + '/' + dateRdvFmt.slice(5, 7) + '/' + dateRdvFmt.slice(0, 4);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY_PC[0], NAVY_PC[1], NAVY_PC[2]);
    doc.text('PLAN POST-CONSULTATION \u2014 RDV du ' + dateRdvFmt, marginL, y);
    y += 3;

    doc.setDrawColor(SAGE_PC[0], SAGE_PC[1], SAGE_PC[2]);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, marginL + contentW, y);
    doc.setLineWidth(0.1);
    y += 5;

    var _pcLine = function(label, value) {
      if (!value) return;
      var lines = doc.splitTextToSize(label + ' ' + value, contentW - 4);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(NAVY_PC[0], NAVY_PC[1], NAVY_PC[2]);
      lines.forEach(function(l, li) { doc.text(l, marginL, y + li * 5); });
      y += lines.length * 5 + 2;
    };

    if (postConsultData.decisions) _pcLine('Decisions :', postConsultData.decisions);
    if (postConsultData.examens) _pcLine('Examens :', postConsultData.examens);
    if (postConsultData.traitement_teste) _pcLine('A tester :', postConsultData.traitement_teste);
    if (postConsultData.date_reevaluation) {
      var reevalFmt = postConsultData.date_reevaluation;
      if (reevalFmt.length === 10 && reevalFmt[4] === '-') {
        reevalFmt = reevalFmt.slice(8, 10) + '/' + reevalFmt.slice(5, 7) + '/' + reevalFmt.slice(0, 4);
      }
      _pcLine('Reevaluation :', reevalFmt);
    }
    if (postConsultData.variable_suivie) {
      _pcLine('Variable a surveiller :', varLabelsPC[postConsultData.variable_suivie] || postConsultData.variable_suivie);
    }
    if (postConsultData.signaux_stop) _pcLine('Signaux d\'arret :', postConsultData.signaux_stop);

    y += 2;
    var discTxtPC = 'Notes personnelles post-consultation. Pas un avis medical.';
    var discLinesPC = doc.splitTextToSize(discTxtPC, contentW);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GREY_PC[0], GREY_PC[1], GREY_PC[2]);
    discLinesPC.forEach(function(l, li) { doc.text(l, marginL, y + li * 4); });
    y += discLinesPC.length * 4 + 3;

    drawSep(y);
    y += 5;
  }

  // ============================================================
  // FOOTER (toutes les pages)
  // ============================================================
  drawFooters();

  doc.autoPrint();
  const pdfUrl = doc.output('bloburl');

  // Nom de fichier dynamique
  const _nom    = (localStorage.getItem('boussole_nom')    || '').trim().toUpperCase();
  const _prenom = (localStorage.getItem('boussole_prenom') || '').trim();
  const _now    = new Date();
  const _dd     = String(_now.getDate()).padStart(2, '0');
  const _mm     = String(_now.getMonth() + 1).padStart(2, '0');
  const _yyyy   = _now.getFullYear();
  const _dateStr = _dd + _mm + _yyyy;
  const _filename = (_nom && _prenom)
    ? 'PreConsultation_' + _nom + '_' + _prenom + '_' + _dateStr + '.pdf'
    : 'PreConsultation_' + _dateStr + '.pdf';

  const _a = document.createElement('a');
  _a.href = pdfUrl;
  _a.download = _filename;
  _a.target = '_blank';
  document.body.appendChild(_a);
  _a.click();
  document.body.removeChild(_a);
}

// Export global
window.genererPDFConsultation = genererPDFConsultation;
