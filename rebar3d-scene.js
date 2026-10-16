import * as k from "./vendor/anatomy/iso-kit.js";
import * as G from "./vendor/anatomy/lathe.js";

export const WIDTH = 640;
export const HEIGHT = 400;
export const MM = 10;

const GROUND = { x: -74, y: -72, w: 266, d: 180, r: 9 };
const GROUND_H = 6;

const FOOT_WALL_H = 20;
const BEAM_WALL_H = 26;
const BEAM = { x0: 52, x1: 176, half: 15 };
const COLUMN_HALF = 20;
const COLUMN_TOP = 112;
const STIRRUP_R = 0.5;
const MAT_R = 0.8;
const MAIN_R = 1.25;
const BEAM_BAR_R = 0.8;

export const SX0 = 60;
export const END_LEFT = [50, 150];
export const END_RIGHT = [950, 1050];
export const MID_FROM = 150;
export const MID_TO = 950;
export const MID_MAX = 7;
export const SPACING = { min: 100, max: 300, step: 10, start: 150 };

export const TZ = 17;
const TABLE = { x: 54, y: 30, w: 136, d: 62, r: 2.5 };
const GY = 6;
export const GAUGE = { x0: 74, x1: 170 };
const KNOB_Y = 73 + GY;
export const KNOB_Z = TZ + 5.5;
export const TRACK_Z = TZ + 2;
export const ELEV = { y0: 37, y1: 45 };
export const SHEET_Z = TZ + 0.8;
export const PIN = { z0: BEAM_WALL_H, z1: BEAM_WALL_H + 7 };
const PIN_Y = BEAM.half + 1;

const SPOOL = [36, 72];
const RACK = { x: -56, y: 60, w: 72, d: 26, r: 2 };

export const VIEW = { azimuth: 58, elevation: 30, elevationMin: 12, elevationMax: 60 };

const box = (plan, z0, z1) => k.boxCorners(plan, z0, z1);
const FIT_POINTS = [
  ...box(GROUND, -GROUND_H, 0),
  ...box({ x: -COLUMN_HALF, y: -COLUMN_HALF, w: COLUMN_HALF * 2, d: COLUMN_HALF * 2 }, 0, COLUMN_TOP + 2),
  ...box({ x: 52, y: -20, w: 128, d: 40 }, 0, PIN.z1 + 2),
  ...box(TABLE, 0, TZ + 12),
];
const mid = (axis) => {
  const values = FIT_POINTS.map((point) => point[axis]);
  return (Math.min(...values) + Math.max(...values)) / 2;
};
const PIVOT_XY = [mid(0), mid(1)];
const Z_MIN = Math.min(...FIT_POINTS.map((point) => point[2]));
const Z_MAX = Math.max(...FIT_POINTS.map((point) => point[2]));

function scaleFor(elevation, pz) {
  const pad = 14;
  let best = Infinity;
  for (let azimuth = 0; azimuth < 360; azimuth += 6) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const center = k.iso([PIVOT_XY[0], PIVOT_XY[1], pz], unit);
    let dx = 0;
    let dy = 0;
    for (const point of FIT_POINTS) {
      const [x, y] = k.iso(point, unit);
      dx = Math.max(dx, Math.abs(x - center[0]));
      dy = Math.max(dy, Math.abs(y - center[1]));
    }
    best = Math.min(best, (WIDTH / 2 - pad) / dx, (HEIGHT / 2 - pad) / dy);
  }
  return best;
}

const fitCache = new Map();
function fitAt(elevation) {
  if (!fitCache.has(elevation)) {
    let best = { scale: 0, pz: 0 };
    for (let pz = Z_MIN; pz <= Z_MAX; pz += 6) {
      const scale = scaleFor(elevation, pz);
      if (scale > best.scale) best = { scale, pz };
    }
    fitCache.set(elevation, best);
  }
  return fitCache.get(elevation);
}

function fitBlend(elevation) {
  const low = Math.floor(elevation);
  const t = elevation - low;
  const a = fitAt(low);
  const b = fitAt(low + 1);
  return { scale: a.scale * (1 - t) + b.scale * t, pz: a.pz * (1 - t) + b.pz * t };
}

