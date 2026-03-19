/**
 * Boussole — Génération PDF v2
 * Architecture modulaire : CONFIG → PdfEngine → blocs render* → exports
 * Dépendance : jsPDF (chargé via CDN dans index.html)
 */

// ─── 1. CONFIG ───────────────────────────────────────────────────────────────

const PDF_CONFIG = Object.freeze({
  format:      'a4',
  orientation: 'portrait',
  unit:        'mm',

  marginX:      14,
  marginTop:    12,
  marginBottom: 12,

  // Typographie — 5 niveaux
  font: 'helvetica',
  fontSize: {
    h1:    16,    // titre Boussole en-tête
    h2:    10,    // titres de section
    body:   9,    // contenu principal
    small:  8,    // sous-texte, métadonnées
    micro:  7.5,  // pied de page légal
  },

  // Espacements
  sectionGap:      3,    // espace vertical entre deux cartes
  lineHeightBody:  4.2,
  lineHeightSmall: 3.8,
  cardPaddingX:    4,
  cardPaddingY:    3.5,
  titleHeight:     5.5,  // hauteur réservée au titre de section

  // Couleurs
  colors: {
    headerBg:      [246, 248, 252],
    sectionBg:     [250, 252, 255],
    border:        [224, 229, 236],
    text:          [33, 37, 41],
    muted:         [93, 101, 115],
    accent:        [42, 86, 140],
    warning:       [158, 103, 0],
    warningBg:     [255, 249, 235],
    warningBorder: [240, 222, 178],
  },

  version:  'v2.0.0',
  timezone: 'Europe/Paris',
});

// ─── 2. UTILS ────────────────────────────────────────────────────────────────

function _getParisDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PDF_CONFIG.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value || '';
  return {
    day:    get('day'),
    month:  get('month'),
    year:   get('year'),
    hour:   get('hour'),
    minute: get('minute'),
  };
}

function _formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function _formatDateTime() {
  const p = _getParisDateParts();
  return `${p.day}/${p.month}/${p.year} à ${p.hour}:${p.minute}`;
}

function _pdfFilename() {
  const p = _getParisDateParts();
  return `boussole_${p.year}-${p.month}-${p.day}.pdf`;
}

