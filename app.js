/**
 * Boussole+ v1.0 - Application principale
 */

// État de l'application
const app = {
  currentPanel: 'today',
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
  initTodayPanel();
  initSummaryPanel();
  loadTodayData();
  initRappels();
  document.getElementById('btn-mark-event')?.addEventListener('click', openEventModal);

  // Onboarding : premier lancement — welcome banner conditionnel dans panel-today
  if (!localStorage.getItem('boussole_onboarded')) {
    const banner = document.getElementById('welcome-banner');
    if (banner) banner.style.display = 'block';
  }
  switchPanel('today');

  // Feature D — listeners modale profil
  document.getElementById('btn-changer-profil')?.addEventListener('click', ouvrirModaleProfil);
  document.getElementById('btn-confirmer-profil')?.addEventListener('click', confirmerProfil);
  document.getElementById('btn-passer-profil')?.addEventListener('click', fermerModaleProfil);

  // Feature D — Modale profil si onboardé mais pas encore de profil défini
  if (localStorage.getItem('boussole_onboarded') && !localStorage.getItem('boussole_profil')) {
    setTimeout(() => ouvrirModaleProfil(), 900);
  }
  // Feature D — Afficher profil actif dans Paramètres
  renderProfilActifDisplay();

  // Feature T-Med — Init module Traitements
  if (typeof window.Traitements !== 'undefined') window.Traitements.init();

  document.getElementById('btn-onboarding-start')?.addEventListener('click', () => {
    localStorage.setItem('boussole_onboarded', '1');
    switchPanel('today');
    // Feature D — enchaîner modale profil si pas encore défini
    if (!localStorage.getItem('boussole_profil')) {
      setTimeout(() => ouvrirModaleProfil(), 600);
    }
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
  // Réinitialiser _saisieDate si on quitte today
  if (app.currentPanel === 'today' && panelId !== 'today') {
    window._saisieDate = localDateStr(new Date());
    const btnSave = document.getElementById('btn-save');
    if (btnSave) btnSave.textContent = 'Enregistrer';
  }

  // Désactiver tous les boutons et panels
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
    btn.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));

  // Activer le panel sélectionné
  const navBtn = document.querySelector(`[data-panel="${panelId}"]`);
  const panel = document.getElementById(`panel-${panelId}`);

  if (navBtn) {
    navBtn.classList.add('active');
    navBtn.setAttribute('aria-current', 'page');
    navBtn.setAttribute('aria-selected', 'true');
  }
  if (panel) panel.classList.add('active');

  app.currentPanel = panelId;

  // Rafraîchir selon le panel
  if (panelId === 'resume') {
    refreshSummary();
  }

  if (panelId === 'tbsante') {
    renderAccordeons();
    renderJournalNotes();
  }

  if (panelId === 'settings') {
    if (typeof window.Traitements !== 'undefined' && typeof window.Traitements.renderResumeParametres === 'function') {
      window.Traitements.renderResumeParametres();
    }
  }

  // Repositionner les smileys quand le panel today devient visible (offsetWidth valide)
  if (panelId === 'today') {
    loadTodayData();
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
      initRetroDateSelect();
    });
  }
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
        slider.setAttribute('aria-valuenow', slider.value);
        updateSmiley(id, parseInt(slider.value));
      });
    }
  });
  
  // Note
  const noteTextarea = document.getElementById('note');
  const noteCount = document.getElementById('note-count');
  
  if (noteTextarea && noteCount) {
    noteTextarea.addEventListener('input', () => {
      noteCount.textContent = `${noteTextarea.value.length}/1000`;
    });
  }
  
  // Curseur humeur (ADR-2026-026)
  const humeurRangeInput = document.getElementById('humeur-range');
  if (humeurRangeInput) {
    humeurRangeInput.addEventListener('input', function() {
      this.dataset.touched = 'true';
      this.setAttribute('aria-valuenow', this.value);
      const el = document.getElementById('humeur-smiley-display');
      if (el) el.textContent = getHumeurSmiley(parseInt(this.value));
    });
  }

  // Boutons
  document.getElementById('btn-save')?.addEventListener('click', saveCurrentEntry);
  document.getElementById('btn-quick')?.addEventListener('click', fillLastValues);
  document.getElementById('btn-event-save')?.addEventListener('click', saveEvent);
  document.getElementById('btn-event-cancel')?.addEventListener('click', () => { window._editEventKey = null; document.getElementById('modal-event').style.display = 'none'; });
  document.getElementById('event-desc')?.addEventListener('input', function() { document.getElementById('event-desc-count').textContent = this.value.length + '/300'; });
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
      document.getElementById('note-count').textContent = `${entry.note.length}/1000`;
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

/**
 * === SAISIE RÉTROACTIVE (Feature S) ===
 */