export function projectionAt(azimuth, elevation) {
  const { scale, pz } = fitBlend(elevation);
  const unit = { origin: [0, 0], scale, azimuth, elevation };
  const center = k.iso([PIVOT_XY[0], PIVOT_XY[1], pz], unit);
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

const FOOT_WALLS = [
  { plan: { x: -52, y: -52, w: 104, d: 2, r: 0.4 }, n: [0, -1], h: FOOT_WALL_H, waler: { x: -52, y: -53.2, w: 104, d: 1.2 }, stakes: [-36, 0, 36].map((s) => ({ x: s - 1, y: -55.2, w: 2, d: 2 })) },
  { plan: { x: -52, y: 50, w: 104, d: 2, r: 0.4 }, n: [0, 1], h: FOOT_WALL_H, waler: { x: -52, y: 52, w: 104, d: 1.2 }, stakes: [-36, 0, 36].map((s) => ({ x: s - 1, y: 53.2, w: 2, d: 2 })) },
  { plan: { x: -52, y: -50, w: 2, d: 100, r: 0.4 }, n: [-1, 0], h: FOOT_WALL_H, waler: { x: -53.2, y: -50, w: 1.2, d: 100 }, stakes: [-30, 0, 30].map((s) => ({ x: -55.2, y: s - 1, w: 2, d: 2 })) },
  { plan: { x: 50, y: -50, w: 2, d: 100, r: 0.4 }, n: [1, 0], h: FOOT_WALL_H, waler: null, stakes: [] },
];
const BEAM_STAKE_X = [80, 118, 156];
const BEAM_WALLS = [
  { plan: { x: BEAM.x0, y: BEAM.half, w: BEAM.x1 - BEAM.x0 + 2, d: 2, r: 0.4 }, n: [0, 1], h: BEAM_WALL_H, waler: { x: BEAM.x0, y: BEAM.half + 2, w: BEAM.x1 - BEAM.x0 + 2, d: 1.2 }, stakes: BEAM_STAKE_X.map((s) => ({ x: s - 1, y: BEAM.half + 3.2, w: 2, d: 2 })) },
  { plan: { x: BEAM.x0, y: -BEAM.half - 2, w: BEAM.x1 - BEAM.x0 + 2, d: 2, r: 0.4 }, n: [0, -1], h: BEAM_WALL_H, waler: { x: BEAM.x0, y: -BEAM.half - 3.2, w: BEAM.x1 - BEAM.x0 + 2, d: 1.2 }, stakes: BEAM_STAKE_X.map((s) => ({ x: s - 1, y: -BEAM.half - 5.2, w: 2, d: 2 })) },
  { plan: { x: BEAM.x1, y: -BEAM.half - 2, w: 2, d: BEAM.half * 2 + 4, r: 0.4 }, n: [1, 0], h: BEAM_WALL_H, waler: null, stakes: [] },
];

const MAT_Y = Array.from({ length: 7 }, (_, index) => -45 + index * 15);
const MAT_Z_A = 5 + MAT_R;
const MAT_Z_B = MAT_Z_A + MAT_R * 2;
const FOOT_Z = MAT_Z_B + MAT_R + MAIN_R;
const COLUMN_MAIN_AT = COLUMN_HALF - 3.5 - STIRRUP_R - MAIN_R;
const COLUMN_MAINS = [];
for (const x of [-COLUMN_MAIN_AT, 0, COLUMN_MAIN_AT]) for (const y of [-COLUMN_MAIN_AT, 0, COLUMN_MAIN_AT]) if (x !== 0 || y !== 0) COLUMN_MAINS.push([x, y]);
const COLUMN_LOOPS = Array.from({ length: 9 }, (_, index) => 16 + index * 11);
const BEAM_U = BEAM.half - 3.5;
const BEAM_V = (BEAM_WALL_H - 7) / 2;
const BEAM_ZC = BEAM_WALL_H / 2;
const BEAM_BAR_Y = [-1, 0, 1].map((s) => s * (BEAM_U - STIRRUP_R - BEAM_BAR_R));
const BEAM_BAR_Z = [-1, 1].map((s) => BEAM_ZC + s * (BEAM_V - STIRRUP_R - BEAM_BAR_R));
const BEAM_BARS = [];
for (const y of BEAM_BAR_Y) for (const z of BEAM_BAR_Z) BEAM_BARS.push([y, z]);
export const BEAM_BARS_X = [56, 170];

const gravel = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const keepOut = [
    { x: -62, y: -62, w: 122, d: 124 },
    { x: 48, y: -26, w: 138, d: 52 },
    { x: 48, y: 24, w: 148, d: 76 },
    { x: -62, y: 54, w: 112, d: 44 },
  ];
  const out = [];
  while (out.length < 64) {
    const x = GROUND.x + 7 + next() * (GROUND.w - 14);
    const y = GROUND.y + 7 + next() * (GROUND.d - 14);
    if (keepOut.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d)) continue;
    out.push([x, y]);
  }
  return out;
})();

