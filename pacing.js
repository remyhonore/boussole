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
    4: { emoji: '<span style="color:#2d6a4f;">●</span>', label: 'Journée favorable', tip: 'Tu as de la marge. Reste à l\'écoute de ton corps.', color: '#2d6a4f' },
    5: { emoji: '<span style="color:#2d6a4f;">●</span>', label: 'Bonne stabilité', tip: 'Bonne récupération. Profite de cette journée en restant attentif(ve).', color: '#2d6a4f' }
  };

  // Vérifie si un événement crash/PEM a été signalé dans les 48 dernières heures
  function _hasCrashEvent48h() {
    var cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    var cutoffStr = cutoff.toISOString().split('T')[0];
    var crashTypes = ['crash-pem', 'mauvaise-journee-exceptionnelle', 'reaction-medicament', 'symptome-inhabituel', 'presyncope', 'syncope', 'effet-paradoxal'];
    try {
      var keys = Object.keys(localStorage).filter(function(k) { return k.startsWith('boussole_event_'); });
      for (var i = 0; i < keys.length; i++) {
        var raw = localStorage.getItem(keys[i]);
        if (raw) {
          var evt = JSON.parse(raw);
          var evtDate = evt.date || '';
          if (evtDate >= cutoffStr && crashTypes.indexOf(evt.type) !== -1) return true;
        }
      }
    } catch (e) {}
    return false;
  }

  // --- Calcul du score de stabilité matinal (1-5) ---
  // Blend subjectif (60%) + biométrie (40%) pour éviter la dissociation
  // entre ressenti et mesures objectives
  function calculer() {
    // 1. Score de récupération (biométrie, 0-100)
    var scoreRecup = null;
    if (window.ScoreSNA && typeof window.ScoreSNA.calculer === 'function') {
      var sna = window.ScoreSNA.calculer();
      if (sna && typeof sna.score === 'number') scoreRecup = sna.score;
    }

    // 2. Score subjectif récent (0-10 → normalisé 0-100)
    var subjectif = null;
    var hierScore = null;
    var entries = [];
    try {
      var raw = localStorage.getItem('boussole_v1_data');
      if (raw) entries = (JSON.parse(raw).entries || []);
    } catch (e) {}
    if (entries.length > 0) {
      entries.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      var last = entries[entries.length - 1];
      var vals = [last.energie, last.qualite_sommeil, last.douleurs, last.clarte_mentale].filter(function(v) { return typeof v === 'number'; });
      if (vals.length > 0) {
        hierScore = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
        subjectif = hierScore * 10; // 0-10 → 0-100
      }
    }

    // Pas assez de données
    if (scoreRecup === null && subjectif === null) return null;

    // 3. Blend : subjectif prime (le ressenti fait foi)
    var blended;
    var source;
    if (scoreRecup !== null && subjectif !== null) {
      blended = subjectif * 0.6 + scoreRecup * 0.4;
      source = 'blend';
    } else if (subjectif !== null) {
      blended = subjectif;
      source = 'composite';
    } else {
      blended = scoreRecup;
      source = 'recup';
    }

    // 4. Mapping score blendé (0-100) → stabilité (1-5)
    var niveau;
    if (blended < 25) niveau = 1;
    else if (blended < 40) niveau = 2;
    else if (blended < 60) niveau = 3;
    else if (blended < 78) niveau = 4;
    else niveau = 5;

    // 5. Ajustement événements crash récents (48h) — Option B : −1 cran
    // Le lendemain les scores subjectifs prendront le relais naturellement
    var crashRecent = _hasCrashEvent48h();
    if (crashRecent) {
      niveau = Math.max(1, niveau - 1);
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
      source: source,
      scoreRecup: scoreRecup,
      hierScore: hierScore,
      blended: Math.round(blended),
      crashRecent: crashRecent
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
    var sourceNote = res.source === 'blend'
      ? 'Ressenti (' + (res.hierScore ? res.hierScore.toFixed(1) : '?') + '/10) + récupération (' + (res.scoreRecup || '?') + '/100)'
      : res.source === 'recup'
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
          '<div class="section-title" style="color:#06172D;">Pacing — Stabilité du jour</div>' +
          '<span style="font-size:22px;">' + info.emoji + '</span>' +
        '</div>' +
        (res.crashRecent ? '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#991b1b;">⚠️ Crash/PEM signalé récemment — niveau abaissé</div>' : '') +
        '<div style="font-size:13px;font-weight:700;color:' + info.color + ';margin-bottom:4px;">' + info.label + '</div>' +
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


// === Feature B : Enveloppe énergétique déclarative ===
// Budget quotidien basé sur la stabilité matinale, catalogue d'activités personnalisable,
// jauge visuelle avec alertes à 60/80/100%

window.EnergyEnvelope = (function() {
  'use strict';

  var CATALOGUE_KEY = 'boussole_pacing_catalogue';
  var LOG_PREFIX = 'boussole_pacing_log_';

  // Budget par niveau de stabilité matinale (1-5)
  var BUDGETS = { 1: 40, 2: 60, 3: 80, 4: 100, 5: 120 };

  // Catalogue par défaut (coût en points)
  var CATALOGUE_DEFAUT = [
    { id: 'marche_courte', nom: 'Marche courte (15 min)', cout: 10, categorie: 'physique', emoji: '🚶' },
    { id: 'marche_longue', nom: 'Marche longue (30+ min)', cout: 20, categorie: 'physique', emoji: '🚶' },
    { id: 'courses', nom: 'Courses / commissions', cout: 20, categorie: 'physique', emoji: '🛒' },
    { id: 'menage', nom: 'Ménage / rangement', cout: 15, categorie: 'physique', emoji: '🧹' },
    { id: 'cuisine', nom: 'Cuisine (préparer un repas)', cout: 12, categorie: 'physique', emoji: '🍳' },
    { id: 'douche', nom: 'Douche / soins', cout: 8, categorie: 'physique', emoji: '🚿' },
    { id: 'sport_leger', nom: 'Sport léger / étirements', cout: 25, categorie: 'physique', emoji: '🧘' },
    { id: 'ecran_travail', nom: 'Travail / écran (1h)', cout: 15, categorie: 'cognitif', emoji: '💻' },
    { id: 'reunion', nom: 'Réunion / appel', cout: 20, categorie: 'cognitif', emoji: '📞' },
    { id: 'lecture', nom: 'Lecture (30 min)', cout: 8, categorie: 'cognitif', emoji: '📖' },
    { id: 'conversation', nom: 'Conversation stressante', cout: 18, categorie: 'cognitif', emoji: '😰' },
    { id: 'admin', nom: 'Tâches administratives', cout: 12, categorie: 'cognitif', emoji: '📋' },
    { id: 'social', nom: 'Sortie sociale', cout: 25, categorie: 'cognitif', emoji: '👥' },
    { id: 'repos_allonge', nom: 'Repos allongé (30 min)', cout: -10, categorie: 'repos', emoji: '🛋️' },
    { id: 'sieste', nom: 'Sieste', cout: -15, categorie: 'repos', emoji: '😴' },
    { id: 'meditation', nom: 'Méditation / respiration', cout: -5, categorie: 'repos', emoji: '🧘' }
  ];

  function _getCatalogue() {
    try {
      var raw = localStorage.getItem(CATALOGUE_KEY);
      if (raw) {
        var custom = JSON.parse(raw);
        // Fusionner : défaut + custom (custom ids commencent par 'custom_')
        var defIds = CATALOGUE_DEFAUT.map(function(a) { return a.id; });
        var merged = CATALOGUE_DEFAUT.slice();
        custom.forEach(function(c) {
          if (defIds.indexOf(c.id) === -1) merged.push(c);
        });
        return merged;
      }
    } catch (e) {}
    return CATALOGUE_DEFAUT.slice();
  }

  function _getLog(date) {
    try {
      var raw = localStorage.getItem(LOG_PREFIX + date);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function _saveLog(date, log) {
    try { localStorage.setItem(LOG_PREFIX + date, JSON.stringify(log)); } catch (e) {}
  }

  function _today() { return new Date().toISOString().split('T')[0]; }

  function getBudget() {
    var pace = window.MorningPace ? window.MorningPace.calculer() : null;
    var niveau = pace ? pace.niveau : 3; // défaut modéré
    return BUDGETS[niveau] || 80;
  }

  function getUsed(date) {
    var log = _getLog(date || _today());
    return log.reduce(function(sum, entry) { return sum + (entry.cout || 0); }, 0);
  }

  function logActivity(activityId) {
    var date = _today();
    var catalogue = _getCatalogue();
    var act = catalogue.find(function(a) { return a.id === activityId; });
    if (!act) return;
    var log = _getLog(date);
    log.push({ id: act.id, nom: act.nom, cout: act.cout, emoji: act.emoji, heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
    _saveLog(date, log);
    render('energy-envelope-card');
  }

  function removeActivity(index) {
    var date = _today();
    var log = _getLog(date);
    if (index >= 0 && index < log.length) {
      log.splice(index, 1);
      _saveLog(date, log);
      render('energy-envelope-card');
    }
  }

  function addCustomActivity(nom, cout, categorie, emoji) {
    var customs = [];
    try { var raw = localStorage.getItem(CATALOGUE_KEY); if (raw) customs = JSON.parse(raw); } catch (e) {}
    var id = 'custom_' + Date.now();
    customs.push({ id: id, nom: nom, cout: parseInt(cout, 10), categorie: categorie || 'physique', emoji: emoji || '⚡' });
    try { localStorage.setItem(CATALOGUE_KEY, JSON.stringify(customs)); } catch (e) {}
    return id;
  }

  function deleteCustomActivity(id) {
    var customs = [];
    try { var raw = localStorage.getItem(CATALOGUE_KEY); if (raw) customs = JSON.parse(raw); } catch (e) {}
    customs = customs.filter(function(a) { return a.id !== id; });
    try { localStorage.setItem(CATALOGUE_KEY, JSON.stringify(customs)); } catch (e) {}
    render('energy-envelope-card');
  }

  function _submitCustom() {
    var nom = (document.getElementById('ee-custom-nom') || {}).value || '';
    var cout = (document.getElementById('ee-custom-cout') || {}).value || '';
    if (!nom.trim() || cout === '') return;
    var cat = (document.getElementById('ee-custom-cat') || {}).value || 'physique';
    addCustomActivity(nom.trim(), cout, cat, '⚡');
    render('energy-envelope-card');
    // Rouvrir le picker
    setTimeout(function() { var p = document.getElementById('ee-picker'); if (p) p.style.display = 'block'; }, 50);
  }

  function _togglePicker() {
    var picker = document.getElementById('ee-picker');
    if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  }

  // --- Rendu principal ---
  function render(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // Pas de Morning Pace = pas d'enveloppe
    var pace = window.MorningPace ? window.MorningPace.calculer() : null;
    if (!pace) { container.style.display = 'none'; return; }

    var budget = getBudget();
    var date = _today();
    var log = _getLog(date);
    var used = log.reduce(function(s, e) { return s + (e.cout || 0); }, 0);
    var pct = budget > 0 ? Math.max(0, Math.min(100, (used / budget) * 100)) : 0;

    // Couleur jauge
    var gaugeColor = pct < 60 ? '#2d6a4f' : pct < 80 ? '#f59e0b' : '#dc2626';
    var gaugeLabel = pct < 60 ? 'Zone confort' : pct < 80 ? 'Attention' : pct >= 100 ? 'Budget dépassé' : 'Zone rouge';

    // Alerte contextuelle
    var alertHtml = '';
    if (pct >= 100) {
      alertHtml = '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#991b1b;line-height:1.4;">' +
        '⚠️ Budget dépassé. Risque de crash dans les 24-48h. Repose-toi.</div>';
    } else if (pct >= 80) {
      alertHtml = '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#92400e;line-height:1.4;">' +
        'Il te reste peu d\'énergie. Pense à te reposer.</div>';
    } else if (pct >= 60) {
      alertHtml = '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#92400e;line-height:1.4;">' +
        'Tu as utilisé plus de la moitié de ton enveloppe.</div>';
    }

    // Log du jour
    var logHtml = '';
    if (log.length > 0) {
      logHtml = '<div style="margin-top:10px;">';
      log.forEach(function(entry, idx) {
        var signe = entry.cout >= 0 ? '+' : '';
        var coul = entry.cout >= 0 ? '#dc2626' : '#2d6a4f';
        logHtml += '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:12px;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span>' + (entry.emoji || '⚡') + '</span>' +
            '<span style="color:#1a2332;">' + entry.nom + '</span>' +
            '<span style="color:#9ca3af;font-size:11px;">' + entry.heure + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span style="font-weight:600;color:' + coul + ';">' + signe + entry.cout + '</span>' +
            '<button onclick="window.EnergyEnvelope.removeActivity(' + idx + ')" style="background:none;border:none;color:#d1d5db;cursor:pointer;font-size:13px;padding:0 2px;" aria-label="Supprimer cette activité">&times;</button>' +
          '</div>' +
        '</div>';
      });
      logHtml += '</div>';
    }

    // Picker d'activités (caché par défaut)
    var catalogue = _getCatalogue();
    var cats = { physique: '💪 Physique', cognitif: '🧠 Cognitif', repos: '🛋️ Repos' };
    var pickerHtml = '<div id="ee-picker" style="display:none;margin-top:10px;border-top:1px solid #e5e7eb;padding-top:10px;">';
    Object.keys(cats).forEach(function(cat) {
      var items = catalogue.filter(function(a) { return a.categorie === cat; });
      if (items.length === 0) return;
      pickerHtml += '<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:8px 0 4px;">' + cats[cat] + '</div>';
      pickerHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      items.forEach(function(a) {
        var signe = a.cout >= 0 ? '+' : '';
        var bg = a.cout < 0 ? 'rgba(45,106,79,.08)' : 'rgba(6,23,45,.04)';
        pickerHtml += '<button onclick="window.EnergyEnvelope.logActivity(\'' + a.id + '\')" ' +
          'style="background:' + bg + ';border:1px solid rgba(6,23,45,.12);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit;color:#1a2332;" ' +
          'aria-label="Ajouter ' + a.nom + '">' +
          a.emoji + ' ' + a.nom + ' <span style="color:#9ca3af;">(' + signe + a.cout + ')</span></button>';
      });
      pickerHtml += '</div>';
    });

    // --- Activités personnalisées ---
    var customs = [];
    try { var rawC = localStorage.getItem(CATALOGUE_KEY); if (rawC) customs = JSON.parse(rawC); } catch(e) {}
    if (customs.length > 0) {
      pickerHtml += '<div style="font-size:11px;font-weight:600;color:#2d6a4f;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px;">⚡ Mes activités</div>';
      pickerHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      customs.forEach(function(a) {
        var signe = a.cout >= 0 ? '+' : '';
        pickerHtml += '<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(45,106,79,.06);border:1px solid rgba(45,106,79,.2);border-radius:8px;padding:4px 6px 4px 10px;font-size:12px;">' +
          '<button onclick="window.EnergyEnvelope.logActivity(\'' + a.id + '\')" style="background:none;border:none;cursor:pointer;font-size:12px;font-family:inherit;color:#1a2332;padding:0;">' +
          (a.emoji || '⚡') + ' ' + a.nom + ' <span style="color:#9ca3af;">(' + signe + a.cout + ')</span></button>' +
          '<button onclick="window.EnergyEnvelope.deleteCustomActivity(\'' + a.id + '\')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px;padding:0 2px;" title="Supprimer">&times;</button>' +
        '</div>';
      });
      pickerHtml += '</div>';
    }

    // --- Formulaire création ---
    pickerHtml += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;">';
    pickerHtml += '<p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px;">+ Créer une activité</p>';
    pickerHtml += '<div style="display:grid;grid-template-columns:1fr 70px 90px 50px;gap:6px;align-items:end;">';
    pickerHtml += '<div><label style="font-size:10px;color:#9ca3af;">Nom</label><input id="ee-custom-nom" type="text" maxlength="40" placeholder="Ex : Yoga doux" style="width:100%;padding:6px 8px;border:1px solid rgba(6,23,45,.15);border-radius:6px;font-size:12px;font-family:inherit;"></div>';
    pickerHtml += '<div><label style="font-size:10px;color:#9ca3af;">Coût</label><input id="ee-custom-cout" type="number" placeholder="15" min="-30" max="50" style="width:100%;padding:6px 8px;border:1px solid rgba(6,23,45,.15);border-radius:6px;font-size:12px;"></div>';
    pickerHtml += '<div><label style="font-size:10px;color:#9ca3af;">Catégorie</label><select id="ee-custom-cat" style="width:100%;padding:6px 4px;border:1px solid rgba(6,23,45,.15);border-radius:6px;font-size:11px;font-family:inherit;"><option value="physique">Physique</option><option value="cognitif">Cognitif</option><option value="repos">Repos</option></select></div>';
    pickerHtml += '<div><button onclick="window.EnergyEnvelope._submitCustom()" style="width:100%;padding:6px;background:#2d6a4f;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">OK</button></div>';
    pickerHtml += '</div></div>';

    pickerHtml += '</div>';

    // Remaining points
    var remaining = budget - used;
    var remainTxt = remaining >= 0 ? remaining + ' pts restants' : Math.abs(remaining) + ' pts au-dessus';

    container.style.display = 'block';
    container.innerHTML =
      '<div style="border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">' +
        '<div onclick="var b=this.nextElementSibling;var c=this.querySelector(\'.ee-chevron\');if(b.style.display===\'none\'){b.style.display=\'block\';c.style.transform=\'rotate(90deg)\';}else{b.style.display=\'none\';c.style.transform=\'rotate(0deg)\';}" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="ee-chevron" style="font-size:10px;color:#6b7280;transition:transform 0.2s;transform:rotate(90deg);">&#9654;</span>' +
            '<span class="section-title" style="color:#06172D;">Pacing — Enveloppe énergie</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:12px;color:' + gaugeColor + ';font-weight:600;">' + Math.round(pct) + '%</span>' +
            '<span style="font-size:12px;color:#9ca3af;">Budget : ' + budget + ' pts</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:block;margin-top:12px;">' +
        // Jauge
        '<div style="position:relative;height:18px;background:#f3f4f6;border-radius:9px;overflow:hidden;margin-bottom:6px;">' +
          '<div style="position:absolute;left:0;top:0;height:100%;width:' + Math.min(pct, 100) + '%;background:' + gaugeColor + ';border-radius:9px;transition:width 0.4s ease;"></div>' +
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:' + (pct > 45 ? '#fff' : '#1a2332') + ';">' +
            Math.round(pct) + '%</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">' +
          '<span style="color:' + gaugeColor + ';font-weight:600;">' + gaugeLabel + '</span>' +
          '<span style="color:#6b7280;">' + remainTxt + '</span>' +
        '</div>' +
        alertHtml +
        // Bouton ajouter
        '<button onclick="window.EnergyEnvelope._togglePicker()" style="margin-top:10px;width:100%;padding:8px;background:rgba(45,106,79,.08);border:1.5px solid rgba(45,106,79,.2);border-radius:10px;font-size:13px;font-weight:600;color:#2d6a4f;cursor:pointer;font-family:inherit;" aria-label="Ajouter une activité">' +
          '+ Ajouter une activité</button>' +
        pickerHtml +
        logHtml +
        '</div>' +
      '</div>';
  }

  return {
    getBudget: getBudget,
    getUsed: getUsed,
    logActivity: logActivity,
    removeActivity: removeActivity,
    addCustomActivity: addCustomActivity,
    deleteCustomActivity: deleteCustomActivity,
    _togglePicker: _togglePicker,
    _submitCustom: _submitCustom,
    render: render
  };

})();


// === Feature E bis : Corrélations activités → crash (J+1/J+2) ===
// Analyse le lien entre dépassement de budget énergétique et dégradation du score les jours suivants

window.PacingCorrelations = (function() {
  'use strict';

  var LOG_PREFIX = 'boussole_pacing_log_';

  function _getScore(entries, date) {
    var e = entries.find(function(x) { return x.date === date; });
    if (!e) return null;
    var vals = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(function(v) { return typeof v === 'number'; });
    return vals.length > 0 ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
  }

  function _getClarte(entries, date) {
    var e = entries.find(function(x) { return x.date === date; });
    return e && typeof e.clarte_mentale === 'number' ? e.clarte_mentale : null;
  }

  function _getEnergie(entries, date) {
    var e = entries.find(function(x) { return x.date === date; });
    return e && typeof e.energie === 'number' ? e.energie : null;
  }

  function _addDays(dateStr, n) {
    var d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  function analyser() {
    // Charger les entrées
    var entries = [];
    try {
      var raw = localStorage.getItem('boussole_v1_data');
      if (raw) entries = JSON.parse(raw).entries || [];
    } catch (e) {}
    if (entries.length < 7) return null;

    // Charger les logs d'activité des 30 derniers jours
    var today = new Date();
    var jours = [];
    for (var i = 0; i < 30; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var dateStr = d.toISOString().split('T')[0];
      var logRaw = null;
      try { logRaw = localStorage.getItem(LOG_PREFIX + dateStr); } catch (e) {}
      if (logRaw) {
        var log = JSON.parse(logRaw);
        if (log.length > 0) {
          var totalCout = log.reduce(function(s, a) { return s + (a.cout > 0 ? a.cout : 0); }, 0);
          var coutCognitif = log.filter(function(a) { return a.id && (a.id.indexOf('ecran') >= 0 || a.id.indexOf('reunion') >= 0 || a.id.indexOf('lecture') >= 0 || a.id.indexOf('conversation') >= 0 || a.id.indexOf('admin') >= 0 || a.id.indexOf('social') >= 0); }).reduce(function(s, a) { return s + (a.cout > 0 ? a.cout : 0); }, 0);
          var budget = window.EnergyEnvelope ? window.EnergyEnvelope.getBudget() : 80;
          var pct = budget > 0 ? (totalCout / budget) * 100 : 0;
          jours.push({ date: dateStr, totalCout: totalCout, coutCognitif: coutCognitif, pct: pct, nbActivites: log.length });
        }
      }
    }

    if (jours.length < 5) return null;

    var insights = [];

    // Insight 1 : Budget dépassé (>80%) vs score J+1 et J+2
    var jourOver80 = jours.filter(function(j) { return j.pct >= 80; });
    var jourUnder60 = jours.filter(function(j) { return j.pct < 60; });

    if (jourOver80.length >= 3 && jourUnder60.length >= 3) {
      var scoresJ1over = jourOver80.map(function(j) { return _getScore(entries, _addDays(j.date, 1)); }).filter(function(s) { return s !== null; });
      var scoresJ1under = jourUnder60.map(function(j) { return _getScore(entries, _addDays(j.date, 1)); }).filter(function(s) { return s !== null; });

      if (scoresJ1over.length >= 2 && scoresJ1under.length >= 2) {
        var moyOver = scoresJ1over.reduce(function(a, b) { return a + b; }, 0) / scoresJ1over.length;
        var moyUnder = scoresJ1under.reduce(function(a, b) { return a + b; }, 0) / scoresJ1under.length;
        var diff = moyOver - moyUnder;

        if (Math.abs(diff) >= 0.5) {
          insights.push({
            type: 'budget_crash',
            emoji: '⚡',
            text: 'Les jours où tu dépasses 80% de ton budget, ton score du lendemain est en moyenne ' +
              (diff < 0 ? 'plus bas de ' + Math.abs(diff).toFixed(1) + ' pts' : 'plus haut de ' + diff.toFixed(1) + ' pts') +
              ' vs les jours calmes (<60%).',
            impact: diff,
            n: scoresJ1over.length + scoresJ1under.length
          });
        }
      }
    }

    // Insight 2 : Effort cognitif élevé → clarté mentale J+1
    var joursCogHaut = jours.filter(function(j) { return j.coutCognitif >= 20; });
    var joursCogBas = jours.filter(function(j) { return j.coutCognitif < 10; });

    if (joursCogHaut.length >= 3 && joursCogBas.length >= 3) {
      var clarteJ1haut = joursCogHaut.map(function(j) { return _getClarte(entries, _addDays(j.date, 1)); }).filter(function(s) { return s !== null; });
      var clarteJ1bas = joursCogBas.map(function(j) { return _getClarte(entries, _addDays(j.date, 1)); }).filter(function(s) { return s !== null; });

      if (clarteJ1haut.length >= 2 && clarteJ1bas.length >= 2) {
        var moyCH = clarteJ1haut.reduce(function(a, b) { return a + b; }, 0) / clarteJ1haut.length;
        var moyCB = clarteJ1bas.reduce(function(a, b) { return a + b; }, 0) / clarteJ1bas.length;
        var diffC = moyCH - moyCB;

        if (Math.abs(diffC) >= 0.5) {
          insights.push({
            type: 'cognitif_clarte',
            emoji: '🧠',
            text: 'Les jours avec effort cognitif élevé (>20 pts), ta clarté mentale le lendemain est ' +
              (diffC < 0 ? 'plus basse de ' + Math.abs(diffC).toFixed(1) + ' pts' : 'plus haute de ' + diffC.toFixed(1) + ' pts') + '.',
            impact: diffC,
            n: clarteJ1haut.length + clarteJ1bas.length
          });
        }
      }
    }

    // Insight 3 : Score J+2 après dépassement (crash retardé)
    if (jourOver80.length >= 3 && jourUnder60.length >= 3) {
      var scoresJ2over = jourOver80.map(function(j) { return _getScore(entries, _addDays(j.date, 2)); }).filter(function(s) { return s !== null; });
      var scoresJ2under = jourUnder60.map(function(j) { return _getScore(entries, _addDays(j.date, 2)); }).filter(function(s) { return s !== null; });
      if (scoresJ2over.length >= 2 && scoresJ2under.length >= 2) {
        var moyJ2o = scoresJ2over.reduce(function(a, b) { return a + b; }, 0) / scoresJ2over.length;
        var moyJ2u = scoresJ2under.reduce(function(a, b) { return a + b; }, 0) / scoresJ2under.length;
        var diffJ2 = moyJ2o - moyJ2u;

        if (diffJ2 < -0.5) {
          insights.push({
            type: 'crash_retarde',
            emoji: '⏳',
            text: 'Effet retardé à J+2 : après dépassement de budget, ton score chute de ' + Math.abs(diffJ2).toFixed(1) + ' pts 2 jours plus tard.',
            impact: diffJ2,
            n: scoresJ2over.length + scoresJ2under.length
          });
        }
      }
    }

    return insights.length > 0 ? { insights: insights, nbJoursAnalyses: jours.length } : null;
  }

  // --- Rendu HTML ---
  function render() {
    var res = analyser();
    if (!res) return '';

    var html = '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">';
    html += '<p class="section-title" style="color:#06172D;">Corrélations activités</p>';

    res.insights.forEach(function(ins) {
      var color = ins.impact < -0.5 ? '#dc2626' : ins.impact > 0.5 ? '#2d6a4f' : '#6b7280';
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid rgba(6,23,45,.06);">';
      html += '<span style="font-size:13px;">' + ins.emoji + '</span>';
      html += '<p style="margin:0;font-size:13px;color:' + color + ';line-height:1.4;">' + ins.text + '</p>';
      html += '</div>';
    });

    html += '<p style="font-size:11px;color:rgba(6,23,45,.4);margin:8px 0 0;font-style:italic;">Basé sur ' + res.nbJoursAnalyses + ' jours d\'activités. Observation personnelle, pas une preuve scientifique.</p>';
    html += '</div>';
    return html;
  }

  return { analyser: analyser, render: render };

})();