function initRetroDateSelect() {
  const select = document.getElementById('retro-date-select');
  if (!select) return;

  if (!window._saisieDate) window._saisieDate = localDateStr(new Date());

  const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

  select.innerHTML = '';
  for (let i = 0; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    let label;
    if (i === 0) label = `Aujourd'hui (${d.getDate()} ${MOIS_FR[d.getMonth()]})`;
    else if (i === 1) label = `Hier (${d.getDate()} ${MOIS_FR[d.getMonth()]})`;
    else label = `${JOURS_FR[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
    const opt = document.createElement('option');
    opt.value = dateStr;
    opt.textContent = label;
    if (dateStr === window._saisieDate) opt.selected = true;
    select.appendChild(opt);
  }
}

function changerDateSaisie(dateStr) {
  window._saisieDate = dateStr;
  const today = localDateStr(new Date());
  const entry = getEntry(dateStr);

  const sliders = [
    { id: 'energie', key: 'energie' },
    { id: 'qualite-sommeil', key: 'qualite_sommeil' },
    { id: 'douleurs', key: 'douleurs' },
    { id: 'clarte-mentale', key: 'clarte_mentale' }
  ];
  sliders.forEach(({ id, key }) => {
    const slider = document.getElementById(id);
    const valueEl = document.getElementById(id + '-value');
    if (!slider) return;
    const hasVal = entry && entry[key] !== null && entry[key] !== undefined;
    const val = hasVal ? entry[key] : 0;
    slider.value = val;
    if (valueEl) valueEl.textContent = hasVal ? val : '—';
    updateSmiley(id, val);
  });

  const humeurRange = document.getElementById('humeur-range');
  const humeurDisplay = document.getElementById('humeur-smiley-display');
  if (humeurRange) {
    const humeurSaisi = entry && entry.humeur !== null && entry.humeur !== undefined;
    humeurRange.value = humeurSaisi ? entry.humeur : 5;
    humeurRange.dataset.touched = humeurSaisi ? 'true' : 'false';
    if (humeurDisplay) humeurDisplay.textContent = getHumeurSmiley(parseInt(humeurRange.value));
  }

  const noteEl = document.getElementById('note');
  const noteCount = document.getElementById('note-count');
  if (noteEl) {
    noteEl.value = (entry && entry.note) ? entry.note : '';
    if (noteCount) noteCount.textContent = `${noteEl.value.length}/1000`;
  }

  const btnSave = document.getElementById('btn-save');
  if (btnSave) {
    if (dateStr !== today) {
      const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      const d = new Date(dateStr + 'T12:00:00');
      btnSave.textContent = `Enregistrer pour le ${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
    } else {
      btnSave.textContent = 'Enregistrer';
    }
  }

  requestAnimationFrame(() => {
    sliders.forEach(({ id }) => {
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
      ' Tu accumules de l\'énergie depuis 3 jours. Reste attentif(ve) à ne pas dépasser ton enveloppe énergétique.' +
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
      'Score bas depuis 5 jours. Si tu as un suivi médical prévu, c\'est un bon moment d\'en parler à ton professionnel de santé.' +
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
  
  const today = window._saisieDate || getTodayDate();

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
    // Masquer le welcome banner et marquer l'onboarding comme terminé
    const banner = document.getElementById('welcome-banner');
    if (banner) banner.style.display = 'none';
    if (!localStorage.getItem('boussole_onboarded')) localStorage.setItem('boussole_onboarded', '1');
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
      switchPanel('resume');
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
  // boutons d'action déplacés dans panel-tbsante
}

/**
 * === JOURNAL DE BORD (TB Santé) ===
 */
function renderAccordeons() {
  renderEventsSummary();
  renderEssaisList();
  refreshPostConsultationHistorique();
  _renderHistoriqueTab(document.getElementById('historique-content'));
  if (typeof window.Traitements !== 'undefined') window.Traitements.renderListe();
}

function _renderHistoriqueTab(content) {
  var MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var variableLabels = { energie: 'Énergie', sommeil: 'Sommeil', confort: 'Confort physique', clarte: 'Clarté mentale', fc: 'Fréquence cardiaque', poids: 'Poids' };
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('boussole_post_consultation_')) keys.push(k);
  }
  keys.sort().reverse();

  if (keys.length === 0) {
    content.innerHTML = '<p style="color:rgba(6,23,45,.42);font-size:14px;font-style:italic;margin:4px 0;">Aucune consultation enregistrée.</p>';
    return;
  }

  var html = '';
  keys.forEach(function(k) {
    var dateStr = k.replace('boussole_post_consultation_', '');
    var fiche = null;
    try { fiche = JSON.parse(localStorage.getItem(k)); } catch(e) {}
    var parts = dateStr.split('-');
    var dateLabel = '';
    if (parts.length === 3) {
      var d = parseInt(parts[2], 10);
      var m = parseInt(parts[1], 10) - 1;
      var y = parseInt(parts[0], 10);
      dateLabel = d + ' ' + MOIS_FR[m] + ' ' + y;
    } else {
      dateLabel = dateStr;
    }
    var motif = '';
    if (fiche && fiche.variable_suivie) {
      motif = variableLabels[fiche.variable_suivie] || fiche.variable_suivie;
    } else if (fiche && fiche.decisions) {
      motif = fiche.decisions.substring(0, 50) + (fiche.decisions.length > 50 ? '\u2026' : '');
    }
    var isEmpty = !fiche || (!fiche.decisions && !fiche.examens && !fiche.traitement_teste && !fiche.variable_suivie);
    var textColor = isEmpty ? '#9ca3af' : '#06172D';
    html += '<div style="padding:8px 0;border-bottom:1px solid rgba(6,23,45,.06);font-size:14px;color:' + textColor + ';">';
    html += '&#x1F4CB; ' + dateLabel;
    if (motif) html += ' \u2014 ' + motif;
    html += '</div>';
  });
  content.innerHTML = html;
}

function refreshSummary() {
  const data = loadEntries();
  const summary = calculateSummary(data.entries, 30);

  const container = document.getElementById('summary-content');
  if (!container) return;

  // === Calcul métriques 7j (partagé avec mode médecin) ===
  const rawEntries7j = (data.entries || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const today7j = getTodayDate();
  const cutoff7j = new Date(today7j + 'T12:00:00');
  cutoff7j.setDate(cutoff7j.getDate() - 6);
  const cutoff7jStr = cutoff7j.toISOString().split('T')[0];
  const recent7j = rawEntries7j.filter(e => e.date >= cutoff7jStr);

  const dataEnergie7j = recent7j.map(e => e.energie);
  const dataSommeil7j = recent7j.map(e => e.qualite_sommeil);
  const dataConfort7j = recent7j.map(e => e.douleurs);
  const dataClarte7j  = recent7j.map(e => e.clarte_mentale);

  const _metriques7jBase = [
    { key: 'energie',   label: 'Énergie',          emoji: '💪', moy: _avgVals(dataEnergie7j), vals: dataEnergie7j },
    { key: 'sommeil',   label: 'Sommeil',          emoji: '🌙', moy: _avgVals(dataSommeil7j), vals: dataSommeil7j },
    { key: 'douleur',   label: 'Confort physique', emoji: '❤️', moy: _avgVals(dataConfort7j), vals: dataConfort7j },
    { key: 'cognition', label: 'Clarté mentale',   emoji: '🧠', moy: _avgVals(dataClarte7j),  vals: dataClarte7j  }
  ].map(m => Object.assign({}, m, {
    tendance: _tendance7j(m.vals),
    joursBas: _joursBasCount(m.vals),
    nbJours:  m.vals.filter(x => x !== null && x !== undefined).length
  }));

  // Feature D — Réordonner selon profil actif (métriques prioritaires en premier)
  const _profilD = window.getProfilActif ? window.getProfilActif() : null;
  const metriques7j = _profilD
    ? [..._metriques7jBase].sort((a, b) => {
        const pa = _profilD.metriques_prioritaires.indexOf(a.key);
        const pb = _profilD.metriques_prioritaires.indexOf(b.key);
        const ra = pa === -1 ? 99 : pa;
        const rb = pb === -1 ? 99 : pb;
        return ra - rb;
      })
    : _metriques7jBase;

  const mSorted7j = metriques7j.filter(m => m.moy !== null).slice().sort((a, b) => a.moy - b.moy);
  const pointAttention7j = mSorted7j.length > 0 && mSorted7j[0].moy < 7 ? mSorted7j[0] : null;

  const noteConsultation7j = localStorage.getItem('boussole_note_consultation') || '';
  const noteLC7j = noteConsultation7j.toLowerCase();

  // Feature D — Profil actif
  const profilActif = window.getProfilActif ? window.getProfilActif() : null;

  let html = '';

  // Feature D — Tip profil en tête du résumé
  if (profilActif) {
    html += `<div style="border-radius:12px;padding:12px 14px;margin-bottom:12px;background:rgba(45,106,79,.07);border:1.5px solid rgba(45,106,79,.2);display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:20px;line-height:1.2;">${profilActif.emoji}</span>
      <div>
        <p style="margin:0;font-size:11px;font-weight:700;color:#2d6a4f;text-transform:uppercase;letter-spacing:.08em;">${profilActif.label}</p>
        <p style="margin:4px 0 0;font-size:13px;color:rgba(6,23,45,.72);line-height:1.4;">${profilActif.tip}</p>
      </div>
    </div>`;
  }

  // 1. Synthèse fonctionnelle 7j
  html += buildSyntheseFonctionnelle7j(metriques7j, pointAttention7j);

  // 2. Graphique évolution 30j
  html += '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">' +
    '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#06172D;">Évolution 30 jours</p>' +
    '<canvas id="resume-chart-30j" height="180"></canvas>' +
  '</div>';

  // 3. Problème principal
  html += buildProblemePrincipal(pointAttention7j, metriques7j, noteLC7j, _avgVals(dataSommeil7j));

  // 3b. Carte Pacing Repos 14j
  html += buildBlocRepos();

  // 3c. Mini-fiches contextuelles (Feature S)
  const fichesPatterns = detectFichesPatterns(recent7j);
  html += buildBlocFiches(fichesPatterns);

  // 5. Score de stabilité 30j
  html += buildBlocStabilite('resume');

  // 5. Calendrier 14j (résumé 30 jours)
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
    html += `<p style="font-size:11px;color:rgba(6,23,45,.55);margin:8px 0 4px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">14 derniers jours</p>`;
    html += `<div class="cal-grid">${calCells}</div>`;
  }
  if (summary.joursRenseignes < 5) {
    html += `<div class="status status-warning" style="margin-top: 10px;">Données insuffisantes — renseigne au moins 5 jours pour des tendances fiables.</div>`;
  }
  html += `</div>`;

  // 6. Type de journées
  const dist = (typeof getDayTypeDistribution === 'function') ? getDayTypeDistribution(data.entries, 30) : null;
  if (dist && dist.total > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">TYPE DE JOURNÉES</h2>`;
    html += '<div style="margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
        '<span style="font-size:12px;color:#06172D;">🟢 Hauts (&gt;= 7)</span>' +
        '<span style="font-size:12px;font-weight:700;color:var(--color-score);">' + dist.vert + ' j.</span>' +
      '</div>' +
      '<div style="background:rgba(6,23,45,.12);border-radius:8px;height:8px;">' +
        '<div style="background:#2d9e6e;border-radius:8px;height:8px;width:' + Math.round(dist.vert / dist.total * 100) + '%;"></div>' +
      '</div>' +
    '</div>';
    html += '<div style="margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
        '<span style="font-size:12px;color:#06172D;">🟠 Moyens (4–6)</span>' +
        '<span style="font-size:12px;font-weight:700;color:#d97706;">' + dist.orange + ' j.</span>' +
      '</div>' +
      '<div style="background:rgba(6,23,45,.12);border-radius:8px;height:8px;">' +
        '<div style="background:#d97706;border-radius:8px;height:8px;width:' + Math.round(dist.orange / dist.total * 100) + '%;"></div>' +
      '</div>' +
    '</div>';
    html += '<div style="margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
        '<span style="font-size:12px;color:#06172D;">🔴 Bas (&lt; 4)</span>' +
        '<span style="font-size:12px;font-weight:700;color:#dc2626;">' + dist.rouge + ' j.</span>' +
      '</div>' +
      '<div style="background:rgba(6,23,45,.12);border-radius:8px;height:8px;">' +
        '<div style="background:#dc2626;border-radius:8px;height:8px;width:' + Math.round(dist.rouge / dist.total * 100) + '%;"></div>' +
      '</div>' +
    '</div>';
    html += `</div>`;
  }

  // Score de récupération (Feature R — ADR-2026-032)
  html += '<div class="card" id="card-score-sna" style="margin-bottom:16px;">' +
    '<div id="jauge-sna"></div>' +
    '</div>';

  // Corrélations mesures biologiques / bien-être
  if (typeof window.renderCorrelationsCard === 'function') {
    const corrHtml = window.renderCorrelationsCard(data.entries);
    if (corrHtml) html += corrHtml;
  }

  // Variations
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
    html += `<li><span role="img" aria-label="positif">✅</span> Meilleur jour : ${formatDateFr(mj.date)} (score ${mj.score.toFixed(1)}/10)</li>`;
  }
  
  if (summary.pointsMarquants.jourLePlusBas) {
    hasAnyPoint = true;
    const jb = summary.pointsMarquants.jourLePlusBas;
    html += `<li><span role="img" aria-label="attention">⚠️</span> Jour le plus bas : ${formatDateFr(jb.date)} (score ${jb.score.toFixed(1)}/10)</li>`;
  }
  
  if (summary.pointsMarquants.gap) {
    hasAnyPoint = true;
    const gap = summary.pointsMarquants.gap;
    html += `<li><span role="img" aria-label="en pause">⏸️</span> Jours non renseignés : ${formatDateFr(gap.start)}–${formatDateFr(gap.end)} (${gap.count} jours)</li>`;
  }
  
  html += `</ul>`;
  
  if (!hasAnyPoint) {
    html += `<p style="color: var(--color-text-muted); font-style: italic;">Aucune donnée disponible.</p>`;
  }
  
  html += `</div>`;
  
  // 4. Notes
  if (summary.notes && summary.notes.length > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">TES NOTES</h2>`;
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
      html += '<h3 class="pem-header">ÉPISODES DE CRASH DÉTECTÉS</h3>';
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
      html += '<p class="pem-message">Un crash survient souvent 24 a 48h apres un effort. Montre ces episodes a ton professionnel de sante pour en discuter.</p>';
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

  // Chart.js — graphique 30j dans le résumé
  setTimeout(function() {
    if (window._resumeChart) { window._resumeChart.destroy(); window._resumeChart = null; }
    const canvas = document.getElementById('resume-chart-30j');
    if (!canvas || typeof Chart === 'undefined') return;
    const entryMapChart = {};
    data.entries.forEach(function(e) { entryMapChart[e.date] = e; });
    const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
    const chartLabels = [], cEnergie = [], cSommeil = [], cConfort = [], cClarte = [];
    for (let i = 29; i >= 0; i--) {
      const cd = new Date(todayD);
      cd.setDate(cd.getDate() - i);
      const ds = localDateStr(cd);
      chartLabels.push(String(cd.getDate()) + '/' + String(cd.getMonth() + 1).padStart(2, '0'));
      const e = entryMapChart[ds];
      cEnergie.push(e ? e.energie        : null);
      cSommeil.push(e ? e.qualite_sommeil : null);
      cConfort.push(e ? e.douleurs        : null);
      cClarte.push( e ? e.clarte_mentale  : null);
    }
    window._resumeChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          { label: 'Énergie',          data: cEnergie, borderColor: 'var(--color-score)', backgroundColor: 'rgba(45,158,110,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 },
          { label: 'Sommeil',          data: cSommeil, borderColor: '#e07b2a', backgroundColor: 'rgba(224,123,42,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 },
          { label: 'Confort physique', data: cConfort, borderColor: '#9b59b6', backgroundColor: 'rgba(155,89,182,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 },
          { label: 'Clarté mentale',   data: cClarte,  borderColor: '#2980b9', backgroundColor: 'rgba(41,128,185,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
          y: { min: 0, max: 10, ticks: { stepSize: 2 } }
        }
      }
    });
    if (window.ScoreSNA) window.ScoreSNA.renderJauge('jauge-sna');
    renderSparkRepos();
  }, 300);
}

/**
 * === ÉVÉNEMENTS CLINIQUES (Feature T) ===
 */
function openEventModal(editKey) {
  window._editEventKey = editKey || null;
  const modal = document.getElementById('modal-event');
  modal.style.display = 'flex';
  if (editKey) {
    const e = JSON.parse(localStorage.getItem(editKey) || '{}');
    document.getElementById('event-type').value = e.type || '';
    document.getElementById('event-desc').value = e.description || '';
    document.getElementById('event-desc-count').textContent = (e.description || '').length + '/300';
    modal.querySelector('h3').textContent = '✏️ Modifier l\'événement';
  } else {
    document.getElementById('event-desc').value = '';
    document.getElementById('event-type').value = '';
    document.getElementById('event-desc-count').textContent = '0/300';
    modal.querySelector('h3').textContent = '▶ Événement notable';
  }
}

function saveEvent() {
  const desc = document.getElementById('event-desc').value.trim();
  if (!desc) return;
  const type = document.getElementById('event-type').value;
  const editKey = window._editEventKey || null;
  let key, event;
  if (editKey) {
    const existing = JSON.parse(localStorage.getItem(editKey) || '{}');
    event = Object.assign({}, existing, { type: type, description: desc });
    key = editKey;
  } else {
    const dateStr = window._saisieDate || localDateStr(new Date());
    const ts = Date.now();
    const todayEntry = JSON.parse(localStorage.getItem('boussole_' + dateStr) || '{}');
    event = {
      date: dateStr,
      type: type,
      description: desc,
      score: todayEntry.score ?? null,
      humeur: todayEntry.humeur ?? null,
      medicaments: localStorage.getItem('boussole_medicaments') || '',
      created_at: ts
    };
    key = 'boussole_event_' + dateStr + '_' + ts;
  }
  localStorage.setItem(key, JSON.stringify(event));
  window._editEventKey = null;
  document.getElementById('modal-event').style.display = 'none';
  showStatus(editKey ? 'Événement modifié ✓' : 'Événement enregistré ✓');
  renderEventsSummary();
}

function renderEventsSummary() {
  const container = document.getElementById('events-summary-container');
  if (!container) return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('boussole_event_')).sort().reverse();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = keys.filter(k => {
    const e = JSON.parse(localStorage.getItem(k) || '{}');
    return new Date(e.date) >= cutoff;
  });
  if (recent.length === 0) { container.innerHTML = ''; return; }
  const labels = {
    'reaction-medicament': 'Réaction médicament',
    'symptome-inhabituel': 'Symptôme inhabituel',
    'bonne-journee-exceptionnelle': 'Bonne journée exceptionnelle',
    'mauvaise-journee-exceptionnelle': 'Mauvaise journée exceptionnelle',
    'autre': 'Autre'
  };
  function _formatDateLong(dateStr) {
    const mois = ['janvier','février','mars','avril','mai','juin',
      'juillet','août','septembre','octobre','novembre','décembre'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const j = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const a = parts[0];
    return j + ' ' + mois[m] + ' ' + a;
  }
  const items = recent.map(k => {
    const e = JSON.parse(localStorage.getItem(k));
    const label = labels[e.type] || e.type || '';
    const dateFr = _formatDateLong(e.date);
    const kEsc = k.replace(/'/g, "\\'");
    const borderColor = e.color || '#6E877D';
    return '<div style="border-left:3px solid ' + borderColor + ';border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#fafafa;">' +
      '<div style="font-weight:600;margin-bottom:4px;">' + dateFr + ' · ' + label + '</div>' +
      (e.description ? '<div style="font-size:13px;color:rgba(6,23,45,.55);">' + e.description + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button onclick="openEventModal(\'' + kEsc + '\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Modifier</button>' +
        '<button onclick="deleteEvent(\'' + kEsc + '\')" style="background:transparent;border:1px solid #dc2626;color:#dc2626;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Supprimer</button>' +
      '</div>' +
      '</div>';
  }).join('');
  container.innerHTML = items;
}

function deleteEvent(key) {
  if (!confirm('Supprimer cet événement ?')) return;
  localStorage.removeItem(key);
  renderEventsSummary();
}

window.getRecentEvents = function(daysSince) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (daysSince || 30));
  return Object.keys(localStorage)
    .filter(k => k.startsWith('boussole_event_'))
    .map(k => JSON.parse(localStorage.getItem(k)))
    .filter(e => new Date(e.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * === GÉNÉRATION PDF ===
 */
function showPDFPreview() {
  const data = loadEntries();
  const summary = calculateSummary(data.entries, 30);
  summary.entries = data.entries;

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
    summary.entries = data.entries;

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

/**
 * === PACING REPOS — carte tendance 14j (Feature Pacing-Repos) ===
 * Affiche deux sparklines Chart.js (sommeil nocturne + repos diurne)
 * Condition : au moins 3 jours renseignés sur au moins une des deux séries.
 */
function buildBlocRepos() {
  var days = 14;
  var today = new Date();
  var dataSommeil = [];
  var dataRepos   = [];
  var labels      = [];

  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    var dateStr = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    labels.push(String(d.getDate()) + '/' + String(d.getMonth() + 1).padStart(2, '0'));
    var raw = localStorage.getItem('boussole_mesures_' + dateStr);
    var mesures = raw ? JSON.parse(raw) : {};
    dataSommeil.push(mesures.sommeil_duree  !== undefined ? mesures.sommeil_duree  : null);
    dataRepos.push(  mesures.repos_diurne   !== undefined ? mesures.repos_diurne   : null);
  }

  var sommeilDef = dataSommeil.filter(function(v) { return v !== null; });
  var reposDef   = dataRepos.filter(function(v)   { return v !== null; });

  if (sommeilDef.length < 3 && reposDef.length < 3) return '';

  var avgSommeil = sommeilDef.length > 0
    ? (sommeilDef.reduce(function(a, b) { return a + b; }, 0) / sommeilDef.length).toFixed(1) : null;
  var avgRepos = reposDef.length > 0
    ? (reposDef.reduce(function(a, b)   { return a + b; }, 0) / reposDef.length).toFixed(1)   : null;

  var ts = Date.now();
  var idSommeil = 'spark-sommeil-' + ts;
  var idRepos   = 'spark-repos-'   + (ts + 1);

  // Stocker les data en global pour le rendu post-innerHTML
  window._sparkReposData = { labels: labels, dataSommeil: dataSommeil, dataRepos: dataRepos,
    idSommeil: idSommeil, idRepos: idRepos };

  var html =
    '<div style="background:#fff;border:1.5px solid rgba(6,23,45,.12);border-radius:12px;padding:14px;margin-bottom:12px;">' +
      '<p style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(6,23,45,.55);text-transform:uppercase;margin:0 0 10px;">TEMPS DE REPOS — 14 JOURS</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div>' +
          '<p style="font-size:11px;color:#3B82F6;font-weight:600;margin:0 0 4px;">🌙 Sommeil nocturne</p>' +
          '<canvas id="' + idSommeil + '" height="60" style="width:100%;height:60px;"></canvas>' +
          (avgSommeil !== null
            ? '<p style="font-size:12px;color:rgba(6,23,45,.55);margin:4px 0 0;text-align:center;">Moy. : <strong>' + avgSommeil + 'h</strong></p>'
            : '<p style="font-size:11px;color:rgba(6,23,45,.18);margin:4px 0 0;text-align:center;">Non renseigné</p>') +
        '</div>' +
        '<div>' +
          '<p style="font-size:11px;color:#2d6a4f;font-weight:600;margin:0 0 4px;">🛋 Repos diurne</p>' +
          '<canvas id="' + idRepos + '" height="60" style="width:100%;height:60px;"></canvas>' +
          (avgRepos !== null
            ? '<p style="font-size:12px;color:rgba(6,23,45,.55);margin:4px 0 0;text-align:center;">Moy. : <strong>' + avgRepos + 'h</strong></p>'
            : '<p style="font-size:11px;color:rgba(6,23,45,.18);margin:4px 0 0;text-align:center;">Non renseigné</p>') +
        '</div>' +
      '</div>' +
    '</div>';

  return html;
}

/**
 * Rendu des sparklines Pacing-Repos après injection HTML dans le DOM.
 * Appelé dans le setTimeout de refreshSummary, après le rendu du chart 30j.
 */
function renderSparkRepos() {
  var d = window._sparkReposData;
  if (!d || typeof Chart === 'undefined') return;

  var commonOpts = {
    type: 'bar',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, min: 0, max: 12 }
      }
    }
  };

  var cSommeil = document.getElementById(d.idSommeil);
  if (cSommeil) {
    new Chart(cSommeil, Object.assign({}, commonOpts, {
      data: {
        labels: d.labels,
        datasets: [{ data: d.dataSommeil, backgroundColor: '#3B82F6', borderRadius: 2 }]
      }
    }));
  }

  var cRepos = document.getElementById(d.idRepos);
  if (cRepos) {
    new Chart(cRepos, Object.assign({}, commonOpts, {
      data: {
        labels: d.labels,
        datasets: [{ data: d.dataRepos, backgroundColor: '#2d6a4f', borderRadius: 2 }]
      }
    }));
  }
}

/**
 * Génère le bloc HTML de score de stabilité (partagé Résumé + Montrer au médecin).
 * @param {'resume'|'medecin'} mode
 */
function buildBlocStabilite(mode) {
  const stab = computeStabilityScore();
  if (stab === null) return '';
  const stabIcon = stab.trend === 'amelioration' ? '🟢' : stab.trend === 'stable' ? '🟡' : '🔴';
  const stabPct = Math.round(Math.abs(1 - stab.stdDevSecond / (stab.stdDevFirst || 1)) * 100);
  let stabPhrase;
  if (stab.trend === 'amelioration') {
    stabPhrase = 'Ta stabilité s\'améliore — ' + stabPct + '% moins de fluctuations ces 15 derniers jours.';
  } else if (stab.trend === 'stable') {
    stabPhrase = 'Ta stabilité est stable ces 15 derniers jours.';
  } else {
    stabPhrase = 'Tes scores sont plus irréguliers — ' + stabPct + '% plus de fluctuations ces 15 derniers jours.';
  }
  const ecartType = 'Calculé sur les 30 derniers jours';
  if (mode === 'resume') {
    return '<div class="card">' +
      '<h2 class="summary-section">SCORE DE STABILITÉ — 30 JOURS</h2>' +
      '<p style="margin:8px 0;font-size:15px;">' + stabIcon + ' ' + stabPhrase + '</p>' +
      '<p style="font-size:12px;color:#aaa;margin:4px 0 0;">' + ecartType + '</p>' +
      '</div>';
  }
  // mode === 'medecin'
  const SS = 'border-radius:12px;padding:14px;margin-bottom:12px;';
  const ST = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;';
  return '<div style="' + SS + 'background:#fff;border:1px solid rgba(6,23,45,.12);">' +
    '<p style="' + ST + 'color:#06172D;">Score de stabilité — 30 jours</p>' +
    '<p style="margin:4px 0 2px;font-size:13px;color:#06172D;">' + stabIcon + ' ' + stabPhrase + '</p>' +
    '<p style="font-size:12px;color:#aaa;margin:4px 0 0;">' + ecartType + '</p>' +
    '</div>';
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
  if (app.currentPanel === 'resume') {
    refreshSummary();
  }
  
  showStatus('Dataset de référence chargé ✓ (7 entrées)', 'success');
}

// ============================================================
// === Helpers partagés (mode médecin + résumé) ===
// ============================================================
function _avgVals(arr) {
  const vals = arr.filter(v => v !== null && v !== undefined);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function _tendance7j(vals) {
  const v = vals.filter(x => x !== null && x !== undefined);
  if (v.length < 5) return 'stable';
  const d = v.slice(0, 3), f = v.slice(-3);
  const delta = _avgVals(f) - _avgVals(d);
  if (delta > 0.5)  return 'hausse';
  if (delta < -0.5) return 'baisse';
  return 'stable';
}
function _joursBasCount(vals) {
  return vals.filter(x => x !== null && x !== undefined && x < 5).length;
}
function _impactLabel(moy) {
  if (moy === null) return { txt: '—', color: '#999' };
  if (moy < 4) return { txt: 'Altéré', color: '#dc2626' };
  if (moy < 7) return { txt: 'Modéré', color: '#d97706' };
  return { txt: 'Correct', color: 'var(--color-score)' };
}
function _tendanceHtml(t) {
  if (t === 'hausse') return '<span style="color:var(--color-score);">↑ Hausse</span>';
  if (t === 'baisse') return '<span style="color:#dc2626;">↓ Baisse</span>';
  return '<span style="color:#999;">→ Stable</span>';
}

function buildSyntheseFonctionnelle7j(metriques, pointAttention) {
  const grid = metriques.map(m => {
    const impact = _impactLabel(m.moy);
    const tend   = _tendanceHtml(m.tendance);
    const isProb = !!(pointAttention && m.label === pointAttention.label);
    return (
      '<div style="background:' + (isProb ? '#FEF2F2' : '#F8F9FA') + ';border-radius:12px;padding:10px;text-align:center;border:' +
        (isProb ? '1.5px solid #fca5a5' : '1px solid rgba(6,23,45,.12)') + ';">' +
        '<div style="font-size:18px;">' + m.emoji + '</div>' +
        '<div style="font-size:11px;font-weight:600;color:#06172D;margin:4px 0 2px;">' + m.label + '</div>' +
        '<div style="font-size:22px;font-weight:700;color:' + (m.moy !== null ? impact.color : '#999') + ';line-height:1;">' +
          (m.moy !== null ? m.moy.toFixed(1) : '—') + '</div>' +
        '<div style="font-size:10px;color:rgba(6,23,45,.55);margin-top:2px;">' + tend + '</div>' +
        '<div style="font-size:11px;font-weight:600;color:' + impact.color + ';margin-top:4px;">' + impact.txt + '</div>' +
        '<div style="font-size:10px;color:rgba(6,23,45,.55);margin-top:2px;">' + m.joursBas + '/' + m.nbJours + ' j. bas</div>' +
      '</div>'
    );
  }).join('');
  return (
    '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;border:1.5px solid rgba(6,23,45,.12);">' +
      '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#06172D;">Synthèse fonctionnelle — 7 jours</p>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">' + grid + '</div>' +
      '<p style="font-size:10px;color:rgba(6,23,45,.55);font-style:italic;margin:8px 0 0;text-align:center;">Les valeurs affichées sont des moyennes calculées sur les 7 derniers jours enregistrés.</p>' +
    '</div>'
  );
}

function _detectPlainteSommeil(noteLC, avgSommeil) {
  if (noteLC.indexOf('endormissement') !== -1) return "insomnie d'endormissement";
  if (noteLC.indexOf('réveil') !== -1 || noteLC.indexOf('reveil') !== -1) return 'réveils nocturnes';
  if (avgSommeil !== null && avgSommeil < 5) return 'insomnie de maintien';
  return 'insomnie de maintien';
}

function buildProblemePrincipal(pointAttention, metriques, noteLC, avgSommeil) {
  if (!pointAttention) return '';
  const titreMap = {
    'Énergie':          'Fatigue persistante',
    'Sommeil':          'Sommeil insuffisant',
    'Confort physique': 'Gêne physique persistante',
    'Clarté mentale':   'Brouillard mental persistant'
  };
  const titreBloc = titreMap[pointAttention.label] || (pointAttention.label + ' altéré');
  const autresM = metriques.filter(m => m.label !== pointAttention.label && m.moy !== null);
  const retentParts = autresM.map(m => {
    const q = m.moy >= 7 ? 'correcte' : (m.moy >= 4 ? 'modérément altérée' : 'altérée');
    const lbl = m.label === 'Confort physique' ? 'Confort' : m.label;
    return lbl + ' ' + m.moy.toFixed(1) + '/10 ' + q;
  });
  const attColor = pointAttention.moy < 4 ? '#dc2626' : '#d97706';
  const sommeilLine = (pointAttention.label === 'Sommeil' && noteLC !== undefined)
    ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #fca5a5;font-size:12px;color:#d97706;">Plainte déclarée : ' + _detectPlainteSommeil(noteLC, avgSommeil !== undefined ? avgSommeil : null) + '</div>'
    : '';
  return (
    '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#FEE2E2;border-left:4px solid #dc2626;">' +
      '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#d97706;">PROBLÈME PRINCIPAL</p>' +
      '<div style="font-size:17px;font-weight:700;color:' + attColor + ';margin-bottom:10px;">' + titreBloc + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">' +
        '<div style="text-align:center;">' +
          '<div style="font-size:10px;color:#999;text-transform:uppercase;margin-bottom:4px;">Moyenne 7j</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + attColor + ';line-height:1;">' + pointAttention.moy.toFixed(1) + '</div>' +
          '<div style="font-size:11px;color:#999;">/10</div>' +
        '</div>' +
        '<div style="text-align:center;">' +
          '<div style="font-size:10px;color:#999;text-transform:uppercase;margin-bottom:4px;">Jours bas</div>' +
          '<div style="font-size:26px;font-weight:700;color:' + attColor + ';line-height:1;">' + pointAttention.joursBas + '</div>' +
          '<div style="font-size:11px;color:#999;">/7</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:10px;color:#999;text-transform:uppercase;margin-bottom:4px;">Retentissement</div>' +
          retentParts.map(p => '<div style="font-size:11px;color:#06172D;padding:1px 0;">' + p + '</div>').join('') +
        '</div>' +
      '</div>' +
      sommeilLine +
    '</div>'
  );
}

function buildDetailSommeil(dataSommeil, avgSommeil, noteLC, pointAttention) {
  const trigger = noteLC.indexOf('sommeil') !== -1
    || noteLC.indexOf('quviviq') !== -1
    || noteLC.indexOf('hypnotique') !== -1
    || noteLC.indexOf('insomnie') !== -1
    || (pointAttention !== null && pointAttention !== undefined && pointAttention.label === 'Sommeil');
  if (!trigger) return '';
  const somMoyStr   = avgSommeil !== null ? avgSommeil.toFixed(1) + '/10' : 'n/a';
  const somJoursStr = _joursBasCount(dataSommeil) + '/7';
  let plainteTxt = 'insomnie de maintien';
  if (noteLC.indexOf('endormissement') !== -1)                                 plainteTxt = "insomnie d'endormissement";
  else if (noteLC.indexOf('réveil') !== -1 || noteLC.indexOf('reveil') !== -1) plainteTxt = 'réveils nocturnes';
  else if (avgSommeil !== null && avgSommeil < 5)                              plainteTxt = 'insomnie de maintien';
  return (
    '<div style="border-radius:12px;padding:14px;margin-bottom:12px;background:#EFF6FF;border:1.5px solid #3B82F6;">' +
      '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#3B82F6;">Détail sommeil — données déclaratives</p>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">' +
        '<div style="text-align:center;min-width:70px;">' +
          '<div style="font-size:10px;color:#999;text-transform:uppercase;margin-bottom:4px;">Score moyen</div>' +
          '<div style="font-size:24px;font-weight:700;color:#3B82F6;">' + somMoyStr + '</div>' +
        '</div>' +
        '<div style="text-align:center;min-width:70px;">' +
          '<div style="font-size:10px;color:#999;text-transform:uppercase;margin-bottom:4px;">Jours mauvais</div>' +
          '<div style="font-size:24px;font-weight:700;color:#3B82F6;">' + somJoursStr + '</div>' +
        '</div>' +
        '<div style="flex:1;min-width:120px;">' +
          '<div style="font-size:10px;color:#999;text-transform:uppercase;margin-bottom:4px;">Plainte principale</div>' +
          '<div style="font-size:13px;color:#06172D;font-style:italic;">' + plainteTxt + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/**
 * === MODE PRÉSENTATION MÉDECIN ===
 */
window._ouvrirModePresentation = function() {
  const data = loadEntries();
  const rawEntries = (data.entries || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);

  // 7 derniers jours
  const today = getTodayDate();
  const cutoff = new Date(today + 'T12:00:00');
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recentEntries = rawEntries.filter(e => e.date >= cutoffStr);

  // Helpers calcul (définis au niveau module, aliasés ici pour clarté)
  const avg = _avgVals;
  const tendance7j = _tendance7j;
  const joursBasCount = _joursBasCount;
  const impactLabel = _impactLabel;
  const tendanceHtml = _tendanceHtml;

  // Métriques 7j
  const dataEnergie = recentEntries.map(e => e.energie);
  const dataSommeil = recentEntries.map(e => e.qualite_sommeil);
  const dataConfort = recentEntries.map(e => e.douleurs);
  const dataClarte  = recentEntries.map(e => e.clarte_mentale);
  const dataHumeur  = recentEntries.map(e => e.humeur).filter(v => v !== undefined && v !== null);

  const avgEnergie = avg(dataEnergie);
  const avgSommeil = avg(dataSommeil);
  const avgConfort = avg(dataConfort);
  const avgClarte  = avg(dataClarte);
  const avgHumeur  = avg(dataHumeur);

  const metriques = [
    { label: 'Énergie',          emoji: '💪', moy: avgEnergie, vals: dataEnergie },
    { label: 'Sommeil',          emoji: '🌙', moy: avgSommeil, vals: dataSommeil },
    { label: 'Confort physique', emoji: '❤️', moy: avgConfort, vals: dataConfort },
    { label: 'Clarté mentale',   emoji: '🧠', moy: avgClarte,  vals: dataClarte  }
  ].map(m => Object.assign({}, m, {
    tendance: tendance7j(m.vals),
    joursBas: joursBasCount(m.vals),
    nbJours:  m.vals.filter(x => x !== null && x !== undefined).length
  }));

  const metriquesSorted = metriques.filter(m => m.moy !== null).slice().sort((a, b) => a.moy - b.moy);
  const pointAttention = metriquesSorted.length > 0 && metriquesSorted[0].moy < 7 ? metriquesSorted[0] : null;

  // Identité
  const prenom = localStorage.getItem('boussole_prenom') || '';
  const nom    = localStorage.getItem('boussole_nom')    || '';
  const ddn    = localStorage.getItem('boussole_ddn')    || '';
  const tel    = localStorage.getItem('boussole_tel')    || '';

  // Traitement
  const txMed  = (localStorage.getItem('boussole_medicaments') || '').trim();
  const txComp = (localStorage.getItem('boussole_complements') || '').trim();
  const txAll  = (localStorage.getItem('boussole_allergies')   || '').trim();

  // Note consultation
  const noteConsultation = localStorage.getItem('boussole_note_consultation') || '';
  const noteLC = noteConsultation.toLowerCase();

  // Date en français long
  const monthsFr = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const now = new Date();
  const dateJourLong = now.getDate() + ' ' + monthsFr[now.getMonth()] + ' ' + now.getFullYear();

  const SECTION_STYLE = 'border-radius:12px;padding:14px;margin-bottom:12px;';
  const SECTION_TITLE = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;';

  // ============================================================
  // 1. EN-TÊTE : nom patient + date + motif
  // ============================================================
  const patientName = (prenom + ' ' + nom).trim().toUpperCase();
  const patientParts = [patientName, ddn ? formatDateFr(ddn) : '', tel].filter(Boolean);
  const patientLine = patientParts.join(' · ');

  const enTeteHtml =
    '<div style="background:#06172D;padding:20px;border-radius:12px;margin-bottom:12px;text-align:center;">' +
      '<p style="margin:0;font-size:18px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.08em;">Montrer au médecin</p>' +
      '<p style="margin:6px 0 0;font-size:13px;color:#6E877D;">' + dateJourLong + '</p>' +
      (patientLine ? '<p style="margin:4px 0 0;font-size:13px;color:#fff;">' + patientLine + '</p>' : '') +
    '</div>';

  // ============================================================
  // 2. TRAITEMENT ACTUEL — module Traitements (T-Med) ou fallback textareas
  // ============================================================
  const traitementHtml = (typeof window.Traitements !== 'undefined' && window.Traitements.charger().length > 0)
    ? window.Traitements.blocHTML()
    : (function() {
        const medL  = (txMed  ? txMed.split('\n').map(l=>l.trim()).filter(Boolean) : []);
        const compL = (txComp ? txComp.split('\n').map(l=>l.trim()).filter(Boolean) : []);
        const allerH = (txAll && txAll.toUpperCase() !== 'RAS')
          ? '<div style="margin-top:8px;padding:6px 10px;background:#fff3cd;border-radius:8px;font-size:12px;color:#92400e;font-weight:600;">⚠️ Allergies : ' + txAll + '</div>'
          : '';
        return '<div style="' + SECTION_STYLE + 'background:#f0f7f4;border:1.5px solid #2d6a4f;">' +
          '<p style="' + SECTION_TITLE + 'color:#2d6a4f;">Traitement actuel</p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            '<div><div style="font-size:11px;font-weight:600;color:#2d6a4f;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em;">Médicaments</div>' +
              (medL.length ? medL.map(l=>'<div style="font-size:13px;color:#06172D;padding:2px 0;">• '+l+'</div>').join('') : '<div style="font-size:12px;color:#999;font-style:italic;">Non renseigné</div>') +
            '</div>' +
            '<div><div style="font-size:11px;font-weight:600;color:#2d6a4f;margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em;">Compléments</div>' +
              (compL.length ? compL.map(l=>'<div style="font-size:13px;color:#06172D;padding:2px 0;">• '+l+'</div>').join('') : '<div style="font-size:12px;color:#999;font-style:italic;">Non renseigné</div>') +
            '</div>' +
          '</div>' + allerH + '</div>';
      })();

  // ============================================================
  // 3. PROBLÈME PRINCIPAL
  // ============================================================
  const problemePrincipalHtml = buildProblemePrincipal(pointAttention, metriques);

  // ============================================================
  // 4. SYNTHÈSE FONCTIONNELLE
  // ============================================================
  const syntheseHtml = buildSyntheseFonctionnelle7j(metriques, pointAttention);

  // ============================================================
  // 5. BLOC SOMMEIL (conditionnel)
  // ============================================================
  const sommeilHtml = buildDetailSommeil(dataSommeil, avgSommeil, noteLC, pointAttention);

  // ============================================================
  // 6. DONNÉES OBJECTIVES (conditionnel — si >= 3 mesures)
  // ============================================================
  const mesuresParJour = [];
  recentEntries.forEach(function(e) {
    const raw = localStorage.getItem('boussole_mesures_' + e.date);
    if (!raw) return;
    let m;
    try { m = JSON.parse(raw); } catch(ex) { return; }
    mesuresParJour.push({
      fc:     m.fc     !== undefined ? m.fc     : null,
      ta_sys: m.ta_sys !== undefined ? m.ta_sys : null,
      ta_dia: m.ta_dia !== undefined ? m.ta_dia : null,
      rmssd:  m.rmssd  !== undefined ? m.rmssd  : null,
      poids:  m.poids  !== undefined ? m.poids  : null
    });
  });

  const fcVals    = mesuresParJour.map(d => d.fc).filter(v => v !== null);
  const taVals    = mesuresParJour.filter(d => d.ta_sys !== null && d.ta_dia !== null);
  const rmssdVals = mesuresParJour.map(d => d.rmssd).filter(v => v !== null);
  const poidsVals = mesuresParJour.map(d => d.poids).filter(v => v !== null);
  const hasAnyMesure = fcVals.length >= 3 || taVals.length >= 3 || rmssdVals.length >= 3 || poidsVals.length >= 3;

  let donneesObjectivesHtml = '';
  if (hasAnyMesure) {
    const rows = [];
    if (fcVals.length >= 3) {
      const fcMoy = Math.round(avg(fcVals));
      const fcMin = Math.min.apply(null, fcVals);
      const fcMax = Math.max.apply(null, fcVals);
      rows.push('<div style="font-size:13px;color:#06172D;padding:4px 0;border-bottom:1px solid rgba(6,23,45,.12);">❤️ FC repos : <strong>' + fcMoy + ' bpm</strong> moy. (min ' + fcMin + ' – max ' + fcMax + ')</div>');
    }
    if (taVals.length >= 3) {
      const taSys = Math.round(avg(taVals.map(d => d.ta_sys)));
      const taDia = Math.round(avg(taVals.map(d => d.ta_dia)));
      rows.push('<div style="font-size:13px;color:#06172D;padding:4px 0;border-bottom:1px solid rgba(6,23,45,.12);">🩺 Tension : <strong>' + taSys + '/' + taDia + ' mmHg</strong> moy.</div>');
    }
    if (rmssdVals.length >= 3) {
      const rMoy = Math.round(avg(rmssdVals));
      rows.push('<div style="font-size:13px;color:#06172D;padding:4px 0;border-bottom:1px solid rgba(6,23,45,.12);">📊 VFC/RMSSD : <strong>' + rMoy + ' ms</strong> moy.</div>');
    }
    if (poidsVals.length >= 3) {
      const pMoy = avg(poidsVals).toFixed(1);
      rows.push('<div style="font-size:13px;color:#06172D;padding:4px 0;">⚖️ Poids : <strong>' + pMoy + ' kg</strong> moy.</div>');
    }
    donneesObjectivesHtml =
      '<div style="' + SECTION_STYLE + 'background:#F9FAFB;border:1.5px solid rgba(6,23,45,.18);">' +
        '<p style="' + SECTION_TITLE + 'color:rgba(6,23,45,.55);">Données objectives déclaratives</p>' +
        rows.join('') +
        '<div style="font-size:10px;color:rgba(6,23,45,.42);font-style:italic;margin-top:6px;">Mesures déclaratives — pas de valeur diagnostique</div>' +
      '</div>';
  }

  // ============================================================
  // 7. ÉPISODES DE CRASH PEM (conditionnel)
  // ============================================================
  let pemHtml = '';
  if (typeof window.detectPEMEvents === 'function') {
    const days7jPEM = recentEntries.map(function(e) {
      const vals = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(v => v !== null && v !== undefined);
      const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { date: e.date, score: score };
    }).filter(d => d.score !== null);
    const mesures7jPEM = {};
    recentEntries.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jPEM['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });
    const pemEvents = window.detectPEMEvents(days7jPEM, mesures7jPEM);
    if (pemEvents.length > 0) {
      const pemSum = (typeof window.getPEMSummary === 'function') ? window.getPEMSummary(pemEvents) : { count: pemEvents.length, avgDelta: null };
      const avgDeltaStr = pemSum.avgDelta !== null ? pemSum.avgDelta.toFixed(1) : '—';
      pemHtml =
        '<div style="' + SECTION_STYLE + 'background:#FFF7ED;border:1.5px solid #f97316;">' +
          '<p style="' + SECTION_TITLE + 'color:#f97316;">Épisodes de crash (PEM)</p>' +
          '<div style="font-size:14px;color:#06172D;">' +
            '<strong>' + pemSum.count + ' épisode(s)</strong> de dégradation fonctionnelle détecté(s) sur 7 jours.' +
            (pemSum.avgDelta !== null ? ' Chute moyenne : <strong>' + avgDeltaStr + ' pts</strong>.' : '') +
          '</div>' +
        '</div>';
    }
  }

  // ============================================================
  // 8. CYCLE HORMONAL (conditionnel)
  // ============================================================
  let cycleHtml = '';
  if (typeof window.collectCycleData === 'function' && typeof window.analyzeCycleCorrelation === 'function') {
    const days7jCycle = recentEntries.map(function(e) {
      const vals = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(v => v !== null && v !== undefined);
      const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { date: e.date, score: score };
    }).filter(d => d.score !== null);
    const mesures7jCycle = {};
    recentEntries.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { mesures7jCycle['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });
    const cyclePhases7j   = window.collectCycleData(days7jCycle, mesures7jCycle, 7);
    const cycleAnalysis7j = window.analyzeCycleCorrelation(cyclePhases7j);
    const daysWithCycle7j = Object.values(cyclePhases7j).reduce((sum, arr) => sum + arr.length, 0);

    if (cycleAnalysis7j !== null && daysWithCycle7j >= 3) {
      const cyclePhaseLabels = {
        folliculaire: 'Folliculaire', ovulation: 'Ovulation',
        luteale: 'Lutéale', menstruation: 'Règles', perimenopause: 'Irrégulier'
      };
      let phaseDominante = null;
      let maxCount = 0;
      Object.keys(cyclePhases7j).forEach(function(phase) {
        if (cyclePhases7j[phase].length > maxCount) {
          maxCount = cyclePhases7j[phase].length;
          phaseDominante = phase;
        }
      });
      const phaseDomLabel = phaseDominante ? (cyclePhaseLabels[phaseDominante] || phaseDominante) : '—';
      const avgScoreDom = phaseDominante && cyclePhases7j[phaseDominante].length
        ? cyclePhases7j[phaseDominante].reduce((a, b) => a + b, 0) / cyclePhases7j[phaseDominante].length
        : null;
      cycleHtml =
        '<div style="' + SECTION_STYLE + 'background:#FDF4FF;border:1.5px solid #a855f7;">' +
          '<p style="' + SECTION_TITLE + 'color:#a855f7;">Cycle et bien-être</p>' +
          '<div style="font-size:13px;color:#06172D;">' +
            'Phase dominante cette semaine : <strong>' + phaseDomLabel + '</strong> (' + maxCount + ' jour' + (maxCount > 1 ? 's' : '') + ')' +
            (avgScoreDom !== null ? ' · Score moyen : <strong>' + avgScoreDom.toFixed(1) + '/10</strong>' : '') +
          '</div>' +
        '</div>';
    }
  }

  // ============================================================
  // 9. QUESTIONS À POSER AU MÉDECIN (conditionnel)
  // ============================================================
  const scores7jQ = recentEntries.map(function(e) {
    const vv = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(v => v !== null && v !== undefined);
    return vv.length ? vv.reduce((a, b) => a + b, 0) / vv.length : null;
  }).filter(v => v !== null);
  const scoreMoy7jQ = avg(scores7jQ);

  let scoreStdDevQ = 0;
  if (scores7jQ.length >= 2 && scoreMoy7jQ !== null) {
    const varQ = scores7jQ.reduce((acc, v) => acc + (v - scoreMoy7jQ) * (v - scoreMoy7jQ), 0) / scores7jQ.length;
    scoreStdDevQ = Math.sqrt(varQ);
  }
  const humeurValsQ = recentEntries.map(e => e.humeur).filter(v => v !== null && v !== undefined);
  const humeurMoy7jQ = avg(humeurValsQ);

  let pemCount7jQ = 0;
  if (typeof window.detectPEMEvents === 'function') {
    const days7jQpem = recentEntries.map(function(e) {
      const vv = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(v => v !== null && v !== undefined);
      return { date: e.date, score: vv.length ? vv.reduce((a, b) => a + b, 0) / vv.length : null };
    }).filter(d => d.score !== null);
    const m7jpem = {};
    recentEntries.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { m7jpem['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });
    pemCount7jQ = window.detectPEMEvents(days7jQpem, m7jpem).length;
  }

  let daysWithCycleQ = 0;
  if (typeof window.collectCycleData === 'function') {
    const days7jQcyc = recentEntries.map(function(e) {
      const vv = [e.energie, e.qualite_sommeil, e.douleurs, e.clarte_mentale].filter(v => v !== null && v !== undefined);
      return { date: e.date, score: vv.length ? vv.reduce((a, b) => a + b, 0) / vv.length : null };
    }).filter(d => d.score !== null);
    const m7jcyc = {};
    recentEntries.forEach(function(e) {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (!raw) return;
      try { m7jcyc['boussole_mesures_' + e.date] = JSON.parse(raw); } catch(ex) {}
    });
    const cyclePhases7jQ = window.collectCycleData(days7jQcyc, m7jcyc, 7);
    daysWithCycleQ = Object.values(cyclePhases7jQ).reduce((sum, arr) => sum + arr.length, 0);
  }

  const fcMoyQ = fcVals.length >= 3 ? avg(fcVals) : null;
  const questionsQ = [];
  if (pemCount7jQ >= 1)  questionsQ.push("Mes données montrent des chutes de score après les jours à bonne énergie. Faut-il évoquer le malaise post-effort / PEM ?");
  if (daysWithCycleQ >= 1) questionsQ.push("Mon score varie selon les phases de mon cycle. Ce suivi mérite-t-il une attention hormonale ?");
  if (fcMoyQ !== null && fcMoyQ > 85) questionsQ.push("Ma fréquence cardiaque au repos est élevée sur cette période. Faut-il évaluer une composante orthostatique ?");
  if (scoreMoy7jQ !== null && scoreMoy7jQ < 5.0) questionsQ.push("Mon score global est bas de façon persistante. Quels examens complémentaires seraient pertinents à ce stade ?");
  if (scoreStdDevQ > 2.5) questionsQ.push("Ma variabilité est importante d'un jour à l'autre. Ce profil évoque-t-il quelque chose de spécifique ?");
  if (humeurMoy7jQ !== null && scoreMoy7jQ !== null && humeurValsQ.length >= 3 && Math.abs(humeurMoy7jQ - scoreMoy7jQ) > 2) questionsQ.push("Mon ressenti global est souvent différent de mon score composite. Cette dissociation est-elle un signal clinique ?");

  let questionsHtml = '';
  if (questionsQ.length > 0) {
    questionsHtml =
      '<div style="' + SECTION_STYLE + 'background:#F0FDF4;border:1.5px solid #2d6a4f;">' +
        '<p style="' + SECTION_TITLE + 'color:#2d6a4f;">Questions à poser au médecin</p>' +
        questionsQ.slice(0, 5).map(q => '<div style="font-size:13px;color:#06172D;padding:4px 0;border-bottom:1px solid rgba(45,106,79,.1);">→ ' + q + '</div>').join('') +
        '<div style="font-size:10px;color:rgba(6,23,45,.42);font-style:italic;margin-top:8px;">Suggestions basées sur vos données · Pas un avis médical</div>' +
      '</div>';
  }

  // ============================================================
  // GRAPHIQUE 30J
  // ============================================================
  const graphique30jHtml =
    '<div style="' + SECTION_STYLE + 'background:#fff;border:1.5px solid rgba(6,23,45,.12);">' +
      '<p style="' + SECTION_TITLE + 'color:#06172D;">Évolution 30 jours</p>' +
      '<canvas id="mode-presentation-chart" height="180"></canvas>' +
    '</div>';

  // MOTIF DE CONSULTATION (bloc 2)
  let motifHtml;
  if (noteConsultation) {
    const parts = noteConsultation.split(' — ');
    const cochees = parts[0] ? parts[0].split(' · ').map(function(s) { return s.trim(); }).filter(Boolean) : [];
    const texteLibre = parts[1] ? parts[1].trim() : '';
    const allItems = cochees.concat(texteLibre ? [texteLibre] : []);
    const listHtml = allItems.map(function(item) {
      return '<div style="font-size:14px;color:#06172D;padding:3px 0;">• ' + item + '</div>';
    }).join('');
    motifHtml = '<div style="' + SECTION_STYLE + 'background:#fffbf0;border:1.5px solid #d4a017;">' +
      '<p style="' + SECTION_TITLE + 'color:#d4a017;">Motif de consultation</p>' +
      listHtml +
      '</div>';
  } else {
    motifHtml = '';
  }

  // CALENDRIER 14 JOURS (bloc 7)
  const today14mp = new Date(); today14mp.setHours(0, 0, 0, 0);
  const entryMap14mp = {};
  rawEntries.forEach(function(e) { entryMap14mp[e.date] = e; });
  const DAY_LABELS_14MP = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  let calCells14mp = '';
  for (let i = 13; i >= 0; i--) {
    const cd14 = new Date(today14mp);
    cd14.setDate(cd14.getDate() - i);
    const cdStr14 = localDateStr(cd14);
    const cdm14 = String(cd14.getDate()).padStart(2, '0');
    const cmm14 = String(cd14.getMonth() + 1).padStart(2, '0');
    const e14mp = entryMap14mp[cdStr14];
    let dotClass14 = 'cal-dot cal-dot-vide';
    if (e14mp) {
      const vals14 = [e14mp.energie, e14mp.qualite_sommeil, e14mp.douleurs, e14mp.clarte_mentale].filter(v => v !== null && v !== undefined);
      if (vals14.length > 0) {
        const sc14 = vals14.reduce((a, b) => a + b, 0) / vals14.length;
        dotClass14 = sc14 >= 7 ? 'cal-dot cal-dot-vert' : sc14 >= 4 ? 'cal-dot cal-dot-orange' : 'cal-dot cal-dot-rouge';
      }
    }
    calCells14mp +=
      '<div class="cal-cell">' +
        '<span class="cal-day-label">' + DAY_LABELS_14MP[cd14.getDay()] + '</span>' +
        '<div class="' + dotClass14 + '"></div>' +
        '<span class="cal-day-num">' + cdm14 + '/' + cmm14 + '</span>' +
      '</div>';
  }
  const calendrier14jHtml =
    '<div style="' + SECTION_STYLE + 'background:#fff;border:1.5px solid rgba(6,23,45,.12);">' +
      '<p style="' + SECTION_TITLE + 'color:#06172D;">Calendrier 14 jours</p>' +
      '<div class="cal-grid">' + calCells14mp + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;">' +
        '<span style="font-size:11px;color:rgba(6,23,45,.55);display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#2d6a4f;display:inline-block;"></span> Haut (\u22657)</span>' +
        '<span style="font-size:11px;color:rgba(6,23,45,.55);display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#D97706;display:inline-block;"></span> Moyen (4-6)</span>' +
        '<span style="font-size:11px;color:rgba(6,23,45,.55);display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#DC2626;display:inline-block;"></span> Bas (&lt;4)</span>' +
        '<span style="font-size:11px;color:rgba(6,23,45,.55);display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#D1D5DB;display:inline-block;"></span> Non renseigné</span>' +
      '</div>' +
    '</div>';

  // Texte brut pour partage
  const shareLines = [
    'Mon suivi Boussole — 7 derniers jours',
    '',
    avgEnergie !== null ? 'Énergie : ' + avgEnergie.toFixed(1) + '/10' : '',
    avgSommeil !== null ? 'Sommeil : ' + avgSommeil.toFixed(1) + '/10' : '',
    avgConfort !== null ? 'Confort physique : ' + avgConfort.toFixed(1) + '/10' : '',
    avgClarte  !== null ? 'Clarté mentale : '  + avgClarte.toFixed(1)  + '/10' : '',
    noteConsultation ? '\nMotif : ' + noteConsultation : '',
    "\nDocument d'information personnelle · Pas un avis médical"
  ].filter(Boolean);
  window._boussoleShareText = shareLines.join('\n');

  const partagerBtn = '<div style="display:flex;gap:10px;margin-top:24px;justify-content:center;">' +
    '<button onclick="window.print()" style="padding:12px 24px;background:#fff;color:#2d6a4f;border:1.5px solid #2d6a4f;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">🖨️ Imprimer</button>' +
    (navigator.share || navigator.clipboard ? '<button onclick="partagerResume()" style="padding:12px 28px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">Partager ce résumé</button>' : '') +
    '</div>';

  // ============================================================
  // 10. ESSAIS RÉCENTS (90 jours)
  // ============================================================
  let essaisRecentsHtml = '';
  const allEssaisMP = loadEssais();
  const cutoff90MP = new Date();
  cutoff90MP.setDate(cutoff90MP.getDate() - 90);
  const cutoff90Str = cutoff90MP.toISOString().split('T')[0];
  const essaisRecentsMP = allEssaisMP.filter(function(e) { return e.date_debut >= cutoff90Str; });
  if (essaisRecentsMP.length > 0) {
    const essaisRows = essaisRecentsMP.map(function(e) {
      const debut = new Date(e.date_debut + 'T12:00:00');
      const diffJ = Math.max(0, Math.floor((Date.now() - debut) / 86400000));
      const duree = diffJ > 0 ? diffJ + 'j' : '<1j';
      return '<tr>' +
        '<td style="padding:5px 8px;font-size:13px;color:#06172D;border-bottom:1px solid #f0f0f0;">' + (e.nom || '') + '</td>' +
        '<td style="padding:5px 8px;font-size:13px;color:#06172D;border-bottom:1px solid #f0f0f0;">' + (e.type || '') + '</td>' +
        '<td style="padding:5px 8px;font-size:13px;color:#06172D;border-bottom:1px solid #f0f0f0;">' + (e.effet || '') + '</td>' +
        '<td style="padding:5px 8px;font-size:13px;color:rgba(6,23,45,.55);border-bottom:1px solid #f0f0f0;">' + duree + '</td>' +
        '</tr>';
    }).join('');
    essaisRecentsHtml =
      '<div style="' + SECTION_STYLE + 'background:#FAF5FF;border-left:3px solid #a855f7;">' +
        '<p style="' + SECTION_TITLE + 'color:#a855f7;">Essais récents (90 jours)</p>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          '<thead><tr>' +
            '<th style="font-size:11px;font-weight:600;color:#a855f7;text-align:left;padding:4px 8px;">Nom</th>' +
            '<th style="font-size:11px;font-weight:600;color:#a855f7;text-align:left;padding:4px 8px;">Type</th>' +
            '<th style="font-size:11px;font-weight:600;color:#a855f7;text-align:left;padding:4px 8px;">Effet</th>' +
            '<th style="font-size:11px;font-weight:600;color:#a855f7;text-align:left;padding:4px 8px;">Durée</th>' +
          '</tr></thead>' +
          '<tbody>' + essaisRows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  const html =
    enTeteHtml +
    motifHtml +
    traitementHtml +
    problemePrincipalHtml +
    syntheseHtml +
    graphique30jHtml +
    buildBlocStabilite('medecin') +
    calendrier14jHtml +
    sommeilHtml +
    donneesObjectivesHtml +
    pemHtml +
    cycleHtml +
    essaisRecentsHtml +
    questionsHtml +
    partagerBtn +
    '<p style="font-size:11px;color:#aaa;text-align:center;margin-top:24px;">Document d\'information personnelle · Pas un avis médical</p>';

  const overlay = document.getElementById('mode-presentation');
  const content = document.getElementById('mode-presentation-content');
  if (overlay && content) {
    content.innerHTML = '<div style="max-width:660px;margin:0 auto;padding:24px 20px 48px;">' + html + '</div>';
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    setTimeout(function() {
      const canvas = document.getElementById('mode-presentation-chart');
      if (!canvas || typeof Chart === 'undefined') return;

      if (window._modePresentationChart) { window._modePresentationChart.destroy(); }

      const cutoff30 = new Date(today + 'T12:00:00');
      cutoff30.setDate(cutoff30.getDate() - 29);
      const entryMapChart = {};
      data.entries.forEach(function(e) { entryMapChart[e.date] = e; });

      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      const chartLabels = [], cEnergie = [], cSommeil = [], cConfort = [], cClarte = [];
      for (let i = 29; i >= 0; i--) {
        const cd = new Date(todayD);
        cd.setDate(cd.getDate() - i);
        const ds = localDateStr(cd);
        chartLabels.push(String(cd.getDate()) + '/' + String(cd.getMonth() + 1).padStart(2, '0'));
        const e = entryMapChart[ds];
        cEnergie.push(e ? e.energie         : null);
        cSommeil.push(e ? e.qualite_sommeil  : null);
        cConfort.push(e ? e.douleurs         : null);
        cClarte.push( e ? e.clarte_mentale   : null);
      }

      window._modePresentationChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [
            { label: 'Énergie',          data: cEnergie, borderColor: 'var(--color-score)', backgroundColor: 'rgba(45,158,110,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 },
            { label: 'Sommeil',          data: cSommeil, borderColor: '#e07b2a', backgroundColor: 'rgba(224,123,42,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 },
            { label: 'Confort physique', data: cConfort, borderColor: '#9b59b6', backgroundColor: 'rgba(155,89,182,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 },
            { label: 'Clarté mentale',   data: cClarte,  borderColor: '#2980b9', backgroundColor: 'rgba(41,128,185,0.08)', tension: 0.3, spanGaps: true, pointRadius: 3 }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
          scales: {
            x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
            y: { min: 0, max: 10, ticks: { stepSize: 2 } }
          }
        }
      });
    }, 300);
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

      var reposDiurneEl = document.getElementById('mesures-repos-diurne');
      if (reposDiurneEl && reposDiurneEl.value !== '') mesures.repos_diurne = parseFloat(reposDiurneEl.value);
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
      var inputRepos = document.getElementById('mesures-repos-diurne');
      if (inputRepos) inputRepos.value = (mesures.repos_diurne !== undefined) ? mesures.repos_diurne : '';
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
  window._pcOriginalDate = dateStr;
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
  window._pcOriginalDate = dateStr;
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

    html += '<div style="background:#fff;border-left:3px solid #6E877D;border-radius:12px;padding:12px;margin-bottom:8px;">';
    html += '<div class="pc-card-header" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:600;color:#06172D;">';
    html += '<span>' + headerText + '</span>';
    html += '<span id="' + cardId + '-chevron" style="font-size:12px;color:rgba(6,23,45,.45);">' + (isOpen ? '\u25bc' : '\u25b6') + '</span>';
    html += '</div>';
    html += '<div id="' + cardId + '" style="display:' + (isOpen ? 'block' : 'none') + ';margin-top:10px;font-size:13px;color:rgba(6,23,45,.78);line-height:1.8;">';

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

    html += '<div style="margin-top:8px;display:flex;gap:8px;">';
    html += '<button onclick="openPostConsultationFromDate(\'' + dateRdv + '\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Modifier</button>';
    html += '<button onclick="deletePostConsultation(\'' + dateRdv + '\')" style="background:transparent;border:1px solid #dc2626;color:#dc2626;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Supprimer</button>';
    html += '</div>';
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

  // Normaliser la date en YYYY-MM-DD quelle que soit la locale du navigateur
  // Sur certains iOS, l'input[type="date"] peut retourner DD/MM/YYYY
  if (dateRdv && !/^\d{4}-\d{2}-\d{2}$/.test(dateRdv)) {
    // Tenter DD/MM/YYYY → YYYY-MM-DD
    var parts = dateRdv.split(/[\/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // Déjà YYYY/MM/DD avec slash
        dateRdv = parts[0] + '-' + parts[1].padStart(2,'0') + '-' + parts[2].padStart(2,'0');
      } else {
        // DD/MM/YYYY ou DD-MM-YYYY
        dateRdv = parts[2] + '-' + parts[1].padStart(2,'0') + '-' + parts[0].padStart(2,'0');
      }
    }
  }
  var data = {
    date_rdv: dateRdv,
    decisions: document.getElementById('pc-decisions').value,
    examens: document.getElementById('pc-examens').value,
    traitement_teste: document.getElementById('pc-traitement').value,
    date_reevaluation: document.getElementById('pc-date-reeval').value,
    variable_suivie: document.getElementById('pc-variable').value,
    signaux_stop: document.getElementById('pc-signaux-stop').value
  };
  if (window._pcOriginalDate && window._pcOriginalDate !== dateRdv) {
    localStorage.removeItem('boussole_post_consultation_' + window._pcOriginalDate);
  }
  window._pcOriginalDate = dateRdv;
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

window.deletePostConsultation = function(dateStr) {
  if (!confirm('Supprimer la fiche du ' + dateStr + ' ?')) return;
  localStorage.removeItem('boussole_post_consultation_' + dateStr);
  refreshPostConsultationHistorique();
};

function exportJournalConsultationPDF() {
  if (typeof window.jspdf === 'undefined') {
    alert('jsPDF non disponible - verifie ta connexion internet.');
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

// ============================================================
// IMPORT / EXPORT JSON (v8.30)
// ============================================================

function exportDonneesJSON() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('boussole')) {
      var raw = localStorage.getItem(key);
      try { data[key] = JSON.parse(raw); } catch(e) { data[key] = raw; }
    }
  }
  var payload = {
    version: '1.0',
    export_date: getTodayDate(),
    app_version: '8.30',
    data: data
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'boussole-export-' + getTodayDate() + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

function importDonneesJSON(event) {
  var feedback = document.getElementById('import-feedback');
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch(err) {
      feedback.style.display = 'block';
      feedback.style.color = '#e24b4a';
      feedback.textContent = 'Fichier invalide — JSON non reconnu.';
      return;
    }
    if (!parsed || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      feedback.style.display = 'block';
      feedback.style.color = '#e24b4a';
      feedback.textContent = 'Fichier invalide — structure non reconnue.';
      return;
    }
    var ok = window.confirm(
      'Cette action va fusionner les données importées avec vos données actuelles. ' +
      'Les données importées écrasent les données locales en cas de conflit. Continuer ?'
    );
    if (!ok) {
      feedback.style.display = 'block';
      feedback.style.color = 'rgba(6,23,45,.45)';
      feedback.textContent = 'Import annulé.';
      return;
    }
    var count = 0;
    var dataObj = parsed.data;
    Object.keys(dataObj).forEach(function(key) {
      var val = dataObj[key];
      try {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        count++;
      } catch(err) {}
    });
    feedback.style.display = 'block';
    feedback.style.color = '#2d6a4f';
    feedback.textContent = '\u2713 ' + count + ' entr\xe9es import\xe9es \u2014 rechargement\u2026';
    setTimeout(function() { window.location.reload(); }, 1500);
  };
  reader.readAsText(file);
}

// ============================================================
// === FEATURE M — Journal essais/intolérances ===
// ============================================================

function loadEssais() {
  try {
    return JSON.parse(localStorage.getItem('boussole_essais') || '[]');
  } catch (e) {
    return [];
  }
}

function saveEssai(data) {
  var essais = loadEssais();
  if (data.id) {
    var idx = essais.findIndex(function(e) { return e.id === data.id; });
    if (idx >= 0) {
      essais[idx] = data;
    } else {
      essais.push(data);
    }
  } else {
    data.id = Date.now().toString();
    essais.push(data);
  }
  localStorage.setItem('boussole_essais', JSON.stringify(essais));
}

function deleteEssai(id) {
  if (!confirm('Supprimer cet essai ?')) return;
  var essais = loadEssais().filter(function(e) { return e.id !== id; });
  localStorage.setItem('boussole_essais', JSON.stringify(essais));
  renderEssaisList();
}

function renderEssaisList() {
  var container = document.getElementById('essais-list');
  if (!container) return;
  var essais = loadEssais();
  if (essais.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted);font-size:14px;font-style:italic;margin:8px 0 0;">Aucun essai enregistré</p>';
    return;
  }
  var sorted = essais.slice().sort(function(a, b) { return (b.date_debut || '').localeCompare(a.date_debut || ''); });
  var effectColors = {
    'Positif':  { bg: '#dcfce7', color: '#166534' },
    'Neutre':   { bg: '#f3f4f6', color: '#374151' },
    'Négatif':  { bg: '#fee2e2', color: '#991b1b' }
  };
  var html = '';
  sorted.forEach(function(e) {
    var debut = new Date(e.date_debut + 'T12:00:00');
    var diffJ = Math.max(0, Math.floor((Date.now() - debut) / 86400000));
    var dureeStr = diffJ > 0 ? diffJ + ' jour' + (diffJ > 1 ? 's' : '') : 'Aujourd\'hui';
    var effetStyle = effectColors[e.effet] || { bg: '#f3f4f6', color: '#374151' };
    html += '<div style="border-left:3px solid #a855f7;border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#fafafa;">';
    html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">';
    html += '<strong style="font-size:14px;color:#06172D;">' + (e.nom || '') + '</strong>';
    if (e.type) {
      html += '<span class="essai-badge-type">' + e.type + '</span>';
    }
    if (e.effet) {
      html += '<span class="essai-badge-effet" style="background:' + effetStyle.bg + ';color:' + effetStyle.color + ';">' + e.effet + '</span>';
    }
    html += '</div>';
    if (e.objectif) {
      html += '<div style="font-size:13px;color:rgba(6,23,45,.72);margin-bottom:2px;">' + e.objectif + '</div>';
    }
    html += '<div class="essai-duree">Depuis ' + formatDateFr(e.date_debut) + ' · ' + dureeStr + '</div>';
    html += '<div style="display:flex;gap:8px;margin-top:8px;">';
    html += '<button onclick="openModalEssai(\'' + e.id + '\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Modifier</button>';
    html += '<button onclick="deleteEssai(\'' + e.id + '\')" style="background:transparent;border:1px solid #dc2626;color:#dc2626;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Supprimer</button>';
    html += '</div>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function openModalEssai(id) {
  var modal = document.getElementById('modal-essai');
  if (!modal) return;
  var today = localDateStr(new Date());
  if (id) {
    var essais = loadEssais();
    var essai = essais.find(function(e) { return e.id === id; });
    if (!essai) return;
    modal.dataset.editId = id;
    document.getElementById('essai-nom').value        = essai.nom || '';
    document.getElementById('essai-type').value       = essai.type || '';
    document.getElementById('essai-date').value       = essai.date_debut || today;
    document.getElementById('essai-objectif').value   = essai.objectif || '';
    document.getElementById('essai-effet').value      = essai.effet || '';
    document.getElementById('essai-aggravation').value= essai.aggravation || 'Non';
    document.getElementById('essai-paradoxal').value  = essai.paradoxal || 'Non';
    document.getElementById('essai-arret').value      = essai.arret || 'Non';
    document.getElementById('essai-raison-arret').value = essai.raison_arret || '';
    document.querySelector('#modal-essai h3').textContent = 'Modifier l\'essai';
  } else {
    delete modal.dataset.editId;
    document.getElementById('essai-nom').value        = '';
    document.getElementById('essai-type').value       = '';
    document.getElementById('essai-date').value       = today;
    document.getElementById('essai-objectif').value   = '';
    document.getElementById('essai-effet').value      = '';
    document.getElementById('essai-aggravation').value= 'Non';
    document.getElementById('essai-paradoxal').value  = 'Non';
    document.getElementById('essai-arret').value      = 'Non';
    document.getElementById('essai-raison-arret').value = '';
    document.querySelector('#modal-essai h3').textContent = 'Nouvel essai';
  }
  var arretVal = document.getElementById('essai-arret').value;
  document.getElementById('essai-raison-arret-wrap').style.display = arretVal === 'Oui' ? 'block' : 'none';
  modal.style.display = 'flex';
}

function closeModalEssai() {
  var modal = document.getElementById('modal-essai');
  if (modal) modal.style.display = 'none';
}

function saveModalEssai() {
  var nom = document.getElementById('essai-nom').value.trim();
  if (!nom) {
    document.getElementById('essai-nom').focus();
    return;
  }
  var modal = document.getElementById('modal-essai');
  var data = {
    nom:          nom,
    type:         document.getElementById('essai-type').value,
    date_debut:   document.getElementById('essai-date').value,
    objectif:     document.getElementById('essai-objectif').value.trim(),
    effet:        document.getElementById('essai-effet').value,
    aggravation:  document.getElementById('essai-aggravation').value,
    paradoxal:    document.getElementById('essai-paradoxal').value,
    arret:        document.getElementById('essai-arret').value,
    raison_arret: document.getElementById('essai-raison-arret').value.trim()
  };
  if (modal.dataset.editId) {
    data.id = modal.dataset.editId;
  }
  saveEssai(data);
  closeModalEssai();
  renderEssaisList();
}

// === Feature U : Hub suivi unifié (ADR-2026-032) ===

function toggleHubHistory() {
  var container = document.getElementById('hub-history-container');
  var btn = document.getElementById('btn-hub-history');
  if (container.style.display === 'none') {
    container.style.display = 'block';
    btn.textContent = '📓 Mon historique clinique ▲';
    renderHubHistory('all');
  } else {
    container.style.display = 'none';
    btn.textContent = '📓 Mon historique clinique';
  }
}

function collectHubEntries() {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  var cutoffStr = cutoff.toISOString().split('T')[0];
  var entries = [];

  // Feature T — Événements (boussole_event_*)
  var eventTypeLabels = {
    'reaction-medicament': 'Réaction médicament',
    'symptome-inhabituel': 'Symptôme inhabituel',
    'bonne-journee-exceptionnelle': 'Bonne journée exceptionnelle',
    'mauvaise-journee-exceptionnelle': 'Mauvaise journée exceptionnelle',
    'autre': 'Autre'
  };
  Object.keys(localStorage).filter(function(k) { return k.startsWith('boussole_event_'); }).forEach(function(k) {
    try {
      var e = JSON.parse(localStorage.getItem(k));
      if (!e || !e.date || e.date < cutoffStr) return;
      entries.push({
        date: e.date,
        type: 'event',
        label: '▶ Événement',
        text: e.description || '',
        badge: eventTypeLabels[e.type] || e.type || ''
      });
    } catch(ex) {}
  });

  // Feature M — Essais (boussole_essais)
  try {
    var essais = JSON.parse(localStorage.getItem('boussole_essais') || '[]');
    essais.forEach(function(e) {
      if (!e.date_debut || e.date_debut < cutoffStr) return;
      var badge = e.arret === 'Oui' ? 'Arrêté' : 'En cours';
      var text = e.nom || '';
      if (e.type) text += ' · ' + e.type;
      entries.push({
        date: e.date_debut,
        type: 'essai',
        label: '🧪 Essai',
        text: text,
        badge: badge
      });
    });
  } catch(ex) {}

  // Feature J — Post-consultation (boussole_post_consultation_*)
  Object.keys(localStorage).filter(function(k) { return k.startsWith('boussole_post_consultation_'); }).forEach(function(k) {
    try {
      var fiche = JSON.parse(localStorage.getItem(k));
      if (!fiche || !fiche.date_rdv || fiche.date_rdv < cutoffStr) return;
      var text = (fiche.decisions || '').substring(0, 50);
      if (text.length === 50) text += '…';
      if (!text && fiche.examens) text = (fiche.examens || '').substring(0, 50);
      entries.push({
        date: fiche.date_rdv,
        type: 'consult',
        label: '📋 Consultation',
        text: text || '(sans notes)',
        badge: formatDateFr(fiche.date_rdv)
      });
    } catch(ex) {}
  });

  entries.sort(function(a, b) { return b.date.localeCompare(a.date); });
  return entries;
}

function renderHubHistory(filter) {
  var list = document.getElementById('hub-history-list');
  if (!list) return;
  var entries = collectHubEntries();
  var filtered = filter === 'all' ? entries : entries.filter(function(e) { return e.type === filter; });
  if (filtered.length === 0) {
    list.innerHTML = '<p class="hub-empty">Aucun élément sur les 30 derniers jours.</p>';
    return;
  }
  list.innerHTML = filtered.map(function(e) {
    return '<div class="hub-entry type-' + e.type + '">' +
      '<div class="hub-entry-date">' + e.label + ' · ' + formatDateFr(e.date) +
      (e.badge ? '<span class="hub-entry-badge">' + e.badge + '</span>' : '') + '</div>' +
      '<div class="hub-entry-text">' + e.text + '</div>' +
      '</div>';
  }).join('');
}

function filterHubHistory(filter) {
  document.querySelectorAll('.hub-filter').forEach(function(b) {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderHubHistory(filter);
}

// ============================================================
// FEATURE V — Journal : lecture / édition / suppression des notes
// ============================================================

function renderJournalNotes(showAll) {
  var container = document.getElementById('journal-notes-list');
  if (!container) return;

  var data = loadEntries();
  // Index des entrees par date pour acces O(1)
  var byDate = {};
  (data.entries || []).forEach(function(e) { byDate[e.date] = e; });

  // Generer les 30 derniers jours (aujourd'hui inclus)
  var days = [];
  for (var i = 0; i < 30; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  // Limiter a 14j par defaut sauf si showAll
  var visible = showAll ? days : days.slice(0, 14);
  var hidden = showAll ? 0 : days.length - visible.length;

  var html = visible.map(function(date) {
    var entry = byDate[date];
    var safeDate = date.replace(/-/g, '_');
    var dateLabel = formatDateFr(date);

    if (entry && entry.note && entry.note.trim() !== '') {
      // Jour avec note
      var extrait = entry.note.length > 120 ? entry.note.substring(0, 120) + '\u2026' : entry.note;
      return [
        '<div class="journal-note-entry" id="journal-note-' + safeDate + '">',
          '<div class="journal-note-header">',
            '<span class="journal-note-date">' + dateLabel + '</span>',
            '<div class="journal-note-actions">',
              '<button class="journal-note-btn-edit" onclick="editNoteInline(\'' + date + '\')">Modifier</button>',
              '<button class="journal-note-btn-del" onclick="deleteNoteJournal(\'' + date + '\')">Supprimer</button>',
            '</div>',
          '</div>',
          '<div class="journal-note-text" id="journal-note-text-' + safeDate + '">' + extrait.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>',
          '<div class="journal-note-edit-zone" id="journal-note-edit-' + safeDate + '" style="display:none;">',
            '<textarea id="journal-note-textarea-' + safeDate + '" rows="5" style="width:100%;padding:10px 12px;border:1.5px solid rgba(45,106,79,.3);border-radius:12px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;color:#06172D;line-height:1.6;background:#f8faf9;" aria-label="Modifier la note du ' + dateLabel + '">' + entry.note.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea>',
            '<div style="display:flex;gap:8px;margin-top:8px;">',
              '<button onclick="saveNoteEdit(\'' + date + '\')" style="flex:1;background:#2d6a4f;color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;">Enregistrer</button>',
              '<button onclick="cancelNoteEdit(\'' + date + '\')" style="flex:1;background:none;border:1.5px solid rgba(6,23,45,.2);color:rgba(6,23,45,.55);border-radius:8px;padding:8px;font-size:13px;cursor:pointer;">Annuler</button>',
            '</div>',
          '</div>',
        '</div>'
      ].join('');
    } else {
      // Jour sans note — zone d'invitation compacte
      var scores = '';
      if (entry) {
        var parts = [];
        if (entry.humeur != null) parts.push('Humeur ' + entry.humeur);
        if (entry.energie != null) parts.push('\u00c9nergie ' + entry.energie);
        if (entry.qualite_sommeil != null) parts.push('Sommeil ' + entry.qualite_sommeil);
        if (parts.length > 0) scores = '<span style="font-size:11px;color:rgba(6,23,45,.42);margin-left:8px;">' + parts.join(' · ') + '</span>';
      }
      var editZoneId = 'journal-empty-edit-' + safeDate;
      var textareaId = 'journal-empty-textarea-' + safeDate;
      return [
        '<div class="journal-note-entry journal-note-empty" id="journal-note-' + safeDate + '">',
          '<div class="journal-note-header">',
            '<span class="journal-note-date" style="opacity:.55;">' + dateLabel + scores + '</span>',
            '<button onclick="toggleEmptyNoteEdit(\'' + date + '\')" style="background:none;border:1px dashed rgba(45,106,79,.4);color:#2d6a4f;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">+ Note</button>',
          '</div>',
          '<div class="journal-note-text" style="font-size:12px;color:rgba(6,23,45,.18);font-style:italic;">Aucune note ce jour</div>',
          '<div id="' + editZoneId + '" style="display:none;margin-top:8px;">',
            '<textarea id="' + textareaId + '" rows="3" maxlength="1000" placeholder="Ta note pour ce jour..." style="width:100%;padding:10px 12px;border:1.5px solid rgba(45,106,79,.3);border-radius:12px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;color:#06172D;line-height:1.6;background:#f8faf9;" aria-label="Note du ' + dateLabel + '"></textarea>',
            '<div style="display:flex;gap:8px;margin-top:6px;">',
              '<button onclick="saveEmptyNote(\'' + date + '\')" style="flex:1;background:#2d6a4f;color:#fff;border:none;border-radius:8px;padding:7px;font-size:12px;font-weight:600;cursor:pointer;">Enregistrer</button>',
              '<button onclick="cancelEmptyNote(\'' + date + '\')" style="flex:1;background:none;border:1.5px solid rgba(6,23,45,.15);color:rgba(6,23,45,.42);border-radius:8px;padding:7px;font-size:12px;cursor:pointer;">Annuler</button>',
            '</div>',
          '</div>',
        '</div>'
      ].join('');
    }
  }).join('');

  container.innerHTML = html;
  container.dataset.showAll = showAll ? 'true' : 'false';

  if (hidden > 0) {
    container.innerHTML += '<p style="text-align:center;margin-top:8px;"><button onclick="renderJournalNotes(true)" style="background:none;border:none;color:#2d6a4f;font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline;font-family:inherit;">Voir les ' + hidden + ' jours précédents</button></p>';
  }
}

function editNoteInline(date) {
  var safeDate = date.replace(/-/g, '_');
  document.getElementById('journal-note-text-' + safeDate).style.display = 'none';
  document.getElementById('journal-note-edit-' + safeDate).style.display = 'block';
  var ta = document.getElementById('journal-note-textarea-' + safeDate);
  if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

function cancelNoteEdit(date) {
  var safeDate = date.replace(/-/g, '_');
  document.getElementById('journal-note-text-' + safeDate).style.display = 'block';
  document.getElementById('journal-note-edit-' + safeDate).style.display = 'none';
}

function toggleNoteAdd() {
  var zone = document.getElementById('journal-add-zone');
  var btn = document.getElementById('btn-journal-add');
  if (!zone) return;
  var opening = zone.style.display === 'none';
  zone.style.display = opening ? 'block' : 'none';
  btn.textContent = opening ? 'Annuler' : '+ Ajouter une note';
  if (opening) {
    // Pré-remplir la date à aujourd'hui
    var today = new Date().toISOString().split('T')[0];
    var dateInput = document.getElementById('journal-add-date');
    if (dateInput) dateInput.value = today;
    var ta = document.getElementById('journal-add-text');
    if (ta) { ta.value = ''; ta.focus(); }
    document.getElementById('journal-add-count').textContent = '0/1000';
    // Compteur caractères
    if (ta) ta.oninput = function() {
      document.getElementById('journal-add-count').textContent = this.value.length + '/1000';
    };
  }
}

function saveNoteAdd() {
  var date = (document.getElementById('journal-add-date') || {}).value;
  var note = ((document.getElementById('journal-add-text') || {}).value || '').trim();
  if (!date) { alert('Choisis une date.'); return; }
  if (!note) { alert('La note est vide.'); return; }
  // Récupérer ou créer l'entrée
  var existing = getEntry(date);
  var entry = existing || { energie: null, qualite_sommeil: null, douleurs: null, clarte_mentale: null, humeur: null, rmssd: null };
  entry.note = note;
  saveEntry(date, entry);
  // Fermer le formulaire
  document.getElementById('journal-add-zone').style.display = 'none';
  document.getElementById('btn-journal-add').textContent = '+ Ajouter une note';
  // Rafraîchir la liste en mode showAll pour voir la note même ancienne
  renderJournalNotes(true);
}

function cancelNoteAdd() {
  document.getElementById('journal-add-zone').style.display = 'none';
  document.getElementById('btn-journal-add').textContent = '+ Ajouter une note';
}

function toggleEmptyNoteEdit(date) {
  var safeDate = date.replace(/-/g, '_');
  var zone = document.getElementById('journal-empty-edit-' + safeDate);
  if (!zone) return;
  var opening = zone.style.display === 'none';
  zone.style.display = opening ? 'block' : 'none';
  if (opening) {
    var ta = document.getElementById('journal-empty-textarea-' + safeDate);
    if (ta) ta.focus();
  }
}

function saveEmptyNote(date) {
  var safeDate = date.replace(/-/g, '_');
  var ta = document.getElementById('journal-empty-textarea-' + safeDate);
  if (!ta) return;
  var note = ta.value.trim();
  if (!note) { alert('La note est vide.'); return; }
  var existing = getEntry(date);
  var entry = existing || { energie: null, qualite_sommeil: null, douleurs: null, clarte_mentale: null, humeur: null, rmssd: null };
  entry.note = note;
  saveEntry(date, entry);
  renderJournalNotes(document.getElementById('journal-notes-list').dataset.showAll === 'true');
}

function cancelEmptyNote(date) {
  var safeDate = date.replace(/-/g, '_');
  var zone = document.getElementById('journal-empty-edit-' + safeDate);
  if (zone) zone.style.display = 'none';
}

function saveNoteEdit(date) {
  var safeDate = date.replace(/-/g, '_');
  var ta = document.getElementById('journal-note-textarea-' + safeDate);
  if (!ta) return;
  var newNote = ta.value.trim();
  var entry = getEntry(date);
  if (!entry) return;
  entry.note = newNote;
  saveEntry(date, entry);
  renderJournalNotes();
}

function deleteNoteJournal(date) {
  if (!confirm('Supprimer la note du ' + formatDateFr(date) + ' ?')) return;
  var entry = getEntry(date);
  if (!entry) return;
  entry.note = null;
  saveEntry(date, entry);
  renderJournalNotes();
}

// ============================================================
// FEATURE V2 — Export PDF carnet de notes (sans IA)
// ============================================================

function _journalCleanStr(str) {
  return (str || '')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[^\x00-\x7F\u00C0-\u024F]/g, function(c) {
      var map = {
        '\u00e9':'e','\u00e8':'e','\u00ea':'e','\u00eb':'e',
        '\u00e0':'a','\u00e2':'a','\u00e4':'a','\u00e7':'c',
        '\u00ee':'i','\u00ef':'i','\u00f4':'o','\u00f6':'o',
        '\u00f9':'u','\u00fb':'u','\u00fc':'u',
        '\u00e6':'ae','\u0153':'oe',
        '\u2019':"'",'\u2018':"'",'\u201c':'"','\u201d':'"',
        '\u2013':'-','\u2014':'--','\u2026':'...'
      };
      return map[c] || '';
    })
    .trim();
}

// ============================================================
// FEATURE V3 — Export PDF événements & essais
// ============================================================

function _pdfOpenTab(doc, filename) {
  var win = window.open('', '_blank');
  if (win) {
    win.document.write('<html><head><title>' + filename + '</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8faf9;"><p style="color:#2d6a4f;font-size:16px;">Generation...</p></body></html>');
  }
  var blob = doc.output('blob');
  var url = URL.createObjectURL(blob);
  if (win) { win.location.href = url; } else { doc.save(filename); }
}

function generateEventsPDF() {
  if (!window.jspdf) { alert('jsPDF non disponible.'); return; }
  var keys = Object.keys(localStorage).filter(function(k) { return k.startsWith('boussole_event_'); }).sort().reverse();
  var events = keys.map(function(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; }
  }).filter(Boolean);
  if (events.length === 0) { alert('Aucun événement enregistré.'); return; }
  var labels = { 'reaction-medicament': 'Réaction médicament', 'symptome-inhabituel': 'Symptôme inhabituel',
    'bonne-journee-exceptionnelle': 'Bonne journée exceptionnelle', 'mauvaise-journee-exceptionnelle': 'Mauvaise journée exceptionnelle', 'autre': 'Autre' };
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var mL = 18, mR = 18, mT = 20, pageW = 210, pageH = 297, contentW = pageW - mL - mR;
  var y = mT;
  function chk(n) { if (y + n > pageH - 18) { doc.addPage(); y = mT; hdr(); } }
  function hdr() {
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(120,140,130);
    doc.text('myBoussole - Evénements notables', mL, 12);
    doc.text(new Date().toLocaleDateString('fr-FR'), pageW - mR, 12, { align: 'right' });
    doc.setDrawColor(210,220,215); doc.line(mL, 14, pageW - mR, 14); doc.setTextColor(6,23,45);
  }
  hdr();
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(45,106,79);
  doc.text('Événements notables', mL, y + 10);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(100,120,110);
  doc.text(_journalCleanStr(events.length + ' événement' + (events.length > 1 ? 's' : '') + ' - exporté le ' + new Date().toLocaleDateString('fr-FR')), mL, y + 18);
  doc.setDrawColor(45,106,79); doc.setLineWidth(0.5); doc.line(mL, y + 22, pageW - mR, y + 22);
  y += 30;
  events.forEach(function(e, idx) {
    if (idx > 0) { chk(6); doc.setDrawColor(220,230,225); doc.setLineWidth(0.2); doc.line(mL, y, pageW - mR, y); y += 5; }
    chk(10);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(45,106,79);
    doc.text(_journalCleanStr(formatDateFr(e.date)), mL, y);
    if (e.type) {
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(120,140,130);
      doc.text(_journalCleanStr(labels[e.type] || e.type), mL, y + 5); y += 7;
    } else { y += 3; }
    if (e.description) {
      doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(6,23,45);
      var lines = doc.splitTextToSize(_journalCleanStr(e.description), contentW);
      lines.forEach(function(l) { chk(6); doc.text(l, mL, y + 4); y += 5.5; });
    }
    y += 3;
  });
  var tot = doc.getNumberOfPages();
  for (var p = 1; p <= tot; p++) { doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(160,170,165); doc.text('Page ' + p + ' / ' + tot, pageW/2, pageH-10, { align:'center' }); }
  _pdfOpenTab(doc, 'myBoussole-evenements-' + new Date().toISOString().split('T')[0] + '.pdf');
}

function generateEssaisPDF() {
  if (!window.jspdf) { alert('jsPDF non disponible.'); return; }
  var essais = loadEssais();
  if (essais.length === 0) { alert('Aucun essai enregistré.'); return; }
  var sorted = essais.slice().sort(function(a,b) { return (b.date_debut||'').localeCompare(a.date_debut||''); });
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var mL = 18, mR = 18, mT = 20, pageW = 210, pageH = 297, contentW = pageW - mL - mR;
  var y = mT;
  function chk(n) { if (y + n > pageH - 18) { doc.addPage(); y = mT; hdr(); } }
  function hdr() {
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(120,140,130);
    doc.text('myBoussole - Mes essais', mL, 12);
    doc.text(new Date().toLocaleDateString('fr-FR'), pageW - mR, 12, { align: 'right' });
    doc.setDrawColor(210,220,215); doc.line(mL, 14, pageW - mR, 14); doc.setTextColor(6,23,45);
  }
  hdr();
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(45,106,79);
  doc.text('Mes essais', mL, y + 10);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(100,120,110);
  doc.text(_journalCleanStr(sorted.length + ' essai' + (sorted.length > 1 ? 's' : '') + ' - exporté le ' + new Date().toLocaleDateString('fr-FR')), mL, y + 18);
  doc.setDrawColor(45,106,79); doc.setLineWidth(0.5); doc.line(mL, y + 22, pageW - mR, y + 22);
  y += 30;
  sorted.forEach(function(e, idx) {
    if (idx > 0) { chk(6); doc.setDrawColor(220,230,225); doc.setLineWidth(0.2); doc.line(mL, y, pageW - mR, y); y += 5; }
    chk(12);
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(45,106,79);
    doc.text(_journalCleanStr(e.nom || ''), mL, y);
    var meta = [];
    if (e.type) meta.push(e.type);
    if (e.effet) meta.push('Effet: ' + e.effet);
    if (e.arret === 'Oui') meta.push('Arrete');
    if (meta.length > 0) {
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(120,140,130);
      doc.text(meta.join('  |  '), mL, y + 5); y += 8;
    } else { y += 5; }
    if (e.date_debut) {
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,120,110);
      doc.text('Depuis le ' + _journalCleanStr(formatDateFr(e.date_debut)), mL, y + 3); y += 6;
    }
    if (e.objectif) {
      doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(6,23,45);
      var lines = doc.splitTextToSize('Objectif: ' + _journalCleanStr(e.objectif), contentW);
      lines.forEach(function(l) { chk(6); doc.text(l, mL, y + 4); y += 5.5; });
    }
    if (e.raison_arret) {
      doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(150,80,80);
      var rlines = doc.splitTextToSize('Raison arret: ' + _journalCleanStr(e.raison_arret), contentW);
      rlines.forEach(function(l) { chk(6); doc.text(l, mL, y + 4); y += 5.5; });
    }
    y += 3;
  });
  var tot = doc.getNumberOfPages();
  for (var p = 1; p <= tot; p++) { doc.setPage(p); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(160,170,165); doc.text('Page ' + p + ' / ' + tot, pageW/2, pageH-10, { align:'center' }); }
  _pdfOpenTab(doc, 'myBoussole-essais-' + new Date().toISOString().split('T')[0] + '.pdf');
}

function generateJournalPDF() {
  if (!window.jspdf) {
    alert('jsPDF non disponible - verifiez votre connexion.');
    return;
  }
  var data = loadEntries();
  var withNotes = (data.entries || []).filter(function(e) { return e.note && e.note.trim() !== ''; });
  if (withNotes.length === 0) {
    alert('Aucune note a exporter.');
    return;
  }

  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var mL = 18, mR = 18, mT = 20, pageW = 210, pageH = 297;
  var contentW = pageW - mL - mR;
  var y = mT;

  // --- helpers ---
  function checkPage(needed) {
    if (y + needed > pageH - 18) { doc.addPage(); y = mT; drawPageHeader(); }
  }

  function drawPageHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 140, 130);
    doc.text('myBoussole - Carnet de notes', mL, 12);
    var dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(dateStr, pageW - mR, 12, { align: 'right' });
    doc.setDrawColor(210, 220, 215);
    doc.line(mL, 14, pageW - mR, 14);
    doc.setTextColor(6, 23, 45);
  }

  // --- page 1 : titre ---
  drawPageHeader();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(45, 106, 79);
  doc.text('Mon journal', mL, y + 10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 120, 110);
  doc.text(_journalCleanStr(withNotes.length + ' note' + (withNotes.length > 1 ? 's' : '') + ' - exporte le ' + new Date().toLocaleDateString('fr-FR')), mL, y + 19);
  doc.setDrawColor(45, 106, 79);
  doc.setLineWidth(0.5);
  doc.line(mL, y + 24, pageW - mR, y + 24);
  y += 32;

  // --- entrees ---
  withNotes.forEach(function(e, idx) {
    var dateLabel = formatDateFr(e.date);

    // separateur entre entrees
    if (idx > 0) {
      checkPage(8);
      doc.setDrawColor(220, 230, 225);
      doc.setLineWidth(0.2);
      doc.line(mL, y, pageW - mR, y);
      y += 6;
    }

    // date
    checkPage(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(45, 106, 79);
    doc.text(_journalCleanStr(dateLabel), mL, y);
    y += 1;

    // scores sur une ligne si disponibles
    var scores = [];
    if (e.humeur != null)         scores.push('Humeur ' + e.humeur + '/10');
    if (e.energie != null)        scores.push('Energie ' + e.energie + '/10');
    if (e.qualite_sommeil != null) scores.push('Sommeil ' + e.qualite_sommeil + '/10');
    if (e.douleurs != null)       scores.push('Confort ' + e.douleurs + '/10');
    if (e.clarte_mentale != null) scores.push('Clarte ' + e.clarte_mentale + '/10');
    if (scores.length > 0) {
      checkPage(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 140, 130);
      doc.text(scores.join('  |  '), mL, y + 5);
      y += 8;
    } else {
      y += 4;
    }

    // note complete
    var noteClean = _journalCleanStr(e.note);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(6, 23, 45);
    var lines = doc.splitTextToSize(noteClean, contentW);
    lines.forEach(function(line) {
      checkPage(6);
      doc.text(line, mL, y + 5);
      y += 5.5;
    });
    y += 3;
  });

  // --- pied de page numerotation ---
  var totalPages = doc.getNumberOfPages();
  for (var p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(160, 170, 165);
    doc.text('Page ' + p + ' / ' + totalPages, pageW / 2, pageH - 10, { align: 'center' });
  }

  _pdfOpenTab(doc, 'myBoussole-journal-' + new Date().toISOString().split('T')[0] + '.pdf');
}

// ============================================================
// FEATURE S — Mini-fiches contextuelles inline
// ============================================================

function detectFichesPatterns(entries7j) {
  const patterns = [];
  if (!entries7j || entries7j.length < 3) return patterns;

  const sorted = entries7j.slice().sort((a, b) => a.date < b.date ? -1 : 1);

  // Pattern 1 : crash post-effort
  // Énergie basse (<=4) le lendemain d'un score énergie élevé (>=7)
  let crashCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.energie >= 7 && curr.energie <= 4) crashCount++;
  }
  if (crashCount >= 2) patterns.push('crash-post-effort');

  // Pattern 2 : score énergie chroniquement bas (dysautonomie)
  const energieMoy = sorted.reduce((s, e) => s + (e.energie || 0), 0) / sorted.length;
  if (energieMoy <= 4 && patterns.indexOf('crash-post-effort') === -1) {
    patterns.push('dysautonomie-score-bas');
  }

  // Pattern 3 : qualité sommeil mauvaise + énergie basse au réveil (fatigue matinale)
  const sommeilBas = sorted.filter(e => (e.qualite_sommeil || 0) <= 3).length;
  if (sommeilBas >= 4) patterns.push('fatigue-matinale');

  // Pattern 4 : clarté mentale basse fréquente (brouillard)
  const clarteBas = sorted.filter(e => (e.clarte_mentale || 0) <= 3).length;
  if (clarteBas >= 4) patterns.push('brouillard-mental');

  // Max 2 fiches affichées simultanément
  return patterns.slice(0, 2);
}

function buildBlocFiches(patterns) {
  if (!patterns || !patterns.length) return '';
  if (typeof FICHES_DATA === 'undefined') return '';

  const fiches = patterns.map(p => FICHES_DATA[p]).filter(Boolean);
  if (!fiches.length) return '';

  return '<div class="bloc-fiches" id="bloc-fiches">' +
    '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#06172D;">Comprendre ce que tu vis</p>' +
    fiches.map(renderFicheInline).join('') +
    '</div>';
}

function renderFicheInline(fiche) {
  const sections = fiche.sections.map(function(s) {
    return '<div class="fiche-section">' +
      '<strong class="fiche-section-titre">' + s.titre + '</strong>' +
      '<p class="fiche-section-texte">' + s.contenu + '</p>' +
      '</div>';
  }).join('');

  const lien = fiche.lien_vitrine
    ? '<a class="fiche-lien" href="' + fiche.lien_vitrine + '" target="_blank" rel="noopener">' + fiche.lien_label + ' &rarr;</a>'
    : '';

  return '<div class="fiche-inline" id="fiche-' + fiche.id + '">' +
    '<button class="fiche-header" onclick="toggleFicheInline(\'' + fiche.id + '\')" aria-expanded="false">' +
      '<span class="fiche-titre">' + fiche.titre + '</span>' +
      '<span class="fiche-chevron" aria-hidden="true">&#x203A;</span>' +
    '</button>' +
    '<div class="fiche-body" hidden>' +
      '<p class="fiche-intro">' + fiche.intro + '</p>' +
      sections +
      lien +
    '</div>' +
  '</div>';
}

function toggleFicheInline(id) {
  var el = document.getElementById('fiche-' + id);
  if (!el) return;
  var body = el.querySelector('.fiche-body');
  var chevron = el.querySelector('.fiche-chevron');
  var btn = el.querySelector('.fiche-header');
  var isHidden = body.hasAttribute('hidden');
  if (isHidden) {
    body.removeAttribute('hidden');
    chevron.innerHTML = '&#x2304;';
    btn.setAttribute('aria-expanded', 'true');
  } else {
    body.setAttribute('hidden', '');
    chevron.innerHTML = '&#x203A;';
    btn.setAttribute('aria-expanded', 'false');
  }
}

// ============================================================
// Feature D — Profil foyers dominants
// ============================================================

function ouvrirModaleProfil() {
  const overlay = document.getElementById('modal-profil');
  if (!overlay) return;
  const container = document.getElementById('profil-cards-container');
  if (container && window.PROFILS_DATA) {
    const profilActuel = localStorage.getItem('boussole_profil');
    container.innerHTML = Object.values(window.PROFILS_DATA).map(p => `
      <div class="profil-card${profilActuel === p.id ? ' selected' : ''}" data-id="${p.id}" onclick="selectionnerProfil('${p.id}')">
        <div class="profil-card-emoji">${p.emoji}</div>
        <div class="profil-card-text">
          <p class="profil-card-label">${p.label}</p>
          <p class="profil-card-desc">${p.description}</p>
        </div>
      </div>`).join('');
    const btn = document.getElementById('btn-confirmer-profil');
    if (btn) btn.disabled = !profilActuel;
    if (profilActuel && btn) btn.dataset.selected = profilActuel;
  }
  overlay.classList.add('active');
}

function fermerModaleProfil() {
  document.getElementById('modal-profil')?.classList.remove('active');
  renderProfilActifDisplay();
}

function selectionnerProfil(id) {
  document.querySelectorAll('.profil-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.profil-card[data-id="${id}"]`)?.classList.add('selected');
  const btn = document.getElementById('btn-confirmer-profil');
  if (btn) {
    btn.disabled = false;
    btn.dataset.selected = id;
  }
}

function confirmerProfil() {
  const btn = document.getElementById('btn-confirmer-profil');
  const id = btn?.dataset.selected
    || document.querySelector('.profil-card.selected')?.dataset.id;
  if (id && window.setProfilActif) {
    window.setProfilActif(id);
    fermerModaleProfil();
    if (document.getElementById('panel-resume')?.classList.contains('active')) {
      refreshSummary();
    }
  }
}

function renderProfilActifDisplay() {
  const el = document.getElementById('profil-actif-display');
  if (!el) return;
  const p = window.getProfilActif ? window.getProfilActif() : null;
  el.innerHTML = p
    ? `<span class="profil-badge">${p.emoji} ${p.label}</span>`
    : '<span style="font-size:13px;color:rgba(6,23,45,.42);font-style:italic;">Aucun profil défini</span>';
}
