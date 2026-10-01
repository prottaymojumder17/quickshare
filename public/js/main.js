// public/js/main.js
// App bootstrap — সব component initialize

(function () {
  'use strict';

  const QS = window.QS;
  if (!QS) {
    console.error(
      '[QuickShare] QS namespace missing — check config.js load order'
    );
    return;
  }

  function boot() {
    console.log(
      '%c⚡ QuickShare',
      'font-size:16px;font-weight:bold;color:#6366f1;',
      '— initializing...'
    );

    // ── Core
    QS.theme?.init();
    QS.router?.init();

    // ── UI helpers
    QS.toast?.init();
    QS.dragdrop?.init();
    QS.paste?.init();
    QS.codeDisplay?.bind();
    QS.faq?.init();
    QS.landing?.init();
    QS.backToTop?.init();

    // ── Feature components
    QS.send?.init();
    QS.receive?.init();

    // ── URL code auto-fetch (e.g. /r/123456)
    const code = QS.utils.getParam('code');
    if (code && QS.utils.isValidCode(code)) {
      setTimeout(() => {
        QS.receive?.fillAndFetch(code);
      }, 400);
    }

    console.log(
      '%c✓ QuickShare ready',
      'font-size:12px;color:#22c55e;font-weight:bold;'
    );
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
