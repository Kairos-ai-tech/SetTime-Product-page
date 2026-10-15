(function () {
var CFG = {"origin":[182.74469727777893,126.04377055761998],"sinA":0.8480480961564261,"cosA":0.5299192642332049,"sinE":0.49999999999999994,"cosE":0.8660254037844387,"k":1.8956638019978054,"mm":8,"length":200,"endLeft":[50,150,250,350],"endRight":[1250,1350,1450,1550],"midFrom":350,"midTo":1250,"midMax":8,"spacing":{"min":100,"max":300,"step":10,"start":150},"gauge":{"x0":30,"x1":190},"knobZ":5.5,"elev":{"y0":31,"y1":39},"sheetZ":0.8,"barKg":49.3,"stirrupKg":0.913};
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
  var canHover = window.matchMedia("(hover: hover)");
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

  var tour = [150, 100, 200, 300, 120, 250];
  var tourStep = 0;
  var spacing = CFG.spacing.start;
  var target = spacing;
  var knob = gaugeX(spacing);
  var knobGoal = knob;
  var pos = targetsFor(spacing);
  var alpha = pos.map(function (_, i) { return i < intervals(spacing) - 1 ? 1 : 0; });
  var touring = !still.matches;
  var visible = false;
  var frame = 0;
  var last = 0;
  var tourTimer = 0;
  var idleTimer = 0;
  var dragging = null;
  var shown = "";

  function segment(x, y0, y1) {
    var a = screen(x, y0, CFG.sheetZ + 0.1);
    var b = screen(x, y1, CFG.sheetZ + 0.1);
    return "M" + fine(a[0]) + " " + fine(a[1]) + "L" + fine(b[0]) + " " + fine(b[1]);
  }

  function ticks() {
    var fixed = "";
    CFG.endLeft.concat(CFG.endRight).forEach(function (mm) {
      fixed += segment(mm / CFG.mm, CFG.elev.y0, CFG.elev.y1);
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
      if (alpha[i] > 0.04) mid += segment(x, CFG.elev.y0, CFG.elev.y1);
      if (i < intervals(target) - 1) count++;
    }
    tickMid.setAttribute("d", mid);
    carriage.setAttribute("transform", "translate(" + fine(knob * ax[0]) + " " + fine(knob * ax[1]) + ")");
    var total = 8 + count;
    var kg = Math.round(CFG.barKg + total * CFG.stirrupKg);
    var text = "D10 @ " + target + " · ×" + total + " · " + kg + " kg";
    if (text !== shown) {
      shown = text;
      readout.textContent = text;
      stage.setAttribute("aria-valuenow", String(target));
      stage.setAttribute("aria-valuetext", text);
    }
  }

  function step(now) {
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    var calm = still.matches;
    var goal = targetsFor(target);
    var settled = true;
    var tau = dragging ? 0.05 : 0.16;
    knob = calm ? knobGoal : knob + (knobGoal - knob) * (1 - Math.exp(-dt / tau));
    if (Math.abs(knobGoal - knob) < 0.02) knob = knobGoal;
    else settled = false;
    for (var i = 0; i < CFG.midMax; i++) {
      var wantAlpha = i < intervals(target) - 1 ? 1 : 0;
      pos[i] = calm ? goal[i] : pos[i] + (goal[i] - pos[i]) * (1 - Math.exp(-dt / 0.22));
      alpha[i] = calm ? wantAlpha : alpha[i] + (wantAlpha - alpha[i]) * (1 - Math.exp(-dt / 0.12));
      if (Math.abs(goal[i] - pos[i]) < 0.15) pos[i] = goal[i];
      else settled = false;
      if (Math.abs(wantAlpha - alpha[i]) < 0.01) alpha[i] = wantAlpha;
      else settled = false;
    }
    draw();
    frame = visible && !settled ? requestAnimationFrame(step) : 0;
  }

  function run() {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(step);
    }
  }

  function advanceTour() {
    clearTimeout(tourTimer);
    if (!touring) return;
    if (visible) {
      target = tour[tourStep++ % tour.length];
      knobGoal = gaugeX(target);
      run();
    }
    tourTimer = setTimeout(advanceTour, 2600);
  }

  function stopTour() {
    touring = false;
    clearTimeout(tourTimer);
    clearTimeout(idleTimer);
  }

  function arm() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (dragging || still.matches || stage.matches(":focus-visible") || (canHover.matches && stage.matches(":hover"))) return;
      touring = true;
      advanceTour();
    }, 5200);
  }

  function steer(next) {
    stopTour();
    target = snap(next);
    if (!dragging) knobGoal = gaugeX(target);
    arm();
    run();
  }

  function worldAt(event, z) {
    var box = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var sx = ((event.clientX - box.left) / box.width) * vb.width;
    var sy = ((event.clientY - box.top) / box.height) * vb.height;
    var u = (sx - CFG.origin[0]) / CFG.k;
    var v = (sy - CFG.origin[1] + z * CFG.cosE * CFG.k) / (CFG.k * CFG.sinE);
    return u * CFG.sinA + v * CFG.cosA;
  }

  track.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    event.preventDefault();
    track.setPointerCapture(event.pointerId);
    var onKnob = Math.abs(worldAt(event, CFG.knobZ) - knob) <= 9;
    var x = worldAt(event, onKnob ? CFG.knobZ : 2);
    dragging = { id: event.pointerId, grab: onKnob ? x - knob : 0 };
    stage.focus({ preventScroll: true });
    knobGoal = clamp(x - dragging.grab, CFG.gauge.x0, CFG.gauge.x1);
    steer(spacingAt(knobGoal));
  });
  track.addEventListener("pointermove", function (event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    knobGoal = clamp(worldAt(event, dragging.grab ? CFG.knobZ : 2) - dragging.grab, CFG.gauge.x0, CFG.gauge.x1);
    steer(spacingAt(knobGoal));
  });
  var release = function (event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    dragging = null;
    knobGoal = gaugeX(target);
    arm();
    run();
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  stage.addEventListener("focusin", stopTour);
  stage.addEventListener("focusout", arm);
  stage.addEventListener("pointerenter", stopTour);
  stage.addEventListener("pointerleave", arm);
  stage.addEventListener("keydown", function (event) {
    var big = event.shiftKey ? 5 : 1;
    var to = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + CFG.spacing.step * big;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - CFG.spacing.step * big;
    if (event.key === "PageUp") to = target + CFG.spacing.step * 5;
    if (event.key === "PageDown") to = target - CFG.spacing.step * 5;
    if (event.key === "Home") to = CFG.spacing.min;
    if (event.key === "End") to = CFG.spacing.max;
    if (to === null) return;
    event.preventDefault();
    steer(to);
  });

  still.addEventListener("change", function () {
    if (still.matches) stopTour();
    else arm();
    run();
  });

  new IntersectionObserver(function (entries) {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) {
      run();
      if (touring) advanceTour();
    }
  }, { rootMargin: "120px 0px" }).observe(stage);

  ticks();
  draw();
  if (touring) tourTimer = setTimeout(advanceTour, 2600);
}

})();