function _sanitize(input) {
  if (input == null) return '';
  let t = String(input);
  const replacements = [
    [/⚠️|⚠/g,   'Attention'],
    [/✅|✓/g,    '-'],
    [/⏸️|⏸/g,   '-'],
    [/[◊•]/g,   '-'],
    [/→/g,       '->'],
    [/[–—]/g,   '-'],
    [/[""]/g,   '"'],
    [/'/g,       "'"],
  ];
  replacements.forEach(([pat, rep]) => { t = t.replace(pat, rep); });
  t = t.replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
  return t.replace(/[ \t]{2,}/g, ' ').trim();
}

// ─── 3. MOTEUR ───────────────────────────────────────────────────────────────

class PdfEngine {
  constructor(doc) {
    this.doc        = doc;
    this.pageWidth  = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.contentX   = PDF_CONFIG.marginX;
    this.contentW   = this.pageWidth - 2 * PDF_CONFIG.marginX;
    this.y          = PDF_CONFIG.marginTop;
  }

  // Mesure la hauteur totale d'une carte (titre + toutes les lignes)
  _measureCard(rows) {
    const {
      cardPaddingY, titleHeight,
      lineHeightBody, lineHeightSmall,
      font, fontSize,
    } = PDF_CONFIG;
    const maxW = this.contentW - 2 * PDF_CONFIG.cardPaddingX;
    let rowsH = 0;

    rows.forEach((row, i) => {
      this.doc.setFont(font, row.bold ? 'bold' : 'normal');
      this.doc.setFontSize(fontSize.body);
      const mainLines = this.doc.splitTextToSize(_sanitize(row.main || ''), maxW);
      rowsH += mainLines.length * lineHeightBody;

      if (row.sub) {
        this.doc.setFont(font, 'normal');
        this.doc.setFontSize(fontSize.small);
        const subLines = this.doc.splitTextToSize(_sanitize(row.sub), maxW);
        rowsH += subLines.length * lineHeightSmall;
      }

      if (i < rows.length - 1) rowsH += 1.4;
    });

    return cardPaddingY + titleHeight + rowsH + cardPaddingY;
  }

  // Dessine une carte (fond + titre + lignes de contenu)
  drawCard(title, rows) {
    const {
      colors, font, fontSize,
      cardPaddingX, cardPaddingY, titleHeight,
      lineHeightBody, lineHeightSmall, sectionGap,
    } = PDF_CONFIG;
    const { doc, contentX, contentW } = this;
    const maxW = contentW - 2 * cardPaddingX;
    const cardH = this._measureCard(rows);

    // Saut de page si la carte ne tient pas
    const safeBottom = this.pageHeight - PDF_CONFIG.marginBottom - 8;
    if (this.y + cardH > safeBottom && this.y > PDF_CONFIG.marginTop) {
      doc.addPage();
      this.y = PDF_CONFIG.marginTop;
    }

    // Fond + bordure
    doc.setFillColor(...colors.sectionBg);
    doc.setDrawColor(...colors.border);
    doc.rect(contentX, this.y, contentW, cardH, 'FD');

    // Titre de section
    doc.setTextColor(...colors.accent);
    doc.setFont(font, 'bold');
    doc.setFontSize(fontSize.h2);
    doc.text(_sanitize(title), contentX + cardPaddingX, this.y + cardPaddingY + 3.8);

    // Contenu
    let cursorY = this.y + cardPaddingY + titleHeight + 1.5;

    rows.forEach((row, i) => {
      doc.setTextColor(...colors.text);
      doc.setFont(font, row.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize.body);
      const mainLines = doc.splitTextToSize(_sanitize(row.main || ''), maxW);
      mainLines.forEach(line => {
        doc.text(line, contentX + cardPaddingX, cursorY);
        cursorY += lineHeightBody;
      });

      if (row.sub) {
        doc.setTextColor(...colors.muted);
        doc.setFont(font, 'normal');
        doc.setFontSize(fontSize.small);
        const subLines = doc.splitTextToSize(_sanitize(row.sub), maxW);
        subLines.forEach(line => {
          doc.text(line, contentX + cardPaddingX, cursorY);
          cursorY += lineHeightSmall;
        });
      }

      if (i < rows.length - 1) cursorY += 1.4;
    });

    this.y += cardH + sectionGap;
  }
}

// ─── 4. BLOCS ────────────────────────────────────────────────────────────────

function renderHeader(engine, summary) {
  const { doc, contentX, contentW } = engine;
  const { colors, font, fontSize } = PDF_CONFIG;
  const headerH = 24;

  doc.setFillColor(...colors.headerBg);
  doc.setDrawColor(...colors.border);
  doc.rect(contentX, engine.y, contentW, headerH, 'FD');

  // Gauche : titre + sous-titre
  doc.setTextColor(...colors.accent);
  doc.setFont(font, 'bold');
  doc.setFontSize(fontSize.h1);
  doc.text('Boussole', contentX + 4, engine.y + 7.5);

  doc.setTextColor(...colors.muted);
  doc.setFont(font, 'normal');
  doc.setFontSize(fontSize.small);
  doc.text(
    `Généré le ${_formatDateTime()} | ${PDF_CONFIG.version}`,
    contentX + 4,
    engine.y + 13,
  );

  // Droite : résumé + méta
  const rightX = contentX + contentW - 4;

  doc.setTextColor(...colors.text);
  doc.setFont(font, 'bold');
  doc.setFontSize(fontSize.h2 + 0.5);
  doc.text(`Résumé ${summary.windowDays} jours`, rightX, engine.y + 8, { align: 'right' });

  doc.setFont(font, 'normal');
  doc.setFontSize(fontSize.small);
  doc.setTextColor(...colors.muted);
  doc.text(
    `Jours renseignés : ${summary.joursRenseignes}/${summary.totalJours}`,
    rightX, engine.y + 13,
    { align: 'right' },
  );

  if (summary.lastDate) {
    doc.text(
      `Dernière saisie : ${_formatDate(summary.lastDate)}`,
      rightX, engine.y + 17.5,
      { align: 'right' },
    );
  }

  engine.y += headerH + 4;
}

function renderStatusMessage(engine, summary) {
  if (!summary.statusMessage) return;

  const { doc, contentX, contentW } = engine;
  const { colors, font, fontSize } = PDF_CONFIG;
  const maxW = contentW - 8;
  const lines = doc.splitTextToSize(_sanitize(summary.statusMessage), maxW);
  const blockH = Math.max(8, lines.length * 3.8 + 4);

  doc.setFillColor(...colors.warningBg);
  doc.setDrawColor(...colors.warningBorder);
  doc.rect(contentX, engine.y, contentW, blockH, 'FD');

  doc.setTextColor(...colors.warning);
  doc.setFont(font, 'normal');
  doc.setFontSize(fontSize.small);

  let sy = engine.y + 4.2;
  lines.forEach(line => {
    doc.text(line, contentX + 4, sy);
    sy += 3.8;
  });

  engine.y += blockH + PDF_CONFIG.sectionGap;
}

function renderTendances(engine, summary) {
  const rows = [];

  if (summary.energie.moyenne !== null) {
    rows.push({
      main: `Énergie : ${summary.energie.moyenne}/10`,
      sub:  `- ${summary.energie.tendance}`,
      bold: true,
    });
  }
  if (summary.qualite_sommeil.moyenne !== null) {
    rows.push({
      main: `Qualité sommeil : ${summary.qualite_sommeil.moyenne}/10`,
      sub:  `- ${summary.qualite_sommeil.tendance}`,
      bold: true,
    });
  }
  if (summary.douleurs.moyenne !== null) {
    rows.push({
      main: `Confort physique : ${summary.douleurs.moyenne}/10`,
      sub:  `- ${summary.douleurs.tendance}`,
      bold: true,
    });
  }
  if (summary.clarte_mentale && summary.clarte_mentale.moyenne !== null) {
    rows.push({
      main: `Clarté mentale : ${summary.clarte_mentale.moyenne}/10`,
      sub:  `- ${summary.clarte_mentale.tendance}`,
      bold: true,
    });
  }

  if (rows.length === 0) {
    rows.push({
      main: 'Aucune donnée disponible. Commencez par saisir vos repères dans l\'onglet "Aujourd\'hui".',
      bold: false,
    });
  }

  engine.drawCard('1. TENDANCES', rows);
}

function renderCorrelationsPDF(engine, summary) {
  if (typeof window.computeCorrelations !== 'function') return;
  if (!summary.entries || !Array.isArray(summary.entries)) return;

  const correlations = window.computeCorrelations(summary.entries, 30);
  const significant  = correlations.filter(c => c.r !== null && Math.abs(c.r) >= 0.3 && c.n >= 5);
  if (significant.length < 2) return;

  const rows = significant.map(c => ({ main: c.interpretation, bold: false }));
  const daysWithMeasures = correlations.reduce((max, c) => Math.max(max, c.n), 0);
  rows.push({ main: `Base : ${daysWithMeasures} jours avec mesures renseignees.`, bold: false });

  engine.drawCard('CORRELATIONS', rows);
}

function renderVFC(engine, summary) {
  if (!summary.rmssd) return;
  const { moyenne, min, max } = summary.rmssd;
  engine.drawCard('VARIABILITÉ CARDIAQUE (VFC)', [
    {
      main: `RMSSD — Moyenne : ${moyenne}ms | Min : ${min}ms | Max : ${max}ms`,
      bold: false,
    },
  ]);
}

function renderVariations(engine, summary) {
  if (!summary.variations || summary.variations.length === 0) return;

  const rows = summary.variations.map(v => ({
    main: `${_formatDate(v.date)} : ${v.type === 'amélioration' ? 'Forte amélioration' : 'Chute brutale'}`,
    sub:  `(${v.scoreJ.toFixed(1)}/10 vs ${v.scoreJMinus1.toFixed(1)}/10)`,
    bold: true,
  }));

  engine.drawCard('2. VARIATIONS IMPORTANTES', rows);
}

function renderPointsMarquants(engine, summary) {
  const rows = [];
  const { meilleurJour, jourLePlusBas, gap } = summary.pointsMarquants;

  if (meilleurJour) {
    rows.push({
      main: `- Meilleur jour : ${_formatDate(meilleurJour.date)} (score ${meilleurJour.score.toFixed(1)}/10)`,
      bold: false,
    });
  }
  if (jourLePlusBas) {
    rows.push({
      main: `- Jour le plus bas : ${_formatDate(jourLePlusBas.date)} (score ${jourLePlusBas.score.toFixed(1)}/10)`,
      bold: false,
    });
  }
  if (gap) {
    rows.push({
      main: `- Jours non renseignés : ${_formatDate(gap.start)}-${_formatDate(gap.end)} (${gap.count} jours)`,
      bold: false,
    });
  }
  if (rows.length === 0) {
    rows.push({ main: 'Aucune donnée disponible.', bold: false });
  }

  engine.drawCard('3. POINTS MARQUANTS', rows);
}

function renderNotes(engine, summary) {
  if (!summary.notes || summary.notes.length === 0) return;

  const rows = summary.notes.slice(0, 5).map(n => ({
    main: `${_formatDate(n.date)} : "${_sanitize(n.note)}"`,
    bold: false,
  }));

  engine.drawCard('4. VOS NOTES', rows);
}

function renderPrudence(engine) {
  engine.drawCard('5. PRUDENCE', [
    { main: 'Attention : infos générales uniquement.',  bold: false },
    { main: "Pas d'avis médical personnalisé.",         bold: false },
    { main: 'Urgence : 15',                             bold: false },
  ]);
}

function renderFooter(engine) {
  const { doc, contentX, contentW, pageHeight } = engine;
  const { colors, font, fontSize } = PDF_CONFIG;
  const footerY = pageHeight - PDF_CONFIG.marginBottom;

  doc.setDrawColor(...colors.border);
  doc.line(contentX, footerY - 4, contentX + contentW, footerY - 4);

  doc.setTextColor(...colors.muted);
  doc.setFont(font, 'normal');
  doc.setFontSize(fontSize.micro);
  doc.text(
    'Document généré par le patient. Ne remplace pas un avis médical.',
    contentX,
    footerY,
  );
}

// ─── 5. EXPORTS ──────────────────────────────────────────────────────────────

async function generatePDF(summary) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    throw new Error('jsPDF non chargé. Vérifiez votre connexion internet.');
  }

  const doc = new jsPDF({
    orientation: PDF_CONFIG.orientation,
    unit:        PDF_CONFIG.unit,
    format:      PDF_CONFIG.format,
    compress:    true,
  });

  const engine = new PdfEngine(doc);

  renderHeader(engine, summary);
  renderStatusMessage(engine, summary);
  renderTendances(engine, summary);
  renderCorrelationsPDF(engine, summary);
  renderVFC(engine, summary);
  renderVariations(engine, summary);
  renderPointsMarquants(engine, summary);
  renderNotes(engine, summary);
  renderPrudence(engine);
  renderFooter(engine);

  return doc;
}

