/**
 * charts.js — Graphiques temporels interactifs in-app
 * Courbes 7/14/30/90j des 4 indicateurs + overlay traitements + overlay événements crash
 */
(function() {
  'use strict';

  var _chart = null;
  var _currentRange = 30;
  var RANGES = [7, 14, 30, 90];

  var COLORS = {
    energie:  { border: '#2d9e6e', bg: 'rgba(45,158,110,0.08)' },
    sommeil:  { border: '#e07b2a', bg: 'rgba(224,123,42,0.08)' },
    confort:  { border: '#9b59b6', bg: 'rgba(155,89,182,0.08)' },
    clarte:   { border: '#2980b9', bg: 'rgba(41,128,185,0.08)' }
  };

  var LABELS = {
    energie: 'Énergie',
    sommeil: 'Sommeil',
    confort: 'Confort physique',
    clarte:  'Clarté mentale'
  };

  /** Récupère les entrées triées pour la plage donnée */
  function _getEntriesForRange(days) {
    var data = typeof loadEntries === 'function' ? loadEntries() : { entries: [] };
    var entries = (data.entries || []).slice();
    entries.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    var cutoffStr = cutoff.toISOString().split('T')[0];
    return entries.filter(function(e) { return e.date >= cutoffStr; });
  }

  /** Construit les labels et datasets pour Chart.js */
  function _buildChartData(days) {
    var data = typeof loadEntries === 'function' ? loadEntries() : { entries: [] };
    var entryMap = {};
    (data.entries || []).forEach(function(e) { entryMap[e.date] = e; });

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var labels = [], dEnergie = [], dSommeil = [], dConfort = [], dClarte = [], dates = [];

    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var ds = d.toISOString().split('T')[0];
      // Correction fuseau : utiliser localDateStr si dispo
      if (typeof localDateStr === 'function') ds = localDateStr(d);
      dates.push(ds);
      // Label compact : jour/mois, avec espacement adapté
      var showLabel = days <= 30 || (i % Math.ceil(days / 15) === 0) || i === 0;
      labels.push(showLabel ? (d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0')) : '');
      var e = entryMap[ds];
      dEnergie.push(e ? e.energie : null);
      dSommeil.push(e ? e.qualite_sommeil : null);
      dConfort.push(e ? e.douleurs : null);
      dClarte.push(e ? e.clarte_mentale : null);
    }

    var pointRadius = days <= 14 ? 4 : days <= 30 ? 3 : 1.5;
    return {
      labels: labels,
      dates: dates,
      datasets: [
        { label: LABELS.energie,  data: dEnergie, borderColor: COLORS.energie.border,  backgroundColor: COLORS.energie.bg,  tension: 0.3, spanGaps: true, pointRadius: pointRadius, borderWidth: 2 },
        { label: LABELS.sommeil,  data: dSommeil, borderColor: COLORS.sommeil.border,  backgroundColor: COLORS.sommeil.bg,  tension: 0.3, spanGaps: true, pointRadius: pointRadius, borderWidth: 2 },
        { label: LABELS.confort,  data: dConfort, borderColor: COLORS.confort.border,  backgroundColor: COLORS.confort.bg,  tension: 0.3, spanGaps: true, pointRadius: pointRadius, borderWidth: 2 },
        { label: LABELS.clarte,   data: dClarte,  borderColor: COLORS.clarte.border,   backgroundColor: COLORS.clarte.bg,   tension: 0.3, spanGaps: true, pointRadius: pointRadius, borderWidth: 2 }
      ]
    };
  }

  /** Récupère les traitements actifs avec dates de début */
  function _getTraitements() {
    try {
      var raw = localStorage.getItem('boussole_traitements');
      if (!raw) return [];
      var list = JSON.parse(raw);
      return list.filter(function(t) { return t.date_debut; }).map(function(t) {
        return { nom: t.nom, date_debut: t.date_debut, statut: t.statut, categorie: t.categorie };
      });
    } catch(e) { return []; }
  }

  /** Récupère les événements crash/PEM sur la période */
  function _getEvents(dates) {
    var first = dates[0], last = dates[dates.length - 1];
    var events = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || !k.startsWith('boussole_event_')) continue;
      try {
        var ev = JSON.parse(localStorage.getItem(k));
        if (ev && ev.date >= first && ev.date <= last) {
          events.push(ev);
        }
      } catch(e) {}
    }
    return events;
  }

  /** Plugin Chart.js : lignes verticales traitements + marqueurs événements */
  var overlayPlugin = {
    id: 'boussoleOverlays',
    afterDraw: function(chart) {
      var meta = chart._boussoleOverlays;
      if (!meta) return;
      var ctx = chart.ctx;
      var xScale = chart.scales.x;
      var yScale = chart.scales.y;
      var dates = meta.dates || [];

      // --- Traitements : lignes verticales tiretées ---
      (meta.traitements || []).forEach(function(t) {
        var idx = dates.indexOf(t.date_debut);
        if (idx === -1) return;
        var x = xScale.getPixelForValue(idx);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(45,106,79,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        // Label nom du traitement
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(45,106,79,0.8)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        var label = t.nom.length > 12 ? t.nom.substring(0, 12) + '…' : t.nom;
        ctx.fillText(label, x, yScale.top - 4);
        ctx.restore();
      });

      // --- Événements : marqueurs triangulaires ---
      var crashTypes = ['crash-pem', 'mauvaise-journee-exceptionnelle', 'presyncope', 'syncope'];
      var bonTypes = ['bonne-journee-exceptionnelle'];
      (meta.events || []).forEach(function(ev) {
        var idx = dates.indexOf(ev.date);
        if (idx === -1) return;
        var x = xScale.getPixelForValue(idx);
        var isCrash = crashTypes.indexOf(ev.type) !== -1;
        var isBon = bonTypes.indexOf(ev.type) !== -1;
        var color = isCrash ? '#dc2626' : isBon ? '#2d6a4f' : '#f59e0b';
        var yPos = isCrash ? yScale.bottom + 14 : yScale.bottom + 14;

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        if (isCrash) {
          // Triangle pointe en bas (crash)
          ctx.moveTo(x - 5, yScale.bottom + 6);
          ctx.lineTo(x + 5, yScale.bottom + 6);
          ctx.lineTo(x, yScale.bottom + 14);
        } else {
          // Losange (autre événement)
          ctx.moveTo(x, yScale.bottom + 6);
          ctx.lineTo(x + 4, yScale.bottom + 10);
          ctx.lineTo(x, yScale.bottom + 14);
          ctx.lineTo(x - 4, yScale.bottom + 10);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }
  };

  /** Génère le HTML de la carte graphique interactive */
  function buildHTML() {
    var btns = RANGES.map(function(r) {
      var active = r === _currentRange;
      return '<button data-range="' + r + '" class="chart-range-btn' + (active ? ' chart-range-btn--active' : '') + '">' + r + 'j</button>';
    }).join('');

    return '<div id="chart-temporal-card" style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0;color:#06172D;">Évolution</p>' +
        '<div id="chart-range-btns" style="display:flex;gap:4px;">' + btns + '</div>' +
      '</div>' +
      '<canvas id="chart-temporal-canvas" height="200"></canvas>' +
      '<div id="chart-legend-overlay" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;justify-content:center;">' +
        '<span style="font-size:10px;color:#dc2626;">▼ Crash/PEM</span>' +
        '<span style="font-size:10px;color:#2d6a4f;">◆ Bonne journée</span>' +
        '<span style="font-size:10px;color:rgba(45,106,79,.5);">┆ Début traitement</span>' +
      '</div>' +
    '</div>';
  }

  /** Rend ou met à jour le graphique Chart.js */
  function _renderChart(days) {
    if (typeof Chart === 'undefined') return;
    _currentRange = days;

    var canvas = document.getElementById('chart-temporal-canvas');
    if (!canvas) return;

    if (_chart) { _chart.destroy(); _chart = null; }

    var chartData = _buildChartData(days);
    var traitements = _getTraitements();
    var events = _getEvents(chartData.dates);

    // Enregistrer le plugin une seule fois
    if (!Chart._boussolePluginRegistered) {
      Chart.register(overlayPlugin);
      Chart._boussolePluginRegistered = true;
    }

    _chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets
      },
      options: {
        responsive: true,
        layout: { padding: { top: 14, bottom: 16 } },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, boxWidth: 12, padding: 10 }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: function(items) {
                if (!items.length) return '';
                var idx = items[0].dataIndex;
                var ds = chartData.dates[idx];
                if (!ds) return '';
                var parts = ds.split('-');
                return parts[2] + '/' + parts[1] + '/' + parts[0];
              }
            }
          }
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
          y: { min: 0, max: 10, ticks: { stepSize: 2 } }
        }
      }
    });

    // Injecter les données overlay
    _chart._boussoleOverlays = {
      dates: chartData.dates,
      traitements: traitements,
      events: events
    };


    // MAJ boutons actifs
    var btns = document.querySelectorAll('#chart-range-btns .chart-range-btn');
    btns.forEach(function(b) {
      b.classList.toggle('chart-range-btn--active', parseInt(b.dataset.range) === days);
    });
  }

  /** Attache les listeners sur les boutons de plage */
  function _bindButtons() {
    var container = document.getElementById('chart-range-btns');
    if (!container) return;
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.chart-range-btn');
      if (!btn) return;
      var range = parseInt(btn.dataset.range);
      if (range && RANGES.indexOf(range) !== -1) {
        _renderChart(range);
      }
    });
  }

  /** Injecte le CSS des boutons (une seule fois) */
  function _injectCSS() {
    if (document.getElementById('chart-temporal-css')) return;
    var style = document.createElement('style');
    style.id = 'chart-temporal-css';
    style.textContent =
      '.chart-range-btn {' +
        'padding:4px 10px;border-radius:8px;border:1.5px solid rgba(6,23,45,.15);' +
        'background:#fff;color:#06172D;font-size:12px;font-weight:600;cursor:pointer;' +
        'transition:all .15s ease;' +
      '}' +
      '.chart-range-btn--active {' +
        'background:#2d6a4f;color:#fff;border-color:#2d6a4f;' +
      '}' +
      '.chart-range-btn:hover:not(.chart-range-btn--active) {' +
        'border-color:#2d6a4f;color:#2d6a4f;' +
      '}';
    document.head.appendChild(style);
  }

  // === API publique ===
  window.BoussoleCharts = {
    /** Retourne le HTML à insérer dans le Résumé */
    buildHTML: function() {
      _injectCSS();
      return buildHTML();
    },
    /** Rend le graphique (appeler après insertion dans le DOM) */
    render: function(days) {
      _bindButtons();
      _renderChart(days || _currentRange);
    },
    /** Détruit le graphique courant */
    destroy: function() {
      if (_chart) { _chart.destroy(); _chart = null; }
    },

    // === YEAR IN PIXELS ===

    /** Génère le HTML du calendrier Year in Pixels */
    buildYearInPixels: function() {
      return _buildYearInPixels();
    },
    /** Attache les listeners du filtre indicateur */
    initYearInPixels: function() {
      _initYearInPixels();
    }
  };

  // === YEAR IN PIXELS — implémentation ===

  var MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  var _yipFilter = 'score';

  var YIP_FILTERS = [
    { key: 'score',   label: 'Score' },
    { key: 'energie', label: 'Énergie' },
    { key: 'sommeil', label: 'Sommeil' },
    { key: 'confort', label: 'Confort' },
    { key: 'clarte',  label: 'Clarté' }
  ];


  function _yipColor(val) {
    if (val === null || val === undefined) return 'rgba(6,23,45,.06)';
    if (val >= 8) return '#2d6a4f';
    if (val >= 6) return '#6E877D';
    if (val >= 4) return '#e07b2a';
    if (val >= 2) return '#dc6050';
    return '#dc2626';
  }

  function _getYipData(filterKey) {
    var data = typeof loadEntries === 'function' ? loadEntries() : { entries: [] };
    var map = {};
    (data.entries || []).forEach(function(e) {
      var val = null;
      if (filterKey === 'score') {
        var vals = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(function(v) { return v !== null && v !== undefined; });
        val = vals.length ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : null;
      } else if (filterKey === 'energie') val = e.energie;
      else if (filterKey === 'sommeil') val = e.qualite_sommeil;
      else if (filterKey === 'confort') val = e.douleurs;
      else if (filterKey === 'clarte') val = e.clarte_mentale;
      if (val !== null && val !== undefined) map[e.date] = val;
    });
    return map;
  }

  function _buildYearInPixels() {
    var year = new Date().getFullYear();
    var filterBtns = YIP_FILTERS.map(function(f) {
      var active = f.key === _yipFilter;
      return '<button class="yip-filter-btn' + (active ? ' yip-filter-btn--active' : '') + '" data-filter="' + f.key + '">' + f.label + '</button>';
    }).join('');

    var html = '<div id="year-in-pixels-card" style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
    html += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0;color:#06172D;">Year in Pixels ' + year + '</p>';
    html += '<div id="yip-filter-btns" style="display:flex;gap:3px;">' + filterBtns + '</div>';
    html += '</div>';
    html += '<div id="yip-grid">' + _renderGrid() + '</div>';
    // Légende
    html += '<div style="display:flex;gap:6px;align-items:center;justify-content:center;margin-top:8px;">';
    var legendColors = [
      { c: '#dc2626', l: '0-2' }, { c: '#dc6050', l: '2-4' },
      { c: '#e07b2a', l: '4-6' }, { c: '#6E877D', l: '6-8' }, { c: '#2d6a4f', l: '8-10' }
    ];
    legendColors.forEach(function(lc) {
      html += '<span style="display:inline-flex;align-items:center;gap:2px;font-size:9px;color:rgba(6,23,45,.5);"><span style="width:10px;height:10px;border-radius:2px;background:' + lc.c + ';display:inline-block;"></span>' + lc.l + '</span>';
    });
    html += '</div></div>';
    return html;
  }

  function _renderGrid() {
    var year = new Date().getFullYear();
    var dataMap = _getYipData(_yipFilter);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = typeof localDateStr === 'function' ? localDateStr(today) : today.toISOString().split('T')[0];

    var html = '<div style="display:grid;grid-template-columns:28px repeat(31,1fr);gap:1px;font-size:9px;">';
    for (var m = 0; m < 12; m++) {
      // Mois label
      html += '<div style="font-size:9px;color:rgba(6,23,45,.45);font-weight:600;display:flex;align-items:center;padding-right:4px;">' + MONTHS_FR[m] + '</div>';
      var daysInMonth = new Date(year, m + 1, 0).getDate();
      for (var d = 1; d <= 31; d++) {
        if (d > daysInMonth) {
          html += '<div></div>';
          continue;
        }
        var ds = year + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        var isFuture = ds > todayStr;
        var val = dataMap[ds];
        var bg = isFuture ? 'transparent' : _yipColor(val);
        var border = ds === todayStr ? '2px solid #06172D' : 'none';
        var title = val !== null && val !== undefined ? (d + '/' + (m+1) + ' : ' + (typeof val === 'number' ? val.toFixed(1) : val)) : '';
        html += '<div style="aspect-ratio:1;border-radius:2px;background:' + bg + ';border:' + border + ';" title="' + title + '"></div>';
      }
    }
    html += '</div>';
    return html;
  }


  function _initYearInPixels() {
    var container = document.getElementById('yip-filter-btns');
    if (!container) return;
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.yip-filter-btn');
      if (!btn) return;
      _yipFilter = btn.dataset.filter;
      // MAJ boutons actifs
      container.querySelectorAll('.yip-filter-btn').forEach(function(b) {
        b.classList.toggle('yip-filter-btn--active', b.dataset.filter === _yipFilter);
      });
      // Rerendre la grille
      var grid = document.getElementById('yip-grid');
      if (grid) grid.innerHTML = _renderGrid();
    });

    // Injecter CSS yip
    if (!document.getElementById('yip-css')) {
      var style = document.createElement('style');
      style.id = 'yip-css';
      style.textContent =
        '.yip-filter-btn{padding:3px 7px;border-radius:6px;border:1px solid rgba(6,23,45,.12);background:#fff;color:rgba(6,23,45,.6);font-size:10px;font-weight:600;cursor:pointer;transition:all .15s;}' +
        '.yip-filter-btn--active{background:#2d6a4f;color:#fff;border-color:#2d6a4f;}' +
        '.yip-filter-btn:hover:not(.yip-filter-btn--active){border-color:#2d6a4f;color:#2d6a4f;}';
      document.head.appendChild(style);
    }
  }

})();
