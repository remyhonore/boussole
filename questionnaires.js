/**
 * questionnaires.js — Questionnaires PRO validés (PHQ-9, GAD-7, PCFS)
 * Scoring automatique, stockage localStorage, intégration Résumé + PDF
 */
(function() {
  'use strict';

  // === DONNÉES DES QUESTIONNAIRES ===

  var SCALES = {
    'PHQ-9': {
      label: 'PHQ-9 — Dépression',
      shortLabel: 'PHQ-9',
      emoji: '🧠',
      description: 'Évalue la sévérité des symptômes dépressifs sur les 2 dernières semaines.',
      source: 'Kroenke et al., J Gen Intern Med, 2001',
      options: [
        { value: 0, label: 'Jamais' },
        { value: 1, label: 'Plusieurs jours' },
        { value: 2, label: 'Plus de la moitié du temps' },
        { value: 3, label: 'Presque tous les jours' }
      ],
      items: [
        'Peu d\'intérêt ou de plaisir à faire les choses',
        'Se sentir triste, déprimé(e) ou désespéré(e)',
        'Difficultés à s\'endormir, sommeil interrompu, ou trop dormir',
        'Se sentir fatigué(e) ou avoir peu d\'énergie',
        'Peu d\'appétit ou manger trop',
        'Mauvaise opinion de soi-même, sentiment d\'échec ou de déception',
        'Difficultés à se concentrer (lecture, conversation)',
        'Bouger ou parler lentement — ou au contraire, agitation inhabituelle',
        'Pensées de se faire du mal ou que la vie ne vaut pas la peine'
      ],
      interpret: function(score) {
        if (score <= 4) return { level: 'minimal', label: 'Minimal', color: '#2d6a4f' };
        if (score <= 9) return { level: 'leger', label: 'Léger', color: '#6E877D' };
        if (score <= 14) return { level: 'modere', label: 'Modéré', color: '#e07b2a' };
        if (score <= 19) return { level: 'modere-severe', label: 'Modérément sévère', color: '#dc2626' };
        return { level: 'severe', label: 'Sévère', color: '#991b1b' };
      },
      maxScore: 27
    },

    'GAD-7': {
      label: 'GAD-7 — Anxiété',
      shortLabel: 'GAD-7',
      emoji: '😰',
      description: 'Évalue la sévérité des symptômes anxieux sur les 2 dernières semaines.',
      source: 'Spitzer et al., Arch Intern Med, 2006',
      options: [
        { value: 0, label: 'Jamais' },
        { value: 1, label: 'Plusieurs jours' },
        { value: 2, label: 'Plus de la moitié du temps' },
        { value: 3, label: 'Presque tous les jours' }
      ],
      items: [
        'Se sentir nerveux(se), anxieux(se) ou sur les nerfs',
        'Ne pas pouvoir s\'empêcher de s\'inquiéter',
        'S\'inquiéter trop à propos de différentes choses',
        'Difficultés à se détendre',
        'Être agité(e) au point d\'avoir du mal à tenir en place',
        'Être facilement contrarié(e) ou irritable',
        'Avoir peur que quelque chose de terrible puisse arriver'
      ],
      interpret: function(score) {
        if (score <= 4) return { level: 'minimal', label: 'Minimal', color: '#2d6a4f' };
        if (score <= 9) return { level: 'leger', label: 'Léger', color: '#6E877D' };
        if (score <= 14) return { level: 'modere', label: 'Modéré', color: '#e07b2a' };
        return { level: 'severe', label: 'Sévère', color: '#dc2626' };
      },
      maxScore: 21
    },

    'PCFS': {
      label: 'PCFS — Statut fonctionnel',
      shortLabel: 'PCFS',
      emoji: '🏃',
      description: 'Évalue ton niveau de limitation fonctionnelle post-Covid.',
      source: 'Klok et al., ERJ, 2020',
      options: null, // Choix unique spécifique
      items: null,   // Format spécial : choix direct
      pcfsChoices: [
        { value: 0, label: 'Aucune limitation', desc: 'Pas de symptômes, pas de douleurs, pas de limitations.' },
        { value: 1, label: 'Limitations négligeables', desc: 'Symptômes persistants mais sans impact sur les activités quotidiennes.' },
        { value: 2, label: 'Limitations légères', desc: 'Activités quotidiennes réduites — besoin d\'éviter certaines tâches ou de les étaler.' },
        { value: 3, label: 'Limitations modérées à sévères', desc: 'Incapacité structurelle à réaliser certaines activités — assistance nécessaire.' },
        { value: 4, label: 'Limitations sévères', desc: 'Dépendance pour les soins personnels — incapacité fonctionnelle majeure.' }
      ],
      interpret: function(score) {
        if (score === 0) return { level: 'aucune', label: 'Aucune limitation', color: '#2d6a4f' };
        if (score === 1) return { level: 'negligeable', label: 'Négligeable', color: '#6E877D' };
        if (score === 2) return { level: 'legere', label: 'Légère', color: '#e07b2a' };
        if (score === 3) return { level: 'moderee', label: 'Modérée à sévère', color: '#dc2626' };
        return { level: 'severe', label: 'Sévère', color: '#991b1b' };
      },
      maxScore: 4
    }
  };

  // === STOCKAGE ===

  function _storageKey(scaleId, date) {
    return 'boussole_q_' + scaleId + '_' + date;
  }

  function saveResult(scaleId, date, answers, score) {
    var data = { date: date, scale: scaleId, answers: answers, score: score, ts: Date.now() };
    localStorage.setItem(_storageKey(scaleId, date), JSON.stringify(data));
  }

  function getLastResult(scaleId) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith('boussole_q_' + scaleId + '_')) keys.push(k);
    }
    if (!keys.length) return null;
    keys.sort().reverse();
    try { return JSON.parse(localStorage.getItem(keys[0])); } catch(e) { return null; }
  }

  // === UI : MODALE QUESTIONNAIRE ===

  function _openModal(scaleId) {
    var scale = SCALES[scaleId];
    if (!scale) return;

    var existing = document.getElementById('modal-questionnaire');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'modal-questionnaire';
    modal.className = 'modal';
    modal.style.display = 'flex';

    var isPCFS = scaleId === 'PCFS';
    var html = '<div class="modal-content" style="max-width:520px;max-height:85vh;overflow-y:auto;">';
    html += '<h3 style="margin:0 0 4px;font-size:16px;color:#06172D;">' + scale.emoji + ' ' + scale.label + '</h3>';
    html += '<p style="font-size:12px;color:rgba(6,23,45,.55);margin:0 0 14px;">' + scale.description + '</p>';

    if (isPCFS) {
      // PCFS : choix unique parmi 5 niveaux
      html += '<div id="q-pcfs-choices">';
      scale.pcfsChoices.forEach(function(c) {
        html += '<div class="q-pcfs-choice" data-value="' + c.value + '" style="padding:12px;border:1.5px solid rgba(6,23,45,.12);border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all .15s;">';
        html += '<strong style="font-size:14px;">' + c.value + ' — ' + c.label + '</strong>';
        html += '<p style="font-size:12px;color:rgba(6,23,45,.6);margin:4px 0 0;">' + c.desc + '</p>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      // PHQ-9 / GAD-7 : grille de questions
      html += '<div id="q-items">';
      scale.items.forEach(function(item, idx) {
        html += '<div class="q-item" style="margin-bottom:14px;">';
        html += '<p style="font-size:13px;font-weight:600;color:#06172D;margin:0 0 6px;">' + (idx + 1) + '. ' + item + '</p>';
        html += '<div class="q-options" data-idx="' + idx + '" style="display:flex;gap:4px;flex-wrap:wrap;">';
        scale.options.forEach(function(opt) {
          html += '<button class="q-opt-btn" data-idx="' + idx + '" data-val="' + opt.value + '" style="padding:6px 10px;border:1.5px solid rgba(6,23,45,.15);border-radius:8px;background:#fff;font-size:12px;cursor:pointer;transition:all .15s;color:#06172D;">' + opt.label + '</button>';
        });
        html += '</div></div>';
      });
      html += '</div>';
    }

    html += '<div style="display:flex;gap:8px;margin-top:16px;">';
    html += '<button id="q-cancel" class="btn btn-secondary" style="flex:1;font-size:13px;">Annuler</button>';
    html += '<button id="q-submit" class="btn" style="flex:1;font-size:13px;" disabled>Valider</button>';
    html += '</div>';
    html += '<p style="font-size:10px;color:rgba(6,23,45,.4);margin:8px 0 0;text-align:center;">' + scale.source + '</p>';
    html += '</div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);

    // === Listeners ===
    var answers = {};
    var submitBtn = document.getElementById('q-submit');

    if (isPCFS) {
      modal.querySelectorAll('.q-pcfs-choice').forEach(function(el) {
        el.addEventListener('click', function() {
          modal.querySelectorAll('.q-pcfs-choice').forEach(function(c) {
            c.style.borderColor = 'rgba(6,23,45,.12)';
            c.style.background = '#fff';
          });
          el.style.borderColor = '#2d6a4f';
          el.style.background = 'rgba(45,106,79,.06)';
          answers[0] = parseInt(el.dataset.value);
          submitBtn.disabled = false;
        });
      });
    } else {
      modal.querySelectorAll('.q-opt-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          var val = parseInt(btn.dataset.val);
          answers[idx] = val;
          // Highlight active
          modal.querySelectorAll('.q-opt-btn[data-idx="' + idx + '"]').forEach(function(b) {
            b.style.borderColor = 'rgba(6,23,45,.15)';
            b.style.background = '#fff';
            b.style.color = '#06172D';
          });
          btn.style.borderColor = '#2d6a4f';
          btn.style.background = '#2d6a4f';
          btn.style.color = '#fff';
          // Check completeness
          submitBtn.disabled = Object.keys(answers).length < scale.items.length;
        });
      });
    }

    document.getElementById('q-cancel').addEventListener('click', function() { modal.remove(); });

    submitBtn.addEventListener('click', function() {
      var total = 0;
      Object.values(answers).forEach(function(v) { total += v; });
      var date = typeof getTodayDate === 'function' ? getTodayDate() : new Date().toISOString().split('T')[0];
      saveResult(scaleId, date, answers, total);
      modal.remove();
      _showResult(scaleId, total);
      // Rafraîchir le résumé si on est dessus
      if (typeof refreshSummary === 'function') refreshSummary();
    });
  }

  function _showResult(scaleId, score) {
    var scale = SCALES[scaleId];
    var interp = scale.interpret(score);
    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = '<div class="modal-content" style="max-width:400px;text-align:center;">' +
      '<p style="font-size:40px;margin:0 0 8px;">' + scale.emoji + '</p>' +
      '<h3 style="margin:0 0 4px;">' + scale.shortLabel + ' — Score : ' + score + '/' + scale.maxScore + '</h3>' +
      '<p style="font-size:18px;font-weight:700;color:' + interp.color + ';margin:4px 0 12px;">' + interp.label + '</p>' +
      '<p style="font-size:12px;color:rgba(6,23,45,.55);margin:0 0 16px;">Ce score est un indicateur, pas un diagnostic. Parles-en à ton professionnel de santé.</p>' +
      '<button class="btn" onclick="this.closest(\'.modal\').remove()" style="width:100%;font-size:13px;">Fermer</button>' +
    '</div>';
    document.body.appendChild(modal);
  }

  // === CARTE RÉSUMÉ (intégrée dans refreshSummary) ===

  function buildBlocQuestionnaires() {
    var scaleIds = ['PHQ-9', 'GAD-7', 'PCFS'];
    var hasAny = false;
    var cardsHtml = '';

    scaleIds.forEach(function(id) {
      var last = getLastResult(id);
      var scale = SCALES[id];
      if (last) {
        hasAny = true;
        var interp = scale.interpret(last.score);
        var dateParts = last.date.split('-');
        var dateLabel = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
        cardsHtml += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(6,23,45,.06);">' +
          '<div><span style="font-size:13px;font-weight:600;">' + scale.emoji + ' ' + scale.shortLabel + '</span>' +
          '<span style="font-size:11px;color:rgba(6,23,45,.45);margin-left:6px;">' + dateLabel + '</span></div>' +
          '<div style="text-align:right;"><span style="font-size:15px;font-weight:700;color:' + interp.color + ';">' + last.score + '/' + scale.maxScore + '</span>' +
          '<span style="font-size:11px;color:' + interp.color + ';margin-left:4px;">' + interp.label + '</span></div>' +
        '</div>';
      }
    });

    var btnsHtml = scaleIds.map(function(id) {
      return '<button onclick="Questionnaires.open(\'' + id + '\')" style="flex:1;padding:8px 4px;border:1.5px solid rgba(45,106,79,.3);border-radius:8px;background:#fff;color:#2d6a4f;font-size:11px;font-weight:600;cursor:pointer;">' + SCALES[id].shortLabel + '</button>';
    }).join('');


    var html = '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">';
    html += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#06172D;">Questionnaires PRO</p>';
    if (hasAny) html += cardsHtml;
    else html += '<p style="font-size:13px;color:rgba(6,23,45,.45);margin:0 0 10px;">Aucun questionnaire complété. Complète-en un pour suivre ton évolution.</p>';
    html += '<div style="display:flex;gap:6px;margin-top:10px;">' + btnsHtml + '</div>';
    html += '</div>';
    return html;
  }

  // === EXPORT PDF ===

  function exportPourPDF() {
    var results = [];
    ['PHQ-9', 'GAD-7', 'PCFS'].forEach(function(id) {
      var last = getLastResult(id);
      if (!last) return;
      var scale = SCALES[id];
      var interp = scale.interpret(last.score);
      results.push({
        scale: scale.shortLabel,
        score: last.score,
        max: scale.maxScore,
        label: interp.label,
        date: last.date
      });
    });
    return results;
  }

  // === API PUBLIQUE ===

  window.Questionnaires = {
    open: function(scaleId) { _openModal(scaleId); },
    buildBloc: buildBlocQuestionnaires,
    exportPourPDF: exportPourPDF,
    getLastResult: getLastResult,
    SCALES: SCALES
  };

})();