function generatePDFPreview(summary) {
  const lines = [];

  lines.push(`RÉSUMÉ ${summary.windowDays} JOURS`);
  lines.push(`Jours renseignés : ${summary.joursRenseignes}/${summary.totalJours}`);
  if (summary.lastDate) lines.push(`Dernière saisie : ${_formatDate(summary.lastDate)}`);
  lines.push('');

  if (summary.statusMessage) {
    _sanitize(summary.statusMessage).split('\n').filter(Boolean).forEach(l => lines.push(l));
    lines.push('');
  }

  lines.push('1. TENDANCES');
  if (summary.energie.moyenne !== null) {
    lines.push(`Énergie : ${summary.energie.moyenne}/10`);
    lines.push(`- ${_sanitize(summary.energie.tendance)}`);
  }
  if (summary.qualite_sommeil.moyenne !== null) {
    lines.push(`Qualité sommeil : ${summary.qualite_sommeil.moyenne}/10`);
    lines.push(`- ${_sanitize(summary.qualite_sommeil.tendance)}`);
  }
  if (summary.douleurs.moyenne !== null) {
    lines.push(`Confort physique : ${summary.douleurs.moyenne}/10`);
    lines.push(`- ${_sanitize(summary.douleurs.tendance)}`);
  }
  if (summary.clarte_mentale && summary.clarte_mentale.moyenne !== null) {
    lines.push(`Clarté mentale : ${summary.clarte_mentale.moyenne}/10`);
    lines.push(`- ${_sanitize(summary.clarte_mentale.tendance)}`);
  }
  lines.push('');

  if (summary.rmssd) {
    const { moyenne, min, max } = summary.rmssd;
    lines.push('VARIABILITÉ CARDIAQUE (VFC)');
    lines.push(`RMSSD — Moyenne : ${moyenne}ms | Min : ${min}ms | Max : ${max}ms`);
    lines.push('');
  }

  if (summary.variations && summary.variations.length > 0) {
    lines.push('2. VARIATIONS IMPORTANTES');
    summary.variations.forEach(v => {
      lines.push(`${_formatDate(v.date)} : ${v.type === 'amélioration' ? 'Forte amélioration' : 'Chute brutale'}`);
      lines.push(`(${v.scoreJ.toFixed(1)}/10 vs ${v.scoreJMinus1.toFixed(1)}/10)`);
    });
    lines.push('');
  }

  lines.push('3. POINTS MARQUANTS');
  const { meilleurJour, jourLePlusBas, gap } = summary.pointsMarquants;
  if (meilleurJour) {
    lines.push(`- Meilleur jour : ${_formatDate(meilleurJour.date)} (score ${meilleurJour.score.toFixed(1)}/10)`);
  }
  if (jourLePlusBas) {
    lines.push(`- Jour le plus bas : ${_formatDate(jourLePlusBas.date)} (score ${jourLePlusBas.score.toFixed(1)}/10)`);
  }
  if (gap) {
    lines.push(`- Jours non renseignés : ${_formatDate(gap.start)}-${_formatDate(gap.end)} (${gap.count} jours)`);
  }
  lines.push('');

  if (summary.notes && summary.notes.length > 0) {
    lines.push('4. VOS NOTES');
    summary.notes.slice(0, 5).forEach(n => {
      lines.push(`${_formatDate(n.date)} : "${_sanitize(n.note)}"`);
    });
    lines.push('');
  }

  lines.push('5. PRUDENCE');
  lines.push('Attention : infos générales uniquement.');
  lines.push("Pas d'avis médical personnalisé.");
  lines.push('Urgence : 15');

  return lines.join('\n');
}

async function downloadPDF(summary) {
  const doc = await generatePDF(summary);
  const filename = _pdfFilename();
  doc.save(filename);
  return filename;
}

// Points d'entrée publics (compatibilité app.js)
window.generatePDF        = generatePDF;
window.generatePDFPreview = generatePDFPreview;
window.downloadPDF        = downloadPDF;
