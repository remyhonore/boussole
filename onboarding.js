/**
 * Boussole — Onboarding 3 écrans
 * Affiché uniquement à la première ouverture de l'app.
 * Flag : localStorage key 'boussole_onboarding_done'
 */

const onboarding = (() => {
  const KEY = 'boussole_onboarding_done';
  let current = 0;
  let transitioning = false;
  let overlay = null;

  const screens = [
    // Écran 1 — Bienvenue
    () => `
      <div class="ob-icon" aria-hidden="true">🧭</div>
      <h1 class="ob-title">Boussole</h1>
      <p class="ob-subtitle">Ton tableau de bord santé quotidien</p>
      <p class="ob-text">Chaque jour, 4 questions simples pour objectiver comment tu te sens — et en parler avec ton professionnel de santé avec des données, pas des impressions.</p>
      <div class="ob-colors" aria-hidden="true">
        <span style="color:#2d6a4f;font-size:22px;">●</span>
        <span>🟠</span>
        <span>🔴</span>
      </div>
    `,

    // Écran 2 — Les 4 métriques
    () => `
      <h2 class="ob-title">4 indicateurs, une vue claire</h2>
      <ul class="ob-list" aria-label="Les 4 indicateurs">
        <li>
          <span class="ob-list-icon" aria-hidden="true">⚡</span>
          <div>
            <strong>Énergie</strong>
            <p>Ta réserve globale pour la journée</p>
          </div>
        </li>
        <li>
          <span class="ob-list-icon" aria-hidden="true">😴</span>
          <div>
            <strong>Sommeil</strong>
            <p>Qualité perçue, pas durée</p>
          </div>
        </li>
        <li>
          <span class="ob-list-icon" aria-hidden="true">🫀</span>
          <div>
            <strong>Confort physique</strong>
            <p>Douleurs, tensions, lourdeur</p>
          </div>
        </li>
        <li>
          <span class="ob-list-icon" aria-hidden="true">🧠</span>
          <div>
            <strong>Clarté mentale</strong>
            <p>Concentration, brouillard cognitif</p>
          </div>
        </li>
      </ul>
    `,

    // Écran 3 — Système de score
    () => `
      <h2 class="ob-title">Ton score du jour</h2>
      <ul class="ob-list" aria-label="Système de couleurs">
        <li>
          <span class="ob-list-icon" aria-hidden="true" style="color:#2d6a4f;">●</span>
          <div>
            <strong>Bonne journée</strong>
            <p>Score ≥ 7</p>
          </div>
        </li>
        <li>
          <span class="ob-list-icon" aria-hidden="true">🟠</span>
          <div>
            <strong>Journée moyenne</strong>
            <p>Score 4 à 6,9</p>
          </div>
        </li>
        <li>
          <span class="ob-list-icon" aria-hidden="true">🔴</span>
          <div>
            <strong>Journée difficile</strong>
            <p>Score &lt; 4</p>
          </div>
        </li>
      </ul>
      <p class="ob-privacy">🔒 Aucune donnée ne quitte ton appareil. Tout reste chez toi.</p>
    `,
  ];

  function finish() {
    localStorage.setItem(KEY, '1');
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 220);
  }

  function goTo(index) {
    if (transitioning) return;
    transitioning = true;

    const body = overlay.querySelector('#ob-body');
    const dots = overlay.querySelectorAll('.ob-dot');
    const nextBtn = overlay.querySelector('#ob-next');

    dots.forEach((d, i) => {
      d.classList.toggle('ob-dot-active', i === index);
    });

    body.style.opacity = '0';
    setTimeout(() => {
      body.innerHTML = screens[index]();
      body.scrollTop = 0;
      body.style.opacity = '1';
      transitioning = false;
    }, 200);

    nextBtn.textContent = index === screens.length - 1 ? 'C\'est parti !' : 'Suivant';
    current = index;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'ob-styles';
    style.textContent = `
      #ob-overlay {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #06172D;
        -webkit-font-smoothing: antialiased;
      }

      #ob-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px 12px;
        flex-shrink: 0;
      }

      #ob-dots {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .ob-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(6,23,45,.12);
        transition: background 0.2s, width 0.2s, border-radius 0.2s;
        flex-shrink: 0;
      }

      .ob-dot-active {
        background: #2d6a4f;
        width: 24px;
        border-radius: 4px;
      }

      #ob-skip {
        background: none;
        border: none;
        color: rgba(6,23,45,.58);
        font-size: 14px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 6px;
        font-family: inherit;
        line-height: 1;
        min-height: 36px;
      }

      #ob-skip:hover {
        color: #06172D;
        background: rgba(6,23,45,.06);
      }

      #ob-body {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 20px 24px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: opacity 0.2s;
        max-width: 480px;
        margin: 0 auto;
        width: 100%;
      }

      .ob-icon {
        font-size: 64px;
        margin-bottom: 20px;
        line-height: 1;
      }

      .ob-title {
        font-size: 26px;
        font-weight: 700;
        margin-bottom: 10px;
        color: #06172D;
        line-height: 1.2;
      }

      .ob-subtitle {
        font-size: 16px;
        color: #6E877D;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .ob-text {
        font-size: 15px;
        line-height: 1.7;
        color: rgba(6,23,45,.72);
        margin-bottom: 20px;
        max-width: 360px;
      }

      .ob-colors {
        display: flex;
        gap: 16px;
        font-size: 36px;
        justify-content: center;
        margin-top: 4px;
      }

      .ob-list {
        list-style: none;
        padding: 0;
        margin: 16px 0 0;
        width: 100%;
        text-align: left;
      }

      .ob-list li {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 14px 16px;
        margin-bottom: 10px;
        background: rgba(6,23,45,.03);
        border-radius: 12px;
        border: 1px solid rgba(6,23,45,.08);
      }

      .ob-list li:last-child {
        margin-bottom: 0;
      }

      .ob-list-icon {
        font-size: 26px;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .ob-list li > div strong {
        display: block;
        font-size: 15px;
        font-weight: 600;
        color: #06172D;
        margin-bottom: 2px;
      }

      .ob-list li > div p {
        font-size: 13px;
        color: rgba(6,23,45,.58);
        margin: 0;
        line-height: 1.4;
      }

      .ob-privacy {
        margin-top: 18px;
        font-size: 14px;
        color: #065f46;
        padding: 12px 16px;
        background: #f0fdf4;
        border-radius: 8px;
        border: 1px solid #bbf7d0;
        width: 100%;
        text-align: center;
        line-height: 1.5;
      }

      #ob-footer {
        flex-shrink: 0;
        padding: 16px 24px;
        padding-bottom: max(28px, calc(env(safe-area-inset-bottom, 0px) + 16px));
        max-width: 480px;
        margin: 0 auto;
        width: 100%;
      }

      #ob-next {
        width: 100%;
        padding: 14px 24px;
        background: #6E877D;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
        min-height: 44px;
        font-family: inherit;
        box-shadow: 0 4px 12px rgba(6,23,45,.12);
      }

      #ob-next:hover {
        background: #5a7268;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(6,23,45,.16);
      }

      #ob-next:active {
        transform: translateY(0);
        box-shadow: none;
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    injectStyles();

    overlay = document.createElement('div');
    overlay.id = 'ob-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Présentation de Boussole');

    overlay.innerHTML = `
      <div id="ob-header">
        <div id="ob-dots" role="tablist" aria-label="Étape">
          <span class="ob-dot ob-dot-active" role="tab" aria-label="Étape 1 sur 3"></span>
          <span class="ob-dot" role="tab" aria-label="Étape 2 sur 3"></span>
          <span class="ob-dot" role="tab" aria-label="Étape 3 sur 3"></span>
        </div>
        <button id="ob-skip" aria-label="Passer l'introduction">Passer</button>
      </div>
      <div id="ob-body"></div>
      <div id="ob-footer">
        <button id="ob-next">Suivant</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Inject initial screen content
    overlay.querySelector('#ob-body').innerHTML = screens[0]();

    overlay.querySelector('#ob-next').addEventListener('click', () => {
      if (current < screens.length - 1) {
        goTo(current + 1);
      } else {
        finish();
      }
    });

    overlay.querySelector('#ob-skip').addEventListener('click', finish);
  }

  function init() {
    if (localStorage.getItem(KEY) !== null) return;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }

  return { init };
})();
