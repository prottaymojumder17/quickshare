// public/js/utils.js
// Helper functions

(function () {
  'use strict';

  const QS = window.QS;

  const utils = {
    /**
     * DOM query helpers
     */
    $: (sel, parent = document) => parent.querySelector(sel),
    $$: (sel, parent = document) => Array.from(parent.querySelectorAll(sel)),

    /**
     * Element banao
     */
    el(tag, attrs = {}, children = []) {
      const node = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v !== null && v !== undefined) {
          node.setAttribute(k, v);
        }
      }
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c instanceof Node) node.appendChild(c);
      });
      return node;
    },

    /**
     * Bytes → human readable (KB, MB, GB)
     */
    formatSize(bytes) {
      if (!bytes || bytes <= 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const k = 1024;
      const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        units.length - 1
      );
      return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
    },

    /**
     * Time ago / countdown
     */
    formatDuration(ms) {
      const total = Math.max(0, Math.floor(ms / 1000));
      const m = Math.floor(total / 60);
      const s = total % 60;
      if (m <= 0) return `${s}s`;
      return `${m}m ${s.toString().padStart(2, '0')}s`;
    },

    formatTimeLeft(seconds) {
      if (seconds <= 0) return 'Expired';
      if (seconds < 60) return `${seconds}s`;
      const m = Math.floor(seconds / 60);
      return `${m} min`;
    },

    /**
     * File icon detect by MIME
     */
    fileIcon(mimetype, filename = '') {
      const m = (mimetype || '').toLowerCase();
      const ext = (filename.split('.').pop() || '').toLowerCase();

      if (m.startsWith('image/')) return '🖼️';
      if (m.startsWith('video/')) return '🎬';
      if (m.startsWith('audio/')) return '🎵';
      if (m === 'application/pdf' || ext === 'pdf') return '📕';
      if (
        m.includes('zip') ||
        m.includes('rar') ||
        m.includes('7z') ||
        ['zip', 'rar', '7z'].includes(ext)
      )
        return '📦';
      if (m.includes('word') || ['doc', 'docx'].includes(ext)) return '📘';
      if (
        m.includes('sheet') ||
        m.includes('excel') ||
        ['xls', 'xlsx', 'csv'].includes(ext)
      )
        return '📗';
      if (
        m.includes('presentation') ||
        m.includes('powerpoint') ||
        ['ppt', 'pptx'].includes(ext)
      )
        return '📙';
      if (m.startsWith('text/') || ['txt', 'md', 'json'].includes(ext))
        return '📄';
      if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css'].includes(ext))
        return '💻';
      if (['apk'].includes(ext)) return '📱';
      return '📎';
    },

    /**
     * Category (image/video/audio/pdf/other)
     */
    fileCategory(mimetype) {
      if (!mimetype) return 'other';
      if (mimetype.startsWith('image/')) return 'image';
      if (mimetype.startsWith('video/')) return 'video';
      if (mimetype.startsWith('audio/')) return 'audio';
      if (mimetype === 'application/pdf') return 'pdf';
      return 'other';
    },

    isPreviewable(mimetype) {
      return ['image', 'video', 'audio', 'pdf'].includes(
        this.fileCategory(mimetype)
      );
    },

    /**
     * Clipboard — copy with fallback
     */
    async copy(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        // Fallback (http / older browsers)
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (err) {
        console.warn('Copy failed:', err);
        return false;
      }
    },

    /**
     * Debounce
     */
    debounce(fn, wait = 200) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    /**
     * Throttle
     */
    throttle(fn, limit = 200) {
      let inThrottle = false;
      return function (...args) {
        if (inThrottle) return;
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      };
    },

    /**
     * Escape HTML (XSS prevention for text)
     */
    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * Validate 6-digit code
     */
    isValidCode(code) {
      return /^\d{6}$/.test(String(code || '').trim());
    },

    /**
     * Sanitize code input (only digits)
     */
    onlyDigits(str) {
      return String(str || '').replace(/\D/g, '');
    },

    /**
     * Sleep
     */
    sleep(ms) {
      return new Promise(r => setTimeout(r, ms));
    },

    /**
     * URL param getter
     */
    getParam(name) {
      return new URLSearchParams(window.location.search).get(name);
    },

    /**
     * Trigger custom event
     */
    emit(name, detail = {}) {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    },

    /**
     * Listen custom event
     */
    on(name, fn) {
      window.addEventListener(name, fn);
    }
  };

  QS.utils = utils;
})();
