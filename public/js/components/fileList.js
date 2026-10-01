// public/js/components/fileList.js
// Multi-file list with drag-reorder (mouse + touch)

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

    // Drag state
    dragState: {
      active: false,
      fromId: null,
      fromIndex: -1,
      targetId: null,
      position: null, // 'top' | 'bottom'
      pointerId: null,
      ghost: null, // floating preview element
      offsetY: 0,
      startY: 0,
      listRect: null
    },

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

      // Listen to file selection
      QS.utils.on('qs:files-selected', e => {
        this.addFiles(e.detail.files);
      });

      // Reset
      QS.utils.on('qs:new-transfer', () => this.clear());
    },

    /* ═══════════════════════════════════════════════
       DRAG & DROP — Mouse + Touch
       ═══════════════════════════════════════════════ */

    initDragDrop() {
      const container = this.els.items;
      if (!container) return;

      // Only bind pointer drag from handle
      container.addEventListener('pointerdown', e => {
        const handle = e.target.closest('.file-row-drag');
        if (!handle) return;

        const row = handle.closest('.file-row');
        if (!row) return;

        // Only allow reorder if multiple files
        if (this.files.length < 2) return;

        e.preventDefault();

        this.startDrag(e, row);
      });

      // Global listeners
      document.addEventListener('pointermove', e => this.onDragMove(e));
      document.addEventListener('pointerup', e => this.onDragEnd(e));
      document.addEventListener('pointercancel', e => this.onDragEnd(e));

      // Keyboard reorder (accessibility)
      container.addEventListener('keydown', e => this.onKeyReorder(e));
    },

    startDrag(e, row) {
      const id = row.dataset.id;
      const index = this.files.findIndex(f => f.id === id);
      if (index === -1) return;

      // Setup drag state
      this.dragState.active = true;
      this.dragState.fromId = id;
      this.dragState.fromIndex = index;
      this.dragState.pointerId = e.pointerId;
      this.dragState.startY = e.clientY;
      this.dragState.listRect = this.els.items.getBoundingClientRect();

      // Row rect
      const rowRect = row.getBoundingClientRect();
      this.dragState.offsetY = e.clientY - rowRect.top;

      // Style row as dragging
      row.classList.add('dragging');

      // Make pointer capture
      try {
        row.setPointerCapture(e.pointerId);
      } catch (err) {}

      // Create ghost element
      this.createGhost(row, rowRect);

      // Add dragging-active class
      this.els.items.classList.add('dragging-active');

      // Prevent text selection
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    },

    createGhost(row, rect) {
      const ghost = row.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '99999';
      ghost.style.opacity = '0.9';
      ghost.style.transform = 'scale(1.02)';
      ghost.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';

      document.body.appendChild(ghost);
      this.dragState.ghost = ghost;
    },

    onDragMove(e) {
      if (!this.dragState.active) return;
      if (e.pointerId !== this.dragState.pointerId) return;

      e.preventDefault();

      const ghost = this.dragState.ghost;
      if (!ghost) return;

      // Move ghost
      const newTop = e.clientY - this.dragState.offsetY;
      ghost.style.top = newTop + 'px';

      // Determine drop target
      const rows = Array.from(
        this.els.items.querySelectorAll('.file-row:not(.dragging)')
      );
      let target = null;
      let position = null;

      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          target = row;
          position = e.clientY < midY ? 'top' : 'bottom';
          break;
        }

        // If pointer is above all rows
        if (e.clientY < rect.top && !target) {
          target = row;
          position = 'top';
        }
      }

      // Clear previous indicators
      this.els.items.querySelectorAll('.file-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      // Apply new indicator
      if (target) {
        target.classList.add(
          position === 'top' ? 'drag-over-top' : 'drag-over-bottom'
        );
        this.dragState.targetId = target.dataset.id;
        this.dragState.position = position;
      } else {
        this.dragState.targetId = null;
        this.dragState.position = null;
      }

      // Auto-scroll list if near top/bottom
      this.maybeAutoScroll(e.clientY);
    },

    maybeAutoScroll(clientY) {
      const container = this.els.items;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const threshold = 40;
      const speed = 8;

      if (clientY < rect.top + threshold) {
        container.scrollTop -= speed;
      } else if (clientY > rect.bottom - threshold) {
        container.scrollTop += speed;
      }
    },

    onDragEnd(e) {
      if (!this.dragState.active) return;

      const { fromId, targetId, position, ghost, pointerId } = this.dragState;

      // Cleanup ghost
      if (ghost && ghost.parentNode) ghost.remove();

      // Reorder if target exists
      if (targetId && fromId !== targetId) {
        this.reorderFiles(fromId, targetId, position === 'top');
      }

      // Reset state
      this.cleanupDragState();
    },

    cleanupDragState() {
      const container = this.els.items;
      if (container) {
        container.classList.remove('dragging-active');
        container.querySelectorAll('.file-row').forEach(row => {
          row.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
        });
      }

      if (this.dragState.ghost && this.dragState.ghost.parentNode) {
        this.dragState.ghost.remove();
      }

      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      this.dragState = {
        active: false,
        fromId: null,
        fromIndex: -1,
        targetId: null,
        position: null,
        pointerId: null,
        ghost: null,
        offsetY: 0,
        startY: 0,
        listRect: null
      };
    },

    /* ═══════════════════════════════════════════════
       Keyboard reorder (accessibility)
       - Space/Enter on handle → select for move
       - Arrow Up/Down → move
       - Escape → cancel
       ═══════════════════════════════════════════════ */
    onKeyReorder(e) {
      const handle = e.target.closest('.file-row-drag');
      if (!handle) return;

      const row = handle.closest('.file-row');
      if (!row) return;

      const id = row.dataset.id;
      const index = this.files.findIndex(f => f.id === id);
      if (index === -1) return;

      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        this.moveFile(index, index - 1);
      } else if (e.key === 'ArrowDown' && index < this.files.length - 1) {
        e.preventDefault();
        this.moveFile(index, index + 1);
      }
    },

    /**
     * Move file from one index to another (used by keyboard)
     */
    moveFile(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;
      const [moved] = this.files.splice(fromIndex, 1);
      this.files.splice(toIndex, 0, moved);
      this.render();
      this.updateUI();
      this.emitChange();
      QS.toast.info(
        'Moved',
        `"${moved.name}" to position ${toIndex + 1}`,
        1200
      );
    },

    /**
     * Reorder — drag-based
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
      this.updateUI();
      this.emitChange();

      QS.toast.info('Reordered', `"${moved.name}" moved`, 1200);
    },

    /* ═══════════════════════════════════════════════
       Add files
       ═══════════════════════════════════════════════ */
    addFiles(newFiles) {
      if (!newFiles || newFiles.length === 0) return;

      const skipped = [];
      let addedCount = 0;

      for (const file of newFiles) {
        if (this.files.length >= MAX_FILES) {
          skipped.push({ file, reason: `Max ${MAX_FILES} files` });
          continue;
        }

        if (file.size > cfg.MAX_FILE_SIZE) {
          skipped.push({
            file,
            reason: `Too large (max ${formatSize(cfg.MAX_FILE_SIZE)})`
          });
          continue;
        }

        // Total size check
        const totalNow = this.getTotalSize();
        if (totalNow + file.size > 200 * 1024 * 1024) {
          skipped.push({ file, reason: 'Total size exceeded (max 200 MB)' });
          continue;
        }

        const isDuplicate = this.files.some(
          f => f.name === file.name && f.size === file.size
        );
        if (isDuplicate) {
          skipped.push({ file, reason: 'Duplicate' });
          continue;
        }

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
        this.emitChange();

        const totalSize = this.getTotalSize();
        QS.toast.success(
          `${addedCount} file${addedCount > 1 ? 's' : ''} added`,
          `${this.files.length} total · ${formatSize(totalSize)}`,
          2200
        );
      }

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
      this.emitChange();

      QS.toast.info('Removed', removed.name, 1500);
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
      this.emitChange();

      if (this.els.fileInput) this.els.fileInput.value = '';
    },

    /* ═══════════════════════════════════════════════
       Render
       ═══════════════════════════════════════════════ */
    render() {
      const { items } = this.els;
      if (!items) return;

      items.innerHTML = '';
      this.files.forEach(f => items.appendChild(this.createRow(f)));

      // Enable drag only for multi-file
      items.querySelectorAll('.file-row').forEach(row => {
        const handle = row.querySelector('.file-row-drag');
        if (handle) {
          handle.setAttribute('tabindex', '0');
          handle.setAttribute('role', 'button');
          handle.setAttribute('aria-label', 'Drag to reorder');
        }
      });
    },

    createRow(f) {
      const row = el('div', {
        class: 'file-row',
        'data-id': f.id
      });

      // Drag handle
      const dragHandle = el('div', {
        class: 'file-row-drag',
        title: 'Drag to reorder (or use arrow keys)',
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
       UI State
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

      if (dropzone) {
        dropzone.classList.toggle('has-file', hasFiles);
      }

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
       Warning
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
       Emit change event
       ═══════════════════════════════════════════════ */
    emitChange() {
      emit('qs:file-list-change', {
        count: this.files.length,
        totalSize: this.getTotalSize(),
        files: this.files.map(f => f.file)
      });
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

    getItems() {
      return [...this.files];
    },

    getFileOrder() {
      return this.files.map((_, i) => i).join(',');
    },

    getCount() {
      return this.files.length;
    },

    isEmpty() {
      return this.files.length === 0;
    },

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
