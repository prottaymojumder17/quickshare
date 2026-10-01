// public/js/components/fileList.js
// Multi-file list UI manager

(function () {
  'use strict';
  const QS = window.QS;
  const { $, el, formatSize, fileIcon, emit } = QS.utils;
  const cfg = QS.config;

  const MAX_FILES = 5;

  const fileList = {
    els: {},
    files: [], // { id, file, name, size, type }
    fileCounter: 0,

    /* ═══════════════════════════════════════════════
       Init
       ═══════════════════════════════════════════════ */
    init() {
      this.els = {
        container: $('#fileList'),
        items: $('#fileListItems'),
        count: $('#fileListCount'),
        size: $('#fileListSize'),
        clearAll: $('#fileListClearAll'),
        addMore: $('#fileListAddMore'),
        warning: $('#fileListWarning'),
        dropzone: $('#dropzone'),
        fileInput: $('#fileInput')
      };

      if (!this.els.container) {
        console.warn('[FileList] container not found');
        return;
      }

      this.bindEvents();
      this.initDragDrop();
      this.updateUI();
    },

    /* ═══════════════════════════════════════════════
      Events
       ═══════════════════════════════════════════════ */
    bindEvents() {
      // Clear all
      this.els.clearAll?.addEventListener('click', () => {
        if (this.files.length === 0) return;
        if (!confirm(`Remove all ${this.files.length} file(s)?`)) return;
        this.clear();
        QS.toast.info('Cleared', 'All files removed', 1800);
      });

      // Add more → trigger file input
      this.els.addMore?.addEventListener('click', () => {
        this.els.fileInput?.click();
      });

      // Listen to file selection from dragdrop
      QS.utils.on('qs:files-selected', e => {
        this.addFiles(e.detail.files);
      });

      // Listen to file removal request
      QS.utils.on('qs:file-remove', e => {
        this.removeFile(e.detail.id);
      });

      // Listen to reset
      QS.utils.on('qs:new-transfer', () => this.clear());
    },

    /* ═══════════════════════════════════════════════
       Drag & Drop Reordering
       ═══════════════════════════════════════════════ */
    initDragDrop() {
      const container = this.els.items;
      if (!container) return;

      let draggedEl = null;
      let draggedId = null;

      // ── Drag start ──
      container.addEventListener('dragstart', e => {
        const row = e.target.closest('.file-row');
        if (!row) return;

        // Only allow drag from handle (or the row itself on touch)
        draggedEl = row;
        draggedId = row.dataset.id;

        row.classList.add('dragging');
        container.classList.add('dragging-active');

        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggedId);
        } catch (err) {
          // Some browsers require this
        }
      });

      // ── Drag over ──
      container.addEventListener('dragover', e => {
        e.preventDefault();
        if (!draggedEl) return;

        const target = e.target.closest('.file-row');
        if (!target || target === draggedEl) return;

        e.dataTransfer.dropEffect = 'move';

        // Clear previous indicators
        container
          .querySelectorAll('.drag-over-top, .drag-over-bottom')
          .forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
          });

        // Determine drop position
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isTop = e.clientY < midY;

        target.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
      });

      // ── Drag leave ──
      container.addEventListener('dragleave', e => {
        const target = e.target.closest('.file-row');
        if (target) {
          target.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });

      // ── Drop ──
      container.addEventListener('drop', e => {
        e.preventDefault();

        if (!draggedId) return;

        const target = e.target.closest('.file-row');
        if (!target || target === draggedEl) {
          this.cleanupDragState();
          return;
        }

        const targetId = target.dataset.id;
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isTop = e.clientY < midY;

        this.reorderFiles(draggedId, targetId, isTop);
        this.cleanupDragState();
      });

      // ── Drag end ──
      container.addEventListener('dragend', () => {
        this.cleanupDragState();
      });

      // ── Make rows draggable ──
      // We make ALL rows draggable, but only show handle for multi-file
      const observer = new MutationObserver(() => {
        this.makeRowsDraggable();
      });
      observer.observe(container, { childList: true });

      // Initial
      this.makeRowsDraggable();
    },

    makeRowsDraggable() {
      if (!this.els.items) return;
      const rows = this.els.items.querySelectorAll('.file-row');
      rows.forEach(row => {
        row.draggable = true;
      });
    },

    cleanupDragState() {
      const container = this.els.items;
      if (!container) return;

      container.classList.remove('dragging-active');
      container.querySelectorAll('.file-row').forEach(row => {
        row.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
    },

    /**
     * Drag করে files reorder করে
     */
    reorderFiles(fromId, toId, insertBefore) {
      const fromIdx = this.files.findIndex(f => f.id === fromId);
      const toIdx = this.files.findIndex(f => f.id === toId);

      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      // Remove
      const [moved] = this.files.splice(fromIdx, 1);

      // Find new index (account for removal)
      let newIdx = this.files.findIndex(f => f.id === toId);
      if (newIdx === -1) newIdx = toIdx;
      if (!insertBefore) newIdx += 1;

      // Insert
      this.files.splice(newIdx, 0, moved);

      // Re-render
      this.render();
      this.makeRowsDraggable();

      // Toast
      QS.toast.info('Reordered', `"${moved.name}" moved`, 1200);

      // Emit change
      emit('qs:file-list-change', {
        count: this.files.length,
        totalSize: this.getTotalSize(),
        files: this.files.map(f => f.file)
      });
    },

    /* ═══════════════════════════════════════════════
       Add files
       ═══════════════════════════════════════════════ */
    addFiles(newFiles) {
      if (!newFiles || newFiles.length === 0) return;

      const skipped = [];
      let addedCount = 0;

      for (const file of newFiles) {
        // Max file count
        if (this.files.length >= MAX_FILES) {
          skipped.push({ file, reason: `Max ${MAX_FILES} files` });
          continue;
        }

        // Size check
        if (file.size > cfg.MAX_FILE_SIZE) {
          skipped.push({
            file,
            reason: `Too large (max ${formatSize(cfg.MAX_FILE_SIZE)})`
          });
          continue;
        }

        // Duplicate check (same name + size)
        const isDuplicate = this.files.some(
          f => f.name === file.name && f.size === file.size
        );
        if (isDuplicate) {
          skipped.push({ file, reason: 'Duplicate' });
          continue;
        }

        // Add
        this.files.push({
          id: `local_${++this.fileCounter}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || ''
        });
        addedCount++;
      }

      if (addedCount > 0) {
        this.render();
        this.updateUI();

        const totalSize = this.getTotalSize();
        QS.toast.success(
          `${addedCount} file${addedCount > 1 ? 's' : ''} added`,
          `${this.files.length} total · ${formatSize(totalSize)}`,
          2200
        );

        emit('qs:file-list-change', {
          count: this.files.length,
          totalSize,
          files: this.files.map(f => f.file)
        });
      }

      // Show skipped warning
      if (skipped.length > 0) {
        const msg = skipped
          .map(s => `"${s.file.name}" — ${s.reason}`)
          .join('; ');
        this.showWarning(msg);
      } else {
        this.hideWarning();
      }
    },

    /* ═══════════════════════════════════════════════
       Remove one file
       ═══════════════════════════════════════════════ */
    removeFile(id) {
      const idx = this.files.findIndex(f => f.id === id);
      if (idx === -1) return;

      const removed = this.files.splice(idx, 1)[0];
      this.render();
      this.updateUI();

      QS.toast.info('Removed', removed.name, 1500);

      emit('qs:file-list-change', {
        count: this.files.length,
        totalSize: this.getTotalSize(),
        files: this.files.map(f => f.file)
      });
    },

    /* ═══════════════════════════════════════════════
       Clear all
       ═══════════════════════════════════════════════ */
    clear() {
      this.files = [];
      this.fileCounter = 0;
      this.render();
      this.updateUI();
      this.hideWarning();

      // Reset file input
      if (this.els.fileInput) this.els.fileInput.value = '';

      emit('qs:file-list-change', {
        count: 0,
        totalSize: 0,
        files: []
      });
    },

    /* ═══════════════════════════════════════════════
       Render file rows
       ═══════════════════════════════════════════════ */
    render() {
      const { items } = this.els;
      if (!items) return;

      items.innerHTML = '';

      this.files.forEach(f => {
        items.appendChild(this.createRow(f));
      });
    },

    createRow(f) {
      const row = el('div', {
        class: 'file-row',
        'data-id': f.id
      });

      // Drag handle (দৃশ্যমান হবে multi-file হলে CSS দিয়ে)
      const dragHandle = el('div', {
        class: 'file-row-drag',
        title: 'Drag to reorder',
        html: '⋮⋮'
      });

      // Icon
      const icon = el('div', {
        class: 'file-row-icon',
        text: fileIcon(f.type, f.name)
      });

      // Info
      const info = el('div', { class: 'file-row-info' });
      const name = el('div', {
        class: 'file-row-name',
        text: f.name,
        title: f.name
      });
      const meta = el('div', { class: 'file-row-meta' });
      meta.appendChild(el('span', { text: formatSize(f.size) }));
      if (f.type) {
        const shortType = f.type.split('/')[1]?.toUpperCase() || '';
        if (shortType) meta.appendChild(el('span', { text: shortType }));
      }
      info.appendChild(name);
      info.appendChild(meta);

      // Actions
      const actions = el('div', { class: 'file-row-actions' });

      const previewBtn = el('button', {
        class: 'file-row-btn preview-btn',
        type: 'button',
        title: 'Preview',
        html: '👁️',
        onclick: e => {
          e.stopPropagation();
          emit('qs:file-preview', { id: f.id });
        }
      });

      const deleteBtn = el('button', {
        class: 'file-row-btn delete-btn',
        type: 'button',
        title: 'Remove',
        html: '✕',
        onclick: e => {
          e.stopPropagation();
          this.removeFile(f.id);
        }
      });

      actions.appendChild(previewBtn);
      actions.appendChild(deleteBtn);

      // Assemble
      row.appendChild(dragHandle);
      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(actions);

      return row;
    },

    /* ═══════════════════════════════════════════════
       Update UI state
       ═══════════════════════════════════════════════ */
    updateUI() {
      const { container, count, size, dropzone } = this.els;

      const hasFiles = this.files.length > 0;
      const isMulti = this.files.length > 1;

      if (container) {
        container.classList.toggle('show', hasFiles);
        container.classList.toggle('has-multiple', isMulti);
      }

      if (count) count.textContent = String(this.files.length);
      if (size) size.textContent = formatSize(this.getTotalSize());

      // Dropzone hide when files exist
      if (dropzone) {
        dropzone.classList.toggle('has-file', hasFiles);
      }

      // Update send button state
      this.updateSendButton();
    },

    updateSendButton() {
      const btn = $('#sendFileBtn');
      if (!btn) return;
      const hasFiles = this.files.length > 0;
      btn.disabled = !hasFiles;

      const btnText = btn.querySelector('.btn-text');
      if (btnText) {
        if (this.files.length === 0) btnText.textContent = 'Send File';
        else if (this.files.length === 1) btnText.textContent = 'Send File';
        else btnText.textContent = `Send ${this.files.length} Files`;
      }
    },

    /* ═══════════════════════════════════════════════
       Warnings
       ═══════════════════════════════════════════════ */
    showWarning(msg) {
      if (!this.els.warning) return;
      this.els.warning.textContent = msg;
      this.els.warning.classList.add('show');

      clearTimeout(this._warningTimer);
      this._warningTimer = setTimeout(() => this.hideWarning(), 6000);
    },

    hideWarning() {
      if (!this.els.warning) return;
      this.els.warning.classList.remove('show');
      this.els.warning.textContent = '';
    },

    /* ═══════════════════════════════════════════════
       Helpers
       ═══════════════════════════════════════════════ */
    getTotalSize() {
      return this.files.reduce((sum, f) => sum + (f.size || 0), 0);
    },

    getFiles() {
      return this.files.map(f => f.file);
    },

    /**
     * Backend-এ পাঠানোর জন্য order array
     * Format: "0,1,2,3" (comma-separated indices)
     */
    getFileOrder() {
      // files array already in correct order,
      // প্রতিটা file-এর position index হবে
      return this.files.map((_, i) => i).join(',');
    },

    getCount() {
      return this.files.length;
    },

    isEmpty() {
      return this.files.length === 0;
    },

    /**
     * Row-এ uploading state set করে
     */
    setRowState(localId, state, progress = 0) {
      const row = this.els.items?.querySelector(`[data-id="${localId}"]`);
      if (!row) return;
      row.classList.remove('uploading', 'error', 'success');
      if (state) row.classList.add(state);
      if (state === 'uploading') {
        row.style.setProperty('--progress', `${progress}%`);
      }
    },

    disableAll() {
      this.els.items?.querySelectorAll('.file-row').forEach(r => {
        r.classList.add('disabled');
      });
    },

    enableAll() {
      this.els.items?.querySelectorAll('.file-row').forEach(r => {
        r.classList.remove('disabled');
      });
    }
  };

  QS.fileList = fileList;
})();