const steps = (a, b, step) => {
  const n = Math.max(1, Math.ceil((b - a) / step));
  return Array.from({ length: n + 1 }, (_, index) => a + ((b - a) * index) / n);
};

function boxPts(plan, z0, z1, step = 5) {
  const pts = [];
  const xs = steps(plan.x, plan.x + plan.w, step);
  const ys = steps(plan.y, plan.y + plan.d, step);
  const zs = steps(z0, z1, step);
  for (const x of xs) for (const y of ys) for (const z of zs) if (x === xs[0] || x === xs[xs.length - 1] || y === ys[0] || y === ys[ys.length - 1] || z === zs[0] || z === zs[zs.length - 1]) pts.push([x, y, z]);
  return pts;
}

function segPts(a, b, step = 3) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(1, Math.ceil(length / step));
  return Array.from({ length: n + 1 }, (_, index) => [a[0] + ((b[0] - a[0]) * index) / n, a[1] + ((b[1] - a[1]) * index) / n, a[2] + ((b[2] - a[2]) * index) / n]);
}

function roundedLoop(hu, hv, rc) {
  const points = [];
  const add = (u, v, nu, nv) => points.push({ u, v, nu, nv });
  const arc = (cu, cv, from, to) => {
    const count = 6;
    for (let i = 0; i <= count; i++) {
      const angle = ((from + (to - from) * (i / count)) * Math.PI) / 180;
      add(cu + Math.cos(angle) * rc, cv + Math.sin(angle) * rc, Math.cos(angle), Math.sin(angle));
    }
  };
  add(-hu + rc, hv, 0, 1);
  add(hu - rc, hv, 0, 1);
  arc(hu - rc, hv - rc, 90, 0);
  add(hu, -hv + rc, 1, 0);
  arc(hu - rc, -hv + rc, 0, -90);
  add(-hu + rc, -hv, 0, -1);
  arc(-hu + rc, -hv + rc, -90, -180);
  add(-hu, hv - rc, -1, 0);
  arc(-hu + rc, hv - rc, 180, 90);
  return points;
}
const LOOP_BEAM = roundedLoop(BEAM_U, BEAM_V, 3.4);
const LOOP_COLUMN = roundedLoop(COLUMN_HALF - 3.5, COLUMN_HALF - 3.5, 3.4);

