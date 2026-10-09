// Motion layer: Lenis smooth scroll + GSAP/ScrollTrigger reveals, plus
// vanilla ports of a few react-bits effects (spotlight cards, magnetic
// buttons, shiny text) and a Vanta NET backdrop for the pilot section.
//
// Progressive enhancement only. Everything it needs is vendored (vendor/).
// If GSAP/Lenis fail to load, or the visitor prefers reduced motion, this
// file does nothing: `window.__fx` stays unset, script.js keeps its
// IntersectionObserver reveals, and the CSS fallback shows all content.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  window.__fx = true; // tells script.js to skip its own fade-in observer
  document.documentElement.classList.add('fx');

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isNarrow = window.innerWidth < 768;

  document.addEventListener('DOMContentLoaded', function () {
    initLenis();
    initReveals();
    initHeroScrub();
    initScrollProgress();
    initShinyText();
    if (finePointer) {
      initSpotlight();
      initMagnet();
    }
    initVanta();
    // i18n.js / fonts can change layout after first paint — re-measure.
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  });

  // ===== Lenis: smooth scroll, driven by GSAP's ticker =====
  function initLenis() {
    if (!window.Lenis) return;
    const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Anchor links: native smooth-scroll is disabled by Lenis (see .lenis in
    // styles.css), so route in-page links through lenis.scrollTo.
    const navbar = document.getElementById('navbar');
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -((navbar ? navbar.offsetHeight : 68) + 16), duration: 1.4 });
        history.replaceState(null, '', id);
      });
    });
  }

  // ===== Scroll-triggered reveals (replaces the CSS-transition fade-in) =====
  function initReveals() {
    const heading = '.section-heading, .hero-title';
    document.querySelectorAll('.fade-in').forEach(function (el) {
      const delay = (parseInt(el.getAttribute('data-delay'), 10) || 0) * 0.08;
      const blur = el.matches(heading);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: function () {
          el.classList.add('visible'); // some descendants key off .fade-in.visible
          gsap.fromTo(
            el,
            { opacity: 0, y: 28, filter: blur ? 'blur(10px)' : 'none' },
            {
              opacity: 1,
              y: 0,
              filter: blur ? 'blur(0px)' : 'none',
              duration: 1,
              delay: delay,
              ease: 'expo.out',
              clearProps: 'opacity,transform,filter',
            }
          );
        },
      });
    });
  }

  // ===== Hero: copy fades away as the camera flies into the rebar cage =====
  function initHeroScrub() {
    const track = document.querySelector('.hero-track');
    if (!track) return;
    gsap.to('.hero-content, .hero-stats, .scroll-hint', {
      autoAlpha: 0,
      y: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top top-=' + window.innerHeight * 0.1,
        end: 'top top-=' + window.innerHeight * 0.75,
        scrub: true,
      },
    });
  }

  // ===== Scroll progress bar =====
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
      }
    );
  }

  // ===== react-bits ShinyText (CSS sweep; see .fx-shiny) =====
  function initShinyText() {
    document.querySelectorAll('.hero-slogan').forEach(function (el) { el.classList.add('fx-shiny'); });
  }

  // ===== react-bits SpotlightCard: glow follows the cursor =====
  function initSpotlight() {
    document.querySelectorAll('.result-card, .moat').forEach(function (card) {
      card.classList.add('fx-spot');
      card.addEventListener('pointermove', function (e) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--sx', e.clientX - r.left + 'px');
        card.style.setProperty('--sy', e.clientY - r.top + 'px');
      });
    });
  }

  // ===== react-bits Magnet: buttons lean toward the cursor =====
  // Drives CSS vars consumed by the `translate` property, so it composes
  // with the buttons' own hover `transform` instead of fighting it.
  function initMagnet() {
    document.querySelectorAll('.hero-cta, .form-submit, .nav-cta').forEach(function (el) {
      const pos = { x: 0, y: 0 };
      const apply = function () {
        el.style.setProperty('--mag-x', pos.x + 'px');
        el.style.setProperty('--mag-y', pos.y + 'px');
      };
      el.classList.add('fx-magnet');
      el.addEventListener('pointermove', function (e) {
        const r = el.getBoundingClientRect();
        gsap.to(pos, {
          x: (e.clientX - (r.left + r.width / 2)) * 0.25,
          y: (e.clientY - (r.top + r.height / 2)) * 0.35,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: true,
          onUpdate: apply,
        });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(pos, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: true, onUpdate: apply });
      });
    });
  }

  // ===== Vanta NET behind the pilot form (lazy; only while on screen) =====
  // Vanta expects a global THREE, which the page only has as an ES module,
  // so bridge it. Created on entering the viewport and destroyed on leaving
  // so it never runs a second WebGL loop alongside the page backdrop.
  function initVanta() {
    const section = document.getElementById('pilot');
    if (!section || isNarrow) return;

    const host = document.createElement('div');
    host.className = 'vanta-host';
    host.setAttribute('aria-hidden', 'true');
    section.insertBefore(host, section.firstChild);

    let effect = null;
    let loading = null;

    function loadVanta() {
      if (loading) return loading;
      loading = import('three').then(function (mod) {
        window.THREE = Object.assign({}, mod);
        return new Promise(function (resolve, reject) {
          const s = document.createElement('script');
          s.src = 'vendor/vanta.net.min.js';
          s.onload = function () { const m = window._vantaEffect; resolve(m && m.default ? m.default : m); };
          s.onerror = reject;
          document.head.appendChild(s);
        });
      });
      return loading;
    }

    function start() {
      if (effect) return;
      loadVanta().then(function (NET) {
        if (effect || !NET) return;
        try {
          effect = NET({
            el: host,
            mouseControls: true,
            touchControls: false,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            scale: 1,
            scaleMobile: 1,
            color: 0xdd8e1f,
            backgroundColor: 0x0b1a2d,
            points: 9,
            maxDistance: 20,
            spacing: 17,
            showDots: true,
          });
        } catch (e) {
          effect = null; // WebGL/Vanta failure — the CSS gradient stays
        }
      }).catch(function () { /* vendor/three or vanta missing — keep gradient */ });
    }

    function stop() {
      if (!effect) return;
      try { effect.destroy(); } catch (e) { /* ignore */ }
      effect = null;
    }

    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { rootMargin: '200px 0px' }).observe(section);
  }
})();
