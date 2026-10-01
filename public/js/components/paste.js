// public/js/components/paste.js
// Ctrl+V paste support (file or text)

(function () {
  'use strict';
  const QS = window.QS;
  const { $ } = QS.utils;

  const paste = {
    init() {
      document.addEventListener('paste', e => {
        // Ignore if user pasting inside textarea/input (allow native paste)
        const tag = (e.target?.tagName || '').toLowerCase();
        const isTextTarget = tag === 'textarea' || tag === 'input';

        const items = e.clipboardData?.items;
        if (!items) return;

        // Look for files
        let file = null;
        for (const item of items) {
          if (item.kind === 'file') {
            file = item.getAsFile();
            if (file) break;
          }
        }

        if (file) {
          // Only use pasted file if on Send tab and send-file is active
          if (QS.router?.currentTab !== 'send') {
            QS.toast.info(
              'Switch to Send tab',
              'Then paste the file again',
              2500
            );
            return;
          }
          if (QS.router?.currentSubtab === 'text') {
            QS.router.switchSubtab('file');
          }
          QS.dragdrop?.setFile(file);
          e.preventDefault();
          return;
        }

        // Text paste — only auto-use when NOT inside a textarea
        if (!isTextTarget) {
          const text = e.clipboardData.getData('text/plain');
          if (text && text.trim().length > 0) {
            // Auto-switch to text subtab and fill
            if (QS.router?.currentTab !== 'send') {
              QS.router.switchTab('send');
            }
            QS.router?.switchSubtab('text');
            const ta = $('#textInput');
            if (ta) {
              ta.value = text;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              QS.toast.success('Pasted!', 'Text added to send area', 2000);
            }
          }
        }
      });
    }
  };

  QS.paste = paste;
})();
