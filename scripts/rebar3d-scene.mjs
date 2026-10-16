import * as k from "./anatomy-kit/iso-kit.mjs";
import * as G from "./anatomy-kit/lathe.mjs";

export const WIDTH = 640;
export const HEIGHT = 360;
export const MM = 8;

const BENCH = { x: -30, y: -34, w: 262, d: 118, r: 8 };
const BENCH_H = 12;
const FOOT_H = 5;

export const LENGTH = 200;
const HALF = 20;
const WIRE_R = 0.625;
const BAR_R = 1.56;
const BAR_AT = HALF - WIRE_R - BAR_R;
const CRADLE_TOP = 9;
const CY = 0;
const CZ = CRADLE_TOP + WIRE_R + HALF;
const CORNER = 3.4;

export const END_LEFT = [50, 150, 250, 350];
export const END_RIGHT = [1250, 1350, 1450, 1550];
export const MID_FROM = 350;
export const MID_TO = 1250;
export const MID_MAX = 8;
export const SPACING = { min: 100, max: 300, step: 10, start: 150 };
export const GAUGE = { x0: 30, x1: 190 };
const KNOB_Y = 73;
export const KNOB_Z = 5.5;

const MAINS = [];
for (const y of [-BAR_AT, 0, BAR_AT]) for (const z of [-BAR_AT, 0, BAR_AT]) if (y !== 0 || z !== 0) MAINS.push([y, z]);

const SHEET = { x: -12, y: 28, w: 226, d: 22, r: 1.6 };
export const ELEV = { y0: 31, y1: 39 };
export const SHEET_Z = 0.8;
const SPOOL = [219, 8];

export const VIEW = { azimuth: 58, elevation: 30, elevationMin: 12, elevationMax: 60 };

const FIT_POINTS = [
  ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
  ...k.boxCorners({ x: 0, y: -24, w: LENGTH, d: 48 }, CRADLE_TOP, CZ + HALF + 2),
  [SPOOL[0], SPOOL[1], 14],
  [GAUGE.x1 + 6, KNOB_Y, 14],
];
const PIVOT = [0, 1, 2].map((axis) => {
  const values = FIT_POINTS.map((point) => point[axis]);
  return (Math.min(...values) + Math.max(...values)) / 2;
});

const fitCache = new Map();
function fitAt(elevation) {
  if (!fitCache.has(elevation)) {
    const pad = 14;
    let best = Infinity;
    for (let azimuth = 0; azimuth < 360; azimuth += 6) {
      const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
      const center = k.iso(PIVOT, unit);
      let dx = 0;
      let dy = 0;
      for (const point of FIT_POINTS) {
        const [x, y] = k.iso(point, unit);
        dx = Math.max(dx, Math.abs(x - center[0]));
        dy = Math.max(dy, Math.abs(y - center[1]));
      }
      best = Math.min(best, (WIDTH / 2 - pad) / dx, (HEIGHT / 2 - pad) / dy);
    }
    fitCache.set(elevation, best);
  }
  return fitCache.get(elevation);
}

function scaleAt(elevation) {
  const low = Math.floor(elevation);
  const t = elevation - low;
  return fitAt(low) * (1 - t) + fitAt(low + 1) * t;
}

export function projectionAt(azimuth, elevation) {
  const scale = scaleAt(elevation);
  const unit = { origin: [0, 0], scale, azimuth, elevation };
  const center = k.iso(PIVOT, unit);
  return { origin: [WIDTH / 2 - center[0], HEIGHT / 2 - center[1]], scale, azimuth, elevation };
}

export function cameraAt(azimuth, elevation) {
  const P = projectionAt(azimuth, elevation);
  const c = k.cameraOf(P);
  return { origin: k.iso([0, 0, 0], P), sinA: c.sinA, cosA: c.cosA, sinE: c.sinE, cosE: c.cosE, k: c.k };
}

const fmt = (n) => Math.round(n * 10) / 10;
const pathOf = (points) => points.map(([x, y], index) => `${index ? "L" : "M"}${fmt(x)} ${fmt(y)}`).join("");
const xu = (mm) => mm / MM;
const MID_AT = (index, m) => MID_FROM + ((MID_TO - MID_FROM) * (index + 1)) / m;
const MID_START = (() => {
  const m = Math.ceil((MID_TO - MID_FROM) / SPACING.start);
  return Array.from({ length: MID_MAX }, (_, index) => (index < m - 1 ? MID_AT(index, m) : MID_TO));
})();
export const knobAt = (spacing) => GAUGE.x0 + ((spacing - SPACING.min) * (GAUGE.x1 - GAUGE.x0)) / (SPACING.max - SPACING.min);
const CRADLES = [44, 156];

