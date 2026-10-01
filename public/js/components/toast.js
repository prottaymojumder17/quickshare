// public/js/components/toast.js
// Toast notification system

(function () {
  'use strict';
  const QS = window.QS;
  const { el, $ } = QS.utils;

  const ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = $('#toastContainer');
    if (!container) {
      container = el('div', { class: 'toast-container', id: 'toastContainer' });
      document.body.appendChild(container);
    }
    return container;
  }

  const toast = {
    /**
     * Show a toast
     */
    show({ type = 'info', title = '', message = '', duration = null } = {}) {
      const c = ensureContainer();
      const ms = duration || QS.config.TOAST_DURATION;

      const node = el('div', { class: `toast toast-${type}` });

      const icon = el('div', {
        class: 'toast-icon',
        text: ICONS[type] || ICONS.info
      });
      const body = el('div', { class: 'toast-body' });

      if (title)
        body.appendChild(el('div', { class: 'toast-title', text: title }));
      if (message)
        body.appendChild(el('div', { class: 'toast-message', text: message }));

      const close = el('button', {
        class: 'toast-close',
        'aria-label': 'Close',
        text: '✕',
        onclick: () => remove(node)
      });

      node.appendChild(icon);
      node.appendChild(body);
      node.appendChild(close);

      // Auto-dismiss progress bar
      node.style.setProperty('--toast-duration', `${ms}ms`);
      const style = document.createElement('style');
      style.textContent = `.toast::after { animation-duration: ${ms}ms; }`;
      document.head.appendChild(style);

      c.appendChild(node);

      // Auto dismiss
      if (ms > 0) {
        setTimeout(() => remove(node), ms);
      }

      return node;
    },

    success: (title, message, duration) =>
      toast.show({ type: 'success', title, message, duration }),
    error: (title, message, duration) =>
      toast.show({ type: 'error', title, message, duration }),
    warning: (title, message, duration) =>
      toast.show({ type: 'warning', title, message, duration }),
    info: (title, message, duration) =>
      toast.show({ type: 'info', title, message, duration }),

    init() {
      // Listen custom event
      QS.utils.on('qs:toast', e => {
        toast.show(e.detail || {});
      });
    }
  };

  function remove(node) {
    if (!node || !node.parentNode) return;
    node.classList.add('removing');
    setTimeout(() => node.remove(), 300);
  }

  QS.toast = toast;
})();
