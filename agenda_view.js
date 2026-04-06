/**
 * agenda_view.js — Vue Agenda calendrier mensuel (v2 — ADR-2026-044)
 * Grille lun→dim, pastilles score du jour + RDV par specialiste
 * Clic jour = detail score + RDV (modifier/supprimer)
 * Stockage: boussole_agenda_rdv + boussole_journal (localStorage)
 */
(function() {
  'use strict';

  var AGENDA_KEY = 'boussole_agenda_rdv';
  var COLORS = ['#2d6a4f', '#e07b2a', '#6366f1', '#dc2626', '#0891b2', '#9333ea'];
  var JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  var MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  var _currentYear, _currentMonth, _selectedDay;
  var _rendering = false;
  var _specColors = {};
  var _colorIdx = 0;

  function _chargerAgenda() {
    try { return JSON.parse(localStorage.getItem(AGENDA_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _getSpecColor(spec) {
    if (!spec) return '#6b7280';
    if (!_specColors[spec]) {
      _specColors[spec] = COLORS[_colorIdx % COLORS.length];
      _colorIdx++;
    }
    return _specColors[spec];
  }

  function _getRdvParJour(year, month) {
    var agenda = _chargerAgenda();
    var map = {};
    agenda.forEach(function(r) {
      if (!r.datetime) return;
      var d = new Date(r.datetime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        var day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(r);
      }
    });
    return map;
  }

  function _buildSpecMap() {
    _specColors = {};
    _colorIdx = 0;
    var agenda = _chargerAgenda();
    var seen = {};
    agenda.forEach(function(r) {
      if (r.specialiste && !seen[r.specialiste]) {
        seen[r.specialiste] = true;
        _getSpecColor(r.specialiste);
      }
    });
  }

  function _getDayScore(year, month, day) {
    var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    if (typeof getEntry === 'function') {
      var entry = getEntry(dateStr);
      if (entry && typeof entry.energie === 'number' && typeof computeScore === 'function') {
        return computeScore(entry);
      }
    }
    return null;
  }

  function _scoreColor(score) {
    if (score === null) return null;
    if (score >= 7) return '#2d6a4f';
    if (score >= 4) return '#D97706';
    return '#DC2626';
  }

  function _scoreBg(score) {
    if (score === null) return 'transparent';
    if (score >= 7) return 'rgba(45,106,79,.12)';
    if (score >= 4) return 'rgba(217,119,6,.1)';
    return 'rgba(220,38,38,.08)';
  }

  function _joursSemaine(year, month) {
    var first = new Date(year, month, 1).getDay();
    return (first + 6) % 7;
  }

  function _joursTotal(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function _isPast(dateStr) {
    return new Date(dateStr) < new Date();
  }

  // ====== RENDER CALENDRIER v2 ======

  function render(containerId) {
    var container = document.getElementById(containerId || 'agenda-rdv-list');
    if (!container) return;

    if (_currentYear === undefined) {
      var now = new Date();
      _currentYear = now.getFullYear();
      _currentMonth = now.getMonth();
    }

    _buildSpecMap();
    var rdvMap = _getRdvParJour(_currentYear, _currentMonth);
    var offset = _joursSemaine(_currentYear, _currentMonth);
    var totalDays = _joursTotal(_currentYear, _currentMonth);
    var today = new Date();
    var isCurrentMonth = (today.getFullYear() === _currentYear && today.getMonth() === _currentMonth);

    var html = '';

    // === Navigation mois ===
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 4px 12px;">';
    html += '<button onclick="AgendaView._prevMonth()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#2d6a4f;padding:6px 12px;font-weight:700;" aria-label="Mois precedent">&#x276E;</button>';
    html += '<span style="font-size:13px;font-weight:700;color:#06172D;letter-spacing:.02em;">' + MOIS[_currentMonth] + ' ' + _currentYear + '</span>';
    html += '<button onclick="AgendaView._nextMonth()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#2d6a4f;padding:6px 12px;font-weight:700;" aria-label="Mois suivant">&#x276F;</button>';
    html += '</div>';

    // === En-tetes jours ===
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;border-bottom:1px solid rgba(6,23,45,.08);padding-bottom:6px;margin-bottom:4px;">';
    JOURS.forEach(function(j) {
      html += '<div style="text-align:center;font-size:11px;color:rgba(6,23,45,.4);font-weight:700;text-transform:uppercase;letter-spacing:.06em;">' + j + '</div>';
    });
    html += '</div>';

    // === Grille jours ===
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;">';

    for (var i = 0; i < offset; i++) {
      html += '<div style="min-height:52px;"></div>';
    }

    for (var d = 1; d <= totalDays; d++) {
      var isToday = isCurrentMonth && d === today.getDate();
      var isSelected = d === _selectedDay;
      var rdvs = rdvMap[d] || [];

      // Style de la case
      var cellBg = isSelected ? 'rgba(45,106,79,.08)' : 'transparent';
      var cellBorder = isSelected ? 'border:1.5px solid #2d6a4f;' : 'border:1px solid transparent;';

      html += '<div onclick="AgendaView._selectDay(' + d + ')" style="text-align:center;padding:4px 2px;min-height:52px;cursor:pointer;border-radius:10px;' + cellBorder + 'background:' + cellBg + ';transition:all .15s;">';

      // Numéro du jour
      var hasRdv = rdvs.length > 0;
      if (isToday) {
        // Aujourd'hui : cercle vert plein, texte blanc
        html += '<div style="width:34px;height:34px;border-radius:50%;background:#2d6a4f;display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">';
        html += '<span style="font-size:12px;font-weight:700;color:#fff;">' + d + '</span>';
        html += '</div>';
      } else if (hasRdv) {
        // Jour avec RDV : cercle bordure verte, fond vert pâle
        html += '<div style="width:34px;height:34px;border-radius:50%;background:rgba(45,106,79,.08);border:2px solid #2d6a4f;display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">';
        html += '<span style="font-size:12px;font-weight:700;color:#2d6a4f;">' + d + '</span>';
        html += '</div>';
      } else {
        // Jour normal
        html += '<div style="width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">';
        html += '<span style="font-size:12px;color:rgba(6,23,45,.6);">' + d + '</span>';
        html += '</div>';
      }

      // Pastilles RDV sous le cercle
      if (rdvs.length > 0) {
        html += '<div style="display:flex;gap:3px;justify-content:center;margin-top:3px;">';
        rdvs.forEach(function(r) {
          var col = _getSpecColor(r.specialiste);
          var past = _isPast(r.datetime);
          html += '<span style="width:10px;height:10px;border-radius:50%;background:' + col + ';display:inline-block;' + (past ? 'opacity:.4;' : '') + '"></span>';
        });
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    // === Liste des RDV (prochains en haut, passés en details) ===
    var allRdvs = _chargerAgenda();
    var now = new Date();
    var futurs = allRdvs.filter(function(r) { return !_isPast(r.datetime); }).sort(function(a, b) { return (a.datetime || '').localeCompare(b.datetime || ''); });
    var passes = allRdvs.filter(function(r) { return _isPast(r.datetime); }).sort(function(a, b) { return (b.datetime || '').localeCompare(a.datetime || ''); });

    var MOIS_LISTE = ['janv.','f\u00e9vr.','mars','avr.','mai','juin','juil.','ao\u00fbt','sept.','oct.','nov.','d\u00e9c.'];

    function _renderRdvCard(r, isPast) {
      var d = new Date(r.datetime);
      var heure = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      var dateLabel = d.getDate() + ' ' + MOIS_LISTE[d.getMonth()] + ' ' + d.getFullYear();
      var col = _getSpecColor(r.specialiste);
      var c = '';
      c += '<div style="display:flex;gap:12px;align-items:flex-start;border-radius:12px;padding:14px 16px;margin-bottom:10px;background:' + (isPast ? '#f9fafb' : '#fff') + ';box-shadow:0 2px 8px rgba(6,23,45,.08);border:1px solid ' + (isPast ? 'rgba(6,23,45,.06)' : 'rgba(45,106,79,.15)') + ';' + (isPast ? 'opacity:.65;' : '') + '">';
      // Pastille couleur
      c += '<div style="width:12px;height:12px;border-radius:50%;background:' + col + ';margin-top:3px;flex-shrink:0;"></div>';
      // Contenu
      c += '<div style="flex:1;min-width:0;">';
      c += '<div style="font-size:13px;font-weight:700;color:#06172D;">' + (r.specialiste || 'RDV') + '</div>';
      c += '<div style="font-size:13px;color:rgba(6,23,45,.65);margin-top:3px;">' + dateLabel + ' a ' + heure + '</div>';
      if (r.lieu) c += '<div style="font-size:11px;color:rgba(6,23,45,.42);margin-top:2px;">' + r.lieu + '</div>';
      if (r.notes) c += '<div style="font-size:11px;color:rgba(6,23,45,.42);margin-top:4px;line-height:1.4;font-style:italic;">' + r.notes + '</div>';
      c += '</div>';
      // Actions
      c += '<div style="display:flex;gap:6px;flex-shrink:0;">';
      c += '<button onclick="ouvrirModaleAgendaRDV(\'' + r.id + '\')" style="background:rgba(45,106,79,.1);border:none;color:#2d6a4f;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;">Modifier</button>';
      c += '<button onclick="supprimerAgendaRDV(\'' + r.id + '\')" style="background:rgba(220,38,38,.06);border:none;color:#dc2626;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;">Suppr.</button>';
      c += '</div>';
      c += '</div>';
      return c;
    }

    // Prochains RDV
    if (futurs.length > 0) {
      html += '<div style="margin-top:16px;padding-top:14px;border-top:1.5px solid rgba(6,23,45,.08);">';
      html += '<p class="section-title" style="margin:0 0 10px;">Prochains rendez-vous</p>';
      futurs.forEach(function(r) { html += _renderRdvCard(r, false); });
      html += '</div>';
    } else {
      html += '<p style="margin-top:14px;font-size:12px;color:rgba(6,23,45,.4);">Aucun rendez-vous \u00e0 venir.</p>';
    }

    // Passés (collapsible)
    if (passes.length > 0) {
      html += '<details style="margin-top:10px;"><summary class="section-title" style="cursor:pointer;color:rgba(6,23,45,.42);">RDV pass\u00e9s (' + passes.length + ')</summary><div style="margin-top:8px;">';
      passes.forEach(function(r) { html += _renderRdvCard(r, true); });
      html += '</div></details>';
    }

    // === Bouton ajouter ===
    html += '<div style="margin-top:12px;">';
    html += '<button onclick="ouvrirModaleAgendaRDV()" style="background:none;border:1.5px dashed rgba(45,106,79,.4);color:#2d6a4f;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;">+ Planifier un RDV</button>';
    html += '</div>';

    // === Legende ===
    var specs = Object.keys(_specColors);
    if (specs.length > 0) {
      html += '<div style="margin-top:12px;padding:8px 0;border-top:1px solid rgba(6,23,45,.06);display:flex;flex-wrap:wrap;gap:12px;">';
      specs.forEach(function(name) {
        html += '<div style="display:flex;align-items:center;gap:5px;">';
        html += '<span style="width:8px;height:8px;border-radius:50%;background:' + _specColors[name] + ';display:inline-block;"></span>';
        html += '<span style="font-size:11px;color:rgba(6,23,45,.55);font-weight:500;">' + name + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Auto-select today (sauf si déjà en cours de render, anti-boucle)
    if (!_rendering) {
      if (isCurrentMonth && !_selectedDay) {
        _selectDay(today.getDate());
      } else if (_selectedDay) {
        _selectDay(_selectedDay);
      }
    }
  }

  // ====== INTERACTIONS ======

  function _selectDay(day) {
    _selectedDay = day;
    // Re-render pour highlight (sans re-trigger _selectDay)
    _rendering = true;
    render();
    _rendering = false;
  }

  function _prevMonth() {
    _currentMonth--;
    _selectedDay = null;
    if (_currentMonth < 0) { _currentMonth = 11; _currentYear--; }
    render();
  }

  function _nextMonth() {
    _currentMonth++;
    _selectedDay = null;
    if (_currentMonth > 11) { _currentMonth = 0; _currentYear++; }
    render();
  }

  function _goToMonth(year, month) {
    _currentYear = year;
    _currentMonth = month;
    _selectedDay = null;
    render();
  }

  window.AgendaView = {
    render: render,
    _selectDay: _selectDay,
    _prevMonth: _prevMonth,
    _nextMonth: _nextMonth,
    goToMonth: _goToMonth
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.AgendaView;
}
