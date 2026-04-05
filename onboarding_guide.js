/**
 * onboarding_guide.js — Guide de démarrage myBoussole (ADR-2026-044 Sprint 2)
 * IIFE — overlay plein écran, 5 étapes séquentielles, dots progression
 * Clé localStorage : boussole_guide_done
 * Réinitialisation : bouton dans Paramètres
 */
(function() {
  'use strict';

  var GUIDE_KEY = 'boussole_guide_done';

  var steps = [
    {
      emoji: '🧭',
      title: 'Bienvenue sur myBoussole',
      text: 'Ton journal de bien-être pour mieux comprendre ton corps au quotidien.',
      sub: '🔒 Tes données restent sur ton téléphone. Jamais partagées.',
      btn: 'Suivant'
    },
    {
      emoji: '☀️',
      title: 'Note ta journée',
      text: 'Chaque jour, 2 minutes pour noter ton énergie, ton sommeil, ton confort et ta clarté mentale.',
      sub: 'Onglet "Ma journée" — en haut de l\'écran.',
      btn: 'Suivant'
    },
    {
      emoji: '📊',
      title: 'Explore tes tendances',
      text: 'Ton résumé se construit automatiquement : score du jour, moyennes, évolution sur 30 jours.',
      sub: 'Plus tu notes, plus ton profil est précis.',
      btn: 'Suivant'
    },
    {
      emoji: '📋',
      title: 'Prépare tes rendez-vous',
      text: 'Exporte un résumé PDF clair pour ton professionnel de santé. Tes données parlent pour toi.',
      sub: 'Onglet "Suivi" → Mon résumé personnel.',
      btn: 'Suivant'
    },
    {
      emoji: '🚀',
      title: 'C\'est parti !',
      text: 'Commence par noter comment tu te sens aujourd\'hui. Ça prend moins de 2 minutes.',
      sub: '',
      btn: 'Commencer'
    }
  ];

  var currentStep = 0;
  var overlay = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'onboarding-guide-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Guide de démarrage');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(6,23,45,.92);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(overlay);
    renderStep();
  }

  function renderStep() {
    var s = steps[currentStep];
    var totalSteps = steps.length;
    var isLast = currentStep === totalSteps - 1;

    // Dots
    var dotsHtml = '';
    for (var i = 0; i < totalSteps; i++) {
      var active = i === currentStep;
      dotsHtml += '<span style="display:inline-block;width:' + (active ? '24px' : '8px') + ';height:8px;border-radius:4px;background:' + (active ? '#2d6a4f' : 'rgba(45,106,79,.3)') + ';transition:all .3s;"></span>';
    }

    overlay.innerHTML = '<div style="background:#fff;border-radius:24px;max-width:380px;width:100%;padding:36px 28px 28px;box-shadow:0 32px 80px rgba(6,23,45,.4);text-align:center;animation:guideIn .3s ease-out;">'
      + '<div style="font-size:56px;margin:0 0 16px;line-height:1;">' + s.emoji + '</div>'
      + '<h2 style="font-size:20px;font-weight:800;color:#06172D;margin:0 0 12px;line-height:1.3;">' + s.title + '</h2>'
      + '<p style="font-size:13px;color:rgba(6,23,45,.72);margin:0 0 8px;line-height:1.6;">' + s.text + '</p>'
      + (s.sub ? '<p style="font-size:12px;color:rgba(6,23,45,.45);margin:0 0 24px;line-height:1.5;">' + s.sub + '</p>' : '<div style="height:24px;"></div>')
      + '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin:0 0 24px;">' + dotsHtml + '</div>'
      + '<div style="display:flex;gap:10px;">'
      + (currentStep > 0 ? '<button id="guide-btn-back" style="flex:1;padding:13px;background:none;border:1.5px solid rgba(110,135,125,.35);border-radius:12px;font-size:13px;font-weight:600;color:rgba(6,23,45,.55);cursor:pointer;">Retour</button>' : '')
      + '<button id="guide-btn-next" style="flex:2;padding:13px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">' + s.btn + '</button>'
      + '</div>'
      + (currentStep === 0 ? '<button id="guide-btn-skip" style="margin-top:16px;background:none;border:none;font-size:13px;color:rgba(6,23,45,.4);cursor:pointer;padding:4px;">Passer le guide</button>' : '')
      + '</div>';

    // Event listeners
    var btnNext = document.getElementById('guide-btn-next');
    var btnBack = document.getElementById('guide-btn-back');
    var btnSkip = document.getElementById('guide-btn-skip');

    if (btnNext) btnNext.addEventListener('click', function() {
      if (isLast) {
        completeGuide();
      } else {
        currentStep++;
        renderStep();
      }
    });

    if (btnBack) btnBack.addEventListener('click', function() {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
      }
    });

    if (btnSkip) btnSkip.addEventListener('click', function() {
      completeGuide();
    });
  }

  function completeGuide() {
    localStorage.setItem(GUIDE_KEY, '1');
    if (overlay && overlay.parentNode) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .25s ease-out';
      setTimeout(function() {
        overlay.parentNode.removeChild(overlay);
        overlay = null;
        // Naviguer vers Ma journée pour commencer la saisie
        if (typeof switchPanel === 'function') switchPanel('resume');
        // Proposer la modale profil si pas encore défini
        if (!localStorage.getItem('boussole_profil') && typeof ouvrirModaleProfil === 'function') {
          setTimeout(function() { ouvrirModaleProfil(); }, 600);
        }
      }, 250);
    }
  }

  // API publique
  window.OnboardingGuide = {
    show: function() {
      currentStep = 0;
      buildOverlay();
    },
    reset: function() {
      localStorage.removeItem(GUIDE_KEY);
    },
    isComplete: function() {
      return localStorage.getItem(GUIDE_KEY) === '1';
    }
  };

  // Lancement automatique au premier chargement
  function init() {
    if (!localStorage.getItem(GUIDE_KEY)) {
      // Petit délai pour laisser l'app se charger
      setTimeout(function() { buildOverlay(); }, 400);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Injection CSS animation
  var style = document.createElement('style');
  style.textContent = '@keyframes guideIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}';
  document.head.appendChild(style);

})();
