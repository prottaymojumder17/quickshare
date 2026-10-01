// public/js/components/progress.js
// Upload progress UI

(function () {
  'use strict';
  const QS = window.QS;
  const { $ } = QS.utils;

  function createProgress(containerId, fillId, percentId) {
    const container = $(containerId);
    const fill = $(fillId);
    const percent = $(percentId);

    return {
      container,
      fill,
      percent,

      show() {
        if (container) container.hidden = false;
        this.set(0);
      },

      hide() {
        if (container) container.hidden = true;
      },

      set(value) {
        const v = Math.max(0, Math.min(100, Math.round(value)));
        if (fill) fill.style.width = `${v}%`;
        if (percent) percent.textContent = `${v}%`;
        return v;
      },

      success() {
        if (fill) fill.classList.add('success');
        if (fill) fill.classList.remove('error');
        this.set(100);
      },

      error() {
        if (fill) fill.classList.add('error');
        if (fill) fill.classList.remove('success');
      },

      reset() {
        if (fill) fill.classList.remove('success', 'error');
        this.set(0);
      }
    };
  }

  const progress = {
    create: createProgress
  };

  QS.progress = progress;
})();
