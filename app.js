/**
 * Boussole+ v1.0 - Application principale
 */

// État de l'application
const app = {
  currentPanel: 'home',
  lastSavedEntry: null,
  undoTimer: null,
  isGeneratingPDF: false
};

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', () => {
  // Dark mode toggle
  (function() {
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
      btn.addEventListener('click', function() {
        document.documentElement.classList.toggle('dark');
        var isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('boussole_theme', isDark ? 'dark' : 'light');
        btn.textContent = isDark ? '☀️' : '🌙';
      });
    }
  })();

  initNavigation();
  initHomePanel();
  initTodayPanel();
  initSummaryPanel();
  loadTodayData();
  
  // Charger le dataset de référence si mode debug
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'dataset') {
    loadDebugDataset();
  }
});

/**
 * === NAVIGATION ===
 */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      switchPanel(panel);
    });
  });
}

function switchPanel(panelId) {
  // Désactiver tous les boutons et panels
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
  });
  document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));

  // Activer le panel sélectionné
  const navBtn = document.querySelector(`[data-panel="${panelId}"]`);
  const panel = document.getElementById(`panel-${panelId}`);

  if (navBtn) {
    navBtn.classList.add('active');
    navBtn.setAttribute('aria-current', 'page');
  }
  if (panel) panel.classList.add('active');
  
  app.currentPanel = panelId;
  
  // Rafraîchir le résumé si on affiche ce panel
  if (panelId === 'summary') {
    refreshSummary();
  }

  // Repositionner les smileys quand le panel today devient visible (offsetWidth valide)
  if (panelId === 'today') {
    requestAnimationFrame(() => {
      ['energie', 'qualite-sommeil', 'douleurs', 'clarte-mentale'].forEach(id => {
        const slider = document.getElementById(id);
        if (slider) updateSmiley(id, parseInt(slider.value));
      });
    });
  }
}

/**
 * === ÉCRAN ACCUEIL ===
 */
function initHomePanel() {
  document.getElementById('btn-start-entry')?.addEventListener('click', () => {
    switchPanel('today');
  });
}

/**
 * Retourne le smiley et la couleur associée à une valeur de curseur.
 * @param {number|null} value — null = pas encore saisi
 * @returns {{ emoji: string, color: string }|null}
 */
function getSmiley(value) {
  if (value === null) return null;
  if (value <= 2)  return { emoji: '😫', color: '#e74c3c' };
  if (value <= 4)  return { emoji: '😟', color: '#e67e22' };
  if (value <= 6)  return { emoji: '😐', color: '#f1c40f' };
  if (value <= 8)  return { emoji: '🙂', color: '#9acd32' };
  return                 { emoji: '😊', color: '#2ecc71' };
}

/**
 * Met à jour le smiley sur le thumb du curseur.
 * @param {string} id — identifiant du curseur (ex: 'energie')
 * @param {number|null} value
 */
function updateSmiley(id, value) {
  const smileyEl = document.getElementById(`${id}-smiley`);
  const slider = document.getElementById(id);
  if (!smileyEl) return;
  const result = getSmiley(value);
  const wrapper = smileyEl.parentElement;
  if (!result) {
    smileyEl.textContent = '';
    smileyEl.style.opacity = '0';
    if (wrapper) wrapper.classList.remove('has-smiley');
  } else {
    smileyEl.textContent = result.emoji;
    smileyEl.style.opacity = '1';
    if (wrapper) wrapper.classList.add('has-smiley');
    if (slider) {
      const percent = (slider.value - slider.min) / (slider.max - slider.min);
      const thumbWidth = 28;
      const left = percent * (slider.offsetWidth - thumbWidth) + thumbWidth / 2;
      smileyEl.style.left = left + 'px';
    }
  }
}

window.addEventListener('resize', () => {
  ['energie', 'qualite-sommeil', 'douleurs', 'clarte-mentale'].forEach(id => {
    const slider = document.getElementById(id);
    const smileyEl = document.getElementById(`${id}-smiley`);
    if (!slider || !smileyEl || !smileyEl.textContent) return;
    const percent = (slider.value - slider.min) / (slider.max - slider.min);
    const thumbWidth = 28;
    const left = percent * (slider.offsetWidth - thumbWidth) + thumbWidth / 2;
    smileyEl.style.left = left + 'px';
  });
});

/**
 * === ÉCRAN AUJOURD'HUI ===
 */
