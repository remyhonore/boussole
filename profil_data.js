/**
 * Boussole — Feature D : Profil foyers dominants
 * localStorage key : boussole_profil  (ex: "dysautonomie")
 */

window.PROFILS_DATA = {
  dysautonomie: {
    id: 'dysautonomie',
    label: 'Dysautonomie / POTS',
    emoji: '⚡',
    description: 'FC au repos, vertiges, intolérance orthostatique.',
    tip: 'Ta FC repos et ton temps de repos sont tes indicateurs clés. Note-les chaque jour.',
    metriques_prioritaires: ['energie', 'fc_repos', 'repos_diurne']
  },
  pem_energie: {
    id: 'pem_energie',
    label: 'PEM / Énergie',
    emoji: '🔋',
    description: 'Crash après effort, enveloppe énergétique très réduite.',
    tip: "Le crash post-effort est ton signal prioritaire. Surveille l'énergie J+1 après un effort.",
    metriques_prioritaires: ['energie', 'douleur', 'repos_diurne']
  },
  neuroinflammation: {
    id: 'neuroinflammation',
    label: 'Brouillard mental',
    emoji: '🧠',
    description: 'Difficultés de concentration, mémoire, clarté mentale fluctuante.',
    tip: 'La clarté mentale et le sommeil sont tes baromètres. Un mauvais sommeil prédit souvent une journée brumeuse.',
    metriques_prioritaires: ['cognition', 'sommeil', 'douleur']
  },
  hormonal: {
    id: 'hormonal',
    label: 'Hormonal / Cycle',
    emoji: '🌙',
    description: 'Variations liées au cycle menstruel ou à la péri-ménopause.',
    tip: 'Tes variations suivent souvent ton cycle. Note les phases pour mieux anticiper les jours difficiles.',
    metriques_prioritaires: ['energie', 'humeur', 'sommeil']
  },
  mixte: {
    id: 'mixte',
    label: 'Profil mixte',
    emoji: '🔄',
    description: 'Plusieurs foyers actifs, symptômes variés et changeants.',
    tip: 'Ton profil est multifactoriel. Tous tes indicateurs comptent — surveille les patterns sur 7 jours.',
    metriques_prioritaires: ['energie', 'sommeil', 'cognition']
  }
};

/**
 * Retourne l'objet profil actif depuis localStorage, ou null.
 * @returns {Object|null}
 */
window.getProfilActif = function () {
  const id = localStorage.getItem('boussole_profil');
  return id && window.PROFILS_DATA[id] ? window.PROFILS_DATA[id] : null;
};

/**
 * Enregistre le profil actif en localStorage.
 * @param {string} id
 */
window.setProfilActif = function (id) {
  if (window.PROFILS_DATA[id]) {
    localStorage.setItem('boussole_profil', id);
  }
};
