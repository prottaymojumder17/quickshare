// public/js/components/backToTop.js
// Scroll to top floating button (with progress ring)

(function () {
  'use strict';
  const QS = window.QS;
  const { $, throttle } = QS.utils;

  // Ring radius (থেকে একটু কম — edge artifact এড়াতে)
  const RING_RADIUS = 21.5;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 135.09

  const backToTop = {
    btn: null,
    ring: null,
    circle: null,
    showAfter: 300, // px scrolled before appearing
    lastPct: -1,

    init() {
      this.btn = $('#backToTop');
      if (!this.btn) return;

      // Inject progress ring
      this.injectRing();

      // Click handler
      this.btn.addEventListener('click', () => this.scrollTop());

      // Scroll listener (throttled)
      window.addEventListener(
        'scroll',
        throttle(() => this.onScroll(), 50),
        { passive: true }
      );

      // Initial check
      this.onScroll();
    },

    /**
     * SVG ring inject করে button-এর ভিতরে
     */
    injectRing() {
      if (!this.btn) return;

      const ns = 'http://www.w3.org/2000/svg';

      // SVG container
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'scroll-ring');
      svg.setAttribute('viewBox', '0 0 48 48');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('aria-hidden', 'true');

      // Circle
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '24');
      circle.setAttribute('cy', '24');
      circle.setAttribute('r', String(RING_RADIUS));

      // Initial state (empty)
      circle.style.strokeDasharray = String(RING_CIRCUMFERENCE);
      circle.style.strokeDashoffset = String(RING_CIRCUMFERENCE);

      // Rotate -90deg so progress starts from top (SVG-based rotation)
      circle.setAttribute('transform', 'rotate(-90 24 24)');

      svg.appendChild(circle);
      this.btn.appendChild(svg);

      this.ring = svg;
      this.circle = circle;
    },

    /**
     * Scroll position update করে — button show/hide + ring progress
     */
    onScroll() {
      if (!this.btn) return;

      const scrolled = window.scrollY || window.pageYOffset || 0;
      const visible = scrolled > this.showAfter;

      // Button show/hide
      this.btn.classList.toggle('visible', visible);

      // Progress ring update
      if (this.circle) {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(1, scrolled / docHeight) : 0;

        // ⚡ Optimize: যদি same percentage হয়, DOM update skip করি
        const roundedPct = Math.round(pct * 1000) / 1000; // 0.001 precision
        if (roundedPct === this.lastPct) return;
        this.lastPct = roundedPct;

        const offset = RING_CIRCUMFERENCE * (1 - pct);
        this.circle.style.strokeDashoffset = `${offset}`;
      }
    },

    /**
     * Smooth scroll to top
     */
    scrollTop() {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }

      // Reset progress visually after scroll (small delay)
      setTimeout(() => {
        this.lastPct = -1;
        this.onScroll();
      }, 500);
    }
  };

  QS.backToTop = backToTop;
})();