export function renderScene(azimuth, elevation) {
  const P = projectionAt(azimuth, elevation);
  const V = G.viewOf(P);
  const W = [V[1], V[2]];
  const toward = k.towardViewer(P);
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const planDepth = (x, y) => x * toward[0] + y * toward[1];
  const byDepth = (points) => [...points].sort((a, b) => planDepth(a[0], a[1]) - planDepth(b[0], b[1]));

  function bench() {
    const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(BENCH, 20))) {
      out.push(S(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "faint" }));
    const screws = k.corners(BENCH, 10);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    return out.join("");
  }

  function labelPlate() {
    const plan = { x: -26, y: -10, w: 22, d: 20, r: 2 };
    const out = [S(k.slabOf(plan, 0, 0.8, P, 4), { tone: "lo", crease: "none" })];
    out.push(L(k.planOutline(k.insetPlan(plan, 1.8), 0.8, P, 4), { tone: "faint" }));
    [[6, 14], [10, 9], [14, 12]].forEach(([dy, length]) => out.push(L(k.lineOnTop([plan.x + 4, plan.y + dy], [plan.x + 4 + length, plan.y + dy], 0.8, P), { tone: "lo", free: true })));
    out.push(D([at([plan.x + 3.6, plan.y + 3.6, 0.8]), at([plan.x + plan.w - 3.6, plan.y + plan.d - 3.6, 0.8])], { size: 0.42 }));
    return out.join("");
  }

  function sheetBase() {
    const out = [S(k.slabOf(SHEET, 0, 0.8, P, 4), { tone: "lo", crease: "none" })];
    out.push(L(k.planOutline(k.insetPlan(SHEET, 2.2), 0.8, P, 4), { tone: "faint" }));
    const frame = { x: 0, y: ELEV.y0, w: LENGTH, d: ELEV.y1 - ELEV.y0, r: 0 };
    out.push(L(k.planOutline(frame, 0.8, P, 1), { tone: "mid" }));
    out.push(L(k.lineOnTop([0, (ELEV.y0 + ELEV.y1) / 2], [LENGTH, (ELEV.y0 + ELEV.y1) / 2], 0.8, P), { tone: "faint", dashed: true }));
    const strip = { x: 0, y: 41.4, w: LENGTH, d: 4.2, r: 0.6 };
    out.push(S(k.slabOf(strip, 0.8, 0.5, P, 2), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x, strip.x + strip.w, 12.5 / 1, 4, strip.y + 0.6, 1.3, [1.6, 3], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(k.faceTextSvg(k.topMatrix([-9, 36.5], 0.8, P, "x"), "D10", { size: 3.4, tone: "mid" }));
    out.push(D([at([-8.2, 31, 0.8]), at([211, 31, 0.8]), at([-8.2, 47, 0.8]), at([211, 47, 0.8])], { size: 0.42 }));
    return out.join("");
  }

  function cradle(cx) {
    const nearSide = toward[1] >= 0 ? 1 : -1;
    const plateY = (side) => (side > 0 ? 21.4 : -24.8);
    const backOut = [];
    const plate = { x: cx - 11, y: -26, w: 22, d: 52, r: 2 };
    backOut.push(S(k.slabOf(plate, 0, 2, P, 3, 0.4), { tone: "lo" }));
    backOut.push(D([[cx - 7.5, -22.5], [cx + 7.5, -22.5], [cx - 7.5, 22.5], [cx + 7.5, 22.5]].map(([x, y]) => at([x, y, 2])), { size: 0.4 }));
    backOut.push(S(k.slabOf({ x: cx - 8, y: -19, w: 16, d: 38, r: 1.2 }, 2, CRADLE_TOP - 2, P, 3, 0.6), { tone: "mid" }));
    backOut.push(L(k.lineOnTop([cx - 5, -12], [cx + 5, -12], CRADLE_TOP, P), { tone: "faint" }), L(k.lineOnTop([cx - 5, 12], [cx + 5, 12], CRADLE_TOP, P), { tone: "faint" }));
    backOut.push(S(k.slabOf({ x: cx - 8, y: plateY(-nearSide), w: 16, d: 3.4, r: 1 }, 2, 14, P, 2, 0.5), { tone: "mid" }));
    const frontOut = [S(k.slabOf({ x: cx - 8, y: plateY(nearSide), w: 16, d: 3.4, r: 1 }, 2, 14, P, 2, 0.5), { tone: "mid" })];
    const dotY = plateY(nearSide) + 1.7;
    frontOut.push(D([at([cx - 4, dotY, 16]), at([cx + 4, dotY, 16])], { size: 0.4 }));
    return { back: backOut.join(""), front: frontOut.join("") };
  }

  function spool() {
    const [x, y] = SPOOL;
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 9, y: y - 9, w: 18, d: 18, r: 9 }, 0, 1, P)}"/>`];
    out.push(S(k.cylinder(x, y, 9, 0, 1.6, P, 36), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 5.6, 1.6, 7, P, 28), { tone: "hi", crease: "none" }));
    [3, 4.6, 6.2].forEach((z) => out.push(L(k.sideArc(x, y, 5.6, z, P, 16), { tone: "lo" })));
    out.push(S(k.cylinder(x, y, 9, 8.6, 1.6, P, 36), { tone: "mid" }));
    out.push(L(k.ring(x, y, 6.4, 10.2, P, 36), { tone: "lo" }));
    out.push(L(k.ring(x, y, 1.6, 10.2, P, 12), { tone: "mid" }));
    return out.join("");
  }

  function bar([y, z]) {
    const F = G.frameAlong([0, CY + y, CZ + z], [1, 0, 0]);
    return S(G.solidOf([[0, BAR_R], [LENGTH, BAR_R]], F, P), { tone: "hi", crease: "lo" });
  }

  function loop(at0) {
    const rc = CORNER;
    const points = [];
    const add = (y, z, ny, nz) => points.push({ y, z, ny, nz });
    const arc = (cy, cz, from, to) => {
      const steps = 7;
      for (let i = 0; i <= steps; i++) {
        const angle = ((from + (to - from) * (i / steps)) * Math.PI) / 180;
        add(cy + Math.cos(angle) * rc, cz + Math.sin(angle) * rc, Math.cos(angle), Math.sin(angle));
      }
    };
    add(-HALF + rc, HALF, 0, 1);
    add(HALF - rc, HALF, 0, 1);
    arc(HALF - rc, HALF - rc, 90, 0);
    add(HALF, -HALF + rc, 1, 0);
    arc(HALF - rc, -HALF + rc, 0, -90);
    add(-HALF + rc, -HALF, 0, -1);
    arc(-HALF + rc, -HALF + rc, -90, -180);
    add(-HALF, HALF - rc, -1, 0);
    arc(-HALF + rc, HALF - rc, 180, 90);
    const flags = points.map((p) => p.ny * W[0] + p.nz * W[1] > 0);
    const count = points.length;
    let start = flags.findIndex((flag, i) => flag && !flags[(i + count - 1) % count]);
    if (start < 0) start = 0;
    const front = [];
    const back = [];
    let i = 0;
    while (i < count && flags[(start + i) % count]) front.push(points[(start + i++) % count]);
    if (!front.length) return { front: "", back: pathOf(points.map((p) => at([at0, CY + p.y, CZ + p.z]))) };
    back.push(front[front.length - 1]);
    while (i < count) back.push(points[(start + i++) % count]);
    back.push(front[0]);
    const project = (list) => pathOf(list.map((p) => at([at0, CY + p.y, CZ + p.z])));
    return { front: project(front), back: project(back) };
  }

  const wire = (d, tone) => `<path class="rb-case" d="${d}"/><path class="rb-wire" data-tone="${tone}" d="${d}"/>`;

  function stirrups() {
    const ordered = [...END_LEFT.map((mm) => ({ mm, tone: "hi", fixed: true })), ...MID_START.map((mm, index) => ({ mm, tone: "lit", index })), ...END_RIGHT.map((mm) => ({ mm, tone: "hi", fixed: true }))];
    if (toward[0] < 0) ordered.reverse();
    const backs = [];
    const fronts = [];
    for (const item of ordered) {
      const built = loop(item.fixed ? xu(item.mm) : 0);
      const move = item.fixed ? "" : ` data-mid="${item.index}" transform="${k.translateAlong(P, [xu(item.mm), 0, 0])}"`;
      backs.push(`<g class="rb-stirrup"${move}>${wire(built.back, item.tone)}</g>`);
      if (built.front) fronts.push(`<g class="rb-stirrup"${move}>${wire(built.front, item.tone)}</g>`);
      else if (!item.fixed) fronts.push(`<g class="rb-stirrup"${move}></g>`);
    }
    return { backs: backs.join(""), fronts: fronts.join("") };
  }

  function gaugeBase() {
    const out = [];
    const x0 = GAUGE.x0 - 8;
    const x1 = GAUGE.x1 + 8;
    const strip = { x: x0, y: 56, w: x1 - x0, d: 9, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(GAUGE.x0, GAUGE.x1, 4, 5, strip.y + 0.8, 0.8, [2.6, 4.6], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(D([at([x0 + 2.5, 60.5, 0.8]), at([x1 - 2.5, 60.5, 0.8])], { size: 0.42 }));
    out.push(S(k.slabOf({ x: x0, y: 69, w: x1 - x0, d: 5, r: 1.2 }, 0, 2.4, P, 3, 0.4), { tone: "mid" }));
    return out.join("");
  }

  function post(x) {
    const out = [S(k.slabOf({ x, y: 54, w: 5, d: 24, r: 1.2 }, 0, 6, P, 3, 0.5), { tone: "mid" })];
    out.push(D([at([x + 2.5, 59, 6]), at([x + 2.5, 73, 6])], { size: 0.42 }));
    return out.join("");
  }

  function carriage() {
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ x: -8, y: 66.5, w: 16, d: 13, r: 2.5 }, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`];
    out.push(S(k.slabOf({ x: -8, y: 66.5, w: 16, d: 13, r: 2.5 }, 0, 5.5, P, 4, 0.6), { tone: "mid" }));
    out.push(D([at([-5.2, 69, 5.5]), at([5.2, 69, 5.5]), at([-5.2, 77, 5.5]), at([5.2, 77, 5.5])], { size: 0.4 }));
    out.push(S(k.slabOf({ x: -1.2, y: 58, w: 2.4, d: 9, r: 0.8 }, 0.8, 2.2, P, 2), { tone: "hi", crease: "none" }));
    out.push(L(k.lineOnTop([0, 57.2], [0, 65.5], 3, P), { tone: "lit" }));
    out.push(S(k.cylinder(0, KNOB_Y, 5, 5.5, 5, P, 32, 0.4), { tone: "hi" }));
    out.push(L(k.knurl(0, KNOB_Y, 5, 5.5, 10.5, 30, P), { tone: "lo" }));
    out.push(L(k.ring(0, KNOB_Y, 3.6, 10.5, P, 24), { tone: "faint" }));
    out.push(L(k.lineOnTop([0, KNOB_Y], [4.2, KNOB_Y], 10.5, P), { tone: "lit" }));
    out.push(D([at([0, KNOB_Y, 10.5])], { size: 0.5, tone: "hi" }));
    return out.join("");
  }

  const sorted = [...MAINS].sort((a, b) => a[0] * W[0] + a[1] * W[1] - (b[0] * W[0] + b[1] * W[1]));
  const wires = stirrups();
  const cradles = CRADLES.map(cradle);
  const posts = [GAUGE.x0 - 13, GAUGE.x1 + 8];
  const [farPost, nearPost] = toward[0] >= 0 ? posts : [...posts].reverse();
  const carriageNode = `<g data-part="carriage" tabindex="-1" transform="${k.translateAlong(P, [knobAt(SPACING.start), 0, 0])}">${carriage()}</g>`;
  const gaugeNode = `<g data-layer="gauge">${gaugeBase()}${post(farPost)}${carriageNode}${post(nearPost)}</g>`;
  const spoolNode = `<g data-part="spool">${spool()}</g>`;
  const gaugeDepth = planDepth(GAUGE.x0 + 80, 66);
  const spoolDepth = planDepth(SPOOL[0], SPOOL[1]);
  const lowObjects = gaugeDepth < spoolDepth ? [gaugeNode, spoolNode] : [spoolNode, gaugeNode];

  const body = [
    `<g data-layer="bench">${bench()}</g>`,
    `<g data-layer="flats">${labelPlate()}${sheetBase()}</g>`,
    `<g data-layer="sheet-ticks"><path class="rb-tick" data-tone="hi" data-ticks="fixed" d=""/><path class="rb-tick" data-tone="lit" data-ticks="mid" d=""/></g>`,
    ...lowObjects,
    `<g data-layer="cradles-back">${cradles.map((c) => c.back).join("")}</g>`,
    `<g data-layer="stirrups-back">${wires.backs}</g>`,
    `<g data-layer="mains">${sorted.map(bar).join("")}</g>`,
    `<g data-layer="stirrups-front">${wires.fronts}</g>`,
    `<g data-layer="cradles-front">${cradles.map((c) => c.front).join("")}</g>`,
    `<path data-track d="${k.onTop([[GAUGE.x0 - 12, 48], [GAUGE.x1 + 12, 48], [GAUGE.x1 + 12, 84], [GAUGE.x0 - 12, 84]], 2, P, true)}"/>`,
  ].join("");

  return { body, cam: cameraAt(azimuth, elevation) };
}
