// public/js/components/dragdrop.js
// Drag & drop + file input for multiple files

(function () {
  'use strict';
  const QS = window.QS;
  const { $, emit, formatSize } = QS.utils;

  const MAX_FILES = 5;

  const dragdrop = {
    dropzone: null,
    fileInput: null,
    maxSize: 0,

    init() {
      this.dropzone = $('#dropzone');
      this.fileInput = $('#fileInput');
      this.maxSize = QS.config.MAX_FILE_SIZE;

      if (!this.dropzone) return;

      // Click → open file dialog
      this.dropzone.addEventListener('click', () => {
        this.fileInput?.click();
      });

      // File input change (multiple)
      if (this.fileInput) {
        this.fileInput.addEventListener('change', e => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) this.handleFiles(files);
          // Reset input so same file can be selected again
          e.target.value = '';
        });
      }

      // Drag events
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        this.dropzone.addEventListener(evt, e => {
          e.preventDefault();
          e.stopPropagation();
        });
      });

      this.dropzone.addEventListener('dragenter', () => {
        this.dropzone.classList.add('dragover');
      });

      this.dropzone.addEventListener('dragover', () => {
        this.dropzone.classList.add('dragover');
      });

      this.dropzone.addEventListener('dragleave', e => {
        if (!this.dropzone.contains(e.relatedTarget)) {
          this.dropzone.classList.remove('dragover');
        }
      });

      this.dropzone.addEventListener('drop', e => {
        this.dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length > 0) this.handleFiles(files);
      });

      // Prevent browser from opening files when dropped outside
      ['dragover', 'drop'].forEach(evt => {
        window.addEventListener(evt, e => {
          if (!this.dropzone.contains(e.target)) {
            e.preventDefault();
          }
        });
      });

      // Body drag state
      window.addEventListener('dragenter', () =>
        document.body.classList.add('dragging-file')
      );
      window.addEventListener('dragleave', e => {
        if (e.relatedTarget === null)
          document.body.classList.remove('dragging-file');
      });
      window.addEventListener('drop', () =>
        document.body.classList.remove('dragging-file')
      );
    },

    /**
     * Multiple files handle করে
     * Validation fileList-এ হবে (single source of truth)
     */
    handleFiles(files) {
      if (!files || files.length === 0) return;

      // Emit — fileList add করবে (validation সহ)
      emit('qs:files-selected', { files });
    },

    /**
     * Programmatic set (paste থেকে)
     * Single file আসলেও array-এ wrap করি
     */
    setFile(file) {
      if (!file) return;
      this.handleFiles([file]);
    }
  };

  QS.dragdrop = dragdrop;
})();
