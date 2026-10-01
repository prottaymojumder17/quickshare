// public/js/components/clipboard.js
// Copy with visual feedback

(function () {
  'use strict';
  const QS = window.QS;
  const { copy } = QS.utils;

  const clipboard = {
    /**
     * Copy text + animate a button
     * @param {string} text
     * @param {HTMLElement} btn - optional button to animate
     */
    async copy(text, btn = null) {
      const ok = await copy(text);

      if (ok) {
        QS.toast.success('Copied!', 'Content copied to clipboard', 1800);
        if (btn) this.animateButton(btn);
      } else {
        QS.toast.error('Copy failed', 'Please copy manually', 2500);
      }
      return ok;
    },

    /**
     * Animate a copy button (📋 → ✓ → 📋)
     */
    animateButton(btn) {
      if (!btn) return;
      const original = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = '✓';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = original;
      }, QS.config.COPY_FEEDBACK_MS);
    }
  };

  QS.clipboard = clipboard;
})();
