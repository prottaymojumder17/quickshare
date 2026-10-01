// public/js/components/preview.js
// Render received file or text

(function () {
  'use strict';
  const QS = window.QS;
  const { el, fileIcon, fileCategory, formatSize, escapeHtml } = QS.utils;

  const preview = {
    /**
     * Render receive result into #receiveResult
     */
    render(resultEl, code, info) {
      resultEl.innerHTML = '';
      resultEl.hidden = false;

      if (info.type === 'text') {
        this.renderText(resultEl, code, info);
      } else {
        this.renderFile(resultEl, code, info);
      }
    },

    renderText(root, code, info) {
      // Header
      root.appendChild(
        this.header(
          '📝',
          'Text Message',
          `${formatSize(info.size)} · ${info.downloads || 0} downloads`
        )
      );

      // Text content
      const box = el('div', { class: 'result-text' });
      box.textContent = info.text || '';
      root.appendChild(box);

      // Actions
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
    },

    renderFile(root, code, info) {
      const icon = fileIcon(info.mimetype, info.filename);
      const meta = `${formatSize(info.size)} · ${info.downloads || 0} downloads`;

      root.appendChild(this.header(icon, info.filename, meta));

      // Inline preview
      const cat = fileCategory(info.mimetype);
      if (cat === 'image') {
        const img = el('img', {
          class: 'result-preview',
          src: `/api/preview/${code}`,
          alt: info.filename,
          loading: 'lazy'
        });
        root.appendChild(img);
      } else if (cat === 'video') {
        const video = el('video', {
          class: 'result-preview',
          src: `/api/preview/${code}`,
          controls: 'true',
          preload: 'metadata'
        });
        root.appendChild(video);
      } else if (cat === 'audio') {
        const audio = el('audio', {
          src: `/api/preview/${code}`,
          controls: 'true',
          style: 'width:100%;margin-bottom:16px;'
        });
        root.appendChild(audio);
      } else if (cat === 'pdf') {
        const iframe = el('iframe', {
          class: 'result-preview',
          src: `/api/preview/${code}`,
          style:
            'width:100%;height:400px;border:0;background:#fff;border-radius:12px;margin-bottom:16px;'
        });
        root.appendChild(iframe);
      }

      // Actions
      const actions = el('div', { class: 'result-actions' });

      const dlLink = el('a', {
        class: 'btn btn-primary',
        href: `/api/download/${code}`,
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

      // Expiry hint
      if (info.expiresInSeconds) {
        const hint = el('div', {
          class: 'expiry-bar',
          html: `<span>⏱️</span> Expires in <strong id="receiveExpiry">${QS.utils.formatDuration(info.expiresInSeconds * 1000)}</strong>`
        });
        root.appendChild(hint);
        this.startReceiveCountdown(info.expiresInSeconds);
      }
    },

    header(icon, title, meta) {
      const wrap = el('div', { class: 'result-header' });
      const iconEl = el('div', { class: 'result-icon', text: icon });
      const info = el('div', { class: 'result-info' });
      info.appendChild(el('div', { class: 'result-title', text: title }));
      info.appendChild(el('div', { class: 'result-meta', text: meta }));
      wrap.appendChild(iconEl);
      wrap.appendChild(info);
      return wrap;
    },

    countdownTimer: null,

    startReceiveCountdown(seconds) {
      this.stopReceiveCountdown();
      let remaining = seconds;
      const el = document.getElementById('receiveExpiry');
      if (!el) return;

      this.countdownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          el.textContent = 'Expired';
          el.style.color = 'var(--danger)';
          this.stopReceiveCountdown();
        } else {
          el.textContent = QS.utils.formatDuration(remaining * 1000);
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
