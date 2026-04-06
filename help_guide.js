/**
 * help_guide.js — Guide complet des fonctionnalités myBoussole
 * IIFE — overlay plein écran, slides paginées, dots progression
 * Même pattern que onboarding_guide.js mais couvre TOUTES les features
 * Accessible depuis Paramètres : "Mode d'emploi complet"
 */
(function() {
  'use strict';

  var steps = [
    {
      emoji: '🧭',
      title: 'Bienvenue dans le mode d\'emploi',
      text: 'Découvre tout ce que myBoussole peut faire pour toi. Chaque écran présente une fonctionnalité.',
      sub: 'Tu peux revenir ici à tout moment depuis les Paramètres.'
    },
    {
      emoji: '🏠',
      title: 'Accueil — ton tableau de bord',
      text: 'Ton score du jour, tes métriques (énergie, sommeil, confort, clarté, humeur), la tendance de la semaine et ton prochain rendez-vous.',
      sub: 'Le score se calcule automatiquement à partir de ta saisie quotidienne.'
    },
    {
      emoji: '☀️',
      title: 'Ma journée — la saisie quotidienne',
      text: '4 curseurs : énergie, sommeil, confort physique, clarté mentale. Plus ton humeur en emoji et une note libre.',
      sub: 'Astuce : utilise les boutons "Hier" ou "Dernières valeurs" pour aller plus vite.'
    },
    {
      emoji: '🎤',
      title: 'Dictée vocale',
      text: 'Appuie sur le micro à côté de ta note ou dans le journal pour dicter au lieu de taper.',
      sub: 'Fonctionne avec le micro de ton téléphone. Parle naturellement.'
    },
    {
      emoji: '📓',
      title: 'Journal — ton espace privé',
      text: 'Écris ce que tu ressens, tagge tes entrées (fatigue, douleur, moral, sommeil, énergie, PEM, autre) et choisis un mood.',
      sub: 'Filtre par tag ou par période. Exporte en PDF. Tout reste sur ton appareil.'
    },
    {
      emoji: '📋',
      title: 'Mes rendez-vous',
      text: 'Planifie tes prochains RDV, choisis la catégorie du praticien (MG, spécialiste, thérapie, examens) et retrouve-les sur le calendrier.',
      sub: 'Les RDV passés restent visibles avec un résumé des décisions prises.'
    },
    {
      emoji: '🩺',
      title: 'Historique consultations',
      text: 'Après chaque RDV, enregistre les décisions, les examens demandés, le traitement à tester et la date de réévaluation.',
      sub: 'Ces infos apparaissent automatiquement dans ton résumé PDF pour le prochain rendez-vous.'
    },
    {
      emoji: '💊',
      title: 'Mes traitements',
      text: 'Documente tes médicaments, compléments et stratégies. Dose, fréquence, moment de prise, paliers.',
      sub: 'Les traitements actifs sont intégrés dans ton PDF de consultation.'
    },
    {
      emoji: '📊',
      title: 'Graphiques et tendances',
      text: 'Visualise l\'évolution de tes 4 indicateurs sur 7, 14, 30 ou 90 jours. Les débuts de traitement et les crashes apparaissent sur le graphique.',
      sub: 'Onglet Suivi → Évolution de mon bien-être.'
    },
    {
      emoji: '🎯',
      title: 'Score de stabilité',
      text: 'Compare la régularité de tes scores entre les 15 premiers et les 15 derniers jours du mois. Moins de variations = état plus prévisible.',
      sub: 'Onglet Suivi → Variabilité de ton ressenti.'
    },
    {
      emoji: '🌡️',
      title: 'Données objectives',
      text: 'Renseigne ta fréquence cardiaque, ta tension, ta VFC (RMSSD) ou ton poids dans la section "Mes mesures" de Ma journée.',
      sub: 'Ces données enrichissent ton PDF de consultation.'
    },
    {
      emoji: '🧩',
      title: 'Arbre des ressentis',
      text: 'Un questionnaire interactif qui analyse tes ressentis par domaine et suggère des pistes à explorer avec ton professionnel de santé.',
      sub: 'Onglet Suivi → Arbre des ressentis. 7 domaines, 23 questions.'
    },
    {
      emoji: '⚡',
      title: 'Pacing et énergie',
      text: 'Suis ta stabilité matinale, gère ton enveloppe d\'énergie quotidienne et détecte les variations importantes (PEM).',
      sub: 'Onglet Suivi → Énergie et pacing.'
    },
    {
      emoji: '📄',
      title: 'Exports PDF',
      text: 'Deux exports disponibles : le PDF enrichi (multi-pages, graphiques, corrélations) et le PDF consultation (1 page synthétique pour ton médecin).',
      sub: 'Onglet Suivi → Mon résumé personnel / Message à mon médecin.'
    },
    {
      emoji: '📅',
      title: 'Calendrier Year in Pixels',
      text: 'Chaque jour est une case colorée selon ton score. Visualise une année entière d\'un coup d\'oeil.',
      sub: 'Onglet Suivi → Year in Pixels. Choisis l\'indicateur à afficher.'
    },
    {
      emoji: '🔒',
      title: 'Tes données, ton appareil',
      text: 'Aucune donnée ne quitte ton téléphone. Pas de compte, pas de serveur, pas de cloud. Tout est stocké localement.',
      sub: 'Tu peux exporter/importer tes données en JSON depuis les Paramètres.'
    },
    {
      emoji: '📲',
      title: 'Ajouter à ton écran d\'accueil',
      text: 'Pour un accès rapide, ajoute myBoussole à ton écran d\'accueil depuis ton navigateur.',
      sub: 'iPhone : bouton Partager → Ajouter à l\'écran d\'accueil. Android : menu ⋮ → Ajouter à l\'écran d\'accueil.'
    },
    {
      emoji: '⚙️',
      title: 'Paramètres',
      text: 'Genre, préférence d\'accordéons, thème sombre, export/import de données, et relancement du guide de démarrage.',
      sub: 'C\'est aussi ici que tu retrouveras ce mode d\'emploi.'
    },
    {
      emoji: '💡',
      title: 'Tu sais tout !',
      text: 'L\'essentiel, c\'est la régularité. Quelques minutes par jour suffisent pour construire un suivi utile.',
      sub: 'Bonne route avec myBoussole.'
    }
  ];

  var currentStep = 0;
  var overlay = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'help-guide-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Mode d\'emploi complet');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(6,23,45,.92);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(overlay);
    renderStep();
  }

  function renderStep() {
    var s = steps[currentStep];
    var total = steps.length;
    var isLast = currentStep === total - 1;

    // Dots — en groupes pour ne pas dépasser sur mobile
    var dotsHtml = '';
    for (var i = 0; i < total; i++) {
      var active = i === currentStep;
      dotsHtml += '<span style="display:inline-block;width:' + (active ? '18px' : '6px') + ';height:6px;border-radius:3px;background:' + (active ? '#2d6a4f' : 'rgba(45,106,79,.25)') + ';transition:all .3s;"></span>';
    }

    // Compteur textuel
    var counterHtml = '<span style="font-size:11px;color:rgba(6,23,45,.4);">' + (currentStep + 1) + '/' + total + '</span>';

    overlay.innerHTML = '<div style="background:#fff;border-radius:24px;max-width:380px;width:100%;padding:32px 24px 24px;box-shadow:0 32px 80px rgba(6,23,45,.4);text-align:center;animation:helpGuideIn .3s ease-out;">'
      + '<div style="font-size:48px;margin:0 0 12px;line-height:1;">' + s.emoji + '</div>'
      + '<h2 style="font-size:18px;font-weight:800;color:#06172D;margin:0 0 10px;line-height:1.3;">' + s.title + '</h2>'
      + '<p style="font-size:13px;color:rgba(6,23,45,.72);margin:0 0 6px;line-height:1.6;">' + s.text + '</p>'
      + (s.sub ? '<p style="font-size:12px;color:rgba(6,23,45,.45);margin:0 0 20px;line-height:1.5;">' + s.sub + '</p>' : '<div style="height:20px;"></div>')
      + '<div style="display:flex;align-items:center;justify-content:center;gap:4px;margin:0 0 6px;flex-wrap:wrap;">' + dotsHtml + '</div>'
      + '<div style="margin:0 0 20px;">' + counterHtml + '</div>'
      + '<div style="display:flex;gap:10px;">'
      + (currentStep > 0 ? '<button id="help-btn-back" style="flex:1;padding:12px;background:none;border:1.5px solid rgba(110,135,125,.35);border-radius:12px;font-size:13px;font-weight:600;color:rgba(6,23,45,.55);cursor:pointer;font-family:inherit;">Retour</button>' : '')
      + '<button id="help-btn-next" style="flex:2;padding:12px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">' + (isLast ? 'Fermer' : 'Suivant') + '</button>'
      + '</div>'
      + '<button id="help-btn-close" style="margin-top:14px;background:none;border:none;font-size:12px;color:rgba(6,23,45,.35);cursor:pointer;padding:4px;font-family:inherit;">Fermer le guide</button>'
      + '</div>';

    // Event listeners
    var btnNext = document.getElementById('help-btn-next');
    var btnBack = document.getElementById('help-btn-back');
    var btnClose = document.getElementById('help-btn-close');

    if (btnNext) btnNext.addEventListener('click', function() {
      if (isLast) { closeGuide(); } else { currentStep++; renderStep(); }
    });
    if (btnBack) btnBack.addEventListener('click', function() {
      if (currentStep > 0) { currentStep--; renderStep(); }
    });
    if (btnClose) btnClose.addEventListener('click', function() {
      closeGuide();
    });
  }

  function closeGuide() {
    if (overlay && overlay.parentNode) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .25s ease-out';
      setTimeout(function() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
      }, 250);
    }
  }

  // API publique
  window.HelpGuide = {
    show: function() {
      currentStep = 0;
      buildOverlay();
    }
  };

  // CSS animation
  var style = document.createElement('style');
  style.textContent = '@keyframes helpGuideIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}';
  document.head.appendChild(style);

})();
