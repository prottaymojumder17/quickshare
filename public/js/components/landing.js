// public/js/components/landing.js
// Scroll reveal + navbar scroll effect + live stats

(function () {
  'use strict';
  const QS = window.QS;
  const { $, throttle } = QS.utils;

  const landing = {
    init() {
      this.initNavbarScroll();
      this.initScrollReveal();
      this.initStatsCounter();
      this.initMobileMenu();
      this.initLiveStats();
    },

    initNavbarScroll() {
      const nav = $('#navbar');
      if (!nav) return;

      const handler = throttle(() => {
        if (window.scrollY > 20) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      }, 100);

      window.addEventListener('scroll', handler, { passive: true });
      handler();
    },

    initScrollReveal() {
      // Reveal sections on scroll
      const targets = document.querySelectorAll(
        '.features .section-header, .feature-card, .step-card, .stats-grid, .faq-item, .cta-box'
      );
      targets.forEach(el => el.classList.add('reveal'));

      if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('in-view'));
        return;
      }

      const io = new IntersectionObserver(
        entries => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              // stagger
              setTimeout(() => entry.target.classList.add('in-view'), i * 60);
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );

      targets.forEach(el => io.observe(el));
    },

    initStatsCounter() {
      // reserved — animated numbers (simple)
      const el = $('#statActive');
      if (!el) return;
    },

    initMobileMenu() {
      const btn = $('#mobileMenuBtn');
      const links = $('#navbarLinks');
      if (!btn || !links) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = links.classList.toggle('mobile-open');
        btn.classList.toggle('active', isOpen);
        // Lock body scroll when menu open (optional)
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on link click
      links.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          links.classList.remove('mobile-open');
          btn.classList.remove('active');
          document.body.style.overflow = '';
        });
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!links.classList.contains('mobile-open')) return;
        if (!links.contains(e.target) && !btn.contains(e.target)) {
          links.classList.remove('mobile-open');
          btn.classList.remove('active');
          document.body.style.overflow = '';
        }
      });

      // Close on resize to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth > 767 && links.classList.contains('mobile-open')) {
          links.classList.remove('mobile-open');
          btn.classList.remove('active');
          document.body.style.overflow = '';
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('mobile-open')) {
          links.classList.remove('mobile-open');
          btn.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    },

    async initLiveStats() {
      // Fetch stats every 20s
      const fetchStats = async () => {
        try {
          const res = await fetch('/api/stats');
          const data = await res.json();
          if (data?.success) {
            const el = $('#statActive');
            if (el) {
              const n = data.data.activeTransfers || 0;
              animateNumber(el, n);
            }
          }
        } catch (e) {
          // silent
        }
      };
      fetchStats();
      setInterval(fetchStats, 20000);
    }
  };

  function animateNumber(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to) return;
    const duration = 400;
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (to - from) * t);
      el.textContent = v;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  QS.landing = landing;
})();
