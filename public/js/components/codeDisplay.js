// public/js/components/codeDisplay.js
// Show code + expiry countdown + QR + share actions
// Supports: text, single file, multi-file

(function () {
  'use strict';
  const QS = window.QS;
  const { $, formatDuration, formatSize, emit } = QS.utils;

  let countdownTimer = null;
  let currentCode = null;
  let currentShareUrl = null;
  let currentExpiresAt = null;

  const codeDisplay = {
    /**
     * Show the code display section with data
     *
     * @param {Object} data
     * @param {string} data.code
     * @param {string} data.shareUrl
     * @param {number} data.expiresAt
     * @param {string} data.type — 'text' | 'file' | 'files'
     * @param {number} [data.fileCount] — multi-file হলে
     * @param {number} [data.totalSize] — multi-file total
     */
    show({ code, shareUrl, expiresAt, type, fileCount, totalSize }) {
      currentCode = code;
      currentShareUrl = shareUrl;
      currentExpiresAt = expiresAt;

      const box = $('#codeDisplay');
      const codeEl = $('#generatedCode');

      if (codeEl) codeEl.textContent = code;
      if (box) box.hidden = false;

      // Update title based on type
      this.updateTitle(type, fileCount);

      // Scroll into view
      setTimeout(
        () => box?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        100
      );

      // Start countdown
      this.startCountdown();

      // Success toast
      this.showSuccessToast(type, fileCount, code);

      // Emit event
      emit('qs:code-generated', { code, shareUrl, type, fileCount });
    },

    /**
     * Update the title text in code display box
     */
    updateTitle(type, fileCount) {
      const titleEl = $('.code-title');
      const subtitleEl = $('.code-subtitle');

      if (type === 'text') {
        if (titleEl) titleEl.textContent = 'Text Ready!';
        if (subtitleEl)
          subtitleEl.textContent = 'Give this code to the receiver';
      } else if (type === 'files' || (fileCount && fileCount > 1)) {
        if (titleEl) titleEl.textContent = `${fileCount} Files Ready!`;
        if (subtitleEl)
          subtitleEl.textContent =
            'Share this code — receiver can download all files';
      } else {
        if (titleEl) titleEl.textContent = 'File Ready!';
        if (subtitleEl)
          subtitleEl.textContent = 'Give this code to the receiver';
      }
    },

    /**
     * Show success toast
     */
    showSuccessToast(type, fileCount, code) {
      let title = 'Uploaded!';
      if (type === 'text') title = 'Text sent!';
      else if (fileCount > 1) title = `${fileCount} files uploaded!`;
      else if (type === 'file' || type === 'files') title = 'File uploaded!';

      QS.toast.success(
        title,
        `Code: ${code} — share it with the receiver`,
        5000
      );
    },

    hide() {
      const box = $('#codeDisplay');
      if (box) box.hidden = true;
      this.stopCountdown();
      QS.qrcode?.clear();
      currentCode = null;
      currentShareUrl = null;
      currentExpiresAt = null;
    },

    startCountdown() {
      this.stopCountdown();
      if (!currentExpiresAt) return;

      const update = () => {
        const remainingMs = currentExpiresAt - Date.now();
        const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
        const el = $('#codeExpiry');
        if (el) {
          el.textContent =
            remainingSec > 0 ? QS.utils.formatDuration(remainingMs) : 'Expired';
          if (remainingSec <= 0) {
            el.style.color = 'var(--danger)';
            QS.toast.warning(
              'Transfer expired',
              'The code is no longer valid',
              4000
            );
            this.stopCountdown();
          } else if (remainingSec < 60) {
            el.style.color = 'var(--warning)';
          } else {
            el.style.color = '';
          }
        }
      };

      update();
      countdownTimer = setInterval(update, 1000);
    },

    stopCountdown() {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    },

    /**
     * Bind copy / link / new-transfer / qr buttons
     */
    bind() {
      const copyCode = $('#copyCodeBtn');
      if (copyCode) {
        copyCode.addEventListener('click', () => {
          if (currentCode) QS.clipboard.copy(currentCode, copyCode);
        });
      }

      const copyLink = $('#copyLinkBtn');
      if (copyLink) {
        copyLink.addEventListener('click', () => {
          if (currentShareUrl) QS.clipboard.copy(currentShareUrl, copyLink);
        });
      }

      const newBtn = $('#newTransferBtn');
      if (newBtn) {
        newBtn.addEventListener('click', () => {
          this.hide();
          emit('qs:new-transfer');
        });
      }

      const qrToggle = $('#qrToggleBtn');
      const qrContainer = $('#qrContainer');
      if (qrToggle && qrContainer) {
        qrToggle.addEventListener('click', () => {
          const isHidden = qrContainer.hidden;
          qrContainer.hidden = !isHidden;
          if (isHidden && currentShareUrl) {
            QS.qrcode.render(currentShareUrl, 200);
          }
        });
      }
    }
  };

  QS.codeDisplay = codeDisplay;
})();
