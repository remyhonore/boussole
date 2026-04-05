/**
 * agenda_view.js — Vue Agenda calendrier mensuel
 * Grille lun->dim, navigation mois, pastilles couleur par specialiste
 * RDV passes: opacite 40%, futurs: plein. Clic jour = liste RDV.
 * Stockage: boussole_agenda_rdv (localStorage)
 */
(function() {
  'use strict';

  var AGENDA_KEY = 'boussole_agenda_rdv';
  var COLORS = ['#2d6a4f', '#e07b2a', '#6366f1', '#dc2626', '#0891b2', '#9333ea'];
  var JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  var MOIS = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

  var _currentYear, _currentMonth;
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

  function _joursSemaine(year, month) {
    // Premier jour du mois : 0=dim, 1=lun ... 6=sam
    var first = new Date(year, month, 1).getDay();
    // Convertir en offset lundi=0 : (first + 6) % 7
    return (first + 6) % 7;
  }

  function _joursTotal(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function _isPast(dateStr) {
    return new Date(dateStr) < new Date();
  }

  // ====== RENDER CALENDRIER ======

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
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
    html += '<button onclick="AgendaView._prevMonth()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#2d6a4f;padding:4px 8px;" aria-label="Mois precedent">&#x276E;</button>';
    html += '<span style="font-size:13px;font-weight:600;color:#06172D;">' + MOIS[_currentMonth] + ' ' + _currentYear + '</span>';
    html += '<button onclick="AgendaView._nextMonth()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#2d6a4f;padding:4px 8px;" aria-label="Mois suivant">&#x276F;</button>';
    html += '</div>';

    // === En-tetes jours ===
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;">';
    JOURS.forEach(function(j) {
      html += '<div style="text-align:center;font-size:11px;color:rgba(6,23,45,.45);font-weight:600;">' + j + '</div>';
    });
    html += '</div>';

    // === Grille jours ===
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';

    // Cases vides avant le 1er
    for (var i = 0; i < offset; i++) {
      html += '<div></div>';
    }

    for (var d = 1; d <= totalDays; d++) {
      var isToday = isCurrentMonth && d === today.getDate();
      var rdvs = rdvMap[d] || [];
      var bgStyle = isToday ? 'background:#f0f7f4;border-radius:8px;' : '';
      var cursor = rdvs.length > 0 ? 'cursor:pointer;' : '';

      html += '<div onclick="AgendaView._selectDay(' + d + ')" style="text-align:center;padding:4px 0;min-height:36px;' + bgStyle + cursor + '">';
      html += '<div style="font-size:12px;color:' + (isToday ? '#2d6a4f;font-weight:700' : '#06172D') + ';">' + d + '</div>';

      // Pastilles RDV
      if (rdvs.length > 0) {
        html += '<div style="display:flex;gap:2px;justify-content:center;margin-top:2px;flex-wrap:wrap;">';
        rdvs.forEach(function(r) {
          var col = _getSpecColor(r.specialiste);
          var past = _isPast(r.datetime);
          var opacity = past ? 'opacity:0.4;' : '';
          html += '<span style="width:6px;height:6px;border-radius:50%;background:' + col + ';display:inline-block;' + opacity + '"></span>';
        });
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    // === Zone detail jour selectionne ===
    html += '<div id="agenda-day-detail" style="margin-top:10px;"></div>';

    // === Bouton ajouter ===
    html += '<div style="margin-top:10px;">';
    html += '<button onclick="ouvrirModaleAgendaRDV()" style="background:none;border:1.5px dashed rgba(45,106,79,.4);color:#2d6a4f;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;">+ Planifier un RDV</button>';
    html += '</div>';

    // === Legende specialistes ===
    var specs = Object.keys(_specColors);
    if (specs.length > 0) {
      html += '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">';
      specs.forEach(function(name) {
        html += '<div style="display:flex;align-items:center;gap:4px;">';
        html += '<span style="width:8px;height:8px;border-radius:50%;background:' + _specColors[name] + ';display:inline-block;"></span>';
        html += '<span style="font-size:11px;color:rgba(6,23,45,.65);">' + name + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  // ====== INTERACTIONS ======

  function _selectDay(day) {
    var detail = document.getElementById('agenda-day-detail');
    if (!detail) return;
    var rdvs = _getRdvParJour(_currentYear, _currentMonth)[day] || [];
    if (rdvs.length === 0) {
      detail.innerHTML = '';
      return;
    }
    var dayStr = String(day).padStart(2, '0') + '/' + String(_currentMonth + 1).padStart(2, '0') + '/' + _currentYear;
    var h = '<p style="font-size:12px;font-weight:600;color:#06172D;margin:0 0 6px;">' + dayStr + '</p>';
    rdvs.sort(function(a, b) { return (a.datetime || '').localeCompare(b.datetime || ''); });
    rdvs.forEach(function(r) {
      var d = new Date(r.datetime);
      var heureStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      var past = _isPast(r.datetime);
      var col = _getSpecColor(r.specialiste);
      var bg = past ? '#f9fafb' : '#f0f7f4';
      var borderCol = past ? 'rgba(6,23,45,.25)' : col;
      h += '<div style="border-left:3px solid ' + borderCol + ';border-radius:8px;padding:8px 10px;margin-bottom:6px;background:' + bg + ';">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">';
      h += '<div><strong style="font-size:12px;color:#06172D;">' + (r.specialiste || '') + '</strong>';
      h += ' <span style="font-size:11px;color:rgba(6,23,45,.55);">' + heureStr + '</span></div>';
      h += '<div style="display:flex;gap:4px;">';
      h += '<button onclick="ouvrirModaleAgendaRDV(\'' + r.id + '\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">Modifier</button>';
      h += '<button onclick="supprimerAgendaRDV(\'' + r.id + '\')" style="background:none;border:1px solid #dc2626;color:#dc2626;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">Suppr.</button>';
      h += '</div></div>';
      if (r.lieu) h += '<div style="font-size:11px;color:rgba(6,23,45,.55);margin-top:2px;">&#x1F4CD; ' + r.lieu + '</div>';
      if (r.notes) h += '<div style="font-size:11px;color:rgba(6,23,45,.55);margin-top:1px;">' + r.notes + '</div>';
      h += '</div>';
    });
    detail.innerHTML = h;
  }

  function _prevMonth() {
    _currentMonth--;
    if (_currentMonth < 0) { _currentMonth = 11; _currentYear--; }
    render();
  }

  function _nextMonth() {
    _currentMonth++;
    if (_currentMonth > 11) { _currentMonth = 0; _currentYear++; }
    render();
  }

  function _goToMonth(year, month) {
    _currentYear = year;
    _currentMonth = month;
    render();
  }

  // === API PUBLIQUE ===

  window.AgendaView = {
    render: render,
    _selectDay: _selectDay,
    _prevMonth: _prevMonth,
    _nextMonth: _nextMonth,
    goToMonth: _goToMonth
  };

})();

// CommonJS exports pour les tests Jest (ignore par le navigateur)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.AgendaView;
}
