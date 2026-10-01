// public/js/components/send.js
// Send flow: multi-file + text upload

(function () {
  'use strict';
  const QS = window.QS;
  const { $, formatSize, on } = QS.utils;
  const cfg = QS.config;

  let isSending = false;
  let currentXhr = null; // for cancel support

  const send = {
    els: {},

    init() {
      this.els = {
        sendFileBtn: $('#sendFileBtn'),
        textInput: $('#textInput'),
        textCharCount: $('#textCharCount'),
        sendTextBtn: $('#sendTextBtn')
      };

      // Progress bar (overall)
      this.progress = QS.progress.create(
        '#uploadProgress',
        '#uploadProgressFill',
        '#uploadPercent'
      );

      this.bindFileEvents();
      this.bindTextEvents();

      // Listen to fileList changes
      on('qs:file-list-change', e => this.onFileListChange(e.detail));

      // Reset
      on('qs:new-transfer', () => this.reset());

      // Initial state
      this.updateTextButton();
      this.updateFileButton();
    },

    /* ═══════════════════════════════════════════════
       FILE EVENTS
       ═══════════════════════════════════════════════ */
    bindFileEvents() {
      this.els.sendFileBtn?.addEventListener('click', () => this.uploadFiles());
    },

    onFileListChange(detail) {
      this.updateFileButton();

      if (detail.count > 0) {
        QS.codeDisplay?.hide();
      }

      // Clear previous row states when list changes
      this.clearRowStates();
    },

    updateFileButton() {
      const btn = this.els.sendFileBtn;
      if (!btn) return;

      const count = QS.fileList?.getCount() || 0;
      const hasFiles = count > 0;

      btn.disabled = !hasFiles || isSending;

      const btnText = btn.querySelector('.btn-text');
      if (btnText) {
        if (count === 0) btnText.textContent = 'Send File';
        else if (count === 1) btnText.textContent = 'Send File';
        else btnText.textContent = `Send ${count} Files`;
      }
    },

    /* ═══════════════════════════════════════════════
       UPLOAD FILES (main flow)
       ═══════════════════════════════════════════════ */
    async uploadFiles() {
      if (isSending) return;

      const count = QS.fileList?.getCount() || 0;
      if (count === 0) {
        QS.toast.error('No files', 'Please add files first', 2500);
        return;
      }

      isSending = true;

      const files = QS.fileList.getFiles();
      const items = QS.fileList.getItems();
      const totalSize = QS.fileList.getTotalSize();

      // UI: loading state
      this.setButtonLoading(true);
      this.disableInteractions(true);
      this.progress.show();
      this.progress.set(0);

      // Mark all rows as queued
      items.forEach(item => {
        QS.fileList.setRowState(item.id, 'uploading', 0);
      });

      try {
        // Build form data
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });

        // Send order (as "0,1,2") — backend respects it
        formData.append('fileOrder', items.map((_, i) => i).join(','));

        // Upload with progress
        const data = await this.uploadMultiFile(formData, items);

        if (!data?.success) {
          throw new Error(data?.error || 'Upload failed');
        }

        // Mark all rows success
        items.forEach(item => {
          QS.fileList.setRowState(item.id, 'success', 100);
        });

        this.progress.success();

        // Show code display
        setTimeout(() => {
          this.progress.hide();
          this.progress.reset();

          QS.codeDisplay.show({
            code: data.data.code,
            shareUrl: data.data.shareUrl,
            expiresAt: data.data.expiresAt,
            type: data.data.type,
            fileCount: data.data.fileCount,
            totalSize: data.data.totalSize
          });

          // Success toast
          QS.toast.success(
            count === 1 ? 'File sent!' : `${count} files sent!`,
            `Code: ${data.data.code}`,
            5000
          );

          // Clear file list after success? — No, keep it visible
          // User might want to see what was sent
        }, 300);
      } catch (err) {
        console.error('[Send] Upload failed:', err);

        // Mark all rows as error
        items.forEach(item => {
          QS.fileList.setRowState(item.id, 'error', 0);
        });

        this.progress.error();
        QS.toast.error(
          'Upload failed',
          err.message || 'Please try again',
          4000
        );

        setTimeout(() => {
          this.progress.hide();
          this.progress.reset();
        }, 1500);
      } finally {
        isSending = false;
        currentXhr = null;
        this.setButtonLoading(false);
        this.disableInteractions(false);
        this.updateFileButton();
      }
    },

    /**
     * Upload multiple files with progress (XHR)
     */
    uploadMultiFile(formData, items) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        currentXhr = xhr;

        xhr.open('POST', '/api/upload-multiple');

        // Overall progress
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const totalPct = (e.loaded / e.total) * 100;
            this.progress.set(totalPct);

            // Per-file simulated progress
            // Each file gets equal share of total %
            const fileCount = items.length;
            const perFileShare = 100 / fileCount;
            const currentFileIdx = Math.min(
              fileCount - 1,
              Math.floor(totalPct / perFileShare)
            );

            items.forEach((item, idx) => {
              let rowPct = 0;
              if (idx < currentFileIdx) rowPct = 100;
              else if (idx === currentFileIdx) {
                rowPct = Math.min(
                  100,
                  (totalPct - idx * perFileShare) * fileCount
                );
              } else rowPct = 0;

              QS.fileList.setRowState(item.id, 'uploading', rowPct);
            });
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

    /* ═══════════════════════════════════════════════
       TEXT UPLOAD
       ═══════════════════════════════════════════════ */
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

        QS.toast.success('Text sent!', `Code: ${data.data.code}`, 5000);
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

    /* ═══════════════════════════════════════════════
       UI HELPERS
       ═══════════════════════════════════════════════ */
    setButtonLoading(loading) {
      const btn = this.els.sendFileBtn;
      if (!btn) return;

      const btnText = btn.querySelector('.btn-text');
      const btnSpinner = btn.querySelector('.btn-spinner');
      const btnIcon = btn.querySelector('.btn-icon');

      btn.disabled = loading;

      if (loading) {
        if (btnText) btnText.textContent = 'Uploading...';
        if (btnSpinner) btnSpinner.hidden = false;
        if (btnIcon) btnIcon.style.display = 'none';
      } else {
        if (btnSpinner) btnSpinner.hidden = true;
        if (btnIcon) btnIcon.style.display = '';
        this.updateFileButton();
      }
    },

    disableInteractions(disabled) {
      const dropzone = $('#dropzone');
      const addMoreBtn = $('#fileListAddMore');
      const clearAllBtn = $('#fileListClearAll');
      const items = QS.fileList?.els?.items;

      if (dropzone) dropzone.style.pointerEvents = disabled ? 'none' : '';
      if (addMoreBtn) addMoreBtn.disabled = disabled;
      if (clearAllBtn) clearAllBtn.disabled = disabled;

      if (items) {
        items.querySelectorAll('.file-row-btn').forEach(btn => {
          btn.disabled = disabled;
        });

        items.querySelectorAll('.file-row-drag').forEach(handle => {
          handle.style.pointerEvents = disabled ? 'none' : '';
        });
      }
    },

    clearRowStates() {
      const items = QS.fileList?.getItems() || [];
      items.forEach(item => {
        QS.fileList.setRowState(item.id, null);
      });
    },

    /* ═══════════════════════════════════════════════
       RESET
       ═══════════════════════════════════════════════ */
    reset() {
      if (this.els.textInput) {
        this.els.textInput.value = '';
        this.updateTextButton();
        if (this.els.textCharCount) {
          this.els.textCharCount.textContent = '0 characters';
        }
      }
      QS.codeDisplay?.hide();
      this.clearRowStates();
    }
  };

  QS.send = send;
})();
