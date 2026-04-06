/**
 * journal.js — Mon Journal (espace privé)
 * Écriture libre multi-entrées par jour, tags, vue chronologique
 * Stockage localStorage, privacy-first
 * ADR-2026-045 Sprint 2
 */
(function() {
  'use strict';

  var STORAGE_PREFIX = 'boussole_journal_';

  var TAGS = [
    { id: 'pensees', emoji: '💭', label: 'Pensées' },
    { id: 'sante', emoji: '🏥', label: 'Santé' },
    { id: 'victoire', emoji: '💪', label: 'Victoire' },
    { id: 'difficulte', emoji: '😔', label: 'Difficulté' },
    { id: 'traitement', emoji: '💊', label: 'Traitement' },
    { id: 'rdv', emoji: '📋', label: 'RDV' },
    { id: 'autre', emoji: '📝', label: 'Autre' }
  ];

  var MOODS = ['😫', '😟', '😐', '🙂', '😊'];

  // === CRUD ===

  function _generateId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  function _saveEntry(entry) {
    var key = STORAGE_PREFIX + entry.id;
    try { localStorage.setItem(key, JSON.stringify(entry)); } catch(e) {}
  }

  function _deleteEntry(id) {
    localStorage.removeItem(STORAGE_PREFIX + id);
  }

  function _getAllEntries() {
    var entries = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(STORAGE_PREFIX) === 0) {
        try { entries.push(JSON.parse(localStorage.getItem(k))); } catch(e) {}
      }
    }
    entries.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return entries;
  }

  function _getEntriesByDate(dateStr) {
    return _getAllEntries().filter(function(e) { return e.date === dateStr; });
  }

  function _countEntries() {
    var count = 0;
    for (var i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i) && localStorage.key(i).indexOf(STORAGE_PREFIX) === 0) count++;
    }
    return count;
  }

  // === FORMATTING ===

  var MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

  function _formatDateLong(dateStr) {
    var parts = dateStr.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    return JOURS_FR[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS_FR[d.getMonth()] + ' ' + parts[0];
  }

  function _formatHeure(ts) {
    var d = new Date(ts);
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  function _localDateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function _getTagById(id) {
    return TAGS.find(function(t) { return t.id === id; }) || TAGS[TAGS.length - 1];
  }

  // === RENDER PANEL ===

  function render(containerId) {
    var container = document.getElementById(containerId || 'panel-journal');
    if (!container) return;

    var entries = _getAllEntries();
    var html = '';

    // Header + bouton écrire
    html += '<div style="padding:0 16px;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
    html += '<div><p style="font-size:18px;font-weight:700;color:#06172D;margin:0;">📓 Mon journal</p>';
    html += '<p style="font-size:11px;color:rgba(6,23,45,.42);margin:4px 0 0;">Ton espace privé — 🔒 tout reste sur ton appareil</p></div>';
    html += '</div>';

    // Bouton nouvelle entrée
    html += '<button onclick="Journal.openEditor()" style="width:100%;padding:14px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:16px;font-family:inherit;">✍️ Écrire dans mon journal</button>';

    // Entrées groupées par jour
    if (entries.length === 0) {
      html += '<div class="card" style="text-align:center;padding:32px 20px;">';
      html += '<p style="font-size:32px;margin:0 0 12px;">📓</p>';
      html += '<p style="font-size:13px;color:rgba(6,23,45,.55);line-height:1.5;margin:0;">Ton journal est vide.<br>Commence par écrire ce que tu ressens.</p>';
      html += '</div>';
    } else {
      // Grouper par date
      var grouped = {};
      entries.forEach(function(e) {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
      });
      var dates = Object.keys(grouped).sort().reverse();
      dates.forEach(function(date) {
        html += '<div style="margin-bottom:16px;">';
        html += '<p style="font-size:11px;font-weight:700;color:rgba(6,23,45,.45);text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">' + _formatDateLong(date) + '</p>';
        grouped[date].forEach(function(entry) {
          var tag = _getTagById(entry.tag);
          var heure = _formatHeure(entry.timestamp);
          var moodStr = entry.mood !== null && entry.mood !== undefined ? MOODS[entry.mood] + ' ' : '';
          var textPreview = entry.text.length > 200 ? entry.text.substring(0, 200) + '…' : entry.text;
          html += '<div class="card" style="padding:14px;margin-bottom:8px;">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
          html += '<div style="display:flex;align-items:center;gap:6px;">';
          html += '<span style="font-size:11px;background:rgba(45,106,79,.1);color:#2d6a4f;padding:2px 8px;border-radius:10px;font-weight:600;">' + tag.emoji + ' ' + tag.label + '</span>';
          html += '<span style="font-size:11px;color:rgba(6,23,45,.35);">' + heure + '</span>';
          html += '</div>';
          html += '<div style="display:flex;gap:6px;">';
          html += '<button onclick="Journal.openEditor(\'' + entry.id + '\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">Modifier</button>';
          html += '<button onclick="Journal.remove(\'' + entry.id + '\')" style="background:none;border:1px solid #dc2626;color:#dc2626;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">Suppr.</button>';
          html += '</div></div>';
          html += '<p style="font-size:13px;color:#06172D;line-height:1.6;margin:0;white-space:pre-wrap;">' + moodStr + textPreview.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>';
          html += '</div>';
        });
        html += '</div>';
      });
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // === EDITOR MODAL ===

  function openEditor(editId) {
    var existing = null;
    if (editId) {
      try { existing = JSON.parse(localStorage.getItem(STORAGE_PREFIX + editId)); } catch(e) {}
    }

    var modal = document.getElementById('journal-editor-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'journal-editor-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:rgba(6,23,45,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
      modal.addEventListener('click', function(e) { if (e.target === modal) _closeEditor(); });
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';

    var now = new Date();
    var dateVal = existing ? existing.date : _localDateStr(now);
    var textVal = existing ? existing.text : '';
    var tagVal = existing ? existing.tag : 'pensees';
    var moodVal = existing ? (existing.mood !== null && existing.mood !== undefined ? existing.mood : -1) : -1;

    var html = '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
    html += '<p style="font-size:13px;font-weight:700;color:#06172D;margin:0;">' + (existing ? 'Modifier' : 'Nouvelle entrée') + '</p>';
    html += '<button onclick="Journal._closeEditor()" style="background:none;border:none;font-size:20px;cursor:pointer;color:rgba(6,23,45,.4);padding:0;line-height:1;">✕</button>';
    html += '</div>';

    // Tags
    html += '<p style="font-size:11px;font-weight:600;color:rgba(6,23,45,.55);margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em;">Catégorie</p>';
    html += '<div id="journal-tag-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">';
    TAGS.forEach(function(t) {
      var active = t.id === tagVal;
      html += '<button data-tag="' + t.id + '" onclick="Journal._selectTag(\'' + t.id + '\')" style="padding:5px 10px;border-radius:20px;border:1.5px solid ' + (active ? '#2d6a4f' : 'rgba(6,23,45,.15)') + ';background:' + (active ? 'rgba(45,106,79,.1)' : '#fff') + ';color:' + (active ? '#2d6a4f' : '#06172D') + ';font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">' + t.emoji + ' ' + t.label + '</button>';
    });
    html += '</div>';

    // Mood
    html += '<p style="font-size:11px;font-weight:600;color:rgba(6,23,45,.55);margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em;">Humeur (optionnel)</p>';
    html += '<div id="journal-mood-chips" style="display:flex;gap:8px;margin-bottom:14px;">';
    MOODS.forEach(function(m, idx) {
      var active = idx === moodVal;
      html += '<button data-mood="' + idx + '" onclick="Journal._selectMood(' + idx + ')" style="font-size:22px;padding:4px 8px;border-radius:10px;border:1.5px solid ' + (active ? '#2d6a4f' : 'rgba(6,23,45,.1)') + ';background:' + (active ? 'rgba(45,106,79,.1)' : 'transparent') + ';cursor:pointer;">' + m + '</button>';
    });
    html += '</div>';

    // Textarea
    html += '<textarea id="journal-editor-text" rows="8" maxlength="2000" placeholder="Écris librement ce que tu ressens, ce que tu vis, ce que tu veux te rappeler…" style="width:100%;padding:12px;border:1.5px solid rgba(45,106,79,.25);border-radius:12px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;color:#06172D;line-height:1.6;background:#f8faf9;">' + textVal.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:4px;margin-bottom:14px;"><span id="journal-editor-count" style="font-size:11px;color:rgba(6,23,45,.35);">' + textVal.length + '/2000</span></div>';

    // Date
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">';
    html += '<label style="font-size:11px;font-weight:600;color:rgba(6,23,45,.55);">Date :</label>';
    html += '<input type="date" id="journal-editor-date" value="' + dateVal + '" style="font-size:13px;padding:6px 10px;border:1.5px solid rgba(6,23,45,.15);border-radius:8px;font-family:inherit;color:#06172D;">';
    html += '</div>';

    // Save
    html += '<button onclick="Journal._save(\'' + (editId || '') + '\')" style="width:100%;padding:13px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Enregistrer</button>';
    html += '</div>';

    modal.innerHTML = html;

    // Wire textarea counter
    var ta = document.getElementById('journal-editor-text');
    if (ta) {
      ta.addEventListener('input', function() {
        var countEl = document.getElementById('journal-editor-count');
        if (countEl) countEl.textContent = ta.value.length + '/2000';
      });
      ta.focus();
    }

    // Store state
    window._journalEditorState = { tag: tagVal, mood: moodVal };
  }

  function _closeEditor() {
    var modal = document.getElementById('journal-editor-modal');
    if (modal) modal.style.display = 'none';
  }

  function _selectTag(tagId) {
    window._journalEditorState.tag = tagId;
    var chips = document.querySelectorAll('#journal-tag-chips button');
    chips.forEach(function(btn) {
      var active = btn.getAttribute('data-tag') === tagId;
      btn.style.border = '1.5px solid ' + (active ? '#2d6a4f' : 'rgba(6,23,45,.15)');
      btn.style.background = active ? 'rgba(45,106,79,.1)' : '#fff';
      btn.style.color = active ? '#2d6a4f' : '#06172D';
    });
  }

  function _selectMood(idx) {
    var current = window._journalEditorState.mood;
    window._journalEditorState.mood = (current === idx) ? -1 : idx;
    var chips = document.querySelectorAll('#journal-mood-chips button');
    chips.forEach(function(btn) {
      var active = parseInt(btn.getAttribute('data-mood')) === window._journalEditorState.mood;
      btn.style.border = '1.5px solid ' + (active ? '#2d6a4f' : 'rgba(6,23,45,.1)');
      btn.style.background = active ? 'rgba(45,106,79,.1)' : 'transparent';
    });
  }

  function _save(editId) {
    var text = (document.getElementById('journal-editor-text').value || '').trim();
    if (!text) {
      document.getElementById('journal-editor-text').focus();
      return;
    }
    var date = document.getElementById('journal-editor-date').value || _localDateStr(new Date());
    var state = window._journalEditorState || {};
    var entry = {
      id: editId || _generateId(),
      date: date,
      timestamp: editId ? (function() { try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + editId)).timestamp; } catch(e) { return Date.now(); } })() : Date.now(),
      tag: state.tag || 'pensees',
      mood: state.mood >= 0 ? state.mood : null,
      text: text
    };
    _saveEntry(entry);
    _closeEditor();
    render();
  }

  function remove(id) {
    if (!confirm('Supprimer cette entrée du journal ?')) return;
    _deleteEntry(id);
    render();
  }

  // === TILE UPDATE ===

  function updateTile() {
    var tileEl = document.getElementById('tile-journal-sub');
    if (!tileEl) return;
    var count = _countEntries();
    tileEl.textContent = count > 0 ? count + ' entrée' + (count > 1 ? 's' : '') : 'Espace privé';
  }

  // === PUBLIC API ===

  window.Journal = {
    render: render,
    openEditor: openEditor,
    remove: remove,
    updateTile: updateTile,
    getEntries: _getAllEntries,
    countEntries: _countEntries,
    _closeEditor: _closeEditor,
    _selectTag: _selectTag,
    _selectMood: _selectMood,
    _save: _save
  };

})();
