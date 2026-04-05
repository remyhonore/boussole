// score_sna.js — Feature R : Score de récupération
// ADR-2026-032 — ADR-2026-035 (refonte nomenclature + masquage conditionnel)
// Ponderation : RMSSD 30% / FC 25% / Sommeil 25% / TA 15% / Poids 5%
// Normalisation : baseline personnelle 30j, minimum 5 jours
// Règle d'affichage PDF : masqué si < 2 mesures objectives (RMSSD ou FC) sur 30j

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
    var vide = { series: { rmssd: [], fc: [], sommeil: [], ta_sys: [], ta_dia: [], poids_kg: [], duree_sommeil: [] }, derniere: null };
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

    var series = { rmssd: [], fc: [], sommeil: [], ta_sys: [], ta_dia: [], poids_kg: [], duree_sommeil: [] };

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
          if (typeof m.rmssd        === 'number' && m.rmssd        > 0) series.rmssd.push(m.rmssd);
          if (typeof m.fc           === 'number' && m.fc           > 0) series.fc.push(m.fc);
          if (typeof m.ta_sys       === 'number' && m.ta_sys       > 0) series.ta_sys.push(m.ta_sys);
          if (typeof m.ta_dia       === 'number' && m.ta_dia       > 0) series.ta_dia.push(m.ta_dia);
          if (typeof m.poids        === 'number' && m.poids        > 0) series.poids_kg.push(m.poids);
          if (typeof m.duree_sommeil === 'number' && m.duree_sommeil > 0) series.duree_sommeil.push(m.duree_sommeil);
        }
      }
    });

    return { series: series, derniere: recent[recent.length - 1] || null };
  }

  function _scoreSommeil(entry, mesures) {
    var qualite = typeof entry.qualite_sommeil === 'number' ? entry.qualite_sommeil : null;
    var duree = mesures && typeof mesures.duree_sommeil === 'number' ? mesures.duree_sommeil : null;
    if (!qualite) return null;
    var scoreQualite = qualite * 10; // [0-100]
    if (!duree) return scoreQualite; // fallback si pas de duree
    var scoreDuree = Math.max(0, Math.min(100, 100 - Math.abs(duree - 8.5) / 8.5 * 100));
    return scoreQualite * 0.6 + scoreDuree * 0.4;
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

    var mesures_j = mesures;

    var scoreTotal = 0;
    var poidsActifs = 0;
    var detail = {};

    var configs = [
      { cle: 'rmssd',    valeur: mesures.rmssd,                      inverse: false },
      { cle: 'fc',       valeur: mesures.fc,                         inverse: true  },
      { cle: 'sommeil',  valeur: _scoreSommeil(derniere, mesures_j), inverse: false },
      { cle: 'ta_sys',   valeur: mesures.ta_sys,                     inverse: true  },
      { cle: 'ta_dia',   valeur: mesures.ta_dia,                     inverse: true  },
      { cle: 'poids_kg', valeur: mesures.poids,                      inverse: true  }
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
    // Compter les sources objectives disponibles (RMSSD + FC)
    var nbSourcesObjectives = (detail.rmssd !== undefined ? 1 : 0) + (detail.fc !== undefined ? 1 : 0);
    return { score: score, couleur: couleur, detail: detail, date: derniere.date, nbSourcesObjectives: nbSourcesObjectives };
  }

  function renderJauge(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var res = calculer();

    if (!res) {
      container.innerHTML = '<p style="color:#6b7280;font-size:13px;text-align:center;padding:8px 0;">Renseigne au moins 5 jours de mesures pour activer le Score de récupération.</p>';
      return;
    }

    var score = res.score, couleur = res.couleur, detail = res.detail;
    var couleurs = { vert: '#2d6a4f', orange: '#f59e0b', rouge: '#dc2626' };
    var c = couleurs[couleur];
    var labels = { vert: 'Bonne récupération', orange: 'Récupération modérée', rouge: 'Récupération faible' };
    var rayon = 54;
    var circ = Math.PI * rayon;
    var offset = circ - (score / 100) * circ;

    var noms = { rmssd: 'VFC (RMSSD)', fc: 'FC repos', sommeil: 'Sommeil', ta_sys: 'TA systolique', ta_dia: 'TA diastolique', poids_kg: 'Poids' };
    var detailHTML = Object.keys(detail).map(function(k) {
      var v = detail[k];
      var col = v >= 65 ? '#2d6a4f' : v >= 40 ? '#f59e0b' : '#dc2626';
      return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:3px 0;border-bottom:1px solid #f3f4f6;">' +
        '<span style="color:#6b7280;">' + (noms[k] || k) + '</span>' +
        '<span style="font-weight:600;color:' + col + '">' + v + '/100</span>' +
        '</div>';
    }).join('');

    container.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<div style="font-size:13px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:0.08em;">Score de récupération</div>' +
        '<button onclick="document.getElementById(\'modal-sna\').style.display=\'flex\'" ' +
          'style="background:none;border:1px solid #d1d5db;border-radius:50%;width:20px;height:20px;font-size:11px;color:#6b7280;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" ' +
          'aria-label="En savoir plus sur le Score de récupération">?</button>' +
      '</div>' +
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
        '<div style="font-size:12px;font-weight:700;color:' + c + ';margin-top:4px;text-transform:uppercase;letter-spacing:0.06em;">' +
          labels[couleur] +
        '</div>' +
        '<div style="font-size:11px;color:#9ca3af;margin-top:3px;font-style:italic;">' +
          (res.nbSourcesObjectives === 0 ? 'Basé sur sommeil déclaré uniquement — ajoute FC ou RMSSD pour affiner' :
           res.nbSourcesObjectives === 1 ? '1 mesure objective (FC ou RMSSD) + sommeil' :
           'FC + RMSSD + sommeil') +
        '</div>' +
      '</div>' +
      '<div style="margin-top:6px;">' + detailHTML + '</div>';

    // Modale explicative — injectee une seule fois dans le body
    if (!document.getElementById('modal-sna')) {
      var modal = document.createElement('div');
      modal.id = 'modal-sna';
      modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;align-items:center;justify-content:center;padding:16px;';
      modal.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.18);position:relative;">' +
        '<button onclick="document.getElementById(\'modal-sna\').style.display=\'none\'" ' +
          'style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:18px;color:#9ca3af;cursor:pointer;" aria-label="Fermer">x</button>' +
        '<h3 style="font-size:15px;font-weight:700;color:#1a2332;margin:0 0 12px 0;">Score de récupération</h3>' +
        '<p style="font-size:13px;color:rgba(6,23,45,.55);line-height:1.5;margin:0 0 10px 0;">Ce score [0-100] estime ta récupération en comparant tes données du jour à ta propre baseline des 30 derniers jours.</p>' +
        '<p style="font-size:13px;color:rgba(6,23,45,.55);line-height:1.5;margin:0 0 10px 0;">Il peut combiner jusqu\'à 6 sources : VFC (RMSSD), FC repos, qualité et durée du sommeil, tension artérielle, poids. <strong>Plus tu renseignes de mesures objectives, plus le score est fiable.</strong></p>' +
        '<div style="background:#f8f6f0;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:13px;line-height:1.6;">' +
          '<div><span style="color:#2d6a4f;font-weight:700;">Vert (65+)</span> : bonne récupération</div>' +
          '<div><span style="color:#f59e0b;font-weight:700;">Orange (40-64)</span> : récupération modérée</div>' +
          '<div><span style="color:#dc2626;font-weight:700;">Rouge (&lt;40)</span> : récupération faible</div>' +
        '</div>' +
        '<p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 6px 0;">Le score est calcule par rapport a ta propre baseline des 30 derniers jours - pas des normes exterieures.</p>' +
        '<p style="font-size:12px;color:#9ca3af;margin:0;">Base sur minimum 5 jours de mesures renseignees.</p>' +
      '</div>';
      document.body.appendChild(modal);
      // Fermer en cliquant sur le fond
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  }

  function resumePDF() {
    var res = calculer();
    if (!res) return null;
    // Masquer dans le PDF si < 2 mesures objectives (RMSSD ou FC) — ADR-2026-035
    if (res.nbSourcesObjectives < 2) return null;
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
