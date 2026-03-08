/**
 * Boussole+ v1.0 - Application principale
 */

// État de l'application
const app = {
  currentPanel: 'today',
  lastSavedEntry: null,
  undoTimer: null,
  isGeneratingPDF: false
};

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
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
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
  
  // Activer le panel sélectionné
  const navBtn = document.querySelector(`[data-panel="${panelId}"]`);
  const panel = document.getElementById(`panel-${panelId}`);
  
  if (navBtn) navBtn.classList.add('active');
  if (panel) panel.classList.add('active');
  
  app.currentPanel = panelId;
  
  // Rafraîchir le résumé si on affiche ce panel
  if (panelId === 'summary') {
    refreshSummary();
  }
}

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
    }
    if (entry.qualite_sommeil !== null) {
      document.getElementById('qualite-sommeil').value = entry.qualite_sommeil;
      document.getElementById('qualite-sommeil-value').textContent = entry.qualite_sommeil;
    }
    if (entry.douleurs !== null) {
      document.getElementById('douleurs').value = entry.douleurs;
      document.getElementById('douleurs-value').textContent = entry.douleurs;
    }
    if (entry.clarte_mentale !== null) {
      document.getElementById('clarte-mentale').value = entry.clarte_mentale;
      document.getElementById('clarte-mentale-value').textContent = entry.clarte_mentale;
    }
    if (entry.note) {
      document.getElementById('note').value = entry.note;
      document.getElementById('note-count').textContent = `${entry.note.length}/200`;
    }
  }
  
  updateLastSavedDisplay();
}

function saveCurrentEntry() {
  const energie = getSliderValue('energie');
  const qualiteSommeil = getSliderValue('qualite-sommeil');
  const douleurs = getSliderValue('douleurs');
  const clarteMentale = getSliderValue('clarte-mentale');
  const note = document.getElementById('note').value.trim();
  
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
    note: note || null
  };
  
  const success = saveEntry(today, entry);
  
  if (success) {
    showStatus('Enregistré ✓', 'success');
    showUndoButton();
    updateLastSavedDisplay();
    
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
  }
  if (lastEntry.qualite_sommeil !== null) {
    document.getElementById('qualite-sommeil').value = lastEntry.qualite_sommeil;
    document.getElementById('qualite-sommeil').dataset.touched = 'true';
    document.getElementById('qualite-sommeil-value').textContent = lastEntry.qualite_sommeil;
  }
  if (lastEntry.douleurs !== null) {
    document.getElementById('douleurs').value = lastEntry.douleurs;
    document.getElementById('douleurs').dataset.touched = 'true';
    document.getElementById('douleurs-value').textContent = lastEntry.douleurs;
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
  
  // En-tête
  html += `<div class="card">`;
  html += `<h2 class="card-title">📊 Résumé ${summary.windowDays} jours</h2>`;
  html += `<p>Jours renseignés : <strong>${summary.joursRenseignes}/${summary.totalJours}</strong></p>`;
  if (summary.lastDate) {
    html += `<p>Dernière saisie : <strong>${formatDateFr(summary.lastDate)}</strong></p>`;
  }
  
  // Message qualité
  if (summary.statusMessage) {
    html += `<div class="status status-warning" style="margin-top: 16px;">${summary.statusMessage}</div>`;
  }
  html += `</div>`;
  
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
  
  // 2. Variations
  if (summary.variations && summary.variations.length > 0) {
    html += `<div class="card">`;
    html += `<h2 class="summary-section">2️⃣ VARIATIONS IMPORTANTES</h2>`;
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
  
  // 3. Points marquants
  html += `<div class="card">`;
  html += `<h2 class="summary-section">3️⃣ POINTS MARQUANTS</h2>`;
  
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
    html += `<h2 class="summary-section">4️⃣ VOS NOTES</h2>`;
    html += `<ul class="summary-list">`;
    
    summary.notes.forEach(n => {
      html += `<li>${formatDateFr(n.date)} : "${n.note}"</li>`;
    });
    
    html += `</ul>`;
    html += `</div>`;
  }
  
  // 5. Prudence
  html += `<div class="card">`;
  html += `<h2 class="summary-section">5️⃣ PRUDENCE</h2>`;
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
document.getElementById('changelog-link')?.addEventListener('click', () => {
  const modal = document.getElementById('changelog-modal');
  if (modal) modal.style.display = 'flex';
});
document.getElementById('changelog-close')?.addEventListener('click', () => {
  document.getElementById('changelog-modal').style.display = 'none';
});
document.getElementById('changelog-ok')?.addEventListener('click', () => {
  document.getElementById('changelog-modal').style.display = 'none';
});
