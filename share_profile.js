/**
 * Boussole — Profil partageable
 * Canvas 1080×1080 + Web Share API / téléchargement
 */

window.generateShareProfile = function() {
  // 1. Entrées depuis localStorage
  let allEntries = [];
  try {
    const raw = localStorage.getItem('boussole_v1_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      allEntries = Array.isArray(parsed) ? parsed : (parsed.entries || []);
    }
  } catch (e) {}

  const sorted = allEntries.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const entries = sorted.slice(-30);

  if (entries.length < 7) {
    alert('Il te faut au moins 7 jours de données pour générer ton profil.');
    return;
  }

  // 2. Mesures biologiques par date
  const mesures = {};
  entries.forEach(function(e) {
    try {
      const raw = localStorage.getItem('boussole_mesures_' + e.date);
      if (raw) mesures[e.date] = JSON.parse(raw);
    } catch (err) {}
  });

  // Helper : score journalier (moyenne énergie + sommeil + (10-douleurs) + clarté)
  function dayScore(entry) {
    var vals = [
      entry.energie,
      entry.qualite_sommeil,
      entry.douleurs !== undefined && entry.douleurs !== null ? 10 - entry.douleurs : null,
      entry.clarte_mentale
    ].filter(function(v) { return v !== null && v !== undefined; });
    if (vals.length === 0) return null;
    return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
  }

  // 3. Profil dominant
  // PEM : score J >= 7 puis score J+1 <= 4
  var hasPEM = false;
  for (var i = 0; i < entries.length - 1; i++) {
    var sJ = dayScore(entries[i]);
    var sJ1 = dayScore(entries[i + 1]);
    if (sJ !== null && sJ1 !== null && sJ >= 7 && sJ1 <= 4) {
      hasPEM = true;
      break;
    }
  }

  // Dysautonomie : fc > 85 sur >= 3 mesures
  var fcHighCount = Object.values(mesures).filter(function(m) {
    return m && m.fc > 85;
  }).length;
  var hasDysautonomie = fcHighCount >= 3;

  // Cycle : cycle_phase renseigné dans mesures >= 5 jours
  var cycleCount = entries.filter(function(e) {
    var m = mesures[e.date];
    return m && m.cycle_phase;
  }).length;
  var hasCycle = cycleCount >= 5;

  var profileLabel;
  if (hasPEM) {
    profileLabel = 'Profil Énergie';
  } else if (hasDysautonomie) {
    profileLabel = 'Profil Dysautonomie';
  } else if (hasCycle) {
    profileLabel = 'Profil Cycle hormonal';
  } else {
    profileLabel = 'Profil Mixte';
  }

  // 4. 3 métriques les plus instables (écart-type)
  function stdDev(vals) {
    var valid = vals.filter(function(v) { return v !== null && v !== undefined; });
    if (valid.length < 2) return 0;
    var mean = valid.reduce(function(a, b) { return a + b; }, 0) / valid.length;
    var variance = valid.reduce(function(s, v) { return s + Math.pow(v - mean, 2); }, 0) / valid.length;
    return Math.sqrt(variance);
  }

  var metrics = [
    { label: 'Énergie',          std: stdDev(entries.map(function(e) { return e.energie; })) },
    { label: 'Sommeil',          std: stdDev(entries.map(function(e) { return e.qualite_sommeil; })) },
    { label: 'Confort physique', std: stdDev(entries.map(function(e) { return e.douleurs; })) },
    { label: 'Clarté mentale',   std: stdDev(entries.map(function(e) { return e.clarte_mentale; })) }
  ];
  metrics.sort(function(a, b) { return b.std - a.std; });
  var top3 = metrics.slice(0, 3);

  // 5. Tendance 30j : J1–J15 vs J16–J30
  function avgScores(arr) {
    var scores = arr.map(dayScore).filter(function(s) { return s !== null; });
    if (scores.length === 0) return null;
    return scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
  }
  var half = Math.floor(entries.length / 2);
  var avgFirst  = avgScores(entries.slice(0, half));
  var avgSecond = avgScores(entries.slice(half));

  var tendance = 'Stable \u2192';
  if (avgFirst !== null && avgSecond !== null) {
    if (avgSecond > avgFirst + 0.5)      tendance = 'En am\u00e9lioration \uD83D\uDCC8';
    else if (avgSecond < avgFirst - 0.5) tendance = 'En diminution \uD83D\uDCC9';
  }

  // 6. Génération canvas 1080×1080
  var canvas = document.createElement('canvas');
  canvas.width  = 1080;
  canvas.height = 1080;
  var ctx = canvas.getContext('2d');

  // Fond
  ctx.fillStyle = '#06172D';
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';

  // Titre
  ctx.fillStyle = '#2d6a4f';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('Boussole', 540, 100);

  // Sous-titre
  ctx.fillStyle = '#a0b4c8';
  ctx.font = '28px sans-serif';
  ctx.fillText('Mon profil bien-\u00eatre', 540, 155);

  // Séparateur horizontal 60 % de la largeur
  ctx.strokeStyle = '#2d6a4f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(540 - 324, 200);
  ctx.lineTo(540 + 324, 200);
  ctx.stroke();

  // Profil dominant
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(profileLabel, 540, 320);

  // Métriques variables — label
  ctx.fillStyle = '#a0b4c8';
  ctx.font = '24px sans-serif';
  ctx.fillText('Mes 3 m\u00e9triques les + variables', 540, 430);

  // Métriques — liste
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px sans-serif';
  top3.forEach(function(m, idx) {
    ctx.fillText('\u2022 ' + m.label, 540, 480 + idx * 50);
  });

  // Tendance — label
  ctx.fillStyle = '#a0b4c8';
  ctx.font = '24px sans-serif';
  ctx.fillText('Tendance 30 jours', 540, 660);

  // Tendance — valeur
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(tendance, 540, 710);

  // Disclaimer
  ctx.fillStyle = '#6b7280';
  ctx.font = '20px sans-serif';
  ctx.fillText('Donn\u00e9es 100\u00a0% personnelles \u00b7 Non diagnostiques', 540, 1020);

  // URL
  ctx.fillStyle = '#2d6a4f';
  ctx.font = '22px sans-serif';
  ctx.fillText('myboussole.fr', 540, 1055);

  // 7. Partager ou télécharger
  canvas.toBlob(function(blob) {
    if (!blob) return;
    var file = new File([blob], 'profil-boussole.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        title: 'Mon profil Boussole',
        text: 'Mon profil bien-\u00eatre \u2013 g\u00e9n\u00e9r\u00e9 avec Boussole (app.myboussole.fr) \uD83C\uDF3F',
        files: [file]
      }).catch(function(err) {
        if (err.name !== 'AbortError') console.warn('Share failed:', err);
      });
    } else {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'profil-boussole.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }
  }, 'image/png');
};
