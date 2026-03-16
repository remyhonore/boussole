/**
 * Boussole+ v1.0 - Application principale
 */

// État de l'application
const app = {
  currentPanel: 'home',
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
  initRappels();

  // Onboarding : premier lancement
  if (!localStorage.getItem('boussole_onboarded')) {
    switchPanel('onboarding');
  } else {
    switchPanel('home');
  }

  document.getElementById('btn-onboarding-start')?.addEventListener('click', () => {
    localStorage.setItem('boussole_onboarded', '1');
    switchPanel('today');
  });

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
      const humeurRange = document.getElementById('humeur-range');
      const humeurDisplay = document.getElementById('humeur-smiley-display');
      if (humeurRange && humeurDisplay) {
        humeurDisplay.textContent = getHumeurSmiley(parseInt(humeurRange.value));
      }
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
 * Retourne le smiley d'humeur selon la valeur (ADR-2026-026).
 * @param {number} val — 0 à 10
 * @returns {string}
 */
function getHumeurSmiley(val) {
  if (val <= 2) return '😫';
  if (val <= 4) return '😟';
  if (val <= 6) return '😐';
  if (val <= 8) return '🙂';
  return '😊';
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
  
  // Curseur humeur (ADR-2026-026)
  const humeurRangeInput = document.getElementById('humeur-range');
  if (humeurRangeInput) {
    humeurRangeInput.addEventListener('input', function() {
      this.dataset.touched = 'true';
      const el = document.getElementById('humeur-smiley-display');
      if (el) el.textContent = getHumeurSmiley(parseInt(this.value));
    });
  }

  // Boutons
  document.getElementById('btn-save')?.addEventListener('click', saveCurrentEntry);
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

  // Humeur (ADR-2026-026)
  const humeurRange = document.getElementById('humeur-range');
  const humeurSaisi = entry && entry.humeur !== null && entry.humeur !== undefined;

  if (humeurRange) {
    if (humeurSaisi) {
      humeurRange.value = entry.humeur;
      humeurRange.dataset.touched = 'true';
    } else {
      humeurRange.value = 5; // position visuelle neutre seulement
      humeurRange.dataset.touched = 'false';
    }
  }

  // Smiley dans le formulaire de saisie : toujours afficher selon position curseur
  const humeurDisplay = document.getElementById('humeur-smiley-display');
  if (humeurDisplay) humeurDisplay.textContent = getHumeurSmiley(humeurSaisi ? entry.humeur : 5);

  // Smiley accueil : pulse si non saisi, fixe si saisi
  const homeHumeurEl = document.getElementById('home-humeur-smiley');
  if (homeHumeurEl) {
    if (humeurSaisi) {
      homeHumeurEl.style.animation = 'none';
      homeHumeurEl.textContent = getHumeurSmiley(entry.humeur);
      homeHumeurEl.style.cursor = 'default';
    } else {
      homeHumeurEl.style.animation = 'pulse-invite 2s ease-in-out infinite';
      homeHumeurEl.textContent = '😐';
      homeHumeurEl.style.cursor = 'pointer';
    }
  }

  // Charger les mesures objectives (ADR-2026-021)
  if (typeof window.loadMesures === 'function') window.loadMesures(today);

  updateLastSavedDisplay();
  refreshPacingAlert();
  refreshDegradationAlert();

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

function refreshDegradationAlert() {
  var alertEl = document.getElementById('degradation-alert');
  if (!alertEl) return;

  // Vérifier dismiss (7 jours)
  var dismissedDate = null;
  try { dismissedDate = localStorage.getItem('boussole_alerte_degradation_dismiss'); } catch(e) {}
  if (dismissedDate) {
    var dismissed = new Date(dismissedDate);
    var now = new Date();
    var daysSince = (now - dismissed) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      alertEl.style.display = 'none';
      return;
    }
  }

  // Vérifier 5 jours consécutifs tous < 5
  var data = loadEntries();
  var entriesMap = {};
  data.entries.forEach(function(e) { entriesMap[e.date] = e; });

  var allLow = true;
  for (var i = 0; i < 5; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var dateStr = localDateStr(d);
    var entry = entriesMap[dateStr];
    if (!entry) { allLow = false; break; }
    var sc = calculateDayScore(entry);
    if (sc === null || sc >= 5) { allLow = false; break; }
  }

  if (allLow) {
    alertEl.innerHTML =
      '<button onclick="dismissDegradationAlert()" aria-label="Fermer l\'alerte" style="position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;cursor:pointer;color:#c0392b;line-height:1;">&times;</button>' +
      '<span style="font-size:15px;">⚠️</span> ' +
      'Score bas depuis 5 jours. Si vous avez un suivi médical prévu, c\'est un bon moment d\'en parler à votre professionnel de santé.' +
      '<br><a href="#" onclick="window._ouvrirModePresentation && window._ouvrirModePresentation(); return false;" style="display:inline-block;margin-top:8px;color:#c0392b;font-weight:600;text-decoration:none;">Préparer ma consultation →</a>';
    alertEl.style.display = 'block';
  } else {
    alertEl.style.display = 'none';
  }
}

function dismissDegradationAlert() {
  var today = getTodayDate();
  try { localStorage.setItem('boussole_alerte_degradation_dismiss', today); } catch(e) {}
  var alertEl = document.getElementById('degradation-alert');
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
  
  const today = getTodayDate();

  // Sauvegarder
  const humeurRangeEl = document.getElementById('humeur-range');
  const entry = {
    energie,
    qualite_sommeil: qualiteSommeil,
    douleurs,
    clarte_mentale: clarteMentale,
    note: note || null,
    humeur: (humeurRangeEl && humeurRangeEl.dataset.touched === 'true') ? parseInt(humeurRangeEl.value) : null,
    // DEPRECATED: ancien RMSSD — ADR-2026-021 // rmssd: rmssd
  };

  const success = saveEntry(today, entry);

  if (success) {
    updateLastSavedDisplay();
    // Mettre à jour le smiley accueil (ADR-2026-026)
    const humeurVal = (humeurRangeEl?.dataset.touched === 'true') ? parseInt(humeurRangeEl.value) : null;
    const homeEl = document.getElementById('home-humeur-smiley');
    if (homeEl && humeurVal !== null) {
      homeEl.style.animation = 'none';
      homeEl.textContent = getHumeurSmiley(humeurVal);
      homeEl.style.cursor = 'default';
    }

    showFeedbackPanel(today);
  } else {
    showStatus('Erreur lors de l\'enregistrement', 'warning');
  }
}

function showFeedbackPanel(today) {
  const data = loadEntries();
  const entry = data.entries.find(e => e.date === today);
  const score = entry ? calculateDayScore(entry) : null;
  const totalDays = data.entries.length;

  // Couleur du score
  let scoreColor = '#e24b4a';
  if (score !== null) {
    if (score >= 7) scoreColor = '#2d6a4f';
    else if (score >= 4) scoreColor = '#e88c30';
  }

  const scoreEl = document.getElementById('feedback-score');
  if (scoreEl) {
    scoreEl.textContent = score !== null ? score.toFixed(1) : '—';
    scoreEl.style.color = scoreColor;
  }

  // Position du marqueur sur la barre (0–10 → 0–100%)
  // Barre : rouge 0-4 (40%), orange 4-7 (30%), vert 7-10 (30%)
  const markerEl = document.getElementById('feedback-marker');
  if (markerEl && score !== null) {
    const pct = Math.min(100, Math.max(0, (score / 10) * 100));
    markerEl.style.left = pct + '%';
    markerEl.style.background = scoreColor;
  }

  // Message contextuel
  const msgEl = document.getElementById('feedback-message');
  if (msgEl) {
    let msg = '';
    if (totalDays === 1) {
      msg = 'Jour 1 — reviens demain pour commencer à voir tes tendances.';
    } else if (totalDays < 7) {
      msg = `${totalDays} jours consécutifs. Continue, les tendances se dessinent !`;
    } else {
      msg = `${totalDays} jours de suivi. Tu as maintenant un aperçu solide à partager avec ton médecin.`;
    }
    msgEl.textContent = msg;
  }

  switchPanel('feedback');

  // Redirection automatique vers Résumé après 4 secondes
  setTimeout(() => {
    if (app.currentPanel === 'feedback') {
      switchPanel('summary');
    }
  }, 4000);
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
['energie', 'qualite-sommeil', 'douleurs', 'clarte-mentale'].forEach(id => {
  const slider = document.getElementById(id);
  if (slider) {
    slider.addEventListener('input', () => {
      slider.dataset.touched = 'true';
    });
  }
});


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
  html += `<h2 class="summary-section">TENDANCES</h2>`;
  
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

  html += `<p style="font-size:12px;color:#6b7280;font-style:italic;margin-top:8px;padding:0 4px;">
  Les valeurs affichées sont des moyennes calculées sur les 30 derniers jours enregistrés.
</p>`;

  html += `</div>`;

  // 2. Résumé 30 jours
  html += `<div class="card">`;
  html += `<h2 class="summary-section">RÉSUMÉ 30 JOURS</h2>`;
  html += `<p>Jours renseignés : <strong>${summary.joursRenseignes}/${summary.totalJours}</strong>`;
  if (summary.lastDate) {
    html += ` · Dernière saisie : <strong>${formatDateFr(summary.lastDate)}</strong>`;
  }
  html += `</p>`;
  if (typeof getDayType === 'function') {
    const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const today14 = new Date();
    let calCells = '';
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today14);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = data.entries.find(e => e.date === dateStr);
      const dt = entry ? getDayType(entry) : null;
      const dotClass = dt ? 'cal-dot cal-dot-' + dt.type : 'cal-dot cal-dot-vide';
      calCells += `<div class="cal-cell">
        <span class="cal-day-label">${DAY_LABELS[d.getDay()]}</span>
        <div class="${dotClass}"></div>
        <span class="cal-day-num">${d.getDate()}</span>
      </div>`;
    }
    html += `<p style="font-size:11px;color:#6b7280;margin:8px 0 4px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">14 derniers jours</p>`;
    html += `<div class="cal-grid">${calCells}</div>`;
  }
  if (summary.joursRenseignes < 5) {
    html += `<div class="status status-warning" style="margin-top: 10px;">Données insuffisantes — renseigne au moins 5 jours pour des tendances fiables.</div>`;
  }
  html += `</div>`;

  // 2b. Type de journées
  const dist = (typeof getDayTypeDistribution === 'function') ? getDayTypeDistribution(data.entries, 30) : null;
  if (dist && dist.total > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">TYPE DE JOURNÉES</h2>`;
    html += `<ul class="summary-list">`;
    html += `<li>🟢 Hauts (score >= 7) : <strong>${dist.vert} jour${dist.vert > 1 ? 's' : ''}</strong></li>`;
    html += `<li>🟠 Moyens (score 4-6) : <strong>${dist.orange} jour${dist.orange > 1 ? 's' : ''}</strong></li>`;
    html += `<li>🔴 Bas (score < 4) : <strong>${dist.rouge} jour${dist.rouge > 1 ? 's' : ''}</strong></li>`;
    html += `</ul>`;
    html += `</div>`;
  }

  // 2c. Stabilité 30j
  const stability = computeStabilityScore();
  if (stability !== null) {
    const trendIcon = stability.trend === 'amelioration' ? '🟢' : stability.trend === 'stable' ? '🟡' : '🔴';
    const pct = Math.round(Math.abs(1 - stability.stdDevSecond / (stability.stdDevFirst || 1)) * 100);
    let trendPhrase;
    if (stability.trend === 'amelioration') {
      trendPhrase = `Ta variabilité a diminué de ${pct}% sur les 15 derniers jours.`;
    } else if (stability.trend === 'stable') {
      trendPhrase = `Ta variabilité est stable sur les 15 derniers jours.`;
    } else {
      trendPhrase = `Ta variabilité a augmenté de ${pct}% sur les 15 derniers jours.`;
    }
    html += `<div class="card">`;
    html += `<h2 class="summary-section">STABILITÉ</h2>`;
    html += `<p style="margin:8px 0 4px;font-size:15px;">${trendIcon} ${trendPhrase}</p>`;
    html += `<p style="font-size:12px;color:var(--color-text-muted);">Écart-type 30j : ${stability.stdDev30.toFixed(1)} pts</p>`;
    html += `</div>`;
  }

  // 3. Variations
  if (summary.variations && summary.variations.length > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">VARIATIONS IMPORTANTES</h2>`;
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
  html += `<h2 class="summary-section">POINTS MARQUANTS</h2>`;
  
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
    html += `<h2 class="summary-section">VOS NOTES</h2>`;
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
  html += `<h2 class="summary-section">PRUDENCE</h2>`;
  html += `<p style="color: var(--color-text-muted); font-size: 14px;">`;
  html += `⚠️ Infos générales uniquement.<br>`;
  html += `Pas d'avis médical personnalisé.<br>`;
  html += `Urgence : 15`;
  html += `</p>`;
  html += `</div>`;
  
  container.innerHTML = html;
  refreshPostConsultationIndicator();
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
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

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

/**
 * Score de stabilité — écart-type du score composite sur 30 jours
 * Compare J1-J15 (récent) vs J16-J30 (ancien)
 */
function computeStabilityScore() {
  const data = loadEntries();
  const entries = data.entries || [];

  const sorted = entries.slice().sort((a, b) => a.date < b.date ? -1 : 1);

  const scores = [];
  for (let i = sorted.length - 1; i >= 0 && scores.length < 30; i--) {
    const e = sorted[i];
    const vals = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale]
      .filter(v => v !== null && v !== undefined);
    if (vals.length > 0) {
      scores.unshift(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }

  const count = scores.length;
  if (count < 10) return null;

  function _std(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length);
  }

  const stdDev30 = _std(scores);
  const mid = Math.floor(count / 2);
  const stdDevFirst  = _std(scores.slice(0, mid));        // J16-J30 (plus ancien)
  const stdDevSecond = _std(scores.slice(count - mid));   // J1-J15  (plus récent)

  let trend;
  if (stdDevFirst === 0) {
    trend = 'stable';
  } else if (stdDevSecond < stdDevFirst * 0.85) {
    trend = 'amelioration';
  } else if (stdDevSecond > stdDevFirst * 1.15) {
    trend = 'variable';
  } else {
    trend = 'stable';
  }

  return { stdDev30, stdDevFirst, stdDevSecond, count, trend };
}
window.computeStabilityScore = computeStabilityScore;

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

/**
 * === MODE PRÉSENTATION MÉDECIN ===
 */
window._ouvrirModePresentation = function() {
  const data = loadEntries();

  // 7 derniers jours
  const today = getTodayDate();
  const cutoff = new Date(today + 'T12:00:00');
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recentEntries = data.entries.filter(e => e.date >= cutoffStr);

  // Score global 7j
  const scores7j = recentEntries.map(e => calculateDayScore(e)).filter(s => s !== null);
  const scoreGlobal = scores7j.length > 0 ? scores7j.reduce((a, b) => a + b, 0) / scores7j.length : null;

  function avg(arr) {
    const vals = arr.filter(v => v !== null && v !== undefined);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  const avgEnergie = avg(recentEntries.map(e => e.energie));
  const avgSommeil  = avg(recentEntries.map(e => e.qualite_sommeil));
  const avgConfort  = avg(recentEntries.map(e => e.douleurs));
  const avgClarte   = avg(recentEntries.map(e => e.clarte_mentale));
  const avgHumeur   = avg(recentEntries.map(e => e.humeur).filter(v => v !== undefined));

  // Meilleur / pire jour
  let bestDay = null, worstDay = null;
  recentEntries.forEach(function(e) {
    const sc = calculateDayScore(e);
    if (sc === null) return;
    if (!bestDay || sc > bestDay.score) bestDay = { date: e.date, score: sc };
    if (!worstDay || sc < worstDay.score) worstDay = { date: e.date, score: sc };
  });

  function scoreColor(s) {
    if (s === null) return '#999';
    if (s >= 7) return '#2d9e6e';
    if (s >= 4) return '#e07b2a';
    return '#c0392b';
  }
  function metricColor(s) {
    if (s === null) return '#999';
    if (s >= 7) return '#2d9e6e';
    if (s < 3) return '#c0392b';
    if (s < 5) return '#e07b2a';
    return '#06172D';
  }

  // Identité
  const prenom = localStorage.getItem('boussole_prenom') || '';
  const nom    = localStorage.getItem('boussole_nom')    || '';
  const ddn    = localStorage.getItem('boussole_ddn')    || '';
  const tel    = localStorage.getItem('boussole_tel')    || '';
  let identiteHtml = '';
  if (prenom || nom) {
    const parts = [(prenom + ' ' + nom).trim().toUpperCase()];
    if (ddn) parts.push(formatDateFr(ddn));
    if (tel) parts.push(tel);
    identiteHtml = '<p style="margin:4px 0 0;font-size:13px;color:#fff;text-align:center;">' + parts.join(' · ') + '</p>';
  }

  // Note consultation
  const noteConsultation = localStorage.getItem('boussole_note_consultation') || '';

  // Date en français long
  const monthsFr = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const now = new Date();
  const dateJourLong = now.getDate() + ' ' + monthsFr[now.getMonth()] + ' ' + now.getFullYear();

  function metricRow(label, val) {
    const displayVal = val !== null ? val.toFixed(1) : '—';
    const color = metricColor(val);
    const trend = val === null ? '' : (val >= 7 ? '↑' : val < 5 ? '↓' : '→');
    return '<tr>' +
      '<td style="padding:10px 0;border-bottom:1px solid rgba(110,135,125,.2);font-size:14px;">' + label + '</td>' +
      '<td style="padding:10px 0;border-bottom:1px solid rgba(110,135,125,.2);font-size:14px;font-weight:600;color:' + color + ';text-align:center;">' + displayVal + '</td>' +
      '<td style="padding:10px 0;border-bottom:1px solid rgba(110,135,125,.2);font-size:14px;color:' + color + ';text-align:center;">' + trend + '</td>' +
      '</tr>';
  }

  const scoreDisplay = scoreGlobal !== null ? scoreGlobal.toFixed(1) : '—';
  const scoreCol = scoreColor(scoreGlobal);

  // Point d'attention : métrique la plus basse sur 7j
  const metriques7j = [
    { label: '💪 Énergie',          val: avgEnergie },
    { label: '🌙 Sommeil',          val: avgSommeil  },
    { label: '❤️ Confort physique', val: avgConfort  },
    { label: '🧠 Clarté mentale',   val: avgClarte   }
  ].filter(m => m.val !== null);
  let pointAttentionHtml = '';
  if (metriques7j.length > 0) {
    const lowestMetrique = metriques7j.reduce((min, m) => m.val < min.val ? m : min);
    if (lowestMetrique.val < 7) {
      const attValColor = lowestMetrique.val < 4 ? '#e24b4a' : '#e88c30';
      pointAttentionHtml =
        '<div style="background:#FEF2F2;border-left:3px solid #e24b4a;padding:10px 14px;border-radius:6px;margin:12px 0;">' +
          '<div style="font-size:11px;font-weight:bold;color:#e24b4a;text-transform:uppercase;margin-bottom:4px;">Point d\'attention</div>' +
          '<div style="font-size:18px;font-weight:bold;color:' + attValColor + ';margin-bottom:2px;">' + lowestMetrique.label + ' — ' + lowestMetrique.val.toFixed(1) + '/10</div>' +
          '<div style="font-size:12px;color:#888;font-style:italic;">Métrique la plus faible sur les 7 derniers jours</div>' +
        '</div>';
    }
  }

  let motifHtml = '';
  if (noteConsultation) {
    motifHtml =
      '<p style="font-size:13px;font-weight:700;color:#06172D;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 6px;">Motif de consultation</p>' +
      '<div style="width:100%;height:1px;background:#6E877D;margin-bottom:12px;"></div>' +
      '<div style="border-left:3px solid #6E877D;background:#F2F5F4;padding:12px;font-size:14px;line-height:1.6;color:#06172D;border-radius:0 6px 6px 0;">' +
        noteConsultation.replace(/\n/g, '<br>') +
      '</div>';
  }

  let joursHtml = '';
  if (bestDay || worstDay) {
    joursHtml =
      '<p style="font-size:13px;font-weight:700;color:#06172D;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 6px;">Jours remarquables</p>' +
      '<div style="width:100%;height:1px;background:#6E877D;margin-bottom:12px;"></div>' +
      '<div style="display:flex;gap:12px;">';
    if (bestDay) {
      joursHtml +=
        '<div style="flex:1;background:#F2F5F4;border-radius:12px;padding:14px;text-align:center;">' +
        '<div style="font-size:12px;color:#6E877D;font-weight:600;margin-bottom:4px;">MEILLEUR JOUR</div>' +
        '<div style="font-size:13px;color:#06172D;">' + formatDateFr(bestDay.date) + '</div>' +
        '<div style="font-size:22px;font-weight:700;color:#2d9e6e;margin-top:4px;">' + bestDay.score.toFixed(1) + '</div>' +
        '</div>';
    }
    if (worstDay) {
      joursHtml +=
        '<div style="flex:1;background:#F2F5F4;border-radius:12px;padding:14px;text-align:center;">' +
        '<div style="font-size:12px;color:#6E877D;font-weight:600;margin-bottom:4px;">JOUR LE PLUS BAS</div>' +
        '<div style="font-size:13px;color:#06172D;">' + formatDateFr(worstDay.date) + '</div>' +
        '<div style="font-size:22px;font-weight:700;color:#c0392b;margin-top:4px;">' + worstDay.score.toFixed(1) + '</div>' +
        '</div>';
    }
    joursHtml += '</div>';
  }

  // Texte brut pour partage
  const shareLines = [
    'Mon suivi Boussole — 7 derniers jours',
    '',
    'Score global : ' + scoreDisplay + '/10',
    avgEnergie !== null ? 'Énergie : ' + avgEnergie.toFixed(1) + '/10' : '',
    avgSommeil !== null ? 'Sommeil : ' + avgSommeil.toFixed(1) + '/10' : '',
    avgConfort !== null ? 'Confort physique : ' + avgConfort.toFixed(1) + '/10' : '',
    avgClarte  !== null ? 'Clarté mentale : '  + avgClarte.toFixed(1)  + '/10' : '',
    noteConsultation ? '\nMotif : ' + noteConsultation : '',
    '\nDocument d\'information personnelle · Pas un avis médical'
  ].filter(Boolean);
  window._boussoleShareText = shareLines.join('\n');

  const partagerBtn = navigator.share
    ? '<div style="margin-top:24px;text-align:center;"><button onclick="partagerResume()" style="padding:12px 28px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">Partager ce résumé</button></div>'
    : '';

  // Calendrier 14 jours
  const today14 = new Date();
  today14.setHours(0, 0, 0, 0);
  const entryMap14 = {};
  data.entries.forEach(function(e) { entryMap14[e.date] = e; });
  let calCells14 = '';
  for (let ci = 13; ci >= 0; ci--) {
    const cd = new Date(today14);
    cd.setDate(cd.getDate() - ci);
    const cdStr = localDateStr(cd);
    const cdm = String(cd.getDate()).padStart(2, '0');
    const cmm = String(cd.getMonth() + 1).padStart(2, '0');
    const e14 = entryMap14[cdStr];
    let dotClass = 'cal-dot cal-dot-vide';
    let tooltipScore = '\u2014';
    if (e14) {
      const vals = [e14.energie, e14.qualite_sommeil, e14.douleurs, e14.clarte_mentale]
        .filter(v => v !== null && v !== undefined);
      if (vals.length > 0) {
        const sc = vals.reduce((a, b) => a + b, 0) / vals.length;
        tooltipScore = sc.toFixed(1) + '/10';
        if (sc >= 7) dotClass = 'cal-dot cal-dot-vert';
        else if (sc >= 4) dotClass = 'cal-dot cal-dot-orange';
        else dotClass = 'cal-dot cal-dot-rouge';
      }
    }
    calCells14 +=
      '<div class="cal-cell" title="' + cdm + '/' + cmm + ' \u2014 ' + tooltipScore + '">' +
        '<div class="' + dotClass + '"></div>' +
        '<span class="cal-day-num">' + cdm + '/' + cmm + '</span>' +
      '</div>';
  }
  // Stabilité 30j
  let stabilityHtml = '';
  const stab = computeStabilityScore();
  if (stab !== null) {
    const stabIcon = stab.trend === 'amelioration' ? '🟢' : stab.trend === 'stable' ? '🟡' : '🔴';
    const stabPct = Math.round(Math.abs(1 - stab.stdDevSecond / (stab.stdDevFirst || 1)) * 100);
    let stabPhrase;
    if (stab.trend === 'amelioration') {
      stabPhrase = 'Ta variabilité a diminué de ' + stabPct + '% sur les 15 derniers jours.';
    } else if (stab.trend === 'stable') {
      stabPhrase = 'Ta variabilité est stable sur les 15 derniers jours.';
    } else {
      stabPhrase = 'Ta variabilité a augmenté de ' + stabPct + '% sur les 15 derniers jours.';
    }
    stabilityHtml =
      '<p style="font-size:13px;font-weight:700;color:#06172D;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 6px;">Stabilité</p>' +
      '<div style="width:100%;height:1px;background:#6E877D;margin-bottom:12px;"></div>' +
      '<p style="font-size:15px;margin:0 0 4px;">' + stabIcon + ' ' + stabPhrase + '</p>' +
      '<p style="font-size:12px;color:#6E877D;margin:0 0 16px;">' +
        'Écart-type 30j : ' + stab.stdDev30.toFixed(1) + ' pts' +
      '</p>';
  }

  const cal14Html =
    '<p style="font-size:13px;font-weight:700;color:#06172D;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 6px;">Calendrier 14 jours</p>' +
    '<div style="width:100%;height:1px;background:#6E877D;margin-bottom:12px;"></div>' +
    '<div class="cal-grid">' + calCells14 + '</div>' +
    '<p style="font-size:11px;color:#6E877D;margin:6px 0 16px;">Couleur = score composite (\xe9nergie / sommeil / confort / clart\xe9)</p>';

  const html =
    '<div style="background:#06172D;padding:20px;border-radius:12px;margin-bottom:20px;text-align:center;">' +
      '<p style="margin:0;font-size:18px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;">Préparer ma consultation</p>' +
      '<p style="margin:6px 0 0;font-size:13px;color:#6E877D;">' + dateJourLong + '</p>' +
      identiteHtml +
    '</div>' +
    motifHtml +
    '<p style="font-size:13px;font-weight:700;color:#06172D;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 6px;">Mon état — 7 derniers jours</p>' +
    '<div style="width:100%;height:1px;background:#6E877D;margin-bottom:12px;"></div>' +
    '<div style="text-align:center;margin-bottom:16px;">' +
      '<div style="font-size:48px;font-weight:700;color:' + scoreCol + ';line-height:1;">' + scoreDisplay + '</div>' +
      '<div style="font-size:12px;color:#999;margin-top:4px;">Score global moyen</div>' +
    '</div>' +
    pointAttentionHtml +
    stabilityHtml +
    cal14Html +
    '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr>' +
        '<th style="font-size:12px;color:#999;font-weight:600;text-align:left;padding:0 0 8px;">Métrique</th>' +
        '<th style="font-size:12px;color:#999;font-weight:600;text-align:center;padding:0 0 8px;">Moyenne</th>' +
        '<th style="font-size:12px;color:#999;font-weight:600;text-align:center;padding:0 0 8px;">Tendance</th>' +
      '</tr></thead>' +
      '<tbody>' +
        metricRow('💪 Énergie', avgEnergie) +
        metricRow('🌙 Sommeil', avgSommeil) +
        metricRow('❤️ Confort physique', avgConfort) +
        metricRow('🧠 Clarté mentale', avgClarte) +
      '</tbody>' +
    '</table>' +
    '<div style="text-align:center; margin-top:20px; padding:16px;' +
    'background:#F2F5F4; border-radius:12px;">' +
      '<p style="font-size:12px; color:#6E877D; font-weight:600;' +
      'margin:0 0 8px; text-transform:uppercase; letter-spacing:.04em;">' +
      'Ressenti général 7j</p>' +
      '<div style="font-size:40px;">' +
        (avgHumeur !== null ? getHumeurSmiley(Math.round(avgHumeur)) : '😐') +
      '</div>' +
      (avgHumeur !== null
        ? '<p style="font-size:12px; color:rgba(6,23,45,.5); margin:4px 0 0;">Humeur · bien-être émotionnel</p>'
        : '<p style="font-size:11px; color:#aaa; margin:4px 0 0; font-style:italic;">Données insuffisantes</p>') +
    '</div>' +
    joursHtml +
    partagerBtn +
    '<p style="font-size:11px;color:#aaa;text-align:center;margin-top:24px;">Document d\'information personnelle · Pas un avis médical</p>';

  const overlay = document.getElementById('mode-presentation');
  const content = document.getElementById('mode-presentation-content');
  if (overlay && content) {
    content.innerHTML = html;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
};

window._fermerModePresentation = function() {
  const overlay = document.getElementById('mode-presentation');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
};

window._partagerResume = function() {
  if (navigator.share && window._boussoleShareText) {
    navigator.share({ title: 'Mon suivi Boussole', text: window._boussoleShareText }).catch(function() {});
  }
};

// Event listeners globaux
document.getElementById('modal-close')?.addEventListener('click', closePDFModal);
document.getElementById('btn-download-pdf')?.addEventListener('click', downloadPDFFromModal);
document.getElementById('btn-cancel-pdf')?.addEventListener('click', closePDFModal);

// Changelog modal
const CURRENT_VERSION = '1.9';
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

  // Paramètre profil genre (ADR-2026-025)
  function applyProfilGenre(value) {
    var cycleSection = document.querySelector('.mesures-cycle');
    if (cycleSection) {
      cycleSection.style.display = value === 'femme' ? '' : 'none';
    }
  }

  var genreStored = localStorage.getItem('boussole_profil_genre') || 'non_precise';
  applyProfilGenre(genreStored);
  var genreRadioInit = document.querySelector('input[name="profil-genre"][value="' + genreStored + '"]');
  if (genreRadioInit) genreRadioInit.checked = true;

  document.querySelectorAll('input[name="profil-genre"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      if (this.checked) {
        localStorage.setItem('boussole_profil_genre', this.value);
        applyProfilGenre(this.value);
      }
    });
  });

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

      var sommeilDureeEl = document.getElementById('mesures-sommeil');

      if (fc && fc.value) mesures.fc = parseInt(fc.value);
      if (sommeilDureeEl && sommeilDureeEl.value) mesures.sommeil_duree = parseFloat(sommeilDureeEl.value);
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
      if (mesures.sommeil_duree) document.getElementById('mesures-sommeil').value = mesures.sommeil_duree;
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