function initTodayPanel() {
  // Curseurs
  const sliders = ['energie', 'qualite-sommeil', 'douleurs', 'clarte-mentale'];
  sliders.forEach(id => {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(`${id}-value`);

    if (slider && valueDisplay) {
      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
        updateSmiley(id, parseInt(slider.value));
      });
    }
  });
  
  // Note
  const noteTextarea = document.getElementById('note');
  const noteCount = document.getElementById('note-count');
  
  if (noteTextarea && noteCount) {
    noteTextarea.addEventListener('input', () => {
      noteCount.textContent = `${noteTextarea.value.length}/200`;
    });
  }
  
  // Boutons
  document.getElementById('btn-save')?.addEventListener('click', saveCurrentEntry);
  document.getElementById('btn-undo')?.addEventListener('click', undoLastSave);
  document.getElementById('btn-quick')?.addEventListener('click', fillLastValues);
}

function loadTodayData() {
  const today = getTodayDate();
  const entry = getEntry(today);
  
  if (entry) {
    // Charger les valeurs existantes
    if (entry.energie !== null) {
      document.getElementById('energie').value = entry.energie;
      document.getElementById('energie-value').textContent = entry.energie;
      updateSmiley('energie', entry.energie);
    }
    if (entry.qualite_sommeil !== null) {
      document.getElementById('qualite-sommeil').value = entry.qualite_sommeil;
      document.getElementById('qualite-sommeil-value').textContent = entry.qualite_sommeil;
      updateSmiley('qualite-sommeil', entry.qualite_sommeil);
    }
    if (entry.douleurs !== null) {
      document.getElementById('douleurs').value = entry.douleurs;
      document.getElementById('douleurs-value').textContent = entry.douleurs;
      updateSmiley('douleurs', entry.douleurs);
    }
    if (entry.clarte_mentale !== null) {
      document.getElementById('clarte-mentale').value = entry.clarte_mentale;
      document.getElementById('clarte-mentale-value').textContent = entry.clarte_mentale;
      updateSmiley('clarte-mentale', entry.clarte_mentale);
    }
    if (entry.note) {
      document.getElementById('note').value = entry.note;
      document.getElementById('note-count').textContent = `${entry.note.length}/200`;
    }
    // DEPRECATED: ancien RMSSD — ADR-2026-021 // const rmssdInputEl = document.getElementById('rmssd-input');
    // DEPRECATED: ancien RMSSD — ADR-2026-021 // if (rmssdInputEl && entry.rmssd != null) rmssdInputEl.value = entry.rmssd;
  }

  // Charger les mesures objectives (ADR-2026-021)
  if (typeof window.loadMesures === 'function') window.loadMesures(today);

  updateLastSavedDisplay();
  refreshPacingAlert();

  // Repositionner les smileys après que le layout soit calculé (offsetWidth > 0)
  requestAnimationFrame(() => {
    ['energie', 'qualite-sommeil', 'douleurs', 'clarte-mentale'].forEach(id => {
      const slider = document.getElementById(id);
      if (slider) updateSmiley(id, parseInt(slider.value));
    });
  });
}

function refreshPacingAlert() {
  var alertEl = document.getElementById('pacing-alert-today');
  if (!alertEl) return;

  if (typeof window.shouldShowPacingAlert !== 'function') {
    alertEl.style.display = 'none';
    return;
  }

  // Construire le tableau des jours recents depuis les entrees
  var recentData = loadEntries();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  var cutoffStr = cutoff.toISOString().split('T')[0];

  var recentDays = [];
  recentData.entries.forEach(function(entry) {
    if (entry.date >= cutoffStr) {
      var sc = calculateDayScore(entry);
      if (sc !== null) recentDays.push({ date: entry.date, score: sc });
    }
  });

  if (window.shouldShowPacingAlert(recentDays)) {
    alertEl.innerHTML =
      '<span class="pacing-icon">(i)</span>' +
      ' Vous accumulez de l\'energie depuis 3 jours. Restez attentif a ne pas depasser votre enveloppe energetique.' +
      '<button class="pacing-dismiss" onclick="dismissPacingAlert()" aria-label="Fermer l\'alerte">&times;</button>';
    alertEl.style.display = 'block';
  } else {
    alertEl.style.display = 'none';
  }
}

