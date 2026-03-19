// score_sna.js — Feature R : Score composite SNA
// ADR-2026-032
// Ponderation : RMSSD 30% / FC 25% / Sommeil 25% / TA 15% / Poids 5%
// Normalisation : baseline personnelle 30j, minimum 5 jours

window.ScoreSNA = (function() {

  var POIDS = { rmssd: 0.30, fc: 0.25, sommeil: 0.25, ta_sys: 0.10, ta_dia: 0.05, poids_kg: 0.05 };
  var MIN_JOURS = 5;
  var STORAGE_KEY = 'boussole_v1_data';

  function _normaliser(valeur, moyenne, ecartType, inverse) {
    if (!ecartType || ecartType < 0.01) return 50;
    var z = (valeur - moyenne) / ecartType;
    var score = inverse ? 50 + z * 15 : 50 - z * 15;
    return Math.max(0, Math.min(100, score));
  }

  function _stats(tableau) {
    var n = tableau.length;
    if (n < MIN_JOURS) return null;
    var moy = tableau.reduce(function(a, b) { return a + b; }, 0) / n;
    var variance = tableau.reduce(function(s, v) { return s + Math.pow(v - moy, 2); }, 0) / n;
    return { moy: moy, std: Math.sqrt(variance) };
  }

  function _series30j() {
    var vide = { series: { rmssd: [], fc: [], sommeil: [], ta_sys: [], ta_dia: [], poids_kg: [] }, derniere: null };
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (ex) { return vide; }
    var data = raw ? JSON.parse(raw) : { entries: [] };
    var entries = data.entries || [];

    var now = Date.now();
    var TRENTE_J = 30 * 24 * 60 * 60 * 1000;
    var recent = entries.filter(function(e) {
      return (now - new Date(e.date).getTime()) <= TRENTE_J;
    });
    recent.sort(function(a, b) { return a.date < b.date ? -1 : 1; });

    var series = { rmssd: [], fc: [], sommeil: [], ta_sys: [], ta_dia: [], poids_kg: [] };

    recent.forEach(function(e) {
      // Sommeil : qualite_sommeil (1-10), normalise sur [0-100]
      if (typeof e.qualite_sommeil === 'number' && e.qualite_sommeil > 0) {
        series.sommeil.push(e.qualite_sommeil * 10);
      }
      // Mesures biologiques : boussole_mesures_YYYY-MM-DD
      var rawM;
      try { rawM = localStorage.getItem('boussole_mesures_' + e.date); } catch (ex) {}
      if (rawM) {
        var m;
        try { m = JSON.parse(rawM); } catch (ex) {}
        if (m) {
          if (typeof m.rmssd  === 'number' && m.rmssd  > 0) series.rmssd.push(m.rmssd);
          if (typeof m.fc     === 'number' && m.fc     > 0) series.fc.push(m.fc);
          if (typeof m.ta_sys === 'number' && m.ta_sys > 0) series.ta_sys.push(m.ta_sys);
          if (typeof m.ta_dia === 'number' && m.ta_dia > 0) series.ta_dia.push(m.ta_dia);
          if (typeof m.poids  === 'number' && m.poids  > 0) series.poids_kg.push(m.poids);
        }
      }
    });

    return { series: series, derniere: recent[recent.length - 1] || null };
  }

  function calculer() {
    var res30 = _series30j();
    var series = res30.series;
    var derniere = res30.derniere;
    if (!derniere) return null;

    // Mesures du dernier jour
    var mesures = {};
    var rawM;
    try { rawM = localStorage.getItem('boussole_mesures_' + derniere.date); } catch (ex) {}
    if (rawM) {
      try { mesures = JSON.parse(rawM); } catch (ex) {}
    }

    var som = typeof derniere.qualite_sommeil === 'number' ? derniere.qualite_sommeil : null;

    var scoreTotal = 0;
    var poidsActifs = 0;
    var detail = {};

    var configs = [
      { cle: 'rmssd',    valeur: mesures.rmssd,                    inverse: false },
      { cle: 'fc',       valeur: mesures.fc,                       inverse: true  },
      { cle: 'sommeil',  valeur: som !== null ? som * 10 : null,   inverse: false },
      { cle: 'ta_sys',   valeur: mesures.ta_sys,                   inverse: true  },
      { cle: 'ta_dia',   valeur: mesures.ta_dia,                   inverse: true  },
      { cle: 'poids_kg', valeur: mesures.poids,                    inverse: true  }
    ];

    configs.forEach(function(cfg) {
      if (!cfg.valeur || cfg.valeur <= 0) return;
      var stats = _stats(series[cfg.cle]);
      if (!stats) return;
      var s = _normaliser(cfg.valeur, stats.moy, stats.std, cfg.inverse);
      detail[cfg.cle] = Math.round(s);
      scoreTotal += s * POIDS[cfg.cle];
      poidsActifs += POIDS[cfg.cle];
    });

    if (poidsActifs < 0.25) return null;

    var score = Math.round(scoreTotal / poidsActifs);
    var couleur = score >= 65 ? 'vert' : score >= 40 ? 'orange' : 'rouge';
    return { score: score, couleur: couleur, detail: detail, date: derniere.date };
  }

  function renderJauge(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var res = calculer();

    if (!res) {
      container.innerHTML = '<p style="color:#6b7280;font-size:0.85rem;text-align:center;padding:8px 0;">Renseigne au moins 5 jours de mesures pour activer le score SNA.</p>';
      return;
    }

    var score = res.score, couleur = res.couleur, detail = res.detail;
    var couleurs = { vert: '#2d6a4f', orange: '#f59e0b', rouge: '#dc2626' };
    var c = couleurs[couleur];
    var labels = { vert: 'Bonne recuperation', orange: 'Recuperation moderee', rouge: 'Recuperation faible' };

    // Jauge SVG demi-cercle
    var rayon = 54;
    var circ = Math.PI * rayon;
    var offset = circ - (score / 100) * circ;

    var noms = { rmssd: 'VFC (RMSSD)', fc: 'FC repos', sommeil: 'Sommeil', ta_sys: 'TA systolique', ta_dia: 'TA diastolique', poids_kg: 'Poids' };
    var detailHTML = Object.keys(detail).map(function(k) {
      var v = detail[k];
      var col = v >= 65 ? '#2d6a4f' : v >= 40 ? '#f59e0b' : '#dc2626';
      return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;padding:3px 0;border-bottom:1px solid #f3f4f6;">' +
        '<span style="color:#6b7280;">' + (noms[k] || k) + '</span>' +
        '<span style="font-weight:600;color:' + col + '">' + v + '/100</span>' +
        '</div>';
    }).join('');

    container.innerHTML =
      '<div style="text-align:center;padding:4px 0 8px;">' +
        '<svg viewBox="0 0 120 70" width="150" style="display:block;margin:0 auto;overflow:visible;">' +
          '<path d="M10,60 A54,54 0 0,1 110,60" fill="none" stroke="#e5e7eb" stroke-width="12" stroke-linecap="round"/>' +
          '<path d="M10,60 A54,54 0 0,1 110,60" fill="none" stroke="' + c + '" stroke-width="12"' +
            ' stroke-linecap="round"' +
            ' stroke-dasharray="' + circ.toFixed(2) + '"' +
            ' stroke-dashoffset="' + offset.toFixed(2) + '"' +
            ' style="transition:stroke-dashoffset 0.8s ease;"/>' +
          '<text x="60" y="55" text-anchor="middle" font-size="22" font-weight="700" fill="' + c + '">' + score + '</text>' +
          '<text x="60" y="66" text-anchor="middle" font-size="9" fill="#9ca3af">/100</text>' +
        '</svg>' +
        '<div style="font-size:0.8rem;font-weight:700;color:' + c + ';margin-top:4px;text-transform:uppercase;letter-spacing:0.06em;">' +
          labels[couleur] +
        '</div>' +
      '</div>' +
      '<div style="margin-top:6px;">' + detailHTML + '</div>';
  }

  function resumePDF() {
    var res = calculer();
    if (!res) return null;
    var score = res.score, couleur = res.couleur, detail = res.detail;
    var lib = { vert: 'Bonne recuperation', orange: 'Recuperation moderee', rouge: 'Recuperation faible' };
    var noms = { rmssd: 'VFC RMSSD', fc: 'FC repos', sommeil: 'Sommeil', ta_sys: 'TA systolique', ta_dia: 'TA diastolique', poids_kg: 'Poids' };
    var lignes = Object.keys(detail).map(function(k) {
      return (noms[k] || k) + ' : ' + detail[k] + '/100';
    });
    return { score: score, label: lib[couleur], lignes: lignes };
  }

  return { calculer: calculer, renderJauge: renderJauge, resumePDF: resumePDF };

})();
