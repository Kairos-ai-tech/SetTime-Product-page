document.addEventListener('DOMContentLoaded', function () {
  // ===== Sticky navbar =====
  const navbar = document.getElementById('navbar');

  function updateNavbar() {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }

  updateNavbar();
  window.addEventListener('scroll', updateNavbar, { passive: true });

  // ===== Mobile nav toggle =====
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', function () {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  });


  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  // ===== Scroll-triggered fade-in =====
  const fadeElements = document.querySelectorAll('.fade-in');

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  // effects.js (GSAP/ScrollTrigger) takes over reveals when it's active.
  fadeElements.forEach(function (el) {
    if (window.__fx) return;
    observer.observe(el);
  });

  // ===== Animated number counters =====
  const counterElements = document.querySelectorAll('[data-count]');

  const counterObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counterElements.forEach(function (el) {
    counterObserver.observe(el);
  });

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const duration = 1600;
    const start = performance.now();

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.floor(easeOutExpo(progress) * target);
      el.textContent = value.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(tick);
  }

  // ===== mailto form submission =====
  function submitViaMailto(subject, bodyLines) {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = 'mailto:kairos.ai.tech@gmail.com?subject=' + encodedSubject + '&body=' + encodedBody;
  }

  // ===== Contact form =====
  const contactForm = document.getElementById('contactForm');

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;
    const message = document.getElementById('message').value;

    submitViaMailto('SetTime 營造執行平台 — 聯絡表單 from ' + name, [
      '姓名 Name: ' + name,
      'Email: ' + email,
      '身份 Role: ' + role,
      '',
      '訊息 Message:\n' + message,
    ]);
  });

  // ===== Pilot application form =====
  const pilotForm = document.getElementById('pilotForm');

  pilotForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const company = document.getElementById('pilotCompany').value;
    const email = document.getElementById('pilotEmail').value;
    const constructionType = document.getElementById('pilotType').value;

    submitViaMailto('SetTime 免費試點申請 from ' + company, [
      '公司名稱 Company: ' + company,
      'Email: ' + email,
      '施工類型 Construction Type: ' + constructionType,
    ]);
  });
});
