/**
 * Boussole — Corrélations mesures biologiques / bien-être
 */

/**
 * Calcule le coefficient de corrélation de Pearson entre deux tableaux.
 * Ignore les paires où l'une des valeurs est null/undefined.
 * @returns {number|null} r ∈ [-1, 1] ou null si moins de 5 points communs
 */
function pearson(xArr, yArr) {
  const pairs = [];
  const len = Math.min(xArr.length, yArr.length);
  for (let i = 0; i < len; i++) {
    if (xArr[i] != null && yArr[i] != null) {
      pairs.push([xArr[i], yArr[i]]);
    }
  }
  if (pairs.length < 5) return null;

  const n = pairs.length;
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0, sdx = 0, sdy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    sdx += dx * dx;
    sdy += dy * dy;
  }

  const denom = Math.sqrt(sdx * sdy);
  if (denom === 0) return null;
  return Math.max(-1, Math.min(1, num / denom));
}

/**
 * Calcule les corrélations entre mesures biologiques et bien-être
 * sur les windowDays derniers jours.
 * @param {Array} entries - entrées triables par date
 * @param {number} windowDays - fenêtre (défaut 30)
 * @returns {Array} tableau d'objets { paire, label, r, n, interpretation }
 */
function computeCorrelations(entries, windowDays = 30) {
  const sorted = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, windowDays);

  const scoreArr   = [];
  const energieArr = [];
  const sommeilArr = [];
  const fcArr      = [];
  const rmssdArr   = [];

  sorted.forEach(entry => {
    // Score composite avec douleurs inversé (11 - douleurs pour garder l'échelle 1-10)
    const vals = [];
    if (entry.energie        != null) vals.push(entry.energie);
    if (entry.qualite_sommeil != null) vals.push(entry.qualite_sommeil);
    if (entry.douleurs        != null) vals.push(11 - entry.douleurs);
    if (entry.clarte_mentale  != null) vals.push(entry.clarte_mentale);
    const composite = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;

    // Mesures biologiques depuis localStorage
    let fc = null;
    let rmssd = null;
    try {
      const raw = localStorage.getItem('boussole_mesures_' + entry.date);
      if (raw) {
        const mesures = JSON.parse(raw);
        fc    = mesures.fc    != null ? Number(mesures.fc)    : null;
        rmssd = mesures.rmssd != null ? Number(mesures.rmssd) : null;
        if (isNaN(fc))    fc    = null;
        if (isNaN(rmssd)) rmssd = null;
      }
    } catch (e) { /* ignore */ }

    scoreArr.push(composite);
    energieArr.push(entry.energie         != null ? entry.energie          : null);
    sommeilArr.push(entry.qualite_sommeil  != null ? entry.qualite_sommeil  : null);
    fcArr.push(fc);
    rmssdArr.push(rmssd);
  });

  const PAIRES = [
    { paire: 'score_fc',      label: 'Score composite ↔ FC',           x: scoreArr,   y: fcArr    },
    { paire: 'score_rmssd',   label: 'Score composite ↔ RMSSD',        x: scoreArr,   y: rmssdArr },
    { paire: 'energie_fc',    label: 'Énergie ↔ FC',                   x: energieArr, y: fcArr    },
    { paire: 'sommeil_rmssd', label: 'Qualité sommeil ↔ RMSSD',        x: sommeilArr, y: rmssdArr },
  ];

  return PAIRES.map(({ paire, label, x, y }) => {
    // Compter les points communs non-nuls pour récupérer n
    const n = x.reduce((count, v, i) => (v != null && y[i] != null ? count + 1 : count), 0);
    const r = pearson(x, y);

    let interpretation = null;
    if (r !== null && Math.abs(r) >= 0.3 && n >= 5) {
      const inverse = r < 0;
      const INTERPRETATIONS = {
        score_fc: {
          inverse: 'Score composite élevé associé à une FC basse — signe positif de récupération.',
          directe: 'Score composite élevé associé à une FC haute — activation physiologique notable.',
        },
        score_rmssd: {
          inverse: 'Score composite élevé associé à un RMSSD bas — lien inhabituel à surveiller.',
          directe: 'Score composite élevé associé à un RMSSD élevé — bonne variabilité cardiaque.',
        },
        energie_fc: {
          inverse: 'Énergie élevée associée à une FC basse — profil de bonne forme physique.',
          directe: 'Énergie élevée associée à une FC haute — activation physiologique notable.',
        },
        sommeil_rmssd: {
          inverse: 'Bon sommeil associé à un RMSSD bas — lien inhabituel à surveiller.',
          directe: 'Bon sommeil associé à un RMSSD élevé — bonne récupération nocturne.',
        },
      };
      interpretation = INTERPRETATIONS[paire][inverse ? 'inverse' : 'directe'];
    }

    return { paire, label, r, n, interpretation };
  });
}

/**
 * Génère la carte HTML des corrélations pour le résumé.
 * @param {Array} entries
 * @returns {string|null} HTML ou null si < 2 corrélations significatives
 */
function renderCorrelationsCard(entries) {
  const correlations = computeCorrelations(entries, 30);
  const significant  = correlations.filter(c => c.r !== null && Math.abs(c.r) >= 0.3 && c.n >= 5);

  if (significant.length < 2) return null;

  const daysWithMeasures = correlations.reduce((max, c) => Math.max(max, c.n), 0);

  let html = '<div class="card">';
  html += '<h2 class="summary-section">CORRÉLATIONS</h2>';
  html += '<ul class="summary-list">';
  significant.forEach(c => {
    html += `<li>${c.interpretation}</li>`;
  });
  html += '</ul>';
  html += `<p style="font-size:11px;color:var(--color-text-muted);margin-top:8px;">Basé sur ${daysWithMeasures} jours avec mesures renseignées</p>`;
  html += '</div>';

  return html;
}

window.computeCorrelations    = computeCorrelations;
window.renderCorrelationsCard = renderCorrelationsCard;
