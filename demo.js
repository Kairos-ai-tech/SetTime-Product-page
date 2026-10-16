(function () {
  var demo = document.getElementById('demo');
  var svg = demo && demo.querySelector('.rm-svg');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var DEG = Math.PI / 180;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CX = 320, CY = 218;
  var MM = 12.5;
  var SLAB_H = 12, BEAM_H = 48, COL_H = 96, BAR_TOP = COL_H + 16;
  var EL3D = 30;
  var BEAMS = [{ y0: 38, y1: 62 }, { y0: 374, y1: 398 }];
  var COLS = [[60, 30], [540, 30], [60, 366], [540, 366]];
  var BEAM_X0 = 100, SPAN_MM = 5500, MID_LEN_MM = 4600;
  var END_MM = [50, 150, 250, 350, 450];
  var STIRRUP_M = 1.9, STIRRUP_KG_M = 0.617;
  var FACES = [
    { n: [0, 0, -1], c: [0, 1, 3, 2] },
    { n: [0, 0, 1], c: [4, 5, 7, 6] },
    { n: [-1, 0, 0], c: [0, 2, 6, 4] },
    { n: [1, 0, 0], c: [1, 3, 7, 5] },
    { n: [0, -1, 0], c: [0, 1, 5, 4] },
    { n: [0, 1, 0], c: [2, 3, 7, 6] }
  ];

  var layer = svg.querySelector('.rm-units');
  var dimPath = svg.querySelector('.rm-dim-path');
  var dimGroup = svg.querySelector('.rm-dims');
  var dimH = svg.querySelector('[data-dim="h"]');
  var dimV = svg.querySelector('[data-dim="v"]');
  var pinNodes = {};
  svg.querySelectorAll('.rm-pin').forEach(function (n) { pinNodes[n.getAttribute('data-member')] = n; });
  var figure = demo.querySelector('.demo-drawing');
  var gauge = demo.querySelector('.rm-gauge input');
  var gaugeOut = demo.querySelector('.rm-gauge output');

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function node(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function stirrupXs(spacing) {
    var n = Math.ceil(MID_LEN_MM / spacing) - 1;
    var last = END_MM[END_MM.length - 1];
    var mm = END_MM.slice(), i;
    for (i = 1; i <= n; i++) mm.push(last + (i * MID_LEN_MM) / (n + 1));
    for (i = END_MM.length - 1; i >= 0; i--) mm.push(SPAN_MM - END_MM[i]);
    return mm.map(function (v) { return BEAM_X0 + v / MM; });
  }

  var units = [];

  function addUnit(member, box, from, span) {
    var g = node('g', { class: 'rm-unit', 'data-member': member, 'aria-hidden': 'true' }, layer);
    var faces = FACES.map(function (_, i) {
      return node('path', { class: 'rm-face' + (i === 1 ? ' rm-top' : '') }, g);
    });
    var u = { member: member, g: g, box: box, from: from, span: span, faces: faces, bars: [], stirrups: [], pins: [], grow: 1 };
    units.push(u);
    return u;
  }

  function addBar(u, pts, close, cls) {
    var n = node('path', { class: 'rm-bar ' + cls }, u.g);
    var b = { node: n, pts: pts, close: close };
    u.bars.push(b);
    return b;
  }

  var slab = addUnit('s1', { x0: 100, x1: 540, y0: 62, y1: 374, z0: 0, z1: SLAB_H }, -1, 1);
  var i, j;
  for (i = 0; i < 27; i++) {
    var sx = 320 + 16 * (i - 13);
    addBar(slab, [[sx, 50, 5], [sx, 386, 5]], false, 'rm-d13 rm-slab');
  }

  var beamUnits = BEAMS.map(function (bm) {
    var u = addUnit('b1', { x0: BEAM_X0, x1: BEAM_X0 + SPAN_MM / MM, y0: bm.y0, y1: bm.y1, z0: 0, z1: BEAM_H }, 0.08, 0.62);
    for (j = 0; j < 4; j++) {
      var yb = bm.y0 + 4 + (j * 16) / 3;
      addBar(u, [[64, yb, 5], [576, yb, 5]], false, 'rm-d22');
    }
    for (j = 0; j < 3; j++) {
      var yt = bm.y0 + 4 + j * 8;
      addBar(u, [[64, yt, BEAM_H - 5], [576, yt, BEAM_H - 5]], false, 'rm-d22');
    }
    u.ar = node('g', { class: 'rm-ar' }, u.g);
    return u;
  });

  var poolSize = stirrupXs(parseInt(gauge.min, 10)).length;
  beamUnits.forEach(function (u) {
    var bm = u.box;
    for (j = 0; j < poolSize; j++) {
      var st = addBar(u, [[0, bm.y0 + 2, 2], [0, bm.y1 - 2, 2], [0, bm.y1 - 2, BEAM_H - 2], [0, bm.y0 + 2, BEAM_H - 2]], true, 'rm-d10');
      u.stirrups.push(st);
      u.pins.push({ node: node('path', { class: 'rm-ar-pin' }, u.ar), x: 0, y: (bm.y0 + bm.y1) / 2 });
    }
  });

  COLS.forEach(function (c) {
    var u = addUnit('c1', { x0: c[0], x1: c[0] + 40, y0: c[1], y1: c[1] + 40, z0: 0, z1: COL_H }, 0.22, 0.7);
    var cx = c[0] + 20, cy = c[1] + 20;
    [-13, 0, 13].forEach(function (dx) {
      [-13, 0, 13].forEach(function (dy) {
        if (dx === 0 && dy === 0) return;
        addBar(u, [[cx + dx, cy + dy, 0], [cx + dx, cy + dy, BAR_TOP]], false, 'rm-d25');
      });
    });
    for (var z = 6; z < COL_H; z += 12) {
      addBar(u, [[cx - 17, cy - 17, z], [cx + 17, cy - 17, z], [cx + 17, cy + 17, z], [cx - 17, cy + 17, z]], true, 'rm-d10');
    }
  });

  var pinAnchors = [
    { id: 's1', p: [320, 218, SLAB_H], u: slab },
    { id: 'b1', p: [320, 50, BEAM_H], u: beamUnits[0] },
    { id: 'c1', p: [80, 50, BAR_TOP], u: units.filter(function (u) { return u.member === 'c1'; })[0] }
  ];

  var t = 0, goal = 0, azView = -38, spacing = parseInt(gauge.value, 10), raf = 0;
  var other = 0;
  var stirrupQty = demo.querySelector('[data-stirrup-qty]');
  var stirrupKg = demo.querySelector('[data-stirrup-kg]');
  var totalCell = demo.querySelector('[data-total]');
  demo.querySelectorAll('.demo-table tbody tr').forEach(function (tr) {
    if (!tr.querySelector('[data-stirrup-kg]')) other += parseFloat(tr.lastElementChild.textContent) || 0;
  });

  function applySpacing() {
    var xs = stirrupXs(spacing);
    beamUnits.forEach(function (u) {
      u.stirrups.forEach(function (st, k) {
        var on = k < xs.length;
        st.node.style.display = on ? '' : 'none';
        u.pins[k].node.style.display = on ? '' : 'none';
        if (on) {
          st.pts.forEach(function (p) { p[0] = xs[k]; });
          u.pins[k].x = xs[k];
        }
      });
    });
    var kg = Math.round(xs.length * STIRRUP_M * STIRRUP_KG_M);
    stirrupQty.textContent = xs.length;
    stirrupKg.textContent = kg;
    totalCell.textContent = other + kg;
    gaugeOut.textContent = '@' + spacing + ' mm';
  }

  function fmt(v) { return v.toFixed(1); }

  function draw() {
    var el = (90 + (EL3D - 90) * t) * DEG;
    var az = azView * t * DEG;
    var ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    var maxG = 0;
    units.forEach(function (u) {
      u.grow = easeOut(clamp((t - u.from) / u.span));
      if (u.grow > maxG) maxG = u.grow;
    });

    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    [60, 580].forEach(function (x) {
      [30, 406].forEach(function (y) {
        [0, BAR_TOP * maxG].forEach(function (z) {
          var dx = x - CX, dy = y - CY;
          var px = dx * ca - dy * sa;
          var py = (dx * sa + dy * ca) * se - z * ce;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
      });
    });
    var k = Math.min(640 / (maxX - minX + 110), 470 / (maxY - minY + 100));
    var ox = 320 - (k * (minX + maxX)) / 2;
    var oy = 226 - (k * (minY + maxY)) / 2;

    function proj(x, y, z, zs) {
      var dx = x - CX, dy = y - CY;
      var px = dx * ca - dy * sa;
      var py = (dx * sa + dy * ca) * se - z * zs * ce;
      return [ox + k * px, oy + k * py];
    }
    function path(pts, zs, close) {
      var d = '', a, b;
      for (var n = 0; n < pts.length; n++) {
        b = proj(pts[n][0], pts[n][1], pts[n][2], zs);
        if (n === 0) a = b;
        d += (n ? 'L' : 'M') + fmt(b[0]) + ' ' + fmt(b[1]);
      }
      if (pts.length === 2 && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 0.02) d += 'h0.02';
      return close ? d + 'Z' : d;
    }

    var dimOpacity = clamp(1 - t * 3);
    dimGroup.style.opacity = dimOpacity;
    if (dimOpacity > 0) {
      var segs = [[[80, 432, 0], [560, 432, 0]], [[80, 425, 0], [80, 439, 0]], [[560, 425, 0], [560, 439, 0]],
        [[618, 50, 0], [618, 386, 0]], [[611, 50, 0], [625, 50, 0]], [[611, 386, 0], [625, 386, 0]]];
      dimPath.setAttribute('d', segs.map(function (s) { return path(s, 1); }).join(''));
      var ph = proj(320, 455, 0, 1), pv = proj(604, 218, 0, 1);
      dimH.setAttribute('x', fmt(ph[0]));
      dimH.setAttribute('y', fmt(ph[1]));
      dimV.setAttribute('x', fmt(pv[0]));
      dimV.setAttribute('y', fmt(pv[1]));
      dimV.setAttribute('transform', 'rotate(-90 ' + fmt(pv[0]) + ' ' + fmt(pv[1]) + ')');
    }

    var arOpacity = clamp((t - 0.75) / 0.25);

    units.forEach(function (u) {
      var b = u.box, zs = u.grow;
      var corners = [];
      for (var c = 0; c < 8; c++) {
        corners.push(proj(c & 1 ? b.x1 : b.x0, c & 2 ? b.y1 : b.y0, c & 4 ? b.z1 : b.z0, zs));
      }
      FACES.forEach(function (f, fi) {
        var nyr = f.n[0] * sa + f.n[1] * ca;
        var visible = nyr * ce + f.n[2] * se > 1e-6;
        var face = u.faces[fi];
        if (!visible) {
          face.style.display = 'none';
          return;
        }
        face.style.display = '';
        face.setAttribute('d', 'M' + f.c.map(function (ci) { return fmt(corners[ci][0]) + ' ' + fmt(corners[ci][1]); }).join('L') + 'Z');
      });
      u.bars.forEach(function (bar) {
        if (bar.node.style.display === 'none') return;
        bar.node.setAttribute('d', path(bar.pts, zs, bar.close));
      });
      if (u.ar) {
        u.ar.style.opacity = arOpacity;
        u.ar.style.display = arOpacity > 0 ? '' : 'none';
        if (arOpacity > 0) {
          u.pins.forEach(function (p) {
            if (p.node.style.display === 'none') return;
            p.node.setAttribute('d', path([[p.x, p.y, BEAM_H], [p.x, p.y, BEAM_H + 8]], zs, false));
          });
        }
      }
      var cxw = (b.x0 + b.x1) / 2 - CX, cyw = (b.y0 + b.y1) / 2 - CY, czw = (b.z1 * zs) / 2;
      u.key = (cxw * sa + cyw * ca) * ce + czw * se;
    });

    units.slice().sort(function (a, b) { return a.key - b.key; }).forEach(function (u) { layer.appendChild(u.g); });

    pinAnchors.forEach(function (a) {
      var p = proj(a.p[0], a.p[1], a.p[2], a.u.grow);
      pinNodes[a.id].setAttribute('transform', 'translate(' + fmt(p[0]) + ' ' + fmt(p[1] - 18) + ')');
    });
  }

  function go(target) {
    goal = target;
    figure.setAttribute('data-view', target ? '3d' : '2d');
    demo.querySelectorAll('[data-view-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-view-btn') === (target ? '3d' : '2d')));
    });
    cancelAnimationFrame(raf);
    if (reduceMotion) {
      t = target;
      draw();
      return;
    }
    var from = t, start = performance.now(), dur = 1900 * Math.abs(target - from);
    if (dur === 0) return;
    (function step(now) {
      var p = clamp((now - start) / dur);
      t = from + (target - from) * easeInOut(p);
      draw();
      if (p < 1) raf = requestAnimationFrame(step);
    })(start);
  }

  var members = ['b1', 's1', 'c1'];
  var targets = [];
  var details = demo.querySelectorAll('[data-detail]');
  var timer = null, interacted = false, started = false;

  function select(id) {
    targets.forEach(function (el) {
      var on = el.getAttribute('data-member') === id;
      el.classList.toggle('active', on);
      if (el.classList.contains('rm-unit')) return;
      var pressable = el.matches('tr') ? el.querySelector('.demo-mark') : el;
      pressable.setAttribute('aria-pressed', String(on));
    });
    details.forEach(function (el) { el.hidden = el.getAttribute('data-detail') !== id; });
  }

  function stopAutoplay() {
    clearTimeout(timer);
    interacted = true;
  }

  function autoplay(n) {
    if (interacted) return;
    if (n < members.length) {
      select(members[n]);
      timer = setTimeout(function () { autoplay(n + 1); }, 2400);
    } else {
      go(1);
    }
  }

  targets = Array.prototype.slice.call(demo.querySelectorAll('[data-member]'));
  targets.forEach(function (el) {
    el.addEventListener('click', function () {
      stopAutoplay();
      demo.querySelector('.demo-detail').setAttribute('aria-live', 'polite');
      select(el.getAttribute('data-member'));
    });
    if (!el.matches('tr') && !el.classList.contains('rm-unit')) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      });
    }
  });

  demo.querySelectorAll('[data-view-btn]').forEach(function (b) {
    b.addEventListener('click', function () {
      stopAutoplay();
      go(b.getAttribute('data-view-btn') === '3d' ? 1 : 0);
    });
  });

  gauge.addEventListener('input', function () {
    stopAutoplay();
    spacing = parseInt(gauge.value, 10);
    applySpacing();
    draw();
  });

  var drag = null, suppress = false;
  svg.addEventListener('click', function (e) {
    if (suppress) {
      e.stopPropagation();
      suppress = false;
    }
  }, true);
  svg.addEventListener('pointerdown', function (e) {
    if (goal !== 1 || t < 1 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { x: e.clientX, az: azView, id: e.pointerId, moved: false };
  });
  svg.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 5) return;
      drag.moved = true;
      stopAutoplay();
      try { svg.setPointerCapture(e.pointerId); } catch (err) { svg.classList.add('rm-dragging'); }
      svg.classList.add('rm-dragging');
    }
    azView = drag.az + dx * 0.45;
    draw();
  });
  function endDrag() {
    if (!drag) return;
    if (drag.moved) {
      suppress = true;
      setTimeout(function () { suppress = false; }, 0);
    }
    drag = null;
    svg.classList.remove('rm-dragging');
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  applySpacing();
  select('c1');
  draw();

  if (!reduceMotion) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting && !started) {
        started = true;
        obs.disconnect();
        timer = setTimeout(function () { autoplay(0); }, 1800);
      }
    }, { threshold: 0.5 }).observe(demo.querySelector('.demo-grid'));
  }
})();
