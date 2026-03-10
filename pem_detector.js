/**
 * Boussole — Detecteur PEM (Post-Exertional Malaise)
 * Phase 1 : detection + affichage Resume
 */

(function () {

  /**
   * Formate une date en "08 mars"
   */
  function formatDatePEM(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var mois = ['janv.', 'fevr.', 'mars', 'avr.', 'mai', 'juin',
                'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];
    return String(d.getDate()).padStart(2, '0') + ' ' + mois[d.getMonth()];
  }

  /**
   * Ajoute n jours a une date ISO
   */
  function addDays(dateStr, n) {
    var d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  /**
   * Detecte les episodes de crash apres effort (PEM pattern)
   * @param {Array}  days    - [{date: "YYYY-MM-DD", score: number}] tri chronologique
   * @param {Object} mesures - map "boussole_mesures_YYYY-MM-DD" -> {fc, rmssd, ...}
   * @returns {Array} events
   */
  window.detectPEMEvents = function (days, mesures) {
    if (!days || days.length === 0) return [];

    // Lookup rapide score par date
    var scoreByDate = {};
    days.forEach(function (d) { scoreByDate[d.date] = d.score; });

    function getMesures(dateStr) {
      var key = 'boussole_mesures_' + dateStr;
      return (mesures && mesures[key]) ? mesures[key] : null;
    }

    var events = [];
    var processedCrashDates = {};

    days.forEach(function (dayJ) {
      if (dayJ.score < 6) return;

      var dateJ1 = addDays(dayJ.date, 1);
      var dateJ2 = addDays(dayJ.date, 2);

      var scoreJ1 = (scoreByDate[dateJ1] !== undefined) ? scoreByDate[dateJ1] : null;
      var scoreJ2 = (scoreByDate[dateJ2] !== undefined) ? scoreByDate[dateJ2] : null;

      var crashDate = null;
      var crashScore = null;
      var delay = null;

      // J+1 present et crash
      if (scoreJ1 !== null && scoreJ1 <= 4 && (dayJ.score - scoreJ1) >= 2) {
        crashDate = dateJ1;
        crashScore = scoreJ1;
        delay = 1;
      }
      // J+1 absent ou pas en crash : tester J+2
      else if (scoreJ2 !== null && scoreJ2 <= 4 && (dayJ.score - scoreJ2) >= 2) {
        // Si J+1 est absent OU present mais > 4
        if (scoreJ1 === null || scoreJ1 > 4) {
          crashDate = dateJ2;
          crashScore = scoreJ2;
          delay = 2;
        }
      }

      if (!crashDate) return;
      // Eviter les doublons pour un meme crash
      if (processedCrashDates[crashDate]) return;
      processedCrashDates[crashDate] = true;

      var delta = parseFloat((dayJ.score - crashScore).toFixed(2));

      // Mesures pour determiner le niveau
      var mesJ     = getMesures(dayJ.date);
      var mesCrash = getMesures(crashDate);

      var fcJ     = (mesJ     && mesJ.fc     != null) ? mesJ.fc     : null;
      var fcCrash = (mesCrash && mesCrash.fc != null) ? mesCrash.fc : null;
      var fcDelta = (fcJ !== null && fcCrash !== null) ? (fcCrash - fcJ) : null;

      var rmssdJ     = (mesJ     && mesJ.rmssd     != null) ? mesJ.rmssd     : null;
      var rmssdCrash = (mesCrash && mesCrash.rmssd != null) ? mesCrash.rmssd : null;
      var rmssdDelta = (rmssdJ !== null && rmssdCrash !== null) ? (rmssdCrash - rmssdJ) : null;

      var level = 'probable';
      if (fcDelta !== null && fcDelta >= 5) {
        level = 'confirmed';
        if (rmssdDelta !== null && rmssdDelta <= -10) {
          level = 'reinforced';
        }
      }

      events.push({
        dateJ:      dayJ.date,
        dateCrash:  crashDate,
        scoreJ:     parseFloat(dayJ.score.toFixed(2)),
        scoreCrash: parseFloat(crashScore.toFixed(2)),
        delta:      delta,
        delay:      delay,
        level:      level,
        fcJ:        fcJ,
        fcCrash:    fcCrash,
        fcDelta:    fcDelta,
        rmssdJ:     rmssdJ,
        rmssdCrash: rmssdCrash,
        rmssdDelta: rmssdDelta,
        // helper pour affichage
        dateJFr:     formatDatePEM(dayJ.date),
        dateCrashFr: formatDatePEM(crashDate)
      });
    });

    return events;
  };

  /**
   * Calcule un resume des episodes PEM
   * @param {Array} events - resultat de detectPEMEvents
   * @returns {Object} {count, avgDelta, avgDelay, confirmedCount}
   */
  window.getPEMSummary = function (events) {
    if (!events || events.length === 0) {
      return { count: 0, avgDelta: null, avgDelay: null, confirmedCount: 0 };
    }

    var count = events.length;
    var totalDelta = 0;
    var totalDelay = 0;
    var confirmedCount = 0;

    events.forEach(function (e) {
      totalDelta += e.delta;
      totalDelay += e.delay;
      if (e.level === 'confirmed' || e.level === 'reinforced') confirmedCount++;
    });

    return {
      count:          count,
      avgDelta:       parseFloat((totalDelta / count).toFixed(2)),
      avgDelay:       parseFloat((totalDelay / count).toFixed(2)),
      confirmedCount: confirmedCount
    };
  };

  /**
   * Verifie si une alerte pacing doit etre affichee
   * (3 jours consecutifs avec score >= 7)
   * @param {Array} days - [{date: "YYYY-MM-DD", score: number}] tri chronologique
   * @returns {boolean}
   */
  window.shouldShowPacingAlert = function (days) {
    if (!days || days.length < 3) return false;

    // Verifier si l'alerte a deja ete dismissee aujourd'hui
    var today = new Date().toISOString().split('T')[0];
    var dismissKey = 'boussole_pacing_alert_dismissed_' + today;
    try {
      if (localStorage.getItem(dismissKey)) return false;
    } catch (e) { return false; }

    // Trier et prendre les 3 jours les plus recents
    var sorted = days.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    var last3 = sorted.slice(-3);
    if (last3.length < 3) return false;

    // Verifier que les 3 jours sont bien consecutifs
    for (var i = 1; i < last3.length; i++) {
      var prev = new Date(last3[i - 1].date + 'T12:00:00');
      var curr = new Date(last3[i].date + 'T12:00:00');
      var diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff !== 1) return false;
    }

    // Verifier que tous ont un score >= 7
    return last3.every(function (d) { return d.score >= 7; });
  };

})();
