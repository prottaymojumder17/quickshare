// public/js/components/preview.js
// Render received file(s) or text
// Supports: text, single file, multi-file

(function () {
  'use strict';
  const QS = window.QS;
  const { el, formatSize, fileIcon, fileCategory } = QS.utils;

  const preview = {
    countdownTimer: null,

    // Store current transfer info for preview navigation
    _currentFiles: [],
    _currentCode: null,

    /* ═══════════════════════════════════════════════
       MAIN RENDER
       ═══════════════════════════════════════════════ */
    render(resultEl, code, info) {
      resultEl.innerHTML = '';
      resultEl.hidden = false;

      // Store for later access
      this._currentCode = code;
      this._currentFiles = info.files || [];

      if (info.type === 'text') {
        this.renderText(resultEl, code, info);
      } else if (info.type === 'files') {
        this.renderMultiFile(resultEl, code, info);
      } else {
        this.renderSingleFile(resultEl, code, info);
      }
    },

    /* ═══════════════════════════════════════════════
       TEXT
       ═══════════════════════════════════════════════ */
    renderText(root, code, info) {
      root.appendChild(
        this.header(
          '📝',
          'Text Message',
          `${formatSize(info.size)} · ${info.downloads || 0} downloads`
        )
      );

      const box = el('div', { class: 'result-text' });
      box.textContent = info.text || '';
      root.appendChild(box);

      const actions = el('div', { class: 'result-actions' });

      const copyBtn = el('button', {
        class: 'btn btn-primary',
        html: '<span>📋</span> Copy Text',
        onclick: async e => {
          await QS.clipboard.copy(info.text, e.currentTarget);
        }
      });

      const newBtn = el('button', {
        class: 'btn btn-ghost',
        html: '<span>🔁</span> Receive Another',
        onclick: () => QS.receive?.reset()
      });

      actions.appendChild(copyBtn);
      actions.appendChild(newBtn);
      root.appendChild(actions);

      this.appendExpiryBar(root, info);
    },

    /* ═══════════════════════════════════════════════
       SINGLE FILE (legacy — type: 'file')
       ═══════════════════════════════════════════════ */
    renderSingleFile(root, code, info) {
      const icon = fileIcon(info.mimetype, info.filename);
      const meta = `${formatSize(info.size)} · ${info.downloads || 0} downloads`;

      root.appendChild(this.header(icon, info.filename, meta));

      this.appendInlinePreview(root, code, info, 'default');

      const actions = el('div', { class: 'result-actions' });

      const dlLink = el('a', {
        class: 'btn btn-primary',
        href: `/api/download/${code}/default`,
        download: info.filename,
        html: '<span>⬇️</span> Download'
      });

      const copyLinkBtn = el('button', {
        class: 'btn btn-ghost',
        html: '<span>🔗</span> Copy Link',
        onclick: async e => {
          const url = `${window.location.origin}/r/${code}`;
          await QS.clipboard.copy(url, e.currentTarget);
        }
      });

      const newBtn = el('button', {
        class: 'btn btn-ghost',
        html: '<span>🔁</span> Receive Another',
        onclick: () => QS.receive?.reset()
      });

      actions.appendChild(dlLink);
      actions.appendChild(copyLinkBtn);
      actions.appendChild(newBtn);
      root.appendChild(actions);

      this.appendExpiryBar(root, info);
    },

    /* ═══════════════════════════════════════════════
       MULTI-FILE — type: 'files'
       ═══════════════════════════════════════════════ */
    renderMultiFile(root, code, info) {
      const count = info.fileCount || (info.files ? info.files.length : 0);
      const icon = '📦';
      const totalSize = info.totalSizeFormatted || formatSize(info.totalSize);
      const meta = `${count} file${count === 1 ? '' : 's'} · ${totalSize} · ${info.downloads || 0} downloads`;

      root.appendChild(this.header(icon, `${count} Files Received`, meta));

      // ── ZIP download button ──
      const zipWrap = el('div', { class: 'zip-download-wrap' });

      const zipBtn = el('a', {
        class: 'btn btn-primary btn-block',
        href: `/api/download-zip/${code}`,
        download: `QuickShare_${code}.zip`,
        html: `
          <span class="zip-icon">📦</span>
          <span class="zip-text">
            <span class="zip-title">Download All as ZIP</span>
            <span class="zip-subtitle">${count} files · ${totalSize}</span>
          </span>
        `
      });

      zipWrap.appendChild(zipBtn);
      root.appendChild(zipWrap);

      // ── File list ──
      const filesWrap = el('div', { class: 'received-files' });

      const sortedFiles = [...(info.files || [])].sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );

      sortedFiles.forEach((file, idx) => {
        filesWrap.appendChild(
          this.renderFileRow(code, file, idx + 1, sortedFiles)
        );
      });

      root.appendChild(filesWrap);

      // ── Actions ──
      const actions = el('div', { class: 'result-actions' });

      const copyLinkBtn = el('button', {
        class: 'btn btn-ghost',
        html: '<span>🔗</span> Copy Link',
        onclick: async e => {
          const url = `${window.location.origin}/r/${code}`;
          await QS.clipboard.copy(url, e.currentTarget);
        }
      });

      const newBtn = el('button', {
        class: 'btn btn-ghost',
        html: '<span>🔁</span> Receive Another',
        onclick: () => QS.receive?.reset()
      });

      actions.appendChild(copyLinkBtn);
      actions.appendChild(newBtn);
      root.appendChild(actions);

      this.appendExpiryBar(root, info);
    },

    /**
     * Render one file row in multi-file list
     *
     * @param {string} code — transfer code
     * @param {object} file — this file's data
     * @param {number} index — display index (1-based)
     * @param {Array} allFiles — all files (for preview navigation)
     */
    renderFileRow(code, file, index, allFiles) {
      const row = el('div', { class: 'received-file-row' });

      // Index badge
      row.appendChild(
        el('div', { class: 'received-file-index', text: String(index) })
      );

      // Icon
      row.appendChild(
        el('div', {
          class: 'received-file-icon',
          text: fileIcon(file.mimetype, file.filename)
        })
      );

      // Info
      const infoEl = el('div', { class: 'received-file-info' });
      infoEl.appendChild(
        el('div', {
          class: 'received-file-name',
          text: file.filename,
          title: file.filename
        })
      );

      const metaText =
        `${file.sizeFormatted || formatSize(file.size)} · ${(file.mimetype || '').split('/')[1] || ''}`
          .replace(/·\s*$/, '')
          .trim();

      infoEl.appendChild(
        el('div', {
          class: 'received-file-meta',
          text: metaText
        })
      );
      row.appendChild(infoEl);

      // Actions
      const actions = el('div', { class: 'received-file-actions' });

      // 👁️ Preview button
      if (file.previewable) {
        const previewBtn = el('button', {
          class: 'received-file-btn',
          title: 'Preview',
          html: '👁️',
          onclick: e => {
            e.preventDefault();

            // ✅ FIX: pass ALL files + startFileId
            QS.previewModal?.openFromReceived(
              code,
              {
                type: 'files',
                files: allFiles || this._currentFiles || [file]
              },
              file.id
            );
          }
        });
        actions.appendChild(previewBtn);
      }

      // ⬇️ Download
      const dlBtn = el('a', {
        class: 'received-file-btn',
        href: `/api/download/${code}/${file.id}`,
        download: file.filename,
        title: 'Download',
        html: '⬇️'
      });
      actions.appendChild(dlBtn);

      row.appendChild(actions);
      return row;
    },

    /* ═══════════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════════ */

    header(icon, title, meta) {
      const wrap = el('div', { class: 'result-header' });
      const iconEl = el('div', { class: 'result-icon', text: icon });
      const infoEl = el('div', { class: 'result-info' });
      infoEl.appendChild(el('div', { class: 'result-title', text: title }));
      infoEl.appendChild(el('div', { class: 'result-meta', text: meta }));
      wrap.appendChild(iconEl);
      wrap.appendChild(infoEl);
      return wrap;
    },

    appendInlinePreview(root, code, info, fileId) {
      const cat = fileCategory(info.mimetype);
      const src = `/api/preview/${code}/${fileId}`;

      if (cat === 'image') {
        root.appendChild(
          el('img', {
            class: 'result-preview',
            src,
            alt: info.filename,
            loading: 'lazy'
          })
        );
      } else if (cat === 'video') {
        root.appendChild(
          el('video', {
            class: 'result-preview',
            src,
            controls: 'true',
            preload: 'metadata'
          })
        );
      } else if (cat === 'audio') {
        root.appendChild(
          el('audio', {
            src,
            controls: 'true',
            style: 'width:100%;margin-bottom:16px;'
          })
        );
      } else if (cat === 'pdf') {
        root.appendChild(
          el('iframe', {
            class: 'result-preview',
            src,
            style:
              'width:100%;height:400px;border:0;background:#fff;border-radius:12px;margin-bottom:16px;'
          })
        );
      }
    },

    appendExpiryBar(root, info) {
      if (!info.expiresInSeconds) return;

      const hint = el('div', {
        class: 'expiry-bar',
        html: `<span>⏱️</span> Expires in <strong id="receiveExpiry">${QS.utils.formatDuration(info.expiresInSeconds * 1000)}</strong>`
      });

      root.appendChild(hint);
      this.startReceiveCountdown(info.expiresInSeconds);
    },

    startExpiryCountdown(seconds) {
      this.startReceiveCountdown(seconds);
    },

    startReceiveCountdown(seconds) {
      this.stopReceiveCountdown();

      let el2 = document.getElementById('receiveExpiry');
      if (!el2) {
        // Not present — create one
        const root = document.getElementById('receiveResult');
        if (root) {
          const hint = document.createElement('div');
          hint.className = 'expiry-bar';
          hint.innerHTML = `<span>⏱️</span> Expires in <strong id="receiveExpiry">${QS.utils.formatDuration(seconds * 1000)}</strong>`;
          root.appendChild(hint);
          el2 = document.getElementById('receiveExpiry');
        }
      }

      if (!el2) return;

      let remaining = seconds;
      this.countdownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          el2.textContent = 'Expired';
          el2.style.color = 'var(--danger)';
          this.stopReceiveCountdown();
        } else {
          el2.textContent = QS.utils.formatDuration(remaining * 1000);
        }
      }, 1000);
    },

    stopReceiveCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }
  };

  QS.preview = preview;
})();
