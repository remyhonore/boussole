/**
 * Boussole+ v1.0 - Module de stockage
 * Gestion localStorage avec fallback mémoire (Safari iOS navigation privée)
 */

const STORAGE_KEY = 'boussole_v1_data';
const FAVORITES_KEY = 'boussole_v1_favorites';

// Fallback mémoire si localStorage indisponible
const memoryStore = {};

/**
 * Vérifie si localStorage est disponible
 */
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Récupère une valeur du storage
 */
function getItem(key) {
  try {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch (e) {
    return memoryStore[key] || null;
  }
}

/**
 * Sauvegarde une valeur dans le storage
 */
function setItem(key, value) {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    }
    memoryStore[key] = value;
    return true;
  } catch (e) {
    memoryStore[key] = value;
    return false;
  }
}

/**
 * Charge toutes les entrées
 */
function loadEntries() {
  try {
    const data = getItem(STORAGE_KEY);
    if (!data) {
      return { version: '1.0.0', entries: [] };
    }
    const parsed = JSON.parse(data);
    return parsed;
  } catch (e) {
    console.error('Erreur chargement données:', e);
    return { version: '1.0.0', entries: [] };
  }
}

/**
 * Sauvegarde toutes les entrées
 */
function saveEntries(data) {
  try {
    const json = JSON.stringify(data);
    setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    console.error('Erreur sauvegarde données:', e);
    return false;
  }
}

/**
 * Ajoute ou met à jour une entrée
 */
function saveEntry(date, entry) {
  const data = loadEntries();
  
  // Cherche si une entrée existe déjà pour cette date
  const existingIndex = data.entries.findIndex(e => e.date === date);
  
  const newEntry = {
    date,
    energie: entry.energie,
    qualite_sommeil: entry.qualite_sommeil,
    douleurs: entry.douleurs,
    clarte_mentale: entry.clarte_mentale,
    note: entry.note || null
  };
  
  if (existingIndex >= 0) {
    // Remplace l'entrée existante
    data.entries[existingIndex] = newEntry;
  } else {
    // Ajoute une nouvelle entrée
    data.entries.push(newEntry);
  }
  
  // Trie par date décroissante
  data.entries.sort((a, b) => b.date.localeCompare(a.date));
  
  return saveEntries(data);
}

/**
 * Récupère l'entrée d'une date spécifique
 */
function getEntry(date) {
  const data = loadEntries();
  return data.entries.find(e => e.date === date) || null;
}

/**
 * Récupère la dernière entrée
 */
function getLastEntry() {
  const data = loadEntries();
  if (data.entries.length === 0) return null;
  return data.entries[0]; // Déjà trié par date décroissante
}

/**
 * Supprime l'entrée d'une date
 */
function deleteEntry(date) {
  const data = loadEntries();
  data.entries = data.entries.filter(e => e.date !== date);
  return saveEntries(data);
}

/**
 * Charge les favoris (pour Phase 2)
 */
function loadFavorites() {
  try {
    const data = getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Sauvegarde les favoris (pour Phase 2)
 */
function saveFavorites(favorites) {
  try {
    setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Export toutes les données (pour debug)
 */
function exportAllData() {
  return loadEntries();
}

/**
 * Import données (pour debug/tests)
 */
function importData(data) {
  return saveEntries(data);
}