/**
 * === RAPPELS PWA ===
 */
function initRappels() {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  if (!isPWA) {
    if (!localStorage.getItem('boussole_install_banner_dismissed')) {
      const banner = document.getElementById('banner-install');
      if (banner) banner.style.display = 'block';
    }
    return;
  }
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    scheduleRappel();
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') scheduleRappel();
    });
  }
}

function scheduleRappel() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delayMs = next.getTime() - now.getTime();
  localStorage.setItem('boussole_rappel_next', next.getTime().toString());
  setTimeout(() => {
    triggerRappel();
    scheduleRappel();
  }, delayMs);
}

function triggerRappel() {
  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification('Boussole \uD83E\uDDED', {
      body: 'Comment tu te sens ce matin ?',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'rappel-quotidien',
      renotify: false
    });
  });
}

// ============================================================
// === POST-CONSULTATION (Feature J) ===
// ============================================================

function refreshPostConsultationIndicator() {
  var indicator = document.getElementById('pc-indicator');
  if (!indicator) return;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  var found = null;
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('boussole_post_consultation_')) {
      var dateStr = key.replace('boussole_post_consultation_', '');
      if (dateStr >= cutoff.toISOString().slice(0, 10)) {
        if (!found || dateStr > found) found = dateStr;
      }
    }
  }
  if (found) {
    var parts = found.split('-');
    var label = parts[2] + '/' + parts[1];
    indicator.textContent = '\u2713 Fiche du ' + label + ' enregistr\u00e9e \u2014 toucher pour modifier';
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
  refreshPostConsultationHistorique();
}