function dismissPacingAlert() {
  var today = getTodayDate();
  try { localStorage.setItem('boussole_pacing_alert_dismissed_' + today, '1'); } catch(e) {}
  var alertEl = document.getElementById('pacing-alert-today');
  if (alertEl) alertEl.style.display = 'none';
}

function saveCurrentEntry() {
  const energie = getSliderValue('energie');
  const qualiteSommeil = getSliderValue('qualite-sommeil');
  const douleurs = getSliderValue('douleurs');
  const clarteMentale = getSliderValue('clarte-mentale');
  const note = document.getElementById('note').value.trim();
  // DEPRECATED: ancien RMSSD — ADR-2026-021 // const rmssdInput = document.getElementById('rmssd-input');
  // DEPRECATED: ancien RMSSD — ADR-2026-021 // const rmssd = rmssdInput && rmssdInput.value !== '' ? parseFloat(rmssdInput.value) : null;
  
  // Vérifier qu'au moins 1 curseur est renseigné
  const filledCount = [energie, qualiteSommeil, douleurs, clarteMentale].filter(v => v !== null).length;
  
  if (filledCount === 0) {
    showStatus('Renseigne au moins 1 repère pour enregistrer.', 'warning');
    return;
  }
  
  // Sauvegarder l'état actuel pour undo
  const today = getTodayDate();
  app.lastSavedEntry = getEntry(today);
  
  // Sauvegarder
  const entry = {
    energie,
    qualite_sommeil: qualiteSommeil,
    douleurs,
    clarte_mentale: clarteMentale,
    note: note || null,
    // DEPRECATED: ancien RMSSD — ADR-2026-021 // rmssd: rmssd
  };
  
  const success = saveEntry(today, entry);
  
  if (success) {
    showStatus('Enregistré ✓', 'success');
    showUndoButton();
    updateLastSavedDisplay();
    // DEPRECATED: ancien RMSSD — ADR-2026-021 // if (rmssdInput) rmssdInput.value = '';
    
    // Message si < 2 curseurs
    if (filledCount === 1) {
      setTimeout(() => {
        showStatus('Pour plus de fiabilité, renseigne au moins 2 repères.', 'info');
      }, 2000);
    }
  } else {
    showStatus('Erreur lors de l\'enregistrement', 'warning');
  }
}

function getSliderValue(id) {
  const slider = document.getElementById(id);
  if (!slider) return null;
  
  // Si le curseur n'a pas été touché (valeur par défaut 0 et pas d'interaction)
  if (slider.value === '0' && !slider.dataset.touched) {
    return null;
  }
  
  return parseInt(slider.value);
}

// Marquer les curseurs comme touchés
['energie', 'qualite-sommeil', 'douleurs'].forEach(id => {
  const slider = document.getElementById(id);
  if (slider) {
    slider.addEventListener('input', () => {
      slider.dataset.touched = 'true';
    });
  }
});

function showUndoButton() {
  const undoBtn = document.getElementById('btn-undo');
  if (!undoBtn) return;
  
  undoBtn.style.display = 'inline-block';
  
  // Timer 30s
  if (app.undoTimer) clearTimeout(app.undoTimer);
  app.undoTimer = setTimeout(() => {
    undoBtn.style.display = 'none';
    app.lastSavedEntry = null;
  }, 30000);
}

function undoLastSave() {
  const today = getTodayDate();
  
  if (app.lastSavedEntry === null) {
    // Supprimer l'entrée actuelle
    deleteEntry(today);
  } else {
    // Restaurer l'état précédent
    saveEntry(today, app.lastSavedEntry);
  }
  
  loadTodayData();
  showStatus('Annulation effectuée', 'info');
  
  const undoBtn = document.getElementById('btn-undo');
  if (undoBtn) undoBtn.style.display = 'none';
  
  if (app.undoTimer) clearTimeout(app.undoTimer);
  app.lastSavedEntry = null;
}

