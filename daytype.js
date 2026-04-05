/**
 * Boussole+ — Système Vert / Orange / Rouge
 * Basé sur le score composite des métriques saisies
 */

/**
 * Calcule le type de journée à partir d'une entrée
 * @param {Object} entry - entrée avec energie, qualite_sommeil, douleurs, clarte_mentale
 * @returns {Object} { type: 'vert'|'orange'|'rouge', score, label, emoji, conseil, reserve }
 */
function getDayType(entry) {
  if (!entry) return null;

  // Collecte des valeurs non nulles (toutes les métriques, haute = mieux)
  const valeurs = [
    entry.energie,
    entry.qualite_sommeil,
    entry.douleurs,       // renommé "Confort physique" — 10 = très à l'aise
    entry.clarte_mentale
  ].filter(v => v !== null && v !== undefined);

  if (valeurs.length === 0) return null;

  const score = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;

  if (score >= 7) {
    return {
      type: 'vert',
      score,
      label: 'Jour Vert',
      emoji: '<span style="color:#2d6a4f;">●</span>',
      couleur: '#2d6a4f',
      couleurBg: 'rgba(45,106,79,0.06)',
      couleurBorder: 'rgba(45,106,79,0.3)',
      conseil: '1 priorité · pauses planifiées · sommeil protégé',
      detail: 'C\'est un bon jour. Garde 20-30% d\'énergie en réserve — ne rattrape pas tout ce qui n\'a pas été fait.',
      reserve: 'Évite de "sur-utiliser" ce bon jour. Le crash du lendemain se prépare aujourd\'hui.'
    };
  } else if (score >= 4) {
    return {
      type: 'orange',
      score,
      label: 'Jour Orange',
      emoji: '🟠',
      couleur: '#f57c00',
      couleurBg: '#fff8f0',
      couleurBorder: '#ffcc80',
      conseil: 'Rythme réduit · fractionner · éviter les nouveautés',
      detail: 'Journée en vigilance. Réduis le rythme, fractionne les activités, évite les décisions importantes.',
      reserve: 'Ce n\'est pas le moment d\'ajouter de nouvelles choses à ta liste.'
    };
  } else {
    return {
      type: 'rouge',
      score,
      label: 'Jour Rouge',
      emoji: '🔴',
      couleur: '#c62828',
      couleurBg: '#fff5f5',
      couleurBorder: '#ef9a9a',
      conseil: 'Repos & calme · minimum vital · ne pas forcer',
      detail: 'Corps en mode récupération. Minimum vital uniquement. Ce n\'est pas de la faiblesse — c\'est de la stratégie.',
      reserve: 'Forcer aujourd\'hui = crash demain ou après-demain. Protège-toi maintenant.'
    };
  }
}

/**
 * Calcule la distribution des types de jours sur les N derniers jours
 * @param {Array} entries - tableau d'entrées triées par date
 * @param {number} days - nombre de jours
 * @returns {Object} { vert, orange, rouge, total }
 */
function getDayTypeDistribution(entries, days = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const recent = entries.filter(e => e.date >= cutoffStr);

  const distribution = { vert: 0, orange: 0, rouge: 0, total: recent.length };

  recent.forEach(entry => {
    const dt = getDayType(entry);
    if (dt) distribution[dt.type]++;
  });

  return distribution;
}

/**
 * Génère le HTML de la card Vert/Orange/Rouge pour l'affichage après saisie
 * @param {Object} dayType - résultat de getDayType()
 * @returns {string} HTML
 */
function renderDayTypeCard(dayType) {
  if (!dayType) return '';

  return `
    <div class="daytype-card" style="
      background: ${dayType.couleurBg};
      border: 2px solid ${dayType.couleurBorder};
      border-radius: 12px;
      padding: 18px;
      margin-top: 16px;
    ">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span style="font-size: 22px;">${dayType.emoji}</span>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: ${dayType.couleur};">
            ${dayType.label}
          </div>
          <div style="font-size: 13px; color: #666;">
            Score moyen : ${dayType.score.toFixed(1)}/10
          </div>
        </div>
      </div>

      <div style="
        background: white;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
        font-size: 13px;
        color: #333;
        border-left: 3px solid ${dayType.couleur};
      ">
        <strong>Aujourd'hui :</strong> ${dayType.conseil}
      </div>

      <p style="font-size: 13px; color: #555; margin: 8px 0;">
        ${dayType.detail}
      </p>

      <div style="
        background: rgba(0,0,0,0.04);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        color: #666;
        margin-top: 8px;
      ">
        ⚡ <em>${dayType.reserve}</em>
      </div>
    </div>
  `;
}

/**
 * Génère le HTML du bloc distribution pour l'écran Résumé
 * @param {Array} entries - toutes les entrées
 * @param {number} days - fenêtre en jours
 * @returns {string} HTML
 */
function renderDayTypeDistribution(entries, days = 14) {
  const dist = getDayTypeDistribution(entries, days);

  if (dist.total === 0) return '';

  // Calendrier des 14 derniers jours
  const today = new Date();
  const calendarDays = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === dateStr);
    const dt = entry ? getDayType(entry) : null;
    calendarDays.push({ dateStr, dt, dayNum: d.getDate() });
  }

  const calendarHTML = calendarDays.map(({ dt, dayNum }) => {
    const color = dt ? dt.couleur : '#ddd';
    const bg = dt ? dt.couleurBg : '#f9f9f9';
    const emoji = dt ? dt.emoji : '·';
    return `
      <div style="
        width: 36px; height: 36px;
        border-radius: 8px;
        background: ${bg};
        border: 1.5px solid ${color};
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-size: 10px; color: #666; gap: 1px;
      ">
        <span style="font-size: 13px; line-height: 1;">${emoji}</span>
        <span style="font-size: 10px;">${dayNum}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h2 class="summary-section">📅 TYPE DE JOURNÉES — ${days} JOURS</h2>

      <div style="display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 80px; background: rgba(45,106,79,0.06); border: 1.5px solid rgba(45,106,79,0.3); border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 22px; color: #2d6a4f;">●</div>
          <div style="font-weight: 700; font-size: 20px; color: #2d6a4f;">${dist.vert}</div>
          <div style="font-size: 12px; color: #666;">Jours Verts</div>
        </div>
        <div style="flex: 1; min-width: 80px; background: #fff8f0; border: 1.5px solid #ffcc80; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 22px;">🟠</div>
          <div style="font-weight: 700; font-size: 20px; color: #f57c00;">${dist.orange}</div>
          <div style="font-size: 12px; color: #666;">Jours Orange</div>
        </div>
        <div style="flex: 1; min-width: 80px; background: #fff5f5; border: 1.5px solid #ef9a9a; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 22px;">🔴</div>
          <div style="font-weight: 700; font-size: 20px; color: #c62828;">${dist.rouge}</div>
          <div style="font-size: 12px; color: #666;">Jours Rouges</div>
        </div>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
        ${calendarHTML}
      </div>

      <p style="font-size: 12px; color: rgba(6,23,45,.42); margin: 0;">
        Garder 20-30% d'énergie en réserve lors des jours verts réduit les crashs du lendemain.
      </p>
    </div>
  `;
}