function hasPostConsultation() {
  for (var i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i) && localStorage.key(i).startsWith('boussole_post_consultation_')) return true;
  }
  return false;
}

function loadPostConsultation(dateStr) {
  var raw = localStorage.getItem('boussole_post_consultation_' + dateStr);
  if (!raw) return false;
  try {
    var data = JSON.parse(raw);
    document.getElementById('pc-date-rdv').value = data.date_rdv || dateStr;
    document.getElementById('pc-decisions').value = data.decisions || '';
    document.getElementById('pc-examens').value = data.examens || '';
    document.getElementById('pc-traitement').value = data.traitement_teste || '';
    document.getElementById('pc-date-reeval').value = data.date_reevaluation || '';
    document.getElementById('pc-variable').value = data.variable_suivie || '';
    document.getElementById('pc-signaux-stop').value = data.signaux_stop || '';
    return true;
  } catch (e) {
    return false;
  }
}

function openPostConsultation() {
  var modal = document.getElementById('modal-post-consultation');
  if (!modal) return;
  var today = new Date();
  var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  document.getElementById('pc-date-rdv').value = dateStr;
  document.getElementById('pc-decisions').value = '';
  document.getElementById('pc-examens').value = '';
  document.getElementById('pc-traitement').value = '';
  document.getElementById('pc-date-reeval').value = '';
  document.getElementById('pc-variable').value = '';
  document.getElementById('pc-signaux-stop').value = '';
  document.getElementById('pc-feedback').style.display = 'none';
  loadPostConsultation(dateStr);
  modal.style.display = 'flex';
}

