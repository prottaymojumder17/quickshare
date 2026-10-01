// public/js/components/previewModal.js
// Full-screen preview modal for files
// Works for BOTH sender (local File objects) and receiver (URLs)

(function () {
  'use strict';
  const QS = window.QS;
  const { $, el, formatSize, fileIcon, fileCategory } = QS.utils;

  const previewModal = {
    els: {},
    items: [], // [{ id, name, size, mimetype, src, kind: 'local'|'remote' }]
    currentIndex: 0,
    isOpen: false,

    /* ═══════════════════════════════════════════════
       Init
       ═══════════════════════════════════════════════ */
    init() {
      this.els = {
        modal: $('#previewModal'),
        card: $('#previewModal .preview-modal-card'),
        icon: $('#previewModalIcon'),
        name: $('#previewModalName'),
        meta: $('#previewModalMeta'),
        body: $('#previewModalBody'),
        closeBtn: $('#previewModalCloseBtn'),
        downloadBtn: $('#previewModalDownloadBtn'),
        nav: $('#previewModalNav'),
        prevBtn: $('#previewNavPrev'),
        nextBtn: $('#previewNavNext'),
        counter: $('#previewNavCounter'),
        floatPrev: $('#previewFloatPrev'),
        floatNext: $('#previewFloatNext')
      };

      if (!this.els.modal) {
        console.warn('[PreviewModal] modal container not found');
        return;
      }

      this.bindEvents();
    },

    /* ═══════════════════════════════════════════════
       Bind Events
       ═══════════════════════════════════════════════ */
    bindEvents() {
      const {
        modal,
        closeBtn,
        prevBtn,
        nextBtn,
        floatPrev,
        floatNext,
        downloadBtn
      } = this.els;

      // Close
      closeBtn?.addEventListener('click', () => this.close());

      // Backdrop click
      modal?.addEventListener('click', e => {
        if (e.target === modal) this.close();
      });

      // Prev / Next (bottom nav)
      prevBtn?.addEventListener('click', () => this.prev());
      nextBtn?.addEventListener('click', () => this.next());

      // Float nav arrows
      floatPrev?.addEventListener('click', () => this.prev());
      floatNext?.addEventListener('click', () => this.next());

      // Download button
      downloadBtn?.addEventListener('click', () => {
        const item = this.getCurrent();
        if (!item) return;

        if (item.kind === 'local' && item.src instanceof File) {
          // Local file — trigger download
          const url = URL.createObjectURL(item.src);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else if (typeof item.src === 'string') {
          // Remote URL
          const a = document.createElement('a');
          a.href = item.src;
          a.download = item.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      });

      // Keyboard navigation
      document.addEventListener('keydown', e => {
        if (!this.isOpen) return;

        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.next();
        }
      });

      // Listen for preview request from file list (sender side)
      QS.utils.on('qs:file-preview', e => this.openFromFileList(e.detail.id));

      // Close on page visibility change (save resources)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isOpen) this.close();
      });
    },

    /* ═══════════════════════════════════════════════
       Open from file list (sender — local File objects)
       ═══════════════════════════════════════════════ */
    openFromFileList(localFileId) {
      if (!QS.fileList) return;

      const files = QS.fileList.files;
      if (!files || files.length === 0) return;

      // Build items from all files
      this.items = files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mimetype: f.type || '',
        src: f.file,
        kind: 'local'
      }));

      const index = files.findIndex(f => f.id === localFileId);
      this.currentIndex = index >= 0 ? index : 0;

      this.open();
    },

    /* ═══════════════════════════════════════════════
       Open from receiver (URLs)
       ═══════════════════════════════════════════════ */
    openFromReceived(code, info, startFileId = null) {
      if (info.type === 'files' && Array.isArray(info.files)) {
        this.items = info.files.map(f => ({
          id: f.id,
          name: f.filename,
          size: f.size,
          mimetype: f.mimetype,
          src: f.previewUrl,
          downloadUrl: f.downloadUrl,
          kind: 'remote'
        }));

        if (startFileId) {
          const idx = this.items.findIndex(i => i.id === startFileId);
          this.currentIndex = idx >= 0 ? idx : 0;
        } else {
          this.currentIndex = 0;
        }
      } else if (info.type === 'file') {
        // Legacy single file
        this.items = [
          {
            id: 'default',
            name: info.filename,
            size: info.size,
            mimetype: info.mimetype,
            src: info.previewUrl,
            downloadUrl: info.downloadUrl,
            kind: 'remote'
          }
        ];
        this.currentIndex = 0;
      } else {
        return;
      }

      this.open();
    },

    /* ═══════════════════════════════════════════════
       Open Modal
       ═══════════════════════════════════════════════ */
    open() {
      if (!this.els.modal || this.items.length === 0) return;

      this.isOpen = true;
      this.els.modal.classList.add('show');
      this.els.modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Show/hide floating nav based on item count
      const hasMultiple = this.items.length > 1;
      if (this.els.card) {
        this.els.card.classList.toggle('has-multiple', hasMultiple);
      }

      this.render();
    },

    /* ═══════════════════════════════════════════════
       Close Modal
       ═══════════════════════════════════════════════ */
    close() {
      if (!this.els.modal) return;

      this.isOpen = false;
      this.els.modal.classList.remove('show');
      this.els.modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      // Cleanup media elements (stop playback)
      const media = this.els.body?.querySelectorAll('video, audio');
      media?.forEach(m => {
        try {
          m.pause();
          m.src = '';
        } catch (e) {}
      });

      // Revoke object URLs (local files)
      this.items.forEach(item => {
        if (item.kind === 'local' && item._objectUrl) {
          try {
            URL.revokeObjectURL(item._objectUrl);
          } catch (e) {}
        }
      });

      // Clear body after transition
      setTimeout(() => {
        if (!this.isOpen && this.els.body) {
          this.els.body.innerHTML = '';
        }
      }, 300);
    },

    /* ═══════════════════════════════════════════════
       Navigate
       ═══════════════════════════════════════════════ */
    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.render();
      }
    },

    next() {
      if (this.currentIndex < this.items.length - 1) {
        this.currentIndex++;
        this.render();
      }
    },

    getCurrent() {
      return this.items[this.currentIndex] || null;
    },

    /* ═══════════════════════════════════════════════
       Render
       ═══════════════════════════════════════════════ */
    render() {
      const item = this.getCurrent();
      if (!item) return;

      const {
        icon,
        name,
        meta,
        body,
        nav,
        counter,
        prevBtn,
        nextBtn,
        floatPrev,
        floatNext
      } = this.els;

      // ── Header ──
      if (icon) icon.textContent = fileIcon(item.mimetype, item.name);
      if (name) name.textContent = item.name;

      if (meta) {
        meta.innerHTML = '';

        // Size
        meta.appendChild(el('span', { text: formatSize(item.size) }));

        // Category
        const cat = fileCategory(item.mimetype);
        if (cat && cat !== 'other') {
          meta.appendChild(el('span', { text: cat.toUpperCase() }));
        }

        // File X of Y
        if (this.items.length > 1) {
          meta.appendChild(
            el('span', {
              text: `File ${this.currentIndex + 1} of ${this.items.length}`
            })
          );
        }
      }

      // ── Body ──
      if (body) {
        body.innerHTML = '';
        body.appendChild(this.buildContent(item));
      }

      // ── Nav (bottom bar + float arrows) ──
      const hasMultiple = this.items.length > 1;

      // Bottom nav bar
      if (nav) nav.classList.toggle('hidden', !hasMultiple);

      // Card class (controls float nav visibility via CSS)
      if (this.els.card) {
        this.els.card.classList.toggle('has-multiple', hasMultiple);
      }

      if (hasMultiple) {
        // Counter
        if (counter) {
          counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
        }

        // Disabled states
        const isFirst = this.currentIndex === 0;
        const isLast = this.currentIndex === this.items.length - 1;

        if (prevBtn) prevBtn.disabled = isFirst;
        if (nextBtn) nextBtn.disabled = isLast;
        if (floatPrev) floatPrev.disabled = isFirst;
        if (floatNext) floatNext.disabled = isLast;
      } else {
        // Single file — reset disabled states
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (floatPrev) floatPrev.disabled = true;
        if (floatNext) floatNext.disabled = true;
      }
    },

    /* ═══════════════════════════════════════════════
       Build content based on mimetype
       ═══════════════════════════════════════════════ */
    buildContent(item) {
      const cat = fileCategory(item.mimetype);
      const wrap = el('div', {
        style: 'width:100%;height:100%;display:grid;place-items:center;'
      });

      // Get source URL
      let src = item.src;

      if (item.kind === 'local' && src instanceof File) {
        // Create object URL (cached)
        if (!item._objectUrl) {
          item._objectUrl = URL.createObjectURL(src);
        }
        src = item._objectUrl;
      }

      if (!src) {
        return this.noPreview('No preview available', 'Could not load file');
      }

      // ── Image ──
      if (cat === 'image') {
        const img = el('img', { src, alt: item.name });
        img.onerror = () => {
          wrap.innerHTML = '';
          wrap.appendChild(this.noPreview('Failed to load image'));
        };
        wrap.appendChild(img);
        return wrap;
      }

      // ── Video ──
      if (cat === 'video') {
        const video = el('video', {
          src,
          controls: 'true',
          autoplay: 'false',
          preload: 'metadata',
          playsinline: 'true'
        });
        video.onerror = () => {
          wrap.innerHTML = '';
          wrap.appendChild(this.noPreview('Failed to load video'));
        };
        wrap.appendChild(video);
        return wrap;
      }

      // ── Audio ──
      if (cat === 'audio') {
        const audioWrap = el('div', { class: 'audio-wrap' });
        audioWrap.appendChild(el('div', { class: 'audio-icon', text: '🎵' }));
        audioWrap.appendChild(
          el('div', {
            style:
              'color:var(--text);font-weight:600;margin-bottom:20px;font-size:1.05rem;',
            text: item.name
          })
        );
        const audio = el('audio', {
          src,
          controls: 'true',
          preload: 'metadata'
        });
        audioWrap.appendChild(audio);
        return audioWrap;
      }

      // ── PDF ──
      if (cat === 'pdf') {
        const iframe = el('iframe', { src, title: item.name });
        return iframe;
      }

      // ── Text ──
      if (item.mimetype.startsWith('text/') || this.isTextLike(item.name)) {
        if (item.kind === 'local' && item.src instanceof File) {
          return this.renderTextFile(item);
        } else {
          return this.renderRemoteText(item);
        }
      }

      // ── Fallback ──
      return this.noPreview(
        'Preview not available for this file type',
        'You can still download it'
      );
    },

    /**
     * Local text file → read with FileReader
     */
    renderTextFile(item) {
      const wrap = el('div', { class: 'text-preview', text: 'Loading...' });

      const reader = new FileReader();
      reader.onload = e => {
        wrap.textContent = e.target.result || '(empty file)';
      };
      reader.onerror = () => {
        wrap.textContent = 'Failed to read file';
      };

      try {
        reader.readAsText(item.src);
      } catch (e) {
        wrap.textContent = 'Could not read file';
      }

      return wrap;
    },

    /**
     * Remote text → fetch
     */
    renderRemoteText(item) {
      const wrap = el('div', { class: 'text-preview', text: 'Loading...' });

      fetch(item.src)
        .then(r => r.text())
        .then(text => {
          wrap.textContent = text || '(empty file)';
        })
        .catch(() => {
          wrap.textContent = 'Failed to load text';
        });

      return wrap;
    },

    isTextLike(name) {
      const ext = (name.split('.').pop() || '').toLowerCase();
      return [
        'txt',
        'md',
        'json',
        'xml',
        'html',
        'css',
        'js',
        'ts',
        'log',
        'csv',
        'yml',
        'yaml'
      ].includes(ext);
    },

    /* ═══════════════════════════════════════════════
       No preview fallback
       ═══════════════════════════════════════════════ */
    noPreview(text, subtext = '') {
      const wrap = el('div', { class: 'no-preview' });
      wrap.appendChild(el('div', { class: 'no-preview-icon', text: '📄' }));
      wrap.appendChild(el('div', { class: 'no-preview-text', text }));
      if (subtext) {
        wrap.appendChild(
          el('div', {
            style:
              'font-size:0.82rem;color:var(--text-faint);margin-bottom:20px;',
            text: subtext
          })
        );
      }
      return wrap;
    }
  };

  QS.previewModal = previewModal;
})();
