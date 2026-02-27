/**
 * Boussole+ v1.0 - Génération PDF
 * Mise en page professionnelle, lisible mobile/desktop, 1 page A4.
 * Dépendance : jsPDF (chargé via CDN dans index.html)
 */

const PDF_TIMEZONE = 'Europe/Paris';
const PDF_VERSION = 'v1.0.0';

const PDF_THEME = Object.freeze({
  marginX: 14,
  top: 12,
  bottom: 12,
  headerBg: [246, 248, 252],
  sectionBg: [250, 252, 255],
  border: [224, 229, 236],
  text: [33, 37, 41],
  muted: [93, 101, 115],
  accent: [42, 86, 140],
  warning: [158, 103, 0]
});

/**
 * Retourne les parties de date/heure en fuseau Europe/Paris
 */
function getParisDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PDF_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const read = (type) => parts.find(p => p.type === type)?.value || '';

  return {
    day: read('day'),
    month: read('month'),
    year: read('year'),
    hour: read('hour'),
    minute: read('minute')
  };
}

/**
 * Formate une date ISO YYYY-MM-DD en DD/MM/YYYY (sans dérive de fuseau)
 */
function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Formate date et heure pour l'en-tête PDF
 */
function formatDateTime() {
  const p = getParisDateTimeParts();
  return `${p.day}/${p.month}/${p.year} à ${p.hour}:${p.minute}`;
}

/**
 * Génère le nom de fichier PDF en timezone Europe/Paris
 */
function generatePDFFilename() {
  const p = getParisDateTimeParts();
  return `boussole_${p.year}-${p.month}-${p.day}.pdf`;
}

/**
 * Normalise un texte pour rendu PDF (évite les glyphes mal supportés)
 */
function sanitizePdfText(input) {
  if (input === null || input === undefined) return '';

  let text = String(input);

  const replacements = [
    [/⚠️|⚠/g, 'Attention'],
    [/✅|✓/g, '-'],
    [/⏸️|⏸/g, '-'],
    [/◊/g, '-'],
    [/•/g, '-'],
    [/→/g, '->'],
    [/–|—/g, '-'],
    [/“|”/g, '"'],
    [/’/g, "'"]
  ];

  replacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  // Supprime les caractères hors latin-1 (évite artefacts dans certains lecteurs PDF)
  text = text.replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');

  // Nettoyage espaces
  text = text.replace(/[ \t]{2,}/g, ' ').trim();

  return text;
}

/**
 * Génère le contenu texte du PDF (pour aperçu dans la modale)
 * Le texte reste synchronisé avec les sections du PDF exporté.
 */