function closePostConsultation() {
  var modal = document.getElementById('modal-post-consultation');
  if (modal) modal.style.display = 'none';
}

function openPostConsultationFromDate(dateStr) {
  var modal = document.getElementById('modal-post-consultation');
  if (!modal) return;
  document.getElementById('pc-date-rdv').value = dateStr;
  document.getElementById('pc-decisions').value = '';
  document.getElementById('pc-examens').value = '';
  document.getElementById('pc-traitement').value = '';
  document.getElementById('pc-date-reeval').value = '';
  document.getElementById('pc-variable').value = '';
  document.getElementById('pc-signaux-stop').value = '';
  document.getElementById('pc-feedback').style.display = 'none';
  loadPostConsultation(dateStr);
  modal.style.display = 'flex';
}

function refreshPostConsultationHistorique() {
  var container = document.getElementById('pc-historique');
  if (!container) return;

  var variableLabels = {
    energie: '\u00c9nergie',
    sommeil: 'Sommeil',
    confort: 'Confort physique',
    clarte: 'Clart\u00e9 mentale',
    fc: 'Fr\u00e9quence cardiaque',
    poids: 'Poids'
  };

  var fiches = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('boussole_post_consultation_')) {
      try {
        var data = JSON.parse(localStorage.getItem(key));
        fiches.push(data);
      } catch (e) { /* skip */ }
    }
  }

  if (fiches.length === 0) {
    container.style.display = 'none';
    return;
  }

  fiches.sort(function(a, b) { return (b.date_rdv || '').localeCompare(a.date_rdv || ''); });

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  var in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  var in7Str = in7.getFullYear() + '-' + String(in7.getMonth() + 1).padStart(2, '0') + '-' + String(in7.getDate()).padStart(2, '0');

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var p = dateStr.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    var p = dateStr.split('-');
    return p[2] + '/' + p[1];
  }

  var html = '<div style="margin-bottom:8px;">';
  html += '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(6,23,45,.45);text-transform:uppercase;margin-bottom:2px;">Mes consultations</div>';
  html += '<div style="font-size:12px;color:rgba(6,23,45,.5);margin-bottom:6px;">' + fiches.length + ' fiche' + (fiches.length > 1 ? 's' : '') + ' enregistr\u00e9e' + (fiches.length > 1 ? 's' : '') + '</div>';
  html += '<button onclick="exportJournalConsultationPDF()" style="background:none;border:1px solid #2d6a4f;color:#2d6a4f;border-radius:8px;padding:4px 14px;font-size:12px;cursor:pointer;margin-bottom:10px;">\u2193 Exporter le journal (PDF)</button>';

  fiches.forEach(function(fiche, idx) {
    var dateRdv = fiche.date_rdv || '';
    var varLabel = fiche.variable_suivie ? (variableLabels[fiche.variable_suivie] || fiche.variable_suivie) : '';
    var headerText = formatDate(dateRdv) + (varLabel ? ' \u2014 ' + varLabel : '');
    var isOpen = idx === 0;
    var cardId = 'pc-card-' + idx;

    html += '<div style="background:#fff;border-left:3px solid #6E877D;border-radius:10px;padding:12px;margin-bottom:8px;">';
    html += '<div class="pc-card-header" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:600;color:#06172D;">';
    html += '<span>' + headerText + '</span>';
    html += '<span id="' + cardId + '-chevron" style="font-size:12px;color:rgba(6,23,45,.45);">' + (isOpen ? '\u25bc' : '\u25b6') + '</span>';
    html += '</div>';
    html += '<div id="' + cardId + '" style="display:' + (isOpen ? 'block' : 'none') + ';margin-top:10px;font-size:13px;color:#333;line-height:1.8;">';

    if (fiche.decisions) html += '<div><strong>D\u00e9cisions\u00a0:</strong> ' + fiche.decisions + '</div>';
    if (fiche.examens) html += '<div><strong>Examens\u00a0:</strong> ' + fiche.examens + '</div>';
    if (fiche.traitement_teste) html += '<div><strong>\u00c0 tester\u00a0:</strong> ' + fiche.traitement_teste + '</div>';
    if (fiche.date_reevaluation) {
      var reevalColor = '#333';
      if (fiche.date_reevaluation < todayStr) {
        reevalColor = '#e74c3c';
      } else if (fiche.date_reevaluation <= in7Str) {
        reevalColor = '#f39c12';
      }
      html += '<div><strong>R\u00e9\u00e9valuation\u00a0:</strong> <span style="color:' + reevalColor + ';">' + formatDateShort(fiche.date_reevaluation) + '</span></div>';
    }
    if (fiche.variable_suivie) html += '<div><strong>Surveiller\u00a0:</strong> ' + (variableLabels[fiche.variable_suivie] || fiche.variable_suivie) + '</div>';
    if (fiche.signaux_stop) html += '<div><strong>Signaux d\u2019arr\u00eat\u00a0:</strong> ' + fiche.signaux_stop + '</div>';

    html += '<div style="margin-top:8px;"><button onclick="openPostConsultationFromDate(\'' + dateRdv + '\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Modifier</button></div>';
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';

  container.innerHTML = html;
  container.style.display = 'block';

  // Wire up chevron toggles
  fiches.forEach(function(fiche, idx) {
    var cardId = 'pc-card-' + idx;
    var header = container.querySelector('#' + cardId).previousElementSibling;
    if (header) {
      header.onclick = function() {
        var body = document.getElementById(cardId);
        var chevron = document.getElementById(cardId + '-chevron');
        if (body.style.display === 'none') {
          body.style.display = 'block';
          if (chevron) chevron.textContent = '\u25bc';
        } else {
          body.style.display = 'none';
          if (chevron) chevron.textContent = '\u25b6';
        }
      };
    }
  });
}

function savePostConsultation() {
  var dateRdv = document.getElementById('pc-date-rdv').value;
  if (!dateRdv) return;
  var data = {
    date_rdv: dateRdv,
    decisions: document.getElementById('pc-decisions').value,
    examens: document.getElementById('pc-examens').value,
    traitement_teste: document.getElementById('pc-traitement').value,
    date_reevaluation: document.getElementById('pc-date-reeval').value,
    variable_suivie: document.getElementById('pc-variable').value,
    signaux_stop: document.getElementById('pc-signaux-stop').value
  };
  localStorage.setItem('boussole_post_consultation_' + dateRdv, JSON.stringify(data));
  var feedback = document.getElementById('pc-feedback');
  if (feedback) {
    feedback.style.display = 'block';
    setTimeout(function() { closePostConsultation(); refreshPostConsultationIndicator(); }, 1200);
  }
}

// ============================================================
// === EXPORT PDF JOURNAL CONSULTATIONS ===
// ============================================================

function exportJournalConsultationPDF() {
  if (typeof window.jspdf === 'undefined') {
    alert('jsPDF non disponible - verifiez votre connexion internet.');
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Palette
  var NAVY       = [6,   23,  45];
  var SAGE       = [74,  122, 90];
  var MUTED      = [107, 114, 128];
  var ANTHRACITE = [26,  26,  26]; // eslint-disable-line no-unused-vars
  var RED        = [231, 76,  60];
  var ORANGE     = [243, 156, 18];
  var SEP_COLOR  = [232, 229, 224];

  var pageW    = 210;
  var marginL  = 15;
  var marginR  = 15;
  var contentW = pageW - marginL - marginR;
  var PAGE_MAX_Y = 270;
  var y = 0;

  function drawSep(yPos) {
    doc.setDrawColor(SEP_COLOR[0], SEP_COLOR[1], SEP_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(marginL, yPos, marginL + contentW, yPos);
  }

  function checkPage(neededH) {
    if (y + neededH > PAGE_MAX_Y) {
      doc.addPage();
      y = 15;
    }
  }

  function drawFooters() {
    var total = doc.internal.getNumberOfPages();
    for (var p = 1; p <= total; p++) {
      doc.setPage(p);
      var fy = 283;
      drawSep(fy - 3);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(
        "Document d'information personnelle \xB7 Donn\xe9es auto-\xe9valu\xe9es \xB7 Pas un avis m\xe9dical",
        marginL, fy + 2
      );
      doc.setFontSize(8);
      doc.text('myboussole.fr', marginL + contentW, fy + 2, { align: 'right' });
    }
  }

  function _encLatin(str) {
    return (str || '')
      .replace(/[\xe9\xe8\xea\xeb]/g, 'e').replace(/[\xc9\xc8\xca\xcb]/g, 'E')
      .replace(/[\xe0\xe2\xe4]/g,     'a').replace(/[\xc0\xc2\xc4]/g,     'A')
      .replace(/[\xf4\xf6]/g,         'o').replace(/[\xd4\xd6]/g,         'O')
      .replace(/[\xee\xef]/g,         'i').replace(/[\xce\xcf]/g,         'I')
      .replace(/[\xfb\xfc]/g,         'u').replace(/[\xdb\xdc]/g,         'U')
      .replace(/[\xe7]/g,             'c').replace(/[\xc7]/g,             'C');
  }

  function formatDateFR(dateStr) {
    if (!dateStr) return '';
    var p = dateStr.split('-');
    if (p.length !== 3) return dateStr;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  var variableLabels = {
    energie: 'Energie',
    sommeil: 'Sommeil',
    confort: 'Confort physique',
    clarte: 'Clarte mentale',
    fc: 'Frequence cardiaque',
    poids: 'Poids'
  };

  // Fiches
  var fiches = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('boussole_post_consultation_')) {
      try {
        var fiche = JSON.parse(localStorage.getItem(key));
        fiches.push(fiche);
      } catch (e) { /* skip */ }
    }
  }
  if (fiches.length === 0) {
    alert('Aucune fiche de consultation enregistree.');
    return;
  }
  fiches.sort(function(a, b) { return (b.date_rdv || '').localeCompare(a.date_rdv || ''); });

  // Today / in7 for reevaluation color
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  var in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  var in7Str = in7.getFullYear() + '-' + String(in7.getMonth() + 1).padStart(2, '0') + '-' + String(in7.getDate()).padStart(2, '0');

  // Identity
  var prenom = (localStorage.getItem('boussole_prenom') || '').trim();
  var nom    = (localStorage.getItem('boussole_nom')    || '').trim().toUpperCase();
  var nomComplet = _encLatin([prenom, nom].filter(Boolean).join(' ') || 'Utilisateur');
  var exportDate = formatDateFR(todayStr);

  // ============================================================
  // PAGE DE GARDE
  // ============================================================
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('JOURNAL DE SUIVI - CONSULTATIONS', pageW / 2, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(210, 210, 210);
  doc.text(nomComplet + '  \xB7  Export du ' + exportDate, pageW / 2, 19, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  doc.text('myboussole.fr \xB7 donn\xe9es auto-\xe9valu\xe9es', pageW / 2, 25, { align: 'center' });

  y = 36;

  // ============================================================
  // FICHES
  // ============================================================
  fiches.forEach(function(f) {
    checkPage(50);

    // Separateur sage + titre
    doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, marginL + contentW, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text('RDV DU ' + formatDateFR(f.date_rdv || ''), marginL, y);
    y += 6;

    function drawField(labelTxt, value) {
      if (!value || !value.trim()) return;
      checkPage(15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(labelTxt, marginL, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      var lines = doc.splitTextToSize(value, contentW);
      lines.forEach(function(l) {
        checkPage(5);
        doc.text(l, marginL, y);
        y += 4.5;
      });
      y += 2;
    }

    if (f.decisions)       drawField('DECISIONS',          f.decisions);
    if (f.examens)         drawField('EXAMENS PRESCRITS',  f.examens);
    if (f.traitement_teste) drawField('A TESTER',          f.traitement_teste);

    if (f.date_reevaluation) {
      checkPage(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text('REEVALUATION', marginL, y);
      y += 3.5;
      var reevalColor = f.date_reevaluation < todayStr ? RED
                      : f.date_reevaluation <= in7Str  ? ORANGE
                      : NAVY;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(reevalColor[0], reevalColor[1], reevalColor[2]);
      doc.text(formatDateFR(f.date_reevaluation), marginL, y);
      y += 6;
    }

    if (f.variable_suivie) {
      checkPage(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text('VARIABLE SURVEILLEE', marginL, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      var varLabel = variableLabels[f.variable_suivie] || _encLatin(f.variable_suivie);
      doc.text(varLabel, marginL, y);
      y += 6;
    }

    if (f.signaux_stop) drawField("SIGNAUX D'ARRET", f.signaux_stop);

    // Separateur fin gris
    y += 2;
    doc.setDrawColor(SEP_COLOR[0], SEP_COLOR[1], SEP_COLOR[2]);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginL + contentW, y);
    y += 5;
  });

  drawFooters();

  // Telechargement
  var filename = 'boussole-journal-consultations-' + todayStr + '.pdf';
  var blob = doc.output('blob');
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