function fillLastValues() {
  const lastEntry = getLastEntry();
  if (!lastEntry) {
    showStatus('Aucune entrée précédente', 'info');
    return;
  }
  
  if (lastEntry.energie !== null) {
    document.getElementById('energie').value = lastEntry.energie;
    document.getElementById('energie').dataset.touched = 'true';
    document.getElementById('energie-value').textContent = lastEntry.energie;
    updateSmiley('energie', lastEntry.energie);
  }
  if (lastEntry.qualite_sommeil !== null) {
    document.getElementById('qualite-sommeil').value = lastEntry.qualite_sommeil;
    document.getElementById('qualite-sommeil').dataset.touched = 'true';
    document.getElementById('qualite-sommeil-value').textContent = lastEntry.qualite_sommeil;
    updateSmiley('qualite-sommeil', lastEntry.qualite_sommeil);
  }
  if (lastEntry.douleurs !== null) {
    document.getElementById('douleurs').value = lastEntry.douleurs;
    document.getElementById('douleurs').dataset.touched = 'true';
    document.getElementById('douleurs-value').textContent = lastEntry.douleurs;
    updateSmiley('douleurs', lastEntry.douleurs);
  }
  
  showStatus('Dernières valeurs chargées', 'success');
}

function updateLastSavedDisplay() {
  const lastEntry = getLastEntry();
  const display = document.getElementById('last-saved');
  
  if (!display) return;
  
  if (!lastEntry) {
    display.textContent = 'Aucune entrée enregistrée.';
    return;
  }
  
  const parts = [];
  if (lastEntry.energie !== null) parts.push(`Énergie ${lastEntry.energie}`);
  if (lastEntry.qualite_sommeil !== null) parts.push(`Sommeil ${lastEntry.qualite_sommeil}`);
  if (lastEntry.douleurs !== null) parts.push(`Confort ${lastEntry.douleurs}`);
  if (lastEntry.clarte_mentale !== null && lastEntry.clarte_mentale !== undefined) parts.push(`Clarté ${lastEntry.clarte_mentale}`);
  
  const dateStr = formatDateFr(lastEntry.date);
  display.textContent = `Dernière saisie : ${dateStr} · ${parts.join(' · ')}`;
}

/**
 * === ÉCRAN RÉSUMÉ ===
 */
function initSummaryPanel() {
  document.getElementById('btn-generate-pdf')?.addEventListener('click', () => {
    if (typeof genererPDFEnrichi === 'function') {
      genererPDFEnrichi();
    } else {
      showPDFPreview();
    }
  });
}