export function renderScene(azimuth, elevation, options = {}) {
  const trace = options.trace || null;
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
  const keep = (svg, pts, r, solid = false) => {
    if (!trace) return svg;
    trace.push({ pts: pts(), r, solid });
    return `<!--t${trace.length - 1}-->${svg}`;
  };

  const wire = (d, tone, kind) => `<path class="rb-case" data-w="${kind}" d="${d}"/><path class="rb-wire" data-tone="${tone}" data-w="${kind}" d="${d}"/>`;

  function timber(plan, z0, z1, tone) {
    return keep(S(k.slabOf({ r: 0.3, ...plan }, z0, z1 - z0, P, 2, 0.25), { tone }), () => boxPts(plan, z0, z1), 0.6, true);
  }

  const boxOf = (plan, z0, z1, svg) => ({ min: [plan.x, plan.y, z0], max: [plan.x + plan.w, plan.y + plan.d, z1], svg });

  function mustPrecede(a, b) {
    const wants = [];
    for (let axis = 0; axis < 3; axis++) {
      const aLow = a.max[axis] <= b.min[axis];
      const bLow = b.max[axis] <= a.min[axis];
      if (!aLow && !bLow) continue;
      if (Math.abs(V[axis]) < 1e-6) return null;
      wants.push(aLow === V[axis] > 0);
    }
    if (!wants.length || wants.some((w) => w !== wants[0])) return null;
    return wants[0];
  }

  function paintOrder(items) {
    const left = [...items];
    const out = [];
    while (left.length) {
      let index = left.findIndex((a) => left.every((b) => b === a || mustPrecede(b, a) !== true));
      if (index < 0) index = 0;
      out.push(left.splice(index, 1)[0]);
    }
    return out.map((item) => item.svg).join("");
  }

  function wallBoxes(wall) {
    const near = wall.n[0] * toward[0] + wall.n[1] * toward[1] > 0;
    const items = [];
    const body = [timber(wall.plan, 0, wall.h, "mid")];
    const topAt = wall.plan.w > wall.plan.d ? [[wall.plan.x + 4, wall.plan.y + wall.plan.d / 2], [wall.plan.x + wall.plan.w - 4, wall.plan.y + wall.plan.d / 2]] : [[wall.plan.x + wall.plan.w / 2, wall.plan.y + 4], [wall.plan.x + wall.plan.w / 2, wall.plan.y + wall.plan.d - 4]];
    body.push(D(topAt.map(([x, y]) => at([x, y, wall.h])), { size: 0.4 }));
    items.push(boxOf(wall.plan, 0, wall.h, body.join("")));
    if (wall.waler) items.push(boxOf(wall.waler, wall.h * 0.55, wall.h * 0.55 + 3.2, timber(wall.waler, wall.h * 0.55, wall.h * 0.55 + 3.2, "lo")));
    if (wall.stakes.length) {
      const stakeTop = wall.h * 0.78;
      const svg = keep(`<path class="rb-stake" d="${wall.stakes.map((stake) => k.segment([stake.x + 1, stake.y + 1, 0], [stake.x + 1, stake.y + 1, stakeTop], P)).join("")}"/>`, () => wall.stakes.flatMap((stake) => boxPts(stake, 0, stakeTop, 4)), 0.6, true);
      const xs = wall.stakes.map((stake) => stake.x);
      const ys = wall.stakes.map((stake) => stake.y);
      items.push({ min: [Math.min(...xs), Math.min(...ys), 0], max: [Math.max(...xs) + 2, Math.max(...ys) + 2, stakeTop], svg });
    }
    return items.map((item) => ({ ...item, near }));
  }

  function wallSet(list) {
    const items = list.flatMap(wallBoxes);
    return { far: paintOrder(items.filter((item) => !item.near)), near: paintOrder(items.filter((item) => item.near)) };
  }

  function chairs(list, z1) {
    const d = list
      .map((plan) => {
        const cx = plan.x + plan.w / 2;
        return plan.d > plan.w * 2 ? k.segment([cx, plan.y, z1 / 2], [cx, plan.y + plan.d, z1 / 2], P) : k.segment([cx, plan.y + plan.d / 2, 0], [cx, plan.y + plan.d / 2, z1], P);
      })
      .join("");
    return keep(`<path class="rb-chair" data-h="${plan0(list)}" d="${d}"/>`, () => list.flatMap((plan) => boxPts(plan, 0, z1, 3)), 1, true);
  }
  const plan0 = (list) => (list[0].d > list[0].w * 2 ? "rail" : "block");

  function matBars() {
    const out = [];
    const sortedA = [...MAT_Y].sort((a, b) => a * toward[1] - b * toward[1]);
    const sortedB = [...MAT_Y].sort((a, b) => a * toward[0] - b * toward[0]);
    for (const y of sortedA) {
      const a = [-46, y, MAT_Z_A];
      const b = [46, y, MAT_Z_A];
      out.push(keep(wire(k.segment(a, b, P), "mid", "mat"), () => segPts(a, b), MAT_R));
    }
    for (const x of sortedB) {
      const a = [x, -46, MAT_Z_B];
      const b = [x, 46, MAT_Z_B];
      out.push(keep(wire(k.segment(a, b, P), "mid", "mat"), () => segPts(a, b), MAT_R));
    }
    return out.join("");
  }

  function loopOf(axis, at0, shape, cu, cv) {
    const map = (point) => (axis === "x" ? [at0, cu + point.u, cv + point.v] : [cu + point.u, cv + point.v, at0]);
    const normalDot = (point) => (axis === "x" ? point.nu * V[1] + point.nv * V[2] : point.nu * V[0] + point.nv * V[1]);
    const flags = shape.map((point) => normalDot(point) > 0);
    const count = shape.length;
    let start = flags.findIndex((flag, i) => flag && !flags[(i + count - 1) % count]);
    if (start < 0) start = 0;
    const front = [];
    const back = [];
    let i = 0;
    while (i < count && flags[(start + i) % count]) front.push(shape[(start + i++) % count]);
    if (!front.length) {
      const all = shape.map((p) => map(p));
      return { front: "", back: pathOf(all.map(at)), fp: [], bp: all };
    }
    back.push(front[front.length - 1]);
    while (i < count) back.push(shape[(start + i++) % count]);
    back.push(front[0]);
    const fp = front.map((p) => map(p));
    const bp = back.map((p) => map(p));
    return { front: pathOf(fp.map(at)), back: pathOf(bp.map(at)), fp, bp };
  }

  function polyPts(points) {
    const out = [];
    for (let i = 1; i < points.length; i++) out.push(...segPts(points[i - 1], points[i], 3));
    return out;
  }

  function columnCage() {
    const backs = [];
    const fronts = [];
    for (const z of COLUMN_LOOPS) {
      const built = loopOf("z", z, LOOP_COLUMN, 0, 0);
      backs.push(keep(wire(built.back, "hi", "stirrup"), () => polyPts(built.bp), STIRRUP_R));
      if (built.front) fronts.push(keep(wire(built.front, "hi", "stirrup"), () => polyPts(built.fp), STIRRUP_R));
    }
    const mains = [];
    const farFeet = [];
    const nearFeet = [];
    for (const [x, y] of COLUMN_MAINS) {
      const dx = Math.abs(x) > 0.01 ? Math.sign(x) : 0;
      const dy = dx ? 0 : Math.sign(y);
      mains.push({ key: planDepth(x, y), x, y });
      (dx * toward[0] + dy * toward[1] > 0 ? nearFeet : farFeet).push({ key: planDepth(x + dx * 10, y + dy * 10), x, y, dx, dy });
    }
    const foot = (item) => {
      const start = [item.x, item.y, FOOT_Z];
      const end = [item.x + item.dx * 20, item.y + item.dy * 20, FOOT_Z];
      return keep(wire(k.segment(start, end, P), "hi", "main"), () => segPts(start, end, 1.5), MAIN_R);
    };
    const main = (item) => {
      const F = G.frameAlong([item.x, item.y, FOOT_Z], [0, 0, 1]);
      return keep(S(G.solidOf([[0, MAIN_R], [COLUMN_TOP - FOOT_Z, MAIN_R]], F, P, { steps: 14 }), { tone: "hi", crease: "lo" }), () => segPts([item.x, item.y, FOOT_Z], [item.x, item.y, COLUMN_TOP], 1.5), MAIN_R);
    };
    const up = [...mains.map((item) => ({ ...item, draw: main })), ...nearFeet.map((item) => ({ ...item, draw: foot }))].sort((a, b) => a.key - b.key || (a.draw === foot ? -1 : 1));
    return farFeet.sort((a, b) => a.key - b.key).map(foot).join("") + backs.join("") + up.map((item) => item.draw(item)).join("") + fronts.join("");
  }

  function footing() {
    const { far, near } = wallSet(FOOT_WALLS);
    const chairList = [-30, 0, 30].flatMap((x) => [-30, 0, 30].map((y) => ({ x: x - 1.5, y: y - 1.5, w: 3, d: 3 })));
    return far + chairs(chairList, 5) + matBars() + columnCage() + near;
  }

  function stirrupSet() {
    const ordered = [...END_LEFT.map((mm) => ({ mm, tone: "hi", fixed: true })), ...MID_START.map((mm, index) => ({ mm, tone: "lit", index })), ...END_RIGHT.map((mm) => ({ mm, tone: "hi", fixed: true }))];
    if (toward[0] < 0) ordered.reverse();
    const backs = [];
    const fronts = [];
    for (const item of ordered) {
      const x0 = item.fixed ? SX0 + xu(item.mm) : SX0;
      const built = loopOf("x", x0, LOOP_BEAM, 0, BEAM_ZC);
      const move = item.fixed ? "" : ` data-mid="${item.index}" transform="${k.translateAlong(P, [xu(item.mm), 0, 0])}"`;
      const shift = item.fixed ? 0 : xu(item.mm);
      const trackPts = (pts) => () => polyPts(pts).map(([x, y, z]) => [x + shift, y, z]);
      backs.push(`<g class="rb-stirrup"${move}>${keep(wire(built.back, item.tone, "stirrup"), trackPts(built.bp), STIRRUP_R)}</g>`);
      if (built.front) fronts.push(`<g class="rb-stirrup"${move}>${keep(wire(built.front, item.tone, "stirrup"), trackPts(built.fp), STIRRUP_R)}</g>`);
      else if (!item.fixed) fronts.push(`<g class="rb-stirrup"${move}></g>`);
    }
    return { backs: backs.join(""), fronts: fronts.join("") };
  }

  function beamBars() {
    const sorted = [...BEAM_BARS].sort((a, b) => a[0] * W[0] + a[1] * W[1] - (b[0] * W[0] + b[1] * W[1]));
    return sorted
      .map(([y, z]) => {
        const F = G.frameAlong([BEAM_BARS_X[0], y, z], [1, 0, 0]);
        return keep(S(G.solidOf([[0, BEAM_BAR_R], [BEAM_BARS_X[1] - BEAM_BARS_X[0], BEAM_BAR_R]], F, P, { steps: 12 }), { tone: "hi", crease: "lo" }), () => segPts([BEAM_BARS_X[0], y, z], [BEAM_BARS_X[1], y, z]), BEAM_BAR_R);
      })
      .join("");
  }

  const pinSide = toward[1] >= 0 ? 1 : -1;
  const pinY = pinSide * PIN_Y;

  function pins() {
    const stems = END_LEFT.concat(END_RIGHT).map((mm) => {
      const x = SX0 + xu(mm);
      return `M${at([x, pinY, PIN.z0]).map(fmt).join(" ")}L${at([x, pinY, PIN.z1]).map(fmt).join(" ")}`;
    });
    const caps = END_LEFT.concat(END_RIGHT).map((mm) => `M${at([SX0 + xu(mm), pinY, PIN.z1]).map(fmt).join(" ")}h0.01`);
    return `<path class="rb-pin" data-pin="fixed" d="${stems.join("")}"/><path class="rb-pin-cap" data-pin="fixed" d="${caps.join("")}"/><path class="rb-pin" data-pin="mid" d=""/><path class="rb-pin-cap" data-pin="mid" d=""/>`;
  }

  function beam() {
    const { far, near } = wallSet(BEAM_WALLS);
    const rails = [66, 96, 126, 156].map((x) => ({ x: x - 1.5, y: -BEAM_U, w: 3, d: BEAM_U * 2 }));
    const wires = stirrupSet();
    return far + chairs(rails, 3) + `<g data-layer="stirrups-back">${wires.backs}</g>` + beamBars() + `<g data-layer="stirrups-front">${wires.fronts}</g>` + near + pins();
  }

  function rack() {
    const out = [`<path class="iso-halo" d="${k.haloOf(RACK, 0, 0.6, P)}"/>`];
    const sleepers = [-48, 4].map((x) => timber({ x, y: RACK.y, w: 5, d: RACK.d }, 0, 4, "lo"));
    const rows = [
      { count: 5, z: 4 + MAIN_R },
      { count: 4, z: 4 + MAIN_R + 2.17 },
      { count: 3, z: 4 + MAIN_R + 4.33 },
    ];
    const bars = [];
    const yc = RACK.y + RACK.d / 2;
    for (const row of rows) {
      for (let index = 0; index < row.count; index++) {
        const y = yc + (index - (row.count - 1) / 2) * 2.5;
        bars.push([y, row.z]);
      }
    }
    bars.sort((a, b) => a[0] * W[0] + a[1] * W[1] - (b[0] * W[0] + b[1] * W[1]));
    const drawn = bars.map(([y, z]) => {
      const a = [RACK.x + 2, y, z];
      const b = [RACK.x + 68, y, z];
      return keep(wire(k.segment(a, b, P), "hi", "main"), () => segPts(a, b, 4), MAIN_R);
    });
    const [s0, s1] = toward[0] >= 0 ? sleepers : [sleepers[1], sleepers[0]];
    return out.join("") + s0 + s1 + drawn.join("");
  }

  function reel() {
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

  function sheetBase() {
    const sheet = { x: 58, y: 34, w: 128, d: 22, r: 1.6 };
    const out = [S(k.slabOf(sheet, TZ, 0.8, P, 4), { tone: "lo", crease: "none" })];
    out.push(L(k.planOutline(k.insetPlan(sheet, 2.2), SHEET_Z, P, 4), { tone: "faint" }));
    const frame = { x: 60, y: ELEV.y0, w: 108, d: ELEV.y1 - ELEV.y0, r: 0 };
    out.push(L(k.planOutline(frame, SHEET_Z, P, 1), { tone: "mid" }));
    out.push(L(k.lineOnTop([60, (ELEV.y0 + ELEV.y1) / 2], [168, (ELEV.y0 + ELEV.y1) / 2], SHEET_Z, P), { tone: "faint", dashed: true }));
    const strip = { x: 60, y: 47.4, w: 108, d: 4.2, r: 0.6 };
    out.push(S(k.slabOf(strip, SHEET_Z, 0.5, P, 2), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x, strip.x + strip.w, 10, 5, strip.y + 0.6, SHEET_Z + 0.5, [1.6, 3], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(`<path class="rb-tick" data-tone="hi" data-ticks="fixed" d=""/><path class="rb-tick" data-tone="lit" data-ticks="mid" d=""/>`);
    out.push(k.faceTextSvg(k.topMatrix([171, 42.4], SHEET_Z, P, "x"), "D10", { size: 3.4, tone: "mid" }));
    out.push(D([at([61.6, 36, SHEET_Z]), at([182.4, 36, SHEET_Z]), at([61.6, 54, SHEET_Z]), at([182.4, 54, SHEET_Z])], { size: 0.42 }));
    return out.join("");
  }

  function gaugeBase() {
    const out = [];
    const x0 = GAUGE.x0 - 8;
    const x1 = GAUGE.x1 + 8;
    const strip = { x: x0, y: 56 + GY, w: x1 - x0, d: 9, r: 1 };
    out.push(S(k.slabOf(strip, TZ, 0.8, P, 3), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(GAUGE.x0, GAUGE.x1, (GAUGE.x1 - GAUGE.x0) / 20, 5, strip.y + 0.8, TZ + 0.8, [2.6, 4.6], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(D([at([x0 + 2.5, 60.5 + GY, TZ + 0.8]), at([x1 - 2.5, 60.5 + GY, TZ + 0.8])], { size: 0.42 }));
    out.push(S(k.slabOf({ x: x0, y: 69 + GY, w: x1 - x0, d: 5, r: 1.2 }, TZ, 2.4, P, 3, 0.4), { tone: "mid" }));
    return out.join("");
  }

  function post(x) {
    const out = [S(k.slabOf({ x, y: 54 + GY, w: 5, d: 24, r: 1.2 }, TZ, 6, P, 3, 0.5), { tone: "mid" })];
    out.push(D([at([x + 2.5, 59 + GY, TZ + 6]), at([x + 2.5, 73 + GY, TZ + 6])], { size: 0.42 }));
    return out.join("");
  }

  function carriage() {
    const c = TZ;
    const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ x: -8, y: 66.5 + GY, w: 16, d: 13, r: 2.5 }, 2), c, 0.1, P)}"/>`];
    out.push(S(k.slabOf({ x: -8, y: 66.5 + GY, w: 16, d: 13, r: 2.5 }, c, 5.5, P, 4, 0.6), { tone: "mid" }));
    out.push(D([at([-5.2, 69 + GY, c + 5.5]), at([5.2, 69 + GY, c + 5.5]), at([-5.2, 77 + GY, c + 5.5]), at([5.2, 77 + GY, c + 5.5])], { size: 0.4 }));
    out.push(S(k.slabOf({ x: -1.2, y: 58 + GY, w: 2.4, d: 9, r: 0.8 }, c + 0.8, 2.2, P, 2), { tone: "hi", crease: "none" }));
    out.push(L(k.lineOnTop([0, 57.2 + GY], [0, 65.5 + GY], c + 3, P), { tone: "lit" }));
    out.push(S(k.cylinder(0, KNOB_Y, 5, c + 5.5, 5, P, 32, 0.4), { tone: "hi" }));
    out.push(L(k.knurl(0, KNOB_Y, 5, c + 5.5, c + 10.5, 30, P), { tone: "lo" }));
    out.push(L(k.ring(0, KNOB_Y, 3.6, c + 10.5, P, 24), { tone: "faint" }));
    out.push(L(k.lineOnTop([0, KNOB_Y], [4.2, KNOB_Y], c + 10.5, P), { tone: "lit" }));
    out.push(D([at([0, KNOB_Y, c + 10.5])], { size: 0.5, tone: "hi" }));
    return out.join("");
  }

  function table() {
    const out = [`<path class="iso-halo" d="${k.haloOf(TABLE, 0, 0.6, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(TABLE, 6))) out.push(timber({ x: x - 2, y: y - 2, w: 4, d: 4 }, 0, 14, "lo"));
    out.push(keep(S(k.slabOf(TABLE, 14, 3, P, 4, 0.5), { tone: "mid" }), () => boxPts(TABLE, 14, TZ, 8), 1, true));
    out.push(L(k.planOutline(k.insetPlan(TABLE, 2.4), TZ, P, 4), { tone: "faint" }));
    out.push(sheetBase());
    const posts = [GAUGE.x0 - 13, GAUGE.x1 + 8];
    const [farPost, nearPost] = toward[0] >= 0 ? posts : [...posts].reverse();
    const carriageNode = `<g data-part="carriage" tabindex="-1" transform="${k.translateAlong(P, [knobAt(SPACING.start), 0, 0])}">${carriage()}</g>`;
    out.push(`<g data-layer="gauge">${gaugeBase()}${post(farPost)}${carriageNode}${post(nearPost)}</g>`);
    return out.join("");
  }

  const ground = () => {
    const out = [`<path class="iso-halo" d="${k.haloOf(GROUND, -GROUND_H - 2, GROUND_H, P)}"/>`];
    out.push(S(k.slabOf(GROUND, -GROUND_H, GROUND_H, P, 8, 1.2), { tone: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(GROUND, 4), 0, P), { tone: "faint" }));
    out.push(D(gravel.map(([x, y]) => at([x, y, 0])), { size: 0.45, tone: "lo" }));
    out.push(L(k.lineOnTop([-68, 0], [186, 0], 0, P), { tone: "faint", dashed: true }));
    out.push(L(k.lineOnTop([0, -66], [0, 100], 0, P), { tone: "faint", dashed: true }));
    out.push(D([at([-68, 0, 0]), at([186, 0, 0]), at([0, -66, 0]), at([0, 100, 0])], { size: 0.7, tone: "mid" }));
    return out.join("");
  };

  const blocks = [
    { x0: -58, x1: 52, y0: -58, y1: 58, html: footing() },
    { x0: 52, x1: 182, y0: -22, y1: 22, html: beam() },
    { x0: TABLE.x, x1: TABLE.x + TABLE.w, y0: TABLE.y, y1: TABLE.y + TABLE.d, html: table() },
    { x0: RACK.x, x1: RACK.x + RACK.w, y0: RACK.y, y1: RACK.y + RACK.d, html: rack() },
    { x0: SPOOL[0] - 10, x1: SPOOL[0] + 10, y0: SPOOL[1] - 10, y1: SPOOL[1] + 10, html: reel() },
  ];

  const ordered = paintOrder(blocks.map((block) => ({ min: [block.x0, block.y0, 0], max: [block.x1, block.y1, 200], svg: block.html })));

  const body = [
    `<g data-layer="ground">${ground()}</g>`,
    ordered,
    `<path data-track d="${k.onTop([[GAUGE.x0 - 12, 54 + GY], [GAUGE.x1 + 12, 54 + GY], [GAUGE.x1 + 12, 90 + GY], [GAUGE.x0 - 12, 90 + GY]], TRACK_Z, P, true)}"/>`,
  ].join("");

  return { body, cam: { ...cameraAt(azimuth, elevation), pinY }, trace };
}
