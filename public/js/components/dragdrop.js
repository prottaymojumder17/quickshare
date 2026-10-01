// public/js/components/dragdrop.js
// Drag & drop file support

(function () {
  'use strict';
  const QS = window.QS;
  const { $, emit } = QS.utils;

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

      // File input change
      if (this.fileInput) {
        this.fileInput.addEventListener('change', e => {
          const file = e.target.files?.[0];
          if (file) this.handleFile(file);
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
        // only remove if leaving the zone itself
        if (!this.dropzone.contains(e.relatedTarget)) {
          this.dropzone.classList.remove('dragover');
        }
      });

      this.dropzone.addEventListener('drop', e => {
        this.dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) this.handleFile(file);
      });

      // Prevent browser from opening file when dropped outside
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

    handleFile(file) {
      if (file.size > this.maxSize) {
        QS.toast.error(
          'File too large',
          `Maximum size is ${QS.utils.formatSize(this.maxSize)}`,
          3500
        );
        return;
      }
      emit('qs:file-selected', { file });
    },

    /**
     * Programmatically set file (used by paste)
     */
    setFile(file) {
      if (!file) return;
      this.handleFile(file);
    }
  };

  QS.dragdrop = dragdrop;
})();