function refreshSummary() {
  const data = loadEntries();
  const summary = calculateSummary(data.entries, 30);
  
  const container = document.getElementById('summary-content');
  if (!container) return;
  
  let html = '';

  // 1. Tendances
  html += `<div class="card">`;
  html += `<h2 class="summary-section">1️⃣ TENDANCES</h2>`;
  
  let hasAnyTendance = false;
  
  if (summary.energie.moyenne !== null) {
    hasAnyTendance = true;
    html += `<div class="summary-item">`;
    html += `<strong>Énergie : ${summary.energie.moyenne}/10</strong>`;
    html += `<div class="summary-trend">→ ${summary.energie.tendance}</div>`;
    html += `</div>`;
  }
  
  if (summary.qualite_sommeil.moyenne !== null) {
    hasAnyTendance = true;
    html += `<div class="summary-item">`;
    html += `<strong>Qualité sommeil : ${summary.qualite_sommeil.moyenne}/10</strong>`;
    html += `<div class="summary-trend">→ ${summary.qualite_sommeil.tendance}</div>`;
    html += `</div>`;
  }
  
  if (summary.douleurs.moyenne !== null) {
    hasAnyTendance = true;
    html += `<div class="summary-item">`;
    html += `<strong>Confort physique : ${summary.douleurs.moyenne}/10</strong>`;
    html += `<div class="summary-trend">→ ${summary.douleurs.tendance}</div>`;
    html += `</div>`;
  }
  
  if (summary.clarte_mentale && summary.clarte_mentale.moyenne !== null) {
    hasAnyTendance = true;
    html += `<div class="summary-item">`;
    html += `<strong>Clarté mentale : ${summary.clarte_mentale.moyenne}/10</strong>`;
    html += `<div class="summary-trend">→ ${summary.clarte_mentale.tendance}</div>`;
    html += `</div>`;
  }

  if (!hasAnyTendance) {
    html += `<p style="color: var(--color-text-muted); font-style: italic;">Aucune donnée disponible. Commencez par saisir vos repères dans l'onglet "Aujourd'hui".</p>`;
  }
  
  html += `</div>`;

  // 2. Résumé 30 jours
  html += `<div class="card">`;
  html += `<h2 class="summary-section">2️⃣ RÉSUMÉ 30 JOURS</h2>`;
  html += `<p>Jours renseignés : <strong>${summary.joursRenseignes}/${summary.totalJours}</strong>`;
  if (summary.lastDate) {
    html += ` · Dernière saisie : <strong>${formatDateFr(summary.lastDate)}</strong>`;
  }
  html += `</p>`;
  if (summary.joursRenseignes < 5) {
    html += `<div class="status status-warning" style="margin-top: 10px;">Données insuffisantes — renseigne au moins 5 jours pour des tendances fiables.</div>`;
  }
  const dist = (typeof getDayTypeDistribution === 'function') ? getDayTypeDistribution(data.entries, 30) : null;
  if (dist && dist.total > 0) {
    const pct = (n) => Math.round((n / dist.total) * 100);
    html += `<p style="margin-top: 10px;">`;
    html += `Jours hauts (vert) : <strong>${dist.vert}j (${pct(dist.vert)}%)</strong> · `;
    html += `Jours moyens (orange) : <strong>${dist.orange}j (${pct(dist.orange)}%)</strong> · `;
    html += `Jours bas (rouge) : <strong>${dist.rouge}j (${pct(dist.rouge)}%)</strong>`;
    html += `</p>`;
  }
  html += `</div>`;

  // 3. Variations
  if (summary.variations && summary.variations.length > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">3️⃣ VARIATIONS IMPORTANTES</h2>`;
    html += `<ul class="summary-list">`;
    
    summary.variations.forEach(v => {
      const typeText = v.type === 'amélioration' ? 'Forte amélioration' : 'Chute brutale';
      html += `<li>`;
      html += `<strong>${formatDateFr(v.date)} : ${typeText}</strong>`;
      html += `<div class="summary-trend">(${v.scoreJ.toFixed(1)}/10 vs ${v.scoreJMinus1.toFixed(1)}/10)</div>`;
      html += `</li>`;
    });
    
    html += `</ul>`;
    html += `</div>`;
  }
  
  // 4. Points marquants
  html += `<div class="card">`;
  html += `<h2 class="summary-section">4️⃣ POINTS MARQUANTS</h2>`;
  
  let hasAnyPoint = false;
  html += `<ul class="summary-list">`;
  
  if (summary.pointsMarquants.meilleurJour) {
    hasAnyPoint = true;
    const mj = summary.pointsMarquants.meilleurJour;
    html += `<li>✅ Meilleur jour : ${formatDateFr(mj.date)} (score ${mj.score.toFixed(1)}/10)</li>`;
  }
  
  if (summary.pointsMarquants.jourLePlusBas) {
    hasAnyPoint = true;
    const jb = summary.pointsMarquants.jourLePlusBas;
    html += `<li>⚠️ Jour le plus bas : ${formatDateFr(jb.date)} (score ${jb.score.toFixed(1)}/10)</li>`;
  }
  
  if (summary.pointsMarquants.gap) {
    hasAnyPoint = true;
    const gap = summary.pointsMarquants.gap;
    html += `<li>⏸️ Jours non renseignés : ${formatDateFr(gap.start)}–${formatDateFr(gap.end)} (${gap.count} jours)</li>`;
  }
  
  html += `</ul>`;
  
  if (!hasAnyPoint) {
    html += `<p style="color: var(--color-text-muted); font-style: italic;">Aucune donnée disponible.</p>`;
  }
  
  html += `</div>`;
  
  // 4. Notes
  if (summary.notes && summary.notes.length > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">5️⃣ VOS NOTES</h2>`;
    html += `<ul class="summary-list">`;
    
    summary.notes.forEach(n => {
      html += `<li>${formatDateFr(n.date)} : "${n.note}"</li>`;
    });
    
    html += `</ul>`;
    html += `</div>`;
  }
  
  // 5b. Episodes PEM detectes (30 jours)
  if (typeof window.detectPEMEvents === 'function') {
    var pemDays = [];
    var pemMesures = {};
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 29);
    var cutoffStr = cutoffDate.toISOString().split('T')[0];

    data.entries.forEach(function(entry) {
      if (entry.date >= cutoffStr) {
        var sc = calculateDayScore(entry);
        if (sc !== null) pemDays.push({ date: entry.date, score: sc });
      }
    });
    pemDays.sort(function(a, b) { return a.date < b.date ? -1 : 1; });

    pemDays.forEach(function(d) {
      var raw = localStorage.getItem('boussole_mesures_' + d.date);
      if (raw) {
        try { pemMesures['boussole_mesures_' + d.date] = JSON.parse(raw); } catch(e) {}
      }
    });

    var pemEvents = window.detectPEMEvents(pemDays, pemMesures);

    if (pemEvents.length > 0) {
      var levelLabel = { probable: 'Probable', confirmed: 'Confirme (FC)', reinforced: 'Renforce (FC + VFC)' };
      var displayed = pemEvents.slice(0, 5);
      html += '<div class="card pem-section">';
      html += '<h3 class="pem-header">Episodes de crash detectes (30 derniers jours)</h3>';
      html += '<p class="pem-count">' + pemEvents.length + ' episode(s) identifie(s)</p>';
      displayed.forEach(function(ev) {
        var deltaStr = '-' + ev.delta.toFixed(1) + ' pts';
        html += '<div class="pem-card">';
        html += '<div class="pem-dates">' + ev.dateJFr + ' puis ' + ev.dateCrashFr + '</div>';
        html += '<div class="pem-scores">Score : ' + ev.scoreJ.toFixed(1) + ' puis ' +
                '<span class="pem-crash-score">' + ev.scoreCrash.toFixed(1) + '</span>' +
                ' (<span class="pem-delta">' + deltaStr + '</span>)</div>';
        html += '<div class="pem-level">Niveau : ' + (levelLabel[ev.level] || ev.level) + '</div>';
        if (ev.fcJ !== null && ev.fcCrash !== null) {
          var fcSign = ev.fcDelta >= 0 ? '+' : '';
          html += '<div class="pem-fc">FC repos : ' + ev.fcJ + ' bpm puis ' + ev.fcCrash + ' bpm (' + fcSign + ev.fcDelta + ' bpm)</div>';
        }
        html += '</div>';
      });
      html += '<p class="pem-message">Un crash survient souvent 24 a 48h apres un effort. Montrez ces episodes a votre professionnel de sante pour en discuter.</p>';
      html += '</div>';
    }
  }

  // 5c. Corrélation cycle hormonal (30 jours)
  if (typeof window.collectCycleData === 'function' && typeof window.analyzeCycleCorrelation === 'function') {
    var cycleDays = [];
    var cycleMesures = {};
    var cycleCutoff = new Date();
    cycleCutoff.setDate(cycleCutoff.getDate() - 29);
    var cycleCutoffStr = cycleCutoff.toISOString().split('T')[0];

    data.entries.forEach(function(entry) {
      if (entry.date >= cycleCutoffStr) {
        var sc = calculateDayScore(entry);
        if (sc !== null) cycleDays.push({ date: entry.date, score: sc });
      }
    });
    cycleDays.sort(function(a, b) { return a.date < b.date ? -1 : 1; });

    cycleDays.forEach(function(d) {
      var raw = localStorage.getItem('boussole_mesures_' + d.date);
      if (raw) {
        try { cycleMesures['boussole_mesures_' + d.date] = JSON.parse(raw); } catch(e) {}
      }
    });

    var cyclePhaseScores = window.collectCycleData(cycleDays, cycleMesures, 30);
    var cycleAnalysis = window.analyzeCycleCorrelation(cyclePhaseScores);

    if (cycleAnalysis !== null) {
      html += '<div class="cycle-section">';
      html += '<h3>Cycle et bien-être (30 derniers jours)</h3>';
      html += '<table class="cycle-table"><tbody>';

      Object.keys(cycleAnalysis.phases).forEach(function(phase) {
        var p = cycleAnalysis.phases[phase];
        var label = window.getCyclePhaseLabel(phase);
        var color = window.getCyclePhaseColor(phase);
        var barWidth = Math.round((p.avg / 10) * 80);
        html += '<tr>';
        html += '<td style="white-space:nowrap">' + label + '</td>';
        html += '<td style="white-space:nowrap">' + p.avg.toFixed(1) + '/10</td>';
        html += '<td style="white-space:nowrap">' + p.count + 'j</td>';
        html += '<td style="width:100%"><span class="cycle-bar" style="width:' + barWidth + 'px;background:' + color + '"></span></td>';
        html += '</tr>';
      });

      html += '</tbody></table>';

      if (cycleAnalysis.significant) {
        var minLabel = window.getCyclePhaseLabel(cycleAnalysis.phaseMin);
        var maxLabel = window.getCyclePhaseLabel(cycleAnalysis.phaseMax);
        var minAvg = cycleAnalysis.phases[cycleAnalysis.phaseMin].avg.toFixed(1);
        var maxAvg = cycleAnalysis.phases[cycleAnalysis.phaseMax].avg.toFixed(1);
        html += '<p class="cycle-message">Tes jours les plus difficiles coïncident avec la phase ' + minLabel + ' (score moyen ' + minAvg + '/10 vs ' + maxAvg + '/10 en phase ' + maxLabel + '). Cette information peut être utile à partager avec ton professionnel de santé.</p>';
      } else {
        html += '<p class="cycle-message">Tes scores ne montrent pas de variation marquée entre les phases de ton cycle sur cette période.</p>';
      }

      html += '</div>';
    }
  }

  // 6. Prudence
  html += `<div class="card">`;
  html += `<h2 class="summary-section">6️⃣ PRUDENCE</h2>`;
  html += `<p style="color: var(--color-text-muted); font-size: 14px;">`;
  html += `⚠️ Infos générales uniquement.<br>`;
  html += `Pas d'avis médical personnalisé.<br>`;
  html += `Urgence : 15`;
  html += `</p>`;
  html += `</div>`;
  
  container.innerHTML = html;
}

