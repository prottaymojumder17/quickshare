// public/js/components/faq.js
// FAQ accordion

(function () {
  'use strict';
  const QS = window.QS;
  const { $$ } = QS.utils;

  const faq = {
    init() {
      const items = $$('.faq-item');
      items.forEach(item => {
        const q = item.querySelector('.faq-question');
        if (!q) return;
        q.addEventListener('click', () => {
          const isOpen = item.classList.contains('open');
          // Close all
          items.forEach(i => i.classList.remove('open'));
          // Toggle current
          if (!isOpen) item.classList.add('open');
        });
      });

      // Open first by default
      // if (items.length > 0) {
      //   items[0].classList.add('open');
      // }
    }
  };

  QS.faq = faq;
})();
