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

      btn.addEventListener('click', () => {
        const open = btn.classList.toggle('active');
        if (open) {
          links.style.display = 'flex';
          links.style.position = 'fixed';
          links.style.top = 'var(--navbar-h)';
          links.style.left = '0';
          links.style.right = '0';
          links.style.flexDirection = 'column';
          links.style.background = 'var(--bg-card)';
          links.style.padding = '20px';
          links.style.borderBottom = '1px solid var(--border)';
          links.style.boxShadow = 'var(--shadow-lg)';
          links.style.gap = '14px';
          links.style.zIndex = '999';
        } else {
          links.style.display = '';
          links.style.position = '';
          links.style.top = '';
          links.style.left = '';
          links.style.right = '';
          links.style.flexDirection = '';
          links.style.background = '';
          links.style.padding = '';
          links.style.borderBottom = '';
          links.style.boxShadow = '';
          links.style.gap = '';
          links.style.zIndex = '';
        }
      });

      // Close on link click (mobile)
      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          if (window.innerWidth < 768) btn.click();
        });
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