function generatePDFPreview(summary) {
  const lines = [];

  lines.push(`RÉSUMÉ ${summary.windowDays} JOURS`);
  lines.push(`Jours renseignés : ${summary.joursRenseignes}/${summary.totalJours}`);
  if (summary.lastDate) {
    lines.push(`Dernière saisie : ${formatDate(summary.lastDate)}`);
  }
  lines.push('');

  if (summary.statusMessage) {
    const statusLines = sanitizePdfText(summary.statusMessage).split('\n').filter(Boolean);
    statusLines.forEach(line => lines.push(line));
    lines.push('');
  }

  lines.push('1. TENDANCES');
  if (summary.energie.moyenne !== null) {
    lines.push(`Énergie : ${summary.energie.moyenne}/10`);
    lines.push(`- ${sanitizePdfText(summary.energie.tendance)}`);
  }
  if (summary.qualite_sommeil.moyenne !== null) {
    lines.push(`Qualité sommeil : ${summary.qualite_sommeil.moyenne}/10`);
    lines.push(`- ${sanitizePdfText(summary.qualite_sommeil.tendance)}`);
  }
  if (summary.douleurs.moyenne !== null) {
    lines.push(`Confort physique : ${summary.douleurs.moyenne}/10`);
    lines.push(`- ${sanitizePdfText(summary.douleurs.tendance)}`);
  }
  lines.push('');

  if (summary.variations && summary.variations.length > 0) {
    lines.push('2. VARIATIONS IMPORTANTES');
    summary.variations.forEach(v => {
      const typeText = v.type === 'amélioration' ? 'Forte amélioration' : 'Chute brutale';
      lines.push(`${formatDate(v.date)} : ${typeText}`);
      lines.push(`(${v.scoreJ.toFixed(1)}/10 vs ${v.scoreJMinus1.toFixed(1)}/10)`);
    });
    lines.push('');
  }

  lines.push('3. POINTS MARQUANTS');
  if (summary.pointsMarquants.meilleurJour) {
    const mj = summary.pointsMarquants.meilleurJour;
    lines.push(`- Meilleur jour : ${formatDate(mj.date)} (score ${mj.score.toFixed(1)}/10)`);
  }
  if (summary.pointsMarquants.jourLePlusBas) {
    const jb = summary.pointsMarquants.jourLePlusBas;
    lines.push(`- Jour le plus bas : ${formatDate(jb.date)} (score ${jb.score.toFixed(1)}/10)`);
  }
  if (summary.pointsMarquants.gap) {
    const gap = summary.pointsMarquants.gap;
    lines.push(`- Jours non renseignés : ${formatDate(gap.start)}-${formatDate(gap.end)} (${gap.count} jours)`);
  }
  lines.push('');

  if (summary.notes && summary.notes.length > 0) {
    lines.push('4. VOS NOTES');
    summary.notes.forEach(n => {
      lines.push(`${formatDate(n.date)} : "${sanitizePdfText(n.note)}"`);
    });
    lines.push('');
  }

  lines.push('5. PRUDENCE');
  lines.push('Attention : infos générales uniquement.');
  lines.push('Pas d\'avis médical personnalisé.');
  lines.push('Urgence : 15');

  return lines.join('\n');
}

/**
 * Crée un document PDF initialisé
 */
function createPdfDocument() {
  return new window.jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
}

/**
 * Mesure et prépare les lignes d'une section
 */
function prepareSectionRows(doc, rows, maxWidth, style = {}) {
  const prepared = [];

  const rowFontSize = style.rowFontSize || 9;
  const subFontSize = style.subFontSize || 8.5;

  rows.forEach((row) => {
    const mainText = sanitizePdfText(row.main || '');
    const subText = sanitizePdfText(row.sub || '');

    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(rowFontSize);
    const mainLines = doc.splitTextToSize(mainText, maxWidth);

    let subLines = [];
    if (subText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(subFontSize);
      subLines = doc.splitTextToSize(subText, maxWidth);
    }

    prepared.push({
      row,
      mainLines,
      subLines
    });
  });

  return prepared;
}

/**
 * Dessine une section sous forme de carte
 */
