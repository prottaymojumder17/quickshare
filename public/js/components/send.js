// public/js/components/send.js
// Send flow: file + text upload

(function () {
  'use strict';
  const QS = window.QS;
  const { $, formatSize, fileIcon, onlyDigits, on } = QS.utils;
  const cfg = QS.config;

  let selectedFile = null;
  let isSending = false;

  const send = {
    // DOM refs
    els: {},

    init() {
      this.els = {
        fileInput: $('#fileInput'),
        dropzone: $('#dropzone'),
        filePreview: $('#filePreview'),
        filePreviewIcon: $('#filePreviewIcon'),
        filePreviewName: $('#filePreviewName'),
        filePreviewSize: $('#filePreviewSize'),
        fileRemoveBtn: $('#fileRemoveBtn'),
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

      // Listen custom event from dragdrop/paste
      on('qs:file-selected', e => this.handleFileSelected(e.detail.file));
      on('qs:new-transfer', () => this.reset());

      // Initial state
      this.updateTextButton();
    },

    // ═════════ FILE ═════════
    bindFileEvents() {
      // Remove file button
      this.els.fileRemoveBtn?.addEventListener('click', e => {
        e.stopPropagation();
        this.clearFile();
      });

      // Send file button
      this.els.sendFileBtn?.addEventListener('click', () => this.uploadFile());
    },

    handleFileSelected(file) {
      if (!file) return;

      if (file.size > cfg.MAX_FILE_SIZE) {
        QS.toast.error(
          'File too large',
          `Max allowed: ${formatSize(cfg.MAX_FILE_SIZE)}`,
          3500
        );
        return;
      }

      selectedFile = file;

      // Show preview
      if (this.els.filePreview) this.els.filePreview.hidden = false;
      if (this.els.dropzone) this.els.dropzone.classList.add('has-file');
      if (this.els.filePreviewIcon)
        this.els.filePreviewIcon.textContent = fileIcon(file.type, file.name);
      if (this.els.filePreviewName)
        this.els.filePreviewName.textContent = file.name;
      if (this.els.filePreviewSize)
        this.els.filePreviewSize.textContent = formatSize(file.size);

      // Enable send
      if (this.els.sendFileBtn) this.els.sendFileBtn.disabled = false;

      // Hide previous code display
      QS.codeDisplay?.hide();

      QS.toast.info(
        'File ready',
        `${file.name} (${formatSize(file.size)})`,
        2200
      );
    },

    clearFile() {
      selectedFile = null;
      if (this.els.fileInput) this.els.fileInput.value = '';
      if (this.els.filePreview) this.els.filePreview.hidden = true;
      if (this.els.dropzone) this.els.dropzone.classList.remove('has-file');
      if (this.els.sendFileBtn) this.els.sendFileBtn.disabled = true;
    },

    async uploadFile() {
      if (isSending || !selectedFile) return;
      isSending = true;

      const btn = this.els.sendFileBtn;
      const btnText = btn?.querySelector('.btn-text');
      const btnSpinner = btn?.querySelector('.btn-spinner');
      const btnIcon = btn?.querySelector('.btn-icon');

      // UI: loading
      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = 'Uploading...';
      if (btnSpinner) btnSpinner.hidden = false;
      if (btnIcon) btnIcon.style.display = 'none';

      this.progress.show();
      this.progress.set(0);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const data = await this.uploadWithProgress(cfg.ROUTES.upload, formData);

        if (!data?.success) {
          throw new Error(data?.error || 'Upload failed');
        }

        this.progress.success();

        // Show code
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
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Send File';
        if (btnSpinner) btnSpinner.hidden = true;
        if (btnIcon) btnIcon.style.display = '';
      }
    },

    // ═════════ TEXT ═════════
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
      btn.disabled = !ta.value.trim();
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
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Send Text';
        if (btnSpinner) btnSpinner.hidden = true;
        if (btnIcon) btnIcon.style.display = '';
      }
    },

    // ═════════ Upload with progress (XHR) ═════════
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

    // ═════════ Reset ═════════
    reset() {
      this.clearFile();
      if (this.els.textInput) {
        this.els.textInput.value = '';
        this.updateTextButton();
        if (this.els.textCharCount)
          this.els.textCharCount.textContent = '0 characters';
      }
      QS.codeDisplay?.hide();
    }
  };

  QS.send = send;
})();
