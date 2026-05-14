/* ============================================
   COFFEE BROTHERS — APP.JS
   ============================================ */

(function(){
  'use strict';

  /* CURSOR GLOW (desktop only) */
  const glow = document.querySelector('.cursor-glow');
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (glow && !isTouch) {
    let raf;
    window.addEventListener('pointermove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
      });
    });
  } else if (glow) {
    glow.style.display = 'none';
  }

  /* MOBILE MENU */
  const hamb = document.querySelector('.hamb');
  const nav = document.querySelector('.nav');
  if (hamb && nav) {
    const closeMenu = () => {
      nav.classList.remove('open');
      hamb.setAttribute('aria-expanded', 'false');
      hamb.textContent = '☰';
      document.body.classList.remove('menu-open');
    };
    const openMenu = () => {
      nav.classList.add('open');
      hamb.setAttribute('aria-expanded', 'true');
      hamb.textContent = '✕';
      document.body.classList.add('menu-open');
    };
    hamb.addEventListener('click', () => {
      nav.classList.contains('open') ? closeMenu() : openMenu();
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    // ESC schließt
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) closeMenu();
    });

    // Klick außerhalb schließt
    document.addEventListener('click', e => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || hamb.contains(e.target)) return;
      closeMenu();
    });
  }

  /* REVEAL ON SCROLL */
  const revealEls = document.querySelectorAll('.reveal, .menu-card, .campaign, .reel');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => obs.observe(el));
  } else {
    // Fallback: alles direkt sichtbar
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* SLIDER */
  document.querySelectorAll('[data-slider]').forEach(slider => {
    const slidesEl = slider.querySelector('.slides');
    if (!slidesEl) return;
    const total = slidesEl.children.length;
    if (total === 0) return;
    let i = 0;
    let autoTimer;

    const go = n => {
      i = (n + total) % total;
      slidesEl.style.transform = `translateX(-${i * 100}%)`;
    };

    const next = () => go(i + 1);
    const prev = () => go(i - 1);

    slider.querySelector('.next')?.addEventListener('click', () => {
      next();
      restartAuto();
    });
    slider.querySelector('.prev')?.addEventListener('click', () => {
      prev();
      restartAuto();
    });

    const startAuto = () => {
      autoTimer = setInterval(next, 5000);
    };
    const restartAuto = () => {
      clearInterval(autoTimer);
      startAuto();
    };

    startAuto();

    // Pause auf Hover (Desktop)
    slider.addEventListener('mouseenter', () => clearInterval(autoTimer));
    slider.addEventListener('mouseleave', startAuto);

    // Swipe (Mobile)
    let startX = 0;
    slider.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      clearInterval(autoTimer);
    }, { passive: true });
    slider.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        dx < 0 ? next() : prev();
      }
      startAuto();
    });
  });

  /* MAGNETIC LOGO */
  if (!isTouch) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) / 16}px, ${(e.clientY - r.top - r.height / 2) / 16}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* SET TODAY AS MIN DATE FOR RESERVATION */
  const dateInput = document.querySelector('input[type="date"][name="date"]');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

})();