/**
 * === GÉNÉRATION PDF ===
 */
function showPDFPreview() {
  const data = loadEntries();
  const summary = calculateSummary(data.entries, 30);
  
  const preview = generatePDFPreview(summary);
  
  // Afficher modal avec aperçu
  const modal = document.getElementById('pdf-modal');
  const previewEl = document.getElementById('pdf-preview');
  
  if (modal && previewEl) {
    previewEl.textContent = preview;
    modal.classList.add('active');
  }
}

function closePDFModal() {
  const modal = document.getElementById('pdf-modal');
  if (modal) modal.classList.remove('active');
}

async function downloadPDFFromModal() {
  if (app.isGeneratingPDF) return;
  
  app.isGeneratingPDF = true;
  const btn = document.getElementById('btn-download-pdf');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Génération...';
  }
  
  try {
    const data = loadEntries();
    const summary = calculateSummary(data.entries, 30);
    
    const filename = await downloadPDF(summary);
    
    showStatus(`PDF téléchargé : ${filename}`, 'success');
    closePDFModal();
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    showStatus('Erreur lors de la génération du PDF', 'warning');
  } finally {
    app.isGeneratingPDF = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Télécharger';
    }
  }
}

/**
 * === UTILS ===
 */
function getTodayDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function formatDateFr(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status status-${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

function loadDebugDataset() {
  console.log('Chargement du dataset de référence...');
  const data = { version: '1.0.0', entries: DATASET_REF };
  importData(data);
  loadTodayData();
  
  // Rafraîchir le résumé si on est sur cet onglet
  if (app.currentPanel === 'summary') {
    refreshSummary();
  }
  
  showStatus('Dataset de référence chargé ✓ (7 entrées)', 'success');
}

// Event listeners globaux
document.getElementById('modal-close')?.addEventListener('click', closePDFModal);
document.getElementById('btn-download-pdf')?.addEventListener('click', downloadPDFFromModal);
document.getElementById('btn-cancel-pdf')?.addEventListener('click', closePDFModal);

// Changelog modal
const CURRENT_VERSION = '1.8';
const VERSION_KEY = 'boussole_last_version_seen';

function openChangelog() {
  const modal = document.getElementById('changelog-modal');
  if (modal) modal.style.display = 'flex';
}

function closeChangelog() {
  const modal = document.getElementById('changelog-modal');
  if (modal) modal.style.display = 'none';
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
}

document.getElementById('changelog-link')?.addEventListener('click', openChangelog);
document.getElementById('changelog-close')?.addEventListener('click', closeChangelog);
document.getElementById('changelog-ok')?.addEventListener('click', closeChangelog);

// === Section Mes mesures (ADR-2026-021) ===

// Toggle collapsible
(function() {
  const toggleMesures = document.getElementById('toggle-mesures');
  const mesuresBody = document.querySelector('.mesures-body');
  const mesuresSubtitle = document.querySelector('.mesures-subtitle');
  const mesuresChevron = document.querySelector('.mesures-chevron');

  if (toggleMesures) {
    toggleMesures.addEventListener('click', function() {
      const isOpen = mesuresBody.style.display !== 'none';
      mesuresBody.style.display = isOpen ? 'none' : 'block';
      mesuresSubtitle.style.display = isOpen ? 'none' : 'block';
      mesuresChevron.classList.toggle('open', !isOpen);
    });
  }

  // Toggle chips cycle hormonal
  var cycleChips = document.querySelectorAll('#cycle-chips .chip');
  cycleChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      var isActive = chip.classList.contains('active');
      cycleChips.forEach(function(c) { c.classList.remove('active'); });
      if (!isActive) chip.classList.add('active');
    });
  });

  // Sauvegarde mesures
  var btnSaveMesures = document.getElementById('btn-save-mesures');
  if (btnSaveMesures) {
    btnSaveMesures.addEventListener('click', function() {
      var dateKey = getTodayDate();
      var mesures = {};

      var fc = document.getElementById('input-fc');
      var rmssd = document.getElementById('input-rmssd');
      var taSys = document.getElementById('input-ta-sys');
      var taDia = document.getElementById('input-ta-dia');
      var poids = document.getElementById('input-poids');

      if (fc && fc.value) mesures.fc = parseInt(fc.value);
      if (rmssd && rmssd.value) mesures.rmssd = parseInt(rmssd.value);
      if (taSys && taSys.value) mesures.ta_sys = parseInt(taSys.value);
      if (taDia && taDia.value) mesures.ta_dia = parseInt(taDia.value);
      if (poids && poids.value) mesures.poids = parseFloat(poids.value);

      var activeChip = document.querySelector('#cycle-chips .chip.active');
      if (activeChip) mesures.cycle_phase = activeChip.getAttribute('data-phase');

      if (Object.keys(mesures).length === 0) {
        var status = document.getElementById('mesures-status');
        if (status) {
          status.textContent = 'Renseigne au moins une mesure';
          status.style.color = '#c0714a';
          status.style.display = 'block';
          setTimeout(function() { status.style.display = 'none'; status.style.color = '#6E877D'; }, 2500);
        }
        return;
      }

      localStorage.setItem('boussole_mesures_' + dateKey, JSON.stringify(mesures));
      var status = document.getElementById('mesures-status');
      if (status) {
        status.textContent = 'Mesures enregistrées ✓';
        status.style.display = 'block';
        setTimeout(function() { status.style.display = 'none'; }, 2500);
      }
    });
  }

  // Chargement mesures pour la date courante
  window.loadMesures = function(dateKey) {
    var data = localStorage.getItem('boussole_mesures_' + dateKey);
    if (!data) return;
    try {
      var mesures = JSON.parse(data);
      if (mesures.fc) document.getElementById('input-fc').value = mesures.fc;
      if (mesures.rmssd) document.getElementById('input-rmssd').value = mesures.rmssd;
      if (mesures.ta_sys) document.getElementById('input-ta-sys').value = mesures.ta_sys;
      if (mesures.ta_dia) document.getElementById('input-ta-dia').value = mesures.ta_dia;
      if (mesures.poids) document.getElementById('input-poids').value = mesures.poids;
      // Restaurer la phase cycle
      var chips = document.querySelectorAll('#cycle-chips .chip');
      chips.forEach(function(c) { c.classList.remove('active'); });
      if (mesures.cycle_phase) {
        var target = document.querySelector('#cycle-chips .chip[data-phase="' + mesures.cycle_phase + '"]');
        if (target) target.classList.add('active');
      }
    } catch(e) { /* silent */ }
  };

  // Migration RMSSD existantes (une seule fois)
  function migrateLegacyRMSSD() {
    if (localStorage.getItem('boussole_mesures_migrated')) return;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key) continue;
      try {
        var entry = JSON.parse(localStorage.getItem(key));
        if (entry && entry.rmssd && !isNaN(entry.rmssd)) {
          var dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            var mesuresKey = 'boussole_mesures_' + dateMatch[1];
            if (!localStorage.getItem(mesuresKey)) {
              localStorage.setItem(mesuresKey, JSON.stringify({
                rmssd: parseInt(entry.rmssd),
                timestamp: new Date().toISOString()
              }));
            }
          }
        }
      } catch(e) { /* skip non-JSON */ }
    }
    localStorage.setItem('boussole_mesures_migrated', 'true');
  }

  migrateLegacyRMSSD();
})();
