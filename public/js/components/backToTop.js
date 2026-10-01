// public/js/components/backToTop.js
// Scroll to top floating button (with progress ring)

(function () {
  'use strict';
  const QS = window.QS;
  const { $, throttle } = QS.utils;

  const backToTop = {
    btn: null,
    ring: null,
    circle: null,
    showAfter: 300, // px scrolled before appearing

    init() {
      this.btn = $('#backToTop');
      if (!this.btn) return;

      // Inject progress ring inside button (optional visual)
      this.injectRing();

      // Click handler
      this.btn.addEventListener('click', () => this.scrollTop());

      // Scroll listener (throttled)
      window.addEventListener(
        'scroll',
        throttle(() => this.onScroll(), 80),
        { passive: true }
      );

      // Initial check
      this.onScroll();
    },

    injectRing() {
      if (!this.btn) return;
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'scroll-ring');
      svg.setAttribute('viewBox', '0 0 48 48');

      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '24');
      circle.setAttribute('cy', '24');
      circle.setAttribute('r', '22');

      svg.appendChild(circle);
      this.btn.appendChild(svg);

      this.ring = svg;
      this.circle = circle;
    },

    onScroll() {
      if (!this.btn) return;

      const scrolled = window.scrollY || window.pageYOffset;
      const visible = scrolled > this.showAfter;

      this.btn.classList.toggle('visible', visible);

      // Progress ring update
      if (this.circle) {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(1, scrolled / docHeight) : 0;
        const circumference = 2 * Math.PI * 22; // ≈ 138.23
        const offset = circumference * (1 - pct);
        this.circle.style.strokeDasharray = `${circumference}`;
        this.circle.style.strokeDashoffset = `${offset}`;
      }
    },

    scrollTop() {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    }
  };

  QS.backToTop = backToTop;
})();
