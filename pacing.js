// pacing.js — Feature P : Score de stabilité matinal (Morning Pace)
// Inspiré de Visible mais 100% local, sans bracelet, basé sur la baseline personnelle
// Séquence : A (stabilité matinale) → D (feedback utilisateur)

window.MorningPace = (function() {
  'use strict';

  var FEEDBACK_KEY = 'boussole_pace_feedback';
  var LABELS = {
    1: { emoji: '🔴', label: 'Journée de repos', tip: 'Protège ton énergie. Limite les activités au strict nécessaire.', color: '#dc2626' },
    2: { emoji: '🟠', label: 'Journée légère', tip: 'Privilégie le repos actif. Évite les efforts prolongés.', color: '#f59e0b' },
    3: { emoji: '🟡', label: 'Journée modérée', tip: 'Choisis tes activités. Alterne effort et repos.', color: '#eab308' },
    4: { emoji: '🟢', label: 'Journée favorable', tip: 'Tu as de la marge. Reste à l\'écoute de ton corps.', color: '#2d6a4f' },
    5: { emoji: '🟢', label: 'Bonne stabilité', tip: 'Bonne récupération. Profite de cette journée en restant attentif(ve).', color: '#2d6a4f' }
  };

  // --- Calcul du score de stabilité matinal (1-5) ---
  function calculer() {
    var scoreRecup = null;
    if (window.ScoreSNA && typeof window.ScoreSNA.calculer === 'function') {
      var sna = window.ScoreSNA.calculer();
      if (sna && typeof sna.score === 'number') scoreRecup = sna.score;
    }

    // Fallback : score composite d'hier si pas de score récup
    var hierScore = null;
    if (scoreRecup === null) {
      var entries = [];
      try {
        var raw = localStorage.getItem('boussole_v1_data');
        if (raw) entries = (JSON.parse(raw).entries || []);
      } catch (e) {}
      if (entries.length > 0) {
        entries.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
        var last = entries[entries.length - 1];
        var vals = [last.energie, last.qualite_sommeil, last.douleurs, last.clarte_mentale].filter(function(v) { return typeof v === 'number'; });
        if (vals.length > 0) hierScore = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
      }
    }

    // Pas assez de données
    if (scoreRecup === null && hierScore === null) return null;

    // Mapping score récup (0-100) → stabilité (1-5)
    var niveau;
    if (scoreRecup !== null) {
      if (scoreRecup < 25) niveau = 1;
      else if (scoreRecup < 40) niveau = 2;
      else if (scoreRecup < 60) niveau = 3;
      else if (scoreRecup < 78) niveau = 4;
      else niveau = 5;
    } else {
      // Mapping score composite hier (0-10) → stabilité (1-5)
      if (hierScore < 3) niveau = 1;
      else if (hierScore < 4.5) niveau = 2;
      else if (hierScore < 6) niveau = 3;
      else if (hierScore < 8) niveau = 4;
      else niveau = 5;
    }

    // Ajustement feedback : si l'utilisateur a souvent dit 👎, baisser d'un cran
    var feedbacks = _getFeedbacks();
    var recent = feedbacks.slice(-14); // 14 derniers jours
    if (recent.length >= 5) {
      var thumbsDown = recent.filter(function(f) { return f.match === false; }).length;
      if (thumbsDown / recent.length > 0.5) {
        niveau = Math.max(1, niveau - 1);
      }
    }

    return {
      niveau: niveau,
      source: scoreRecup !== null ? 'recup' : 'composite',
      scoreRecup: scoreRecup,
      hierScore: hierScore
    };
  }

  // --- Feedback ---
  function _getFeedbacks() {
    try {
      var raw = localStorage.getItem(FEEDBACK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveFeedback(match) {
    var today = new Date().toISOString().split('T')[0];
    var feedbacks = _getFeedbacks();
    // Dédupliquer par date
    feedbacks = feedbacks.filter(function(f) { return f.date !== today; });
    feedbacks.push({ date: today, match: match });
    // Garder 90 jours max
    if (feedbacks.length > 90) feedbacks = feedbacks.slice(-90);
    try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks)); } catch (e) {}
    // Mettre à jour l'affichage du feedback
    var fbDiv = document.getElementById('morning-pace-feedback');
    if (fbDiv) {
      fbDiv.innerHTML = '<span style="font-size:12px;color:#6b7280;font-style:italic;">Merci pour ton retour ' + (match ? '👍' : '👎') + '</span>';
    }
  }

  // --- Rendu HTML ---
  function render(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var res = calculer();
    if (!res) {
      container.style.display = 'none';
      return;
    }

    var info = LABELS[res.niveau];
    var sourceNote = res.source === 'recup'
      ? 'Basé sur ton score de récupération (' + res.scoreRecup + '/100)'
      : 'Basé sur ton dernier bilan (' + (res.hierScore ? res.hierScore.toFixed(1) : '?') + '/10)';

    // Barre de niveau 1-5
    var dots = '';
    for (var i = 1; i <= 5; i++) {
      var active = i <= res.niveau;
      var dotColor = active ? info.color : '#e5e7eb';
      dots += '<div style="flex:1;height:6px;border-radius:3px;background:' + dotColor + ';' + (i < 5 ? 'margin-right:4px;' : '') + '"></div>';
    }

    // Vérifier si feedback déjà donné aujourd'hui
    var today = new Date().toISOString().split('T')[0];
    var feedbacks = _getFeedbacks();
    var todayFb = feedbacks.find(function(f) { return f.date === today; });
    var feedbackHtml;
    if (todayFb) {
      feedbackHtml = '<span style="font-size:12px;color:#6b7280;font-style:italic;">Retour enregistré ' + (todayFb.match ? '👍' : '👎') + '</span>';
    } else {
      feedbackHtml = '<span style="font-size:11px;color:#9ca3af;">Ce score correspond ?</span>' +
        '<button onclick="window.MorningPace.saveFeedback(true)" style="margin-left:8px;background:none;border:1px solid #d1d5db;border-radius:6px;padding:2px 10px;font-size:13px;cursor:pointer;" aria-label="Oui, le score correspond">👍</button>' +
        '<button onclick="window.MorningPace.saveFeedback(false)" style="margin-left:4px;background:none;border:1px solid #d1d5db;border-radius:6px;padding:2px 10px;font-size:13px;cursor:pointer;" aria-label="Non, le score ne correspond pas">👎</button>';
    }

    container.style.display = 'block';
    container.innerHTML =
      '<div style="border-radius:12px;padding:14px 16px;margin-bottom:12px;background:linear-gradient(135deg,rgba(45,106,79,.06),rgba(45,106,79,.02));border:1.5px solid rgba(45,106,79,.18);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#06172D;">Stabilité du jour</div>' +
          '<span style="font-size:22px;">' + info.emoji + '</span>' +
        '</div>' +
        '<div style="font-size:15px;font-weight:700;color:' + info.color + ';margin-bottom:4px;">' + info.label + '</div>' +
        '<p style="font-size:13px;color:rgba(6,23,45,.72);line-height:1.4;margin:0 0 10px;">' + info.tip + '</p>' +
        '<div style="display:flex;align-items:center;margin-bottom:8px;">' + dots + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<span style="font-size:11px;color:#9ca3af;">' + sourceNote + '</span>' +
        '</div>' +
        '<div id="morning-pace-feedback" style="margin-top:8px;display:flex;align-items:center;gap:4px;">' + feedbackHtml + '</div>' +
      '</div>';
  }

  return {
    calculer: calculer,
    render: render,
    saveFeedback: saveFeedback
  };

})();