function drawSectionCard(doc, y, title, rows, options = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - (2 * PDF_THEME.marginX);
  const x = PDF_THEME.marginX;

  const paddingX = options.paddingX ?? 4;
  const paddingY = options.paddingY ?? 3.5;
  const rowLineHeight = options.rowLineHeight ?? 4.1;
  const subLineHeight = options.subLineHeight ?? 3.7;

  const contentWidth = width - (2 * paddingX);
  const preparedRows = prepareSectionRows(doc, rows, contentWidth, {
    rowFontSize: options.rowFontSize || 9,
    subFontSize: options.subFontSize || 8.3
  });

  const titleHeight = 5;
  let rowsHeight = 0;

  preparedRows.forEach((prepared, index) => {
    rowsHeight += prepared.mainLines.length * rowLineHeight;
    if (prepared.subLines.length > 0) {
      rowsHeight += prepared.subLines.length * subLineHeight;
    }
    if (index < preparedRows.length - 1) {
      rowsHeight += 1.4;
    }
  });

  const cardHeight = paddingY + titleHeight + rowsHeight + paddingY;

  // Fond + bordure
  doc.setFillColor(...PDF_THEME.sectionBg);
  doc.setDrawColor(...PDF_THEME.border);
  doc.rect(x, y, width, cardHeight, 'FD');

  // Titre section
  doc.setTextColor(...PDF_THEME.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(sanitizePdfText(title), x + paddingX, y + paddingY + 3.8);

  // Contenu section
  let cursorY = y + paddingY + titleHeight + 2;
  preparedRows.forEach((prepared, index) => {
    doc.setTextColor(...PDF_THEME.text);
    doc.setFont('helvetica', prepared.row.bold ? 'bold' : 'normal');
    doc.setFontSize(options.rowFontSize || 9);

    prepared.mainLines.forEach(line => {
      doc.text(line, x + paddingX, cursorY);
      cursorY += rowLineHeight;
    });

    if (prepared.subLines.length > 0) {
      doc.setTextColor(...PDF_THEME.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(options.subFontSize || 8.3);
      prepared.subLines.forEach(line => {
        doc.text(line, x + paddingX, cursorY);
        cursorY += subLineHeight;
      });
    }

    if (index < preparedRows.length - 1) {
      cursorY += 1.4;
    }
  });

  return y + cardHeight;
}

/**
 * Génère le PDF
 */
async function generatePDF(summary) {
  const { jsPDF } = window.jspdf || {};

  if (!jsPDF) {
    throw new Error('jsPDF non chargé. Vérifiez votre connexion internet.');
  }

  const doc = createPdfDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const contentX = PDF_THEME.marginX;
  const contentW = pageWidth - (2 * contentX);

  let y = PDF_THEME.top;

  // Bandeau en-tête
  const headerHeight = 24;
  doc.setFillColor(...PDF_THEME.headerBg);
  doc.setDrawColor(...PDF_THEME.border);
  doc.rect(contentX, y, contentW, headerHeight, 'FD');

  // Titre
  doc.setTextColor(...PDF_THEME.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Boussole', contentX + 4, y + 7.5);

  doc.setTextColor(...PDF_THEME.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(`Généré le ${formatDateTime()} | ${PDF_VERSION}`, contentX + 4, y + 12.5);

  // Métadonnées alignées à droite
  doc.setTextColor(...PDF_THEME.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Résumé ${summary.windowDays} jours`, contentX + contentW - 4, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_THEME.muted);
  doc.text(`Jours renseignés : ${summary.joursRenseignes}/${summary.totalJours}`, contentX + contentW - 4, y + 13);

  if (summary.lastDate) {
    doc.text(`Dernière saisie : ${formatDate(summary.lastDate)}`, contentX + contentW - 4, y + 17);
  }

  y += headerHeight + 4;

  // Message qualité données (si présent)
  if (summary.statusMessage) {
    const statusLines = doc.splitTextToSize(sanitizePdfText(summary.statusMessage), contentW - 8);
    const statusHeight = Math.max(8, (statusLines.length * 3.8) + 4);

    doc.setFillColor(255, 249, 235);
    doc.setDrawColor(240, 222, 178);
    doc.rect(contentX, y, contentW, statusHeight, 'FD');

    doc.setTextColor(...PDF_THEME.warning);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);

    let sy = y + 4.2;
    statusLines.forEach(line => {
      doc.text(line, contentX + 4, sy);
      sy += 3.8;
    });

    y += statusHeight + 3;
  }

  // Section 1 - Tendances
  const section1Rows = [];
  if (summary.energie.moyenne !== null) {
    section1Rows.push({
      main: `Énergie : ${summary.energie.moyenne}/10`,
      sub: `- ${summary.energie.tendance}`,
      bold: true
    });
  }
  if (summary.qualite_sommeil.moyenne !== null) {
    section1Rows.push({
      main: `Qualité sommeil : ${summary.qualite_sommeil.moyenne}/10`,
      sub: `- ${summary.qualite_sommeil.tendance}`,
      bold: true
    });
  }
  if (summary.douleurs.moyenne !== null) {
    section1Rows.push({
      main: `Confort physique : ${summary.douleurs.moyenne}/10`,
      sub: `- ${summary.douleurs.tendance}`,
      bold: true
    });
  }
  if (summary.clarte_mentale && summary.clarte_mentale.moyenne !== null) {
    section1Rows.push({
      main: `Clarté mentale : ${summary.clarte_mentale.moyenne}/10`,
      sub: `- ${summary.clarte_mentale.tendance}`,
      bold: true
    });
  }
  if (section1Rows.length === 0) {
    section1Rows.push({
      main: 'Aucune donnée disponible. Commencez par saisir vos repères dans l\'onglet "Aujourd\'hui".',
      bold: false
    });
  }
  y = drawSectionCard(doc, y, '1. TENDANCES', section1Rows);
  y += 2.5;

  // Section 2 - Variations importantes
  if (summary.variations && summary.variations.length > 0) {
    const section2Rows = summary.variations.map(v => {
      const typeText = v.type === 'amélioration' ? 'Forte amélioration' : 'Chute brutale';
      return {
        main: `${formatDate(v.date)} : ${typeText}`,
        sub: `(${v.scoreJ.toFixed(1)}/10 vs ${v.scoreJMinus1.toFixed(1)}/10)`,
        bold: true
      };
    });

    y = drawSectionCard(doc, y, '2. VARIATIONS IMPORTANTES', section2Rows);
    y += 2.5;
  }

  // Section 3 - Points marquants
  const section3Rows = [];
  if (summary.pointsMarquants.meilleurJour) {
    const mj = summary.pointsMarquants.meilleurJour;
    section3Rows.push({
      main: `- Meilleur jour : ${formatDate(mj.date)} (score ${mj.score.toFixed(1)}/10)`,
      bold: false
    });
  }
  if (summary.pointsMarquants.jourLePlusBas) {
    const jb = summary.pointsMarquants.jourLePlusBas;
    section3Rows.push({
      main: `- Jour le plus bas : ${formatDate(jb.date)} (score ${jb.score.toFixed(1)}/10)`,
      bold: false
    });
  }
  if (summary.pointsMarquants.gap) {
    const gap = summary.pointsMarquants.gap;
    section3Rows.push({
      main: `- Jours non renseignés : ${formatDate(gap.start)}-${formatDate(gap.end)} (${gap.count} jours)`,
      bold: false
    });
  }
  if (section3Rows.length === 0) {
    section3Rows.push({ main: 'Aucune donnée disponible.', bold: false });
  }

  y = drawSectionCard(doc, y, '3. POINTS MARQUANTS', section3Rows);
  y += 2.5;

  // Section 4 - Notes (si présentes)
  if (summary.notes && summary.notes.length > 0) {
    const section4Rows = summary.notes.map(n => ({
      main: `${formatDate(n.date)} : "${sanitizePdfText(n.note)}"`,
      bold: false
    }));

    y = drawSectionCard(doc, y, '4. VOS NOTES', section4Rows, {
      rowFontSize: 8.7,
      subFontSize: 8.1
    });
    y += 2.5;
  }

  // Section 5 - Prudence
  const section5Rows = [
    { main: 'Attention : infos générales uniquement.', bold: false },
    { main: 'Pas d\'avis médical personnalisé.', bold: false },
    { main: 'Urgence : 15', bold: false }
  ];

  const remainingForContent = pageHeight - PDF_THEME.bottom - 8 - y;
  const prudenceCompact = remainingForContent < 20;

  y = drawSectionCard(doc, y, '5. PRUDENCE', section5Rows, prudenceCompact ? {
    paddingY: 2.5,
    rowFontSize: 8.1,
    rowLineHeight: 3.5
  } : undefined);

  // Pied de page légal fixe (aligné bas de page)
  const footerY = pageHeight - PDF_THEME.bottom;
  doc.setDrawColor(...PDF_THEME.border);
  doc.line(contentX, footerY - 4, contentX + contentW, footerY - 4);

  doc.setTextColor(...PDF_THEME.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.text(
    'Document généré par le patient. Ne remplace pas un avis médical.',
    contentX,
    footerY
  );

  return doc;
}

/**
 * Télécharge le PDF
 */
async function downloadPDF(summary) {
  const doc = await generatePDF(summary);
  const filename = generatePDFFilename();
  doc.save(filename);
  return filename;
}
