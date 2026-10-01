// public/js/components/receive.js
// Receive flow: enter code → fetch info → preview/download

(function () {
  'use strict';
  const QS = window.QS;
  const { $, onlyDigits, isValidCode } = QS.utils;
  const cfg = QS.config;

  let isFetching = false;

  const receive = {
    els: {},

    init() {
      this.els = {
        input: $('#codeInput'),
        btn: $('#receiveBtn'),
        error: $('#receiveError'),
        loading: $('#receiveLoading'),
        result: $('#receiveResult')
      };

      // Only allow digits in input
      this.els.input?.addEventListener('input', e => {
        e.target.value = onlyDigits(e.target.value).slice(0, cfg.CODE_LENGTH);
        this.clearError();
      });

      // Enter key → receive
      this.els.input?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.fetch();
        }
      });

      // Button click
      this.els.btn?.addEventListener('click', () => this.fetch());
    },

    showError(msg) {
      if (!this.els.error) return;
      this.els.error.textContent = msg;
      this.els.error.hidden = false;
      // shake
      this.els.error.classList.remove('anim-shake');
      void this.els.error.offsetWidth;
      this.els.error.classList.add('anim-shake');
    },

    clearError() {
      if (this.els.error) {
        this.els.error.hidden = true;
        this.els.error.textContent = '';
      }
    },

    setLoading(state) {
      if (this.els.loading) this.els.loading.hidden = !state;
      if (state && this.els.result) this.els.result.hidden = true;
      if (this.els.btn) this.els.btn.disabled = state;

      const btnText = this.els.btn?.querySelector('.btn-text');
      const btnSpinner = this.els.btn?.querySelector('.btn-spinner');
      if (btnText) btnText.textContent = state ? 'Fetching...' : 'Receive';
      if (btnSpinner) btnSpinner.hidden = !state;
    },

    async fetch() {
      if (isFetching) return;

      const code = (this.els.input?.value || '').trim();

      this.clearError();

      if (!isValidCode(code)) {
        this.showError('Please enter a valid 6-digit code');
        this.els.input?.focus();
        return;
      }

      isFetching = true;
      this.setLoading(true);

      try {
        const res = await fetch(`${cfg.ROUTES.info}/${code}`);

        // Handle 404 / other statuses
        if (!res.ok) {
          let msg = 'Code not found or expired';
          try {
            const j = await res.json();
            msg = j.error || msg;
          } catch (e) {}
          throw new Error(msg);
        }

        const data = await res.json();
        if (!data?.success) throw new Error(data?.error || 'Fetch failed');

        // Success — render preview
        QS.preview.render(this.els.result, code, data.data);
        this.setLoading(false);

        QS.toast.success('Received!', 'Your transfer is ready', 2500);

        // Scroll into view
        setTimeout(
          () =>
            this.els.result?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            }),
          150
        );
      } catch (err) {
        console.error(err);
        this.setLoading(false);
        this.showError(err.message || 'Could not fetch transfer');
        QS.toast.error(
          'Not found',
          err.message || 'Invalid or expired code',
          3500
        );
      } finally {
        isFetching = false;
      }
    },

    reset() {
      if (this.els.input) this.els.input.value = '';
      this.clearError();
      if (this.els.result) {
        this.els.result.innerHTML = '';
        this.els.result.hidden = true;
      }
      QS.preview?.stopReceiveCountdown();
      this.els.input?.focus();
    },

    /**
     * Programmatic fill + fetch (used by /r/:code link)
     */
    fillAndFetch(code) {
      if (this.els.input) this.els.input.value = code;
      if (isValidCode(code)) this.fetch();
    }
  };

  QS.receive = receive;
})();
