// public/js/router.js
// Tabs switching (Send / Receive) + subtabs (File / Text) + URL params

(function () {
  'use strict';

  const QS = window.QS;
  const { $, $$, emit, getParam } = QS.utils;

  const router = {
    currentTab: 'send',
    currentSubtab: 'file',

    /**
     * Switch main tab
     */
    switchTab(tabName, opts = {}) {
      if (!['send', 'receive'].includes(tabName)) return;

      // Tabs
      $$('.tab[data-tab]').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
        t.setAttribute(
          'aria-selected',
          t.dataset.tab === tabName ? 'true' : 'false'
        );
      });

      // Panels
      $$('.panel').forEach(p => p.classList.remove('active'));
      const panel = $(`#panel-${tabName}`);
      if (panel) panel.classList.add('active');

      this.currentTab = tabName;

      // Auto focus code input on receive
      if (tabName === 'receive') {
        const inp = $('#codeInput');
        if (inp) setTimeout(() => inp.focus(), 100);
      }

      // Update URL (?tab=receive) — only if different
      if (opts.updateUrl !== false) {
        const url = new URL(window.location.href);
        if (tabName === 'send') url.searchParams.delete('tab');
        else url.searchParams.set('tab', tabName);
        window.history.replaceState({}, '', url);
      }

      emit('qs:tab-change', { tab: tabName });
    },

    /**
     * Switch sub-tab (file / text) inside send panel
     */
    switchSubtab(name) {
      if (!['file', 'text'].includes(name)) return;

      $$('.subtab[data-subtab]').forEach(t => {
        t.classList.toggle('active', t.dataset.subtab === name);
      });

      $$('.subpanel').forEach(p => p.classList.remove('active'));
      const subpanel = $(`#subpanel-${name}`);
      if (subpanel) subpanel.classList.add('active');

      this.currentSubtab = name;

      emit('qs:subtab-change', { subtab: name });
    },

    /**
     * Read URL params on load
     * /r/:code → ?code=123456&tab=receive
     */
    applyUrlParams() {
      const tab = getParam('tab');
      const code = getParam('code');

      if (tab === 'receive') {
        this.switchTab('receive', { updateUrl: false });
      }

      if (code && QS.utils.isValidCode(code)) {
        const inp = $('#codeInput');
        if (inp) inp.value = code;
        // Auto trigger receive after short delay
        setTimeout(() => {
          const btn = $('#receiveBtn');
          if (btn) btn.click();
        }, 300);
      }
    },

    /**
     * Bind click handlers on tabs + subtabs
     */
    bind() {
      $$('.tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
      });

      $$('.subtab[data-subtab]').forEach(tab => {
        tab.addEventListener('click', () =>
          this.switchSubtab(tab.dataset.subtab)
        );
      });

      // Smooth-scroll links (hero CTA, nav links)
      $$('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
          const href = a.getAttribute('href');
          if (href.length <= 1) return;
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    },

    init() {
      this.bind();
      this.applyUrlParams();
    }
  };

  QS.router = router;
})();
