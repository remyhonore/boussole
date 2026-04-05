/**
 * symptom_tree.js — Arbre symptome -> piste clinique
 * Questionnaire interactif par domaines symptomatiques
 * Scoring pondere vers 6 pistes cliniques
 * Stockage localStorage, integration Resume + PDF
 */
(function() {
  'use strict';

  // === PISTES CLINIQUES ===
  var PISTES = {
    'EMSFC': { label: 'EM/SFC - Malaise post-effort', emoji: '⚡', color: '#dc2626' },
    'POTS':  { label: 'POTS - Dysautonomie', emoji: '💓', color: '#e07b2a' },
    'FIBRO': { label: 'Fibromyalgie', emoji: '🔥', color: '#9333ea' },
    'MCAS':  { label: 'MCAS - Activation mastocytaire', emoji: '🧬', color: '#0891b2' },
    'NEURO': { label: 'Fatigue centrale / neuro-inflammation', emoji: '🧠', color: '#6366f1' },
    'DECON': { label: 'Deconditionnement physique', emoji: '🏃', color: '#6E877D' }
  };

  // === DOMAINES SYMPTOMATIQUES ===
  var DOMAINS = [
    {
      id: 'fatigue',
      label: 'Fatigue et recuperation',
      emoji: '🔋',
      items: [
        { text: 'Apres un effort (physique ou mental), ma fatigue augmente de facon disproportionnee', weights: { EMSFC: 3, DECON: 1 } },
        { text: 'Ma fatigue ne s\'ameliore pas (ou peu) apres le repos', weights: { EMSFC: 2, NEURO: 1 } },
        { text: 'Je me sens plus fatigue(e) le lendemain ou surlendemain d\'un effort', weights: { EMSFC: 3 } },
        { text: 'Ma fatigue est presente des le reveil, meme apres une nuit complete', weights: { EMSFC: 1, FIBRO: 1, NEURO: 1 } }
      ]
    },
    {
      id: 'ortho',
      label: 'Intolerance orthostatique',
      emoji: '🧍',
      items: [
        { text: 'J\'ai des vertiges ou etourdissements en me levant', weights: { POTS: 3, DECON: 1 } },
        { text: 'Mon coeur s\'accelere quand je passe de la position couchee a debout', weights: { POTS: 3 } },
        { text: 'Je me sens mieux allonge(e) qu\'assis(e) ou debout', weights: { POTS: 2 } }
      ]
    },
    {
      id: 'douleurs',
      label: 'Douleurs',
      emoji: '💢',
      items: [
        { text: 'J\'ai des douleurs diffuses dans plusieurs zones du corps', weights: { FIBRO: 3 } },
        { text: 'Certaines zones sont douloureuses au toucher ou a la pression', weights: { FIBRO: 2 } },
        { text: 'Mes douleurs varient d\'un jour a l\'autre sans raison claire', weights: { FIBRO: 2, MCAS: 1 } },
        { text: 'Je ressens des maux de tete ou migraines frequents', weights: { NEURO: 1, FIBRO: 1, MCAS: 1 } }
      ]
    },
    pots: {
      label: 'POTS - Dysautonomie',
      short: 'POTS',
      color: '#e07b2a',
      icon: '💓',
      description: 'Le syndrome de tachycardie orthostatique posturale se manifeste par une acceleration du rythme cardiaque au passage en position debout, souvent accompagnee de vertiges et fatigue.',
      suggest: 'Demander un test de table basculante (tilt test) ou un test actif du pouls (test de NASA lean). Mesurer la FC couchee vs debout sur 10 minutes.'
    },
    fibro: {
      label: 'Fibromyalgie',
      short: 'Fibro',
      color: '#7c3aed',
      icon: '🔥',
      description: 'La fibromyalgie se caracterise par des douleurs diffuses chroniques, une fatigue et des troubles cognitifs. Les douleurs sont souvent migratrices et fluctuantes.',
      suggest: 'Evaluer les criteres ACR 2016 (douleurs diffuses, index WPI + SSS). Envisager un bilan rhumatologique.'
    },
    mcas: {
      label: 'MCAS - Activation mastocytaire',
      short: 'MCAS',
      color: '#db2777',
      icon: '🛡️',
      description: 'Le syndrome d\'activation mastocytaire provoque des reactions excessives a divers declencheurs (aliments, stress, temperature). Symptomes : flush, urticaire, troubles digestifs.',
      suggest: 'Doser la tryptase serique basale et en crise. Envisager un dosage d\'histamine et prostaglandines urinaires. Consultation allergologie/immunologie.'
    },
    neuroinflam: {
      label: 'Fatigue centrale - Neuro-inflammation',
      short: 'Neuro-inflam.',
      color: '#0891b2',
      icon: '🧠',
      description: 'La neuro-inflammation peut provoquer brouillard cognitif, fatigue centrale et troubles de la memoire. Souvent associee aux suites d\'infections virales.',
      suggest: 'IRM cerebrale si non realisee. Evaluer marqueurs inflammatoires (CRP, IL-6). Envisager consultation neurologique.'
    },
    deconditionnement: {
      label: 'Deconditionnement physique',
      short: 'Decond.',
      color: '#6b7280',
      icon: '🏃',
      description: 'La reduction prolongee d\'activite physique entraine un cercle vicieux : fatigue -> inactivite -> perte de condition -> fatigue accrue.',
      suggest: 'Envisager une reeducation progressive adaptee (programme GET modifie ou pacing). Evaluer la VO2max si possible.'
    }
  };

    {
      id: 'cognition',
      label: 'Cognition',
      emoji: '🧠',
      items: [
        { text: 'J\'ai du mal a me concentrer ou a suivre une conversation', weights: { NEURO: 2, EMSFC: 1 } },
        { text: 'J\'oublie des choses recentes (rendez-vous, mots, taches)', weights: { NEURO: 2 } },
        { text: 'Je perds le fil de mes pensees en pleine phrase', weights: { NEURO: 2, EMSFC: 1 } }
      ]
    },
    {
      id: 'sna',
      label: 'Systeme nerveux autonome',
      emoji: '🌡️',
      items: [
        { text: 'J\'ai des sueurs ou bouffees de chaleur inexpliquees', weights: { POTS: 2, MCAS: 1 } },
        { text: 'Ma digestion est perturbee (nausees, ballonnements, transit irregulier)', weights: { POTS: 1, MCAS: 1 } },
        { text: 'J\'ai du mal a reguler ma temperature corporelle', weights: { POTS: 2 } }
      ]
    },
    {
      id: 'immuno',
      label: 'Reactions immuno-inflammatoires',
      emoji: '🛡️',
      items: [
        { text: 'J\'ai des reactions de type allergique sans allergene identifie', weights: { MCAS: 3 } },
        { text: 'Je developpe des intolerancessensibilites alimentaires nouvelles', weights: { MCAS: 2 } },
        { text: 'J\'ai des rougeurs cutanees, urticaire ou flush facial', weights: { MCAS: 3 } }
      ]
    },
  var OPTIONS = [
    { value: 0, label: 'Pas du tout' },
    { value: 1, label: 'Un peu' },
    { value: 2, label: 'Moderement' },
    { value: 3, label: 'Fortement' }
  ];

  // === SCORING ===

  function computeScores(answers) {
    var scores = { emsfc: 0, pots: 0, fibro: 0, mcas: 0, neuroinflam: 0, deconditionnement: 0 };
    var maxScores = { emsfc: 0, pots: 0, fibro: 0, mcas: 0, neuroinflam: 0, deconditionnement: 0 };

    DOMAINS.forEach(function(domain) {
      domain.items.forEach(function(item) {
        var val = answers[item.id] || 0;
        var w = item.weights;
        for (var piste in w) {
          if (w.hasOwnProperty(piste)) {
            scores[piste] += val * w[piste];
            maxScores[piste] += 3 * w[piste]; // max possible = option 3 * weight
          }
        }
      });
    });

    // Normaliser en pourcentage
    var results = [];
    for (var key in PISTES) {
      if (PISTES.hasOwnProperty(key)) {
        var pct = maxScores[key] > 0 ? Math.round((scores[key] / maxScores[key]) * 100) : 0;
        results.push({ id: key, pct: pct, raw: scores[key], max: maxScores[key] });
      }
    }
    results.sort(function(a, b) { return b.pct - a.pct; });
    return results;
  }

    {
      id: 'temporalite',
      label: 'Temporalite et declencheur',
      emoji: '📅',
      items: [
        { text: 'Mes symptomes ont debute apres une infection (Covid, grippe, mono...)', weights: { EMSFC: 2, NEURO: 1 } },
        { text: 'Mes symptomes se sont installes progressivement sans evenement declencheur', weights: { FIBRO: 1, DECON: 2 } },
        { text: 'Mes symptomes fluctuent par crises avec des periodes d\'accalmie', weights: { MCAS: 2, FIBRO: 1 } }
      ]
    }
  ];

  var OPTIONS = [
    { value: 0, label: 'Pas du tout' },
    { value: 1, label: 'Un peu' },
    { value: 2, label: 'Souvent' },
    { value: 3, label: 'Tout le temps' }
  ];

  // === CALCUL DES SCORES ===

  function computeScores(answers) {
    var scores = {};
    Object.keys(PISTES).forEach(function(k) { scores[k] = 0; });
    var maxPossible = {};
    Object.keys(PISTES).forEach(function(k) { maxPossible[k] = 0; });

  // === STORAGE ===

  function _storageKey() {
    var d = new Date();
    var dd = String(d.getDate()).padStart(2,'0');
    var mm = String(d.getMonth()+1).padStart(2,'0');
    return 'boussole_symptom_tree_' + d.getFullYear() + '-' + mm + '-' + dd;
  }

  function saveResult(answers, results) {
    var data = { date: _storageKey().replace('boussole_symptom_tree_',''), answers: answers, results: results, ts: Date.now() };
    try { localStorage.setItem(_storageKey(), JSON.stringify(data)); } catch(e) {}
  }

  function getLastResult() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('boussole_symptom_tree_') === 0) keys.push(k);
    }
    if (!keys.length) return null;
    keys.sort();
    var last = keys[keys.length - 1];
    try { return JSON.parse(localStorage.getItem(last)); } catch(e) { return null; }
  }

  // === MODAL UI ===

  var _currentDomainIdx = 0;
  var _answers = {};

    DOMAINS.forEach(function(domain) {
      domain.items.forEach(function(item, idx) {
        var key = domain.id + '_' + idx;
        var val = answers[key] || 0;
        Object.keys(item.weights).forEach(function(piste) {
          scores[piste] += val * item.weights[piste];
          maxPossible[piste] += 3 * item.weights[piste];
        });
      });
    });

    // Normaliser en pourcentage
    var results = [];
    Object.keys(PISTES).forEach(function(k) {
      var pct = maxPossible[k] > 0 ? Math.round((scores[k] / maxPossible[k]) * 100) : 0;
      results.push({ id: k, pct: pct, raw: scores[k], max: maxPossible[k] });
    });

    // Trier par score decroissant
    results.sort(function(a, b) { return b.pct - a.pct; });
    return results;
  }

  // === STOCKAGE ===

  function getStorageKey(date) {
    return 'boussole_symptom_tree_' + date;
  }

  function saveResult(date, answers, results) {
    var data = { date: date, answers: answers, results: results, ts: Date.now() };
    try { localStorage.setItem(getStorageKey(date), JSON.stringify(data)); } catch(e) {}
  }

  function getLastResult() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('boussole_symptom_tree_') === 0) keys.push(k);
    }
    if (!keys.length) return null;
    keys.sort();
    var last = keys[keys.length - 1];
    try { return JSON.parse(localStorage.getItem(last)); } catch(e) { return null; }
  }

  // === UI MODALE ===

  function _openModal() {
    var existing = document.getElementById('symptom-tree-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'symptom-tree-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(6,23,45,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px;';
  function _openModal() {
    _currentDomainIdx = 0;
    _answers = {};

    // Create modal if not exists
    var modal = document.getElementById('symptom-tree-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'symptom-tree-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:rgba(6,23,45,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
      modal.addEventListener('click', function(e) { if (e.target === modal) _closeModal(); });
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    _renderDomain();
  }

  function _closeModal() {
    var modal = document.getElementById('symptom-tree-modal');
    if (modal) modal.style.display = 'none';
  }

  function _renderDomain() {
    var modal = document.getElementById('symptom-tree-modal');
    if (!modal) return;
    var domain = DOMAINS[_currentDomainIdx];
    var totalDomains = DOMAINS.length;
    var progress = Math.round(((_currentDomainIdx) / totalDomains) * 100);

    var html = '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;">';
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.18);';

    // State
    var currentDomain = 0;
    var answers = {};

    function renderDomain() {
      var domain = DOMAINS[currentDomain];
      var progress = Math.round(((currentDomain) / DOMAINS.length) * 100);

      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
      html += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0;color:#06172D;">Arbre symptomes</p>';
      html += '<button onclick="document.getElementById(\'symptom-tree-modal\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;padding:0;">✕</button></div>';

      // Progress bar
      html += '<div style="background:rgba(45,106,79,.1);border-radius:4px;height:6px;margin-bottom:16px;overflow:hidden;">';
      html += '<div style="background:#2d6a4f;height:100%;width:' + progress + '%;border-radius:4px;transition:width .3s;"></div></div>';

      html += '<p style="font-size:11px;color:#6b7280;margin:0 0 4px;">' + (currentDomain + 1) + ' / ' + DOMAINS.length + '</p>';
      html += '<p style="font-size:13px;font-weight:700;margin:0 0 16px;color:#06172D;">' + domain.emoji + ' ' + domain.label + '</p>';
    // Progress bar
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
    html += '<span style="font-size:11px;font-weight:600;color:rgba(6,23,45,.45);">Etape ' + (_currentDomainIdx + 1) + ' / ' + totalDomains + '</span>';
    html += '<button onclick="SymptomTree._close()" style="background:none;border:none;font-size:20px;cursor:pointer;color:rgba(6,23,45,.4);padding:0;line-height:1;">✕</button>';
    html += '</div>';
    html += '<div style="height:4px;background:rgba(6,23,45,.08);border-radius:2px;margin-bottom:20px;"><div style="height:100%;width:' + progress + '%;background:#2d6a4f;border-radius:2px;transition:width .3s;"></div></div>';

    // Domain header
    html += '<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#06172D;">' + domain.emoji + ' ' + domain.label + '</p>';
    html += '<p style="font-size:12px;color:rgba(6,23,45,.5);margin:0 0 16px;">Au cours des 2 dernieres semaines :</p>';

    // Items
    domain.items.forEach(function(item) {
      var selected = _answers[item.id];
      html += '<div style="margin-bottom:14px;">';
      html += '<p style="font-size:13px;font-weight:500;margin:0 0 8px;color:#06172D;line-height:1.4;">' + item.text + '</p>';
      html += '<div style="display:flex;gap:6px;">';
      OPTIONS.forEach(function(opt) {
        var isActive = selected === opt.value;
        var bg = isActive ? '#2d6a4f' : '#fff';
        var clr = isActive ? '#fff' : '#06172D';
        var brd = isActive ? '#2d6a4f' : 'rgba(6,23,45,.15)';
        html += '<button onclick="SymptomTree._answer(\'' + item.id + '\',' + opt.value + ')" style="flex:1;padding:8px 4px;border:1.5px solid ' + brd + ';border-radius:8px;background:' + bg + ';color:' + clr + ';font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;">' + opt.label + '</button>';
      });
      html += '</div></div>';
    });


      domain.items.forEach(function(item, idx) {
        var key = domain.id + '_' + idx;
        var selected = answers[key] !== undefined ? answers[key] : -1;
        html += '<div style="margin-bottom:14px;padding:12px;border-radius:10px;background:rgba(6,23,45,.03);">';
        html += '<p style="font-size:13px;margin:0 0 8px;color:#1a2332;line-height:1.4;">' + item.text + '</p>';
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
        OPTIONS.forEach(function(opt) {
          var isSelected = selected === opt.value;
          var bg = isSelected ? '#2d6a4f' : '#fff';
          var clr = isSelected ? '#fff' : '#1a2332';
          var brd = isSelected ? '#2d6a4f' : 'rgba(6,23,45,.15)';
          html += '<button data-key="' + key + '" data-val="' + opt.value + '" ';
          html += 'style="flex:1;min-width:70px;padding:7px 4px;border:1.5px solid ' + brd + ';border-radius:8px;';
          html += 'background:' + bg + ';color:' + clr + ';font-size:11px;font-weight:600;cursor:pointer;">';
          html += opt.label + '</button>';
        });
        html += '</div></div>';
      });

      // Navigation buttons
      html += '<div style="display:flex;gap:8px;margin-top:16px;">';
      if (currentDomain > 0) {
        html += '<button id="st-prev" style="flex:1;padding:10px;border:1.5px solid rgba(45,106,79,.3);border-radius:10px;background:#fff;color:#2d6a4f;font-size:13px;font-weight:600;cursor:pointer;">Precedent</button>';
      }
    // Navigation buttons
    html += '<div style="display:flex;gap:10px;margin-top:20px;">';
    if (_currentDomainIdx > 0) {
      html += '<button onclick="SymptomTree._prev()" style="flex:1;padding:12px;border:1.5px solid rgba(6,23,45,.15);border-radius:10px;background:#fff;color:#06172D;font-size:13px;font-weight:600;cursor:pointer;">Precedent</button>';
    }
    var allAnswered = domain.items.every(function(item) { return _answers.hasOwnProperty(item.id); });
    if (_currentDomainIdx < totalDomains - 1) {
      html += '<button onclick="SymptomTree._next()" style="flex:1;padding:12px;border:none;border-radius:10px;background:' + (allAnswered ? '#2d6a4f' : 'rgba(6,23,45,.12)') + ';color:' + (allAnswered ? '#fff' : 'rgba(6,23,45,.3)') + ';font-size:13px;font-weight:600;cursor:pointer;" ' + (allAnswered ? '' : 'disabled') + '>Suivant</button>';
    } else {
      html += '<button onclick="SymptomTree._finish()" style="flex:1;padding:12px;border:none;border-radius:10px;background:' + (allAnswered ? '#2d6a4f' : 'rgba(6,23,45,.12)') + ';color:' + (allAnswered ? '#fff' : 'rgba(6,23,45,.3)') + ';font-size:13px;font-weight:600;cursor:pointer;" ' + (allAnswered ? '' : 'disabled') + '>Voir les pistes</button>';
    }
    html += '</div>';
    html += '</div>';

    modal.innerHTML = html;
  }

  function _answer(itemId, value) {
    _answers[itemId] = value;
    _renderDomain();
  }

  function _prev() {
    if (_currentDomainIdx > 0) { _currentDomainIdx--; _renderDomain(); }
  }

  function _next() {
    var domain = DOMAINS[_currentDomainIdx];
    var allAnswered = domain.items.every(function(item) { return _answers.hasOwnProperty(item.id); });
    if (allAnswered && _currentDomainIdx < DOMAINS.length - 1) { _currentDomainIdx++; _renderDomain(); }
  }

      var isLast = currentDomain === DOMAINS.length - 1;
      var nextLabel = isLast ? 'Voir mes pistes' : 'Suivant';
      var nextBg = isLast ? '#2d6a4f' : '#2d6a4f';
      html += '<button id="st-next" style="flex:1;padding:10px;border:none;border-radius:10px;background:' + nextBg + ';color:#fff;font-size:13px;font-weight:600;cursor:pointer;">' + nextLabel + '</button>';
      html += '</div>';

      box.innerHTML = html;

      // Attach option click handlers
      box.querySelectorAll('[data-key]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          answers[this.getAttribute('data-key')] = parseInt(this.getAttribute('data-val'));
          renderDomain(); // re-render to update selected state
        });
      });

      // Attach nav handlers
      var prevBtn = box.querySelector('#st-prev');
      if (prevBtn) prevBtn.addEventListener('click', function() { currentDomain--; renderDomain(); });

      var nextBtn = box.querySelector('#st-next');
      if (nextBtn) nextBtn.addEventListener('click', function() {
        if (isLast) {
          _showResults(answers);
        } else {
          currentDomain++;
          renderDomain();
        }
      });
    }
  function _finish() {
    var domain = DOMAINS[_currentDomainIdx];
    var allAnswered = domain.items.every(function(item) { return _answers.hasOwnProperty(item.id); });
    if (!allAnswered) return;

    var results = computeScores(_answers);
    saveResult(_answers, results);
    _renderResults(results);

    // Refresh resume if visible
    if (typeof window.refreshResume === 'function') window.refreshResume();
  }

  function _renderResults(results) {
    var modal = document.getElementById('symptom-tree-modal');
    if (!modal) return;

    // Take top 3 with pct > 0
    var top = results.filter(function(r) { return r.pct > 0; }).slice(0, 3);

    var html = '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;">';
    html += '<div style="text-align:center;margin-bottom:20px;">';
    html += '<p style="font-size:28px;margin:0;">🧭</p>';
    html += '<p style="font-size:18px;font-weight:700;margin:4px 0 0;color:#06172D;">Pistes a explorer</p>';
    html += '<p style="font-size:12px;color:rgba(6,23,45,.5);margin:6px 0 0;">Ces pistes ne sont pas un diagnostic. Elles orientent la discussion avec votre professionnel de sante.</p>';
    html += '</div>';


    renderDomain();
    modal.appendChild(box);
    document.body.appendChild(modal);
  }

  // === AFFICHAGE RESULTATS ===

  var SUGGESTIONS = {
    'EMSFC': 'Demander un avis specialise en medecine interne ou centre de reference EM/SFC. Envisager un test d\'effort cardio-pulmonaire (CPET) sur 2 jours.',
    'POTS':  'Demander un tilt test (test d\'inclinaison). Mesurer la FC couche/debout sur 10 min (test du pauvre).',
    'FIBRO': 'Evoquer le diagnostic avec le medecin traitant. Demander un bilan rhumatologique pour exclure d\'autres causes.',
    'MCAS':  'Doser la tryptase serique et les metabolites urinaires de l\'histamine. Consulter un allergologue ou immunologue.',
    'NEURO': 'Demander un bilan neuro-inflammatoire (IRM cerebrale, marqueurs inflammatoires). Consulter un neurologue.',
    'DECON': 'Envisager un reconditionnement progressif supervise. Ecarter d\'abord un PEM (malaise post-effort) avant tout programme d\'exercice.'
  };

  function _showResults(answers) {
    var results = computeScores(answers);
    var today = new Date().toISOString().slice(0, 10);
    saveResult(today, answers, results);

    var top3 = results.slice(0, 3).filter(function(r) { return r.pct > 0; });
    if (!top3.length) top3 = results.slice(0, 1);

    if (top.length === 0) {
      html += '<p style="text-align:center;color:rgba(6,23,45,.5);font-size:13px;">Aucune piste significative identifiee. Si vos symptomes persistent, consultez votre professionnel de sante.</p>';
    } else {
      top.forEach(function(r, idx) {
        var piste = PISTES[r.id];
        var barW = Math.max(r.pct, 8);
        var rank = idx + 1;
        html += '<div style="border:1.5px solid rgba(6,23,45,.1);border-radius:12px;padding:14px;margin-bottom:12px;background:' + (idx === 0 ? 'rgba(45,106,79,.04)' : '#fff') + ';">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
        html += '<span style="font-size:11px;font-weight:700;color:' + piste.color + ';background:' + piste.color + '18;padding:2px 8px;border-radius:12px;">#' + rank + '</span>';
        html += '<span style="font-size:13px;font-weight:700;color:#06172D;">' + piste.icon + ' ' + piste.label + '</span>';
        html += '</div>';

        // Progress bar
        html += '<div style="height:6px;background:rgba(6,23,45,.06);border-radius:3px;margin-bottom:10px;">';
        html += '<div style="height:100%;width:' + barW + '%;background:' + piste.color + ';border-radius:3px;"></div>';
        html += '</div>';
        html += '<p style="font-size:11px;font-weight:600;color:' + piste.color + ';margin:0 0 8px;">Concordance : ' + r.pct + ' %</p>';
        html += '<p style="font-size:12px;color:rgba(6,23,45,.65);margin:0 0 10px;line-height:1.5;">' + piste.description + '</p>';
        html += '<div style="background:rgba(45,106,79,.06);border-left:3px solid #2d6a4f;padding:8px 12px;border-radius:0 8px 8px 0;">';
        html += '<p style="font-size:11px;font-weight:600;color:#2d6a4f;margin:0 0 2px;">A en parler avec votre professionnel de sante :</p>';
        html += '<p style="font-size:12px;color:#06172D;margin:0;line-height:1.4;">' + piste.suggest + '</p>';
        html += '</div></div>';
      });
    }

    var box = document.getElementById('symptom-tree-modal').querySelector('div');

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0;color:#06172D;">Pistes a explorer</p>';
    html += '<button onclick="document.getElementById(\'symptom-tree-modal\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;padding:0;">✕</button></div>';

    html += '<p style="font-size:12px;color:#6b7280;margin:0 0 16px;line-height:1.5;">Ces pistes sont des orientations, pas des diagnostics. Elles t\'aident a preparer ta consultation.</p>';

    top3.forEach(function(r, idx) {
      var piste = PISTES[r.id];
      var barWidth = Math.max(r.pct, 4);
      html += '<div style="margin-bottom:14px;padding:14px;border-radius:12px;border:1.5px solid rgba(6,23,45,.08);background:rgba(6,23,45,.02);">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<span style="font-size:13px;font-weight:700;color:#06172D;">' + piste.emoji + ' ' + piste.label + '</span>';
      html += '<span style="font-size:13px;font-weight:700;color:' + piste.color + ';">' + r.pct + '%</span></div>';
      // Progress bar
      html += '<div style="background:rgba(6,23,45,.06);border-radius:4px;height:8px;margin-bottom:8px;overflow:hidden;">';
      html += '<div style="background:' + piste.color + ';height:100%;width:' + barWidth + '%;border-radius:4px;"></div></div>';
      // Suggestion
      html += '<p style="font-size:11px;color:#6b7280;margin:0;line-height:1.4;">' + SUGGESTIONS[r.id] + '</p>';
      html += '</div>';
    });
    // Disclaimer + close
    html += '<div style="background:rgba(220,38,38,.05);border-radius:8px;padding:10px 12px;margin-top:4px;margin-bottom:16px;">';
    html += '<p style="font-size:11px;color:rgba(6,23,45,.55);margin:0;line-height:1.4;">⚠️ Cet outil ne remplace pas un avis medical. Il vise a structurer votre reflexion avant une consultation. Les pistes proposees reposent sur vos reponses et des associations symptomatiques connues.</p>';
    html += '</div>';
    html += '<button onclick="SymptomTree._close()" style="width:100%;padding:12px;border:none;border-radius:10px;background:#2d6a4f;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Fermer</button>';
    html += '</div>';

    modal.innerHTML = html;
  }

  // === BLOC RESUME ===

  function buildBloc() {
    var last = getLastResult();
    var html = '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">';
    html += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#06172D;">Arbre symptome -> piste</p>';

    if (last && last.results) {
      var dateParts = last.date.split('-');
      var dateLabel = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      html += '<p style="font-size:11px;color:rgba(6,23,45,.4);margin:0 0 8px;">Derniere evaluation : ' + dateLabel + '</p>';

      var top = last.results.filter(function(r) { return r.pct > 0; }).slice(0, 3);
      top.forEach(function(r) {
        var piste = PISTES[r.id];
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(6,23,45,.06);">';
        html += '<span style="font-size:13px;font-weight:600;">' + piste.icon + ' ' + piste.short + '</span>';
        html += '<span style="font-size:13px;font-weight:700;color:' + piste.color + ';">' + r.pct + ' %</span>';
        html += '</div>';
      });
    } else {
      html += '<p style="font-size:13px;color:rgba(6,23,45,.45);margin:0 0 10px;">Identifie les pistes cliniques a explorer avec ton professionnel de sante.</p>';
    }


    html += '<div style="margin-top:12px;padding:10px;border-radius:8px;background:rgba(45,106,79,.06);border-left:3px solid #2d6a4f;">';
    html += '<p style="font-size:11px;color:#1a2332;margin:0;line-height:1.4;">';
    html += '/!\\ Cet outil est informatif. Il ne remplace pas l\'avis d\'un professionnel de sante. Parlez-en a votre medecin.</p></div>';

    html += '<button onclick="document.getElementById(\'symptom-tree-modal\').remove()" style="width:100%;padding:12px;border:none;border-radius:10px;background:#2d6a4f;color:#fff;font-size:14px;font-weight:600;cursor:pointer;margin-top:16px;">Fermer</button>';

    box.innerHTML = html;
  }

  // === BLOC RESUME ===

  function buildBloc() {
    var last = getLastResult();
    var html = '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">';
    html += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#06172D;">Arbre symptomes -> pistes</p>';

    if (last && last.results) {
      var top3 = last.results.slice(0, 3).filter(function(r) { return r.pct > 0; });
      var dateParts = last.date.split('-');
      var dateLabel = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      html += '<p style="font-size:11px;color:rgba(6,23,45,.45);margin:0 0 8px;">Derniere evaluation : ' + dateLabel + '</p>';

      top3.forEach(function(r) {
        var piste = PISTES[r.id];
    html += '<button onclick="SymptomTree.open()" style="width:100%;padding:10px;margin-top:10px;border:1.5px solid rgba(45,106,79,.3);border-radius:8px;background:#fff;color:#2d6a4f;font-size:12px;font-weight:600;cursor:pointer;">🧭 ' + (last ? 'Refaire l\'evaluation' : 'Commencer l\'evaluation') + '</button>';
    html += '</div>';
    return html;
  }

  // === EXPORT PDF ===

  function exportPourPDF() {
    var last = getLastResult();
    if (!last || !last.results) return null;
    var top = last.results.filter(function(r) { return r.pct > 0; }).slice(0, 3);
    return {
      date: last.date,
      pistes: top.map(function(r) {
        var piste = PISTES[r.id];
        return { label: piste.label, short: piste.short, pct: r.pct, suggest: piste.suggest };
      })
    };
  }

  // === API PUBLIQUE ===

  window.SymptomTree = {
    open: _openModal,
    buildBloc: buildBloc,
    exportPourPDF: exportPourPDF,
    getLastResult: getLastResult,
    _close: _closeModal,
    _answer: _answer,
    _prev: _prev,
    _next: _next,
    _finish: _finish
  };

})();
        var barW = Math.max(r.pct, 4);
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(6,23,45,.06);">';
        html += '<span style="font-size:12px;min-width:20px;">' + piste.emoji + '</span>';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
        html += '<span style="font-size:12px;font-weight:600;color:#06172D;">' + piste.label.split(' - ')[0] + '</span>';
        html += '<span style="font-size:12px;font-weight:700;color:' + piste.color + ';">' + r.pct + '%</span></div>';
        html += '<div style="background:rgba(6,23,45,.06);border-radius:3px;height:5px;overflow:hidden;">';
        html += '<div style="background:' + piste.color + ';height:100%;width:' + barW + '%;border-radius:3px;"></div></div>';
        html += '</div></div>';
      });
    } else {
      html += '<p style="font-size:13px;color:rgba(6,23,45,.45);margin:0 0 10px;">Aucune evaluation. Identifie tes pistes cliniques pour mieux orienter ta consultation.</p>';
    }

    html += '<button onclick="SymptomTree.open()" style="width:100%;padding:9px;border:1.5px solid rgba(45,106,79,.3);border-radius:8px;background:#fff;color:#2d6a4f;font-size:12px;font-weight:600;cursor:pointer;margin-top:8px;">Evaluer mes symptomes</button>';
    html += '</div>';
    return html;
  }

  // === EXPORT PDF ===

  function exportPourPDF() {
    var last = getLastResult();
    if (!last || !last.results) return null;
    var top3 = last.results.slice(0, 3).filter(function(r) { return r.pct > 0; });
    return {
      date: last.date,
      pistes: top3.map(function(r) {
        return {
          id: r.id,
          label: PISTES[r.id].label,
          pct: r.pct,
          suggestion: SUGGESTIONS[r.id]
        };
      })
    };
  }

  // === API PUBLIQUE ===

  window.SymptomTree = {
    open: function() { _openModal(); },
    buildBloc: buildBloc,
    exportPourPDF: exportPourPDF,
    getLastResult: getLastResult,
    PISTES: PISTES
  };

})();
