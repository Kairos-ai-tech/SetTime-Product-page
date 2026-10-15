var stage = document.querySelector(".cage-stage");
if (stage) {
  var svg = stage.querySelector("svg");
  var carriage = svg.querySelector('[data-part="carriage"]');
  var track = svg.querySelector("[data-track]");
  var readout = document.querySelector(".cage-figure [data-readout]");
  var tickFixed = svg.querySelector('[data-ticks="fixed"]');
  var tickMid = svg.querySelector('[data-ticks="mid"]');
  var midBack = [];
  var midFront = [];
  svg.querySelectorAll("[data-mid]").forEach(function (node) {
    var list = node.closest('[data-layer="stirrups-back"]') ? midBack : midFront;
    list[Number(node.getAttribute("data-mid"))] = node;
  });
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var ax = [CFG.sinA * CFG.k, CFG.cosA * CFG.sinE * CFG.k];
  var span = CFG.spacing.max - CFG.spacing.min;
  var gaugeSpan = CFG.gauge.x1 - CFG.gauge.x0;
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  var snap = function (mm) { return clamp(Math.round(mm / CFG.spacing.step) * CFG.spacing.step, CFG.spacing.min, CFG.spacing.max); };
  var gaugeX = function (mm) { return CFG.gauge.x0 + ((mm - CFG.spacing.min) * gaugeSpan) / span; };
  var spacingAt = function (x) { return CFG.spacing.min + ((x - CFG.gauge.x0) * span) / gaugeSpan; };
  var screen = function (x, y, z) {
    return [
      CFG.origin[0] + (x * CFG.sinA - y * CFG.cosA) * CFG.k,
      CFG.origin[1] + ((x * CFG.cosA + y * CFG.sinA) * CFG.sinE - z * CFG.cosE) * CFG.k
    ];
  };
  var fine = function (n) { return Math.round(n * 10) / 10; };
  var intervals = function (spacing) { return Math.ceil((CFG.midTo - CFG.midFrom) / spacing); };
  var targetsFor = function (spacing) {
    var m = intervals(spacing);
    var out = [];
    for (var i = 0; i < CFG.midMax; i++) out.push(i < m - 1 ? CFG.midFrom + ((CFG.midTo - CFG.midFrom) * (i + 1)) / m : CFG.midTo);
    return out;
  };

  var spacing = CFG.spacing.start;
  var target = spacing;
  var knob = gaugeX(spacing);
  var pos = targetsFor(spacing);
  var alpha = pos.map(function (_, i) { return i < intervals(spacing) - 1 ? 1 : 0; });
  var touring = true;
  var visible = false;
  var frame = 0;
  var last = 0;
  var clock = 0;
  var idleTimer = 0;
  var dragging = null;
  var tour = [150, 100, 200, 300, 120, 250];

  function ticks() {
    var fixed = "";
    CFG.endLeft.concat(CFG.endRight).forEach(function (mm) {
      var x = mm / CFG.mm;
      var a = screen(x, CFG.elev.y0, CFG.sheetZ + 0.1);
      var b = screen(x, CFG.elev.y1, CFG.sheetZ + 0.1);
      fixed += "M" + fine(a[0]) + " " + fine(a[1]) + "L" + fine(b[0]) + " " + fine(b[1]);
    });
    tickFixed.setAttribute("d", fixed);
  }

  function draw() {
    var count = 0;
    var mid = "";
    for (var i = 0; i < CFG.midMax; i++) {
      var x = pos[i] / CFG.mm;
      var t = "translate(" + fine(x * ax[0]) + " " + fine(x * ax[1]) + ")";
      var o = fine(alpha[i]);
      midBack[i].setAttribute("transform", t);
      midFront[i].setAttribute("transform", t);
      midBack[i].style.opacity = o;
      midFront[i].style.opacity = o;
      if (alpha[i] > 0.04) {
        var a = screen(x, CFG.elev.y0, CFG.sheetZ + 0.1);
        var b = screen(x, CFG.elev.y1, CFG.sheetZ + 0.1);
        mid += "M" + fine(a[0]) + " " + fine(a[1]) + "L" + fine(b[0]) + " " + fine(b[1]);
      }
      if (i < intervals(target) - 1) count++;
    }
    tickMid.setAttribute("d", mid);
    carriage.setAttribute("transform", "translate(" + fine(knob * ax[0]) + " " + fine(knob * ax[1]) + ")");
    var total = 8 + count;
    var kg = Math.round(CFG.barKg + total * CFG.stirrupKg);
    var text = "D10 @ " + target + " · ×" + total + " · " + kg + " kg";
    if (readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(target));
    stage.setAttribute("aria-valuetext", text);
  }

  function step(now) {
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    var calm = still.matches;
    if (touring) {
      clock += dt;
      target = tour[Math.floor(clock / 2.6) % tour.length];
    }
    var goal = targetsFor(target);
    var wantKnob = dragging ? knob : gaugeX(target);
    var settled = true;
    knob = calm || dragging ? wantKnob : knob + (wantKnob - knob) * (1 - Math.exp(-dt / 0.16));
    if (Math.abs(wantKnob - knob) < 0.02) knob = wantKnob;
    else settled = false;
    for (var i = 0; i < CFG.midMax; i++) {
      var live = i < intervals(target) - 1;
      var wantAlpha = live ? 1 : 0;
      pos[i] = calm ? goal[i] : pos[i] + (goal[i] - pos[i]) * (1 - Math.exp(-dt / 0.22));
      alpha[i] = calm ? wantAlpha : alpha[i] + (wantAlpha - alpha[i]) * (1 - Math.exp(-dt / 0.12));
      if (Math.abs(goal[i] - pos[i]) < 0.15) pos[i] = goal[i];
      else settled = false;
      if (Math.abs(wantAlpha - alpha[i]) < 0.01) alpha[i] = wantAlpha;
      else settled = false;
    }
    draw();
    frame = visible && !(settled && !touring) ? requestAnimationFrame(step) : 0;
  }

  function run() {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(step);
    }
  }

  function steer(next) {
    touring = false;
    target = snap(next);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (dragging) return;
      touring = !still.matches;
      clock = 0;
      run();
    }, 5200);
    run();
  }

  function worldAt(event) {
    var box = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var sx = ((event.clientX - box.left) / box.width) * vb.width;
    var sy = ((event.clientY - box.top) / box.height) * vb.height;
    var u = (sx - CFG.origin[0]) / CFG.k;
    var v = (sy - CFG.origin[1] + CFG.knobZ * CFG.cosE * CFG.k) / (CFG.k * CFG.sinE);
    return u * CFG.sinA + v * CFG.cosA;
  }

  track.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    track.setPointerCapture(event.pointerId);
    var x = worldAt(event);
    var grabbed = event.target === track && Math.abs(x - knob) > 9 ? 0 : x - knob;
    dragging = { id: event.pointerId, grab: grabbed };
    stage.focus({ preventScroll: true });
    steer(spacingAt(x - grabbed));
  });
  track.addEventListener("pointermove", function (event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    var x = clamp(worldAt(event) - dragging.grab, CFG.gauge.x0, CFG.gauge.x1);
    knob = x;
    steer(spacingAt(x));
  });
  var release = function (event) {
    if (dragging && dragging.id === event.pointerId) dragging = null;
    run();
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  stage.addEventListener("keydown", function (event) {
    var big = event.shiftKey ? 5 : 1;
    var to = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + CFG.spacing.step * big;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - CFG.spacing.step * big;
    if (event.key === "Home") to = CFG.spacing.min;
    if (event.key === "End") to = CFG.spacing.max;
    if (to === null) return;
    event.preventDefault();
    steer(to);
  });

  new IntersectionObserver(function (entries) {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  }, { rootMargin: "120px 0px" }).observe(stage);

  if (still.matches) touring = false;
  ticks();
  draw();
}
