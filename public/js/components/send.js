// public/js/components/send.js
// Send flow: file + text upload
// ⚠️ Phase 3: temporarily uses first file only
// ⚠️ Phase 6: will implement sequential multi-file upload

(function () {
  'use strict';
  const QS = window.QS;
  const { $, formatSize, fileIcon, onlyDigits, on } = QS.utils;
  const cfg = QS.config;

  let isSending = false;

  const send = {
    els: {},

    init() {
      this.els = {
        sendFileBtn: $('#sendFileBtn'),
        textInput: $('#textInput'),
        textCharCount: $('#textCharCount'),
        sendTextBtn: $('#sendTextBtn')
      };

      // Progress bar
      this.progress = QS.progress.create(
        '#uploadProgress',
        '#uploadProgressFill',
        '#uploadPercent'
      );

      // Bind
      this.bindFileEvents();
      this.bindTextEvents();

      // Listen to fileList changes (this replaces the old single-file event)
      on('qs:file-list-change', e => this.onFileListChange(e.detail));

      // Reset
      on('qs:new-transfer', () => this.reset());

      // Initial state
      this.updateTextButton();
      this.updateFileButton();
    },

    /* ═════════ FILE EVENTS ═════════ */
    bindFileEvents() {
      this.els.sendFileBtn?.addEventListener('click', () => this.uploadFiles());
    },

    /**
     * Fired when fileList state changes
     * @param {Object} detail — { count, totalSize, files }
     */
    onFileListChange(detail) {
      this.updateFileButton();

      // Hide code display when files change
      if (detail.count > 0) {
        QS.codeDisplay?.hide();
      }
    },

    /**
     * Update Send button — enabled if fileList has files
     */
    updateFileButton() {
      const btn = this.els.sendFileBtn;
      if (!btn) return;

      const hasFiles = QS.fileList?.getCount() > 0;
      btn.disabled = !hasFiles || isSending;

      const btnText = btn.querySelector('.btn-text');
      if (btnText) {
        const count = QS.fileList?.getCount() || 0;
        if (count === 0) btnText.textContent = 'Send File';
        else if (count === 1) btnText.textContent = 'Send File';
        else btnText.textContent = `Send ${count} Files`;
      }
    },

    /* ═════════ UPLOAD ═════════ */
    async uploadFiles() {
      if (isSending) return;

      const count = QS.fileList?.getCount() || 0;
      if (count === 0) {
        QS.toast.error('No files', 'Please add files first', 2500);
        return;
      }

      // ⚠️ TEMPORARY (Phase 3): upload only the FIRST file
      // TODO Phase 6: sequential upload all files
      const files = QS.fileList.getFiles();
      const firstFile = files[0];

      isSending = true;

      const btn = this.els.sendFileBtn;
      const btnText = btn?.querySelector('.btn-text');
      const btnSpinner = btn?.querySelector('.btn-spinner');
      const btnIcon = btn?.querySelector('.btn-icon');

      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = 'Uploading...';
      if (btnSpinner) btnSpinner.hidden = false;
      if (btnIcon) btnIcon.style.display = 'none';

      this.progress.show();
      this.progress.set(0);

      try {
        const formData = new FormData();
        formData.append('file', firstFile);

        const data = await this.uploadWithProgress(cfg.ROUTES.upload, formData);

        if (!data?.success) {
          throw new Error(data?.error || 'Upload failed');
        }

        this.progress.success();

        setTimeout(() => {
          this.progress.hide();
          this.progress.reset();
          QS.codeDisplay.show({
            code: data.data.code,
            shareUrl: data.data.shareUrl,
            expiresAt: data.data.expiresAt,
            type: 'file'
          });
        }, 300);
      } catch (err) {
        console.error(err);
        this.progress.error();
        QS.toast.error(
          'Upload failed',
          err.message || 'Please try again',
          4000
        );
        setTimeout(() => {
          this.progress.hide();
          this.progress.reset();
        }, 1200);
      } finally {
        isSending = false;
        this.updateFileButton();
        if (btnText) btnText.textContent = 'Send File';
        if (btnSpinner) btnSpinner.hidden = true;
        if (btnIcon) btnIcon.style.display = '';
      }
    },

    /* ═════════ TEXT ═════════ */
    bindTextEvents() {
      const ta = this.els.textInput;
      if (!ta) return;

      ta.addEventListener('input', () => {
        this.updateTextButton();
        if (this.els.textCharCount) {
          const n = ta.value.length;
          this.els.textCharCount.textContent = `${n.toLocaleString()} character${n === 1 ? '' : 's'}`;
        }
      });

      this.els.sendTextBtn?.addEventListener('click', () => this.uploadText());
    },

    updateTextButton() {
      const ta = this.els.textInput;
      const btn = this.els.sendTextBtn;
      if (!ta || !btn) return;
      btn.disabled = !ta.value.trim() || isSending;
    },

    async uploadText() {
      if (isSending) return;
      const text = this.els.textInput?.value || '';
      if (!text.trim()) return;

      isSending = true;
      const btn = this.els.sendTextBtn;
      const btnText = btn?.querySelector('.btn-text');
      const btnSpinner = btn?.querySelector('.btn-spinner');
      const btnIcon = btn?.querySelector('.btn-icon');

      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = 'Sending...';
      if (btnSpinner) btnSpinner.hidden = false;
      if (btnIcon) btnIcon.style.display = 'none';

      try {
        const res = await fetch(cfg.ROUTES.text, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await res.json();

        if (!data?.success) throw new Error(data?.error || 'Send failed');

        QS.codeDisplay.show({
          code: data.data.code,
          shareUrl: data.data.shareUrl,
          expiresAt: data.data.expiresAt,
          type: 'text'
        });
      } catch (err) {
        console.error(err);
        QS.toast.error('Send failed', err.message || 'Please try again', 4000);
      } finally {
        isSending = false;
        this.updateTextButton();
        if (btnText) btnText.textContent = 'Send Text';
        if (btnSpinner) btnSpinner.hidden = true;
        if (btnIcon) btnIcon.style.display = '';
      }
    },

    /* ═════════ Upload with progress ═════════ */
    uploadWithProgress(url, formData) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const pct = (e.loaded / e.total) * 100;
            this.progress.set(pct);
          }
        });

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json.error || `HTTP ${xhr.status}`));
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.timeout = cfg.UPLOAD_TIMEOUT;

        xhr.send(formData);
      });
    },

    /* ═════════ Reset ═════════ */
    reset() {
      if (this.els.textInput) {
        this.els.textInput.value = '';
        this.updateTextButton();
        if (this.els.textCharCount) {
          this.els.textCharCount.textContent = '0 characters';
        }
      }
      QS.codeDisplay?.hide();
    }
  };

  QS.send = send;
})();
