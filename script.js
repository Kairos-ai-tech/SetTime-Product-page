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
  function buildMailtoHref(subject, bodyLines) {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(bodyLines.join('\n'));
    return 'mailto:kairos.ai.tech@gmail.com?subject=' + encodedSubject + '&body=' + encodedBody;
  }

  function submitViaMailto(subject, bodyLines) {
    window.location.href = buildMailtoHref(subject, bodyLines);
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
  // Submits via FormSubmit (formsubmit.co) AJAX so the application lands in
  // the inbox without the visitor needing a mail app. mailto is kept as the
  // fallback if the POST fails.
  //
  // PILOT_FORM_RECIPIENT is the only place the delivery address lives. After
  // the one-time FormSubmit activation (an email to kairos.ai.tech@gmail.com
  // on the first live submission), swap this for the hashed alias FormSubmit
  // provides in that email so the raw address isn't in the page source.
  const PILOT_FORM_RECIPIENT = 'kairos.ai.tech@gmail.com';
  const PILOT_FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + PILOT_FORM_RECIPIENT;
  const PILOT_FORM_TIMEOUT_MS = 10000;

  const pilotForm = document.getElementById('pilotForm');
  const pilotStatus = document.getElementById('pilotStatus');
  const pilotStatusText = document.getElementById('pilotStatusText');
  const pilotMailtoLink = document.getElementById('pilotMailtoLink');
  const pilotSubmit = pilotForm.querySelector('button[type="submit"]');
  const pilotSubmitLabel = pilotSubmit.querySelector('[data-i18n]');

  // Looks a key up in i18n.js's translations for the current language. The
  // element also gets data-i18n so a later language switch re-translates it.
  function setI18nText(el, key) {
    el.setAttribute('data-i18n', key);
    const langSelect = document.getElementById('langSelect');
    const dicts = typeof translations !== 'undefined' ? translations : null;
    const dict = dicts && ((langSelect && dicts[langSelect.value]) || dicts[DEFAULT_LANG]);
    if (dict && typeof dict[key] === 'string') el.textContent = dict[key];
  }

  // mailtoHref is set only for the fallback: a manual link, since browsers
  // can refuse the automatic mailto: launch once the click's user activation
  // has expired during a slow request.
  function showPilotStatus(key, mailtoHref) {
    setI18nText(pilotStatusText, key);
    pilotStatus.classList.toggle('is-fallback', !!mailtoHref);
    if (mailtoHref) {
      pilotMailtoLink.href = mailtoHref;
      setI18nText(pilotMailtoLink, 'pilot.fallback.link');
    }
    pilotMailtoLink.hidden = !mailtoHref;
    pilotStatus.hidden = false;
  }

  function setPilotSending(sending) {
    pilotSubmit.disabled = sending;
    pilotSubmit.setAttribute('aria-busy', sending ? 'true' : 'false');
    setI18nText(pilotSubmitLabel, sending ? 'pilot.sending' : 'pilot.submit');
  }

  pilotForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (pilotSubmit.disabled) return;

    const field = (id) => document.getElementById(id).value.trim();
    const company = field('pilotCompany');
    const email = field('pilotEmail');
    const notes = field('pilotNotes');
    const subject = 'SetTime 免費試點申請 from ' + company;

    // Same bilingual labels for the FormSubmit table and the mailto body.
    const fields = [
      ['姓名 Name', field('pilotName')],
      ['公司名稱 Company', company],
      ['Email', email],
      ['國家/地區 Country', field('pilotCountry')],
      ['身份 Role', field('pilotRole')],
    ];
    const bodyLines = fields
      .map((f) => f[0] + ': ' + f[1])
      .concat(['', '補充說明 Notes:\n' + notes]);

    // Honeypot filled: almost certainly a bot. Look like it worked, send nothing.
    if (field('pilotHoney') !== '') {
      pilotForm.reset();
      showPilotStatus('pilot.success');
      return;
    }

    const payload = {};
    fields.forEach((f) => { payload[f[0]] = f[1]; });
    payload['補充說明 Notes'] = notes;
    payload._subject = subject;
    payload._replyto = email;
    payload._template = 'table';
    payload._honey = '';

    pilotStatus.hidden = true;
    setPilotSending(true);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), PILOT_FORM_TIMEOUT_MS) : null;

    fetch(PILOT_FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined,
    })
      .then((res) => res.json().catch(() => ({})).then((data) => ({ ok: res.ok, data: data })))
      .then((result) => {
        // FormSubmit answers {success: "true"} (a string). Anything else,
        // including the "needs activation" reply before the address is
        // confirmed, counts as a failure.
        const success = result.data && result.data.success;
        if (!result.ok || (success !== true && success !== 'true')) {
          throw new Error((result.data && result.data.message) || 'FormSubmit rejected the submission');
        }
        pilotForm.reset();
        showPilotStatus('pilot.success');
      })
      .catch((err) => {
        console.warn('Pilot form: FormSubmit failed, falling back to mailto', err);
        showPilotStatus('pilot.fallback', buildMailtoHref(subject, bodyLines));
        submitViaMailto(subject, bodyLines);
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
        setPilotSending(false);
      });
  });
});
