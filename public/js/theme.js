// public/js/theme.js
// Dark / Light theme toggle + persist

(function () {
  'use strict';

  const QS = window.QS;
  const { THEME_KEY, DEFAULT_THEME } = QS.config;

  const theme = {
    current: DEFAULT_THEME,

    /**
     * Get saved theme (localStorage or system preference)
     */
    load() {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') {
        this.current = saved;
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: light)').matches
      ) {
        this.current = 'light';
      } else {
        this.current = DEFAULT_THEME;
      }
      this.apply(this.current, false);
    },

    /**
     * Apply theme
     */
    apply(name, save = true) {
      this.current = name;
      document.documentElement.setAttribute('data-theme', name);

      // Meta theme-color for mobile browsers
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta)
        meta.setAttribute('content', name === 'dark' ? '#0a0a0f' : '#f8fafc');

      if (save) {
        try {
          localStorage.setItem(THEME_KEY, name);
        } catch (e) {}
      }

      QS.utils.emit('qs:theme-change', { theme: name });
    },

    /**
     * Toggle
     */
    toggle() {
      const next = this.current === 'dark' ? 'light' : 'dark';
      this.apply(next);
      return next;
    },

    /**
     * Init — apply on load + bind toggle button
     */
    init() {
      this.load();

      const btn = document.getElementById('themeToggle');
      if (btn) {
        btn.addEventListener('click', () => {
          const next = this.toggle();
          QS.utils.emit('qs:toast', {
            type: 'info',
            title: 'Theme switched',
            message: `Now in ${next} mode`,
            duration: 2000
          });
        });
      }

      // Follow system changes (only if user hasn't chosen)
      if (window.matchMedia) {
        window
          .matchMedia('(prefers-color-scheme: light)')
          .addEventListener('change', e => {
            if (!localStorage.getItem(THEME_KEY)) {
              this.apply(e.matches ? 'light' : 'dark', false);
            }
          });
      }
    }
  };

  QS.theme = theme;

  // Apply theme ASAP (before DOMContentLoaded) to avoid flash
  theme.load();
})();
