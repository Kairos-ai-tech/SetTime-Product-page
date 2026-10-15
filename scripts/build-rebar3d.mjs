import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy-kit/iso-kit.mjs";
import * as G from "./anatomy-kit/lathe.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 640;
const HEIGHT = 360;
const MM = 8;

const BENCH = { x: -30, y: -34, w: 262, d: 118, r: 8 };
const BENCH_H = 12;
const FOOT_H = 5;

const LENGTH = 200;
const HALF = 20;
const WIRE_R = 0.625;
const BAR_R = 1.56;
const BAR_AT = HALF - WIRE_R - BAR_R;
const CRADLE_TOP = 9;
const CY = 0;
const CZ = CRADLE_TOP + WIRE_R + HALF;
const CORNER = 3.4;

const END_LEFT = [50, 150, 250, 350];
const END_RIGHT = [1250, 1350, 1450, 1550];
const MID_FROM = 350;
const MID_TO = 1250;
const MID_MAX = 8;
const SPACING = { min: 100, max: 300, step: 10, start: 150 };
const GAUGE = { x0: 30, x1: 190 };
const KNOB_Y = 73;

const MAINS = [];
for (const y of [-BAR_AT, 0, BAR_AT]) for (const z of [-BAR_AT, 0, BAR_AT]) if (y !== 0 || z !== 0) MAINS.push([y, z]);

const SHEET = { x: -12, y: 28, w: 226, d: 22, r: 1.6 };
const ELEV = { y0: 31, y1: 39 };
const SPOOL = [219, 8];

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    ...k.boxCorners({ x: 0, y: -24, w: LENGTH, d: 48 }, CRADLE_TOP, CZ + HALF + 2),
    [SPOOL[0], SPOOL[1], 14],
    [GAUGE.x1 + 6, KNOB_Y, 14],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 58 },
);

const V = G.viewOf(P);
const W = [V[1], V[2]];
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const fmt = (n) => Math.round(n * 10) / 10;
const pathOf = (points) => points.map(([x, y], index) => `${index ? "L" : "M"}${fmt(x)} ${fmt(y)}`).join("");

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
  const ticks = k.topTicks(strip.x, strip.x + strip.w, MM * 12.5 / MM, 4, strip.y + 0.6, 1.3, [1.6, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([-9, 36.5], 0.8, P, "x"), "D10", { size: 3.4, tone: "mid" }));
  out.push(D([at([-8.2, 31, 0.8]), at([211, 31, 0.8]), at([-8.2, 47, 0.8]), at([211, 47, 0.8])], { size: 0.42 }));
  return out.join("");
}

const CRADLES = [44, 156];

function cradleBack(cx) {
  const out = [];
  const plate = { x: cx - 11, y: -26, w: 22, d: 52, r: 2 };
  out.push(S(k.slabOf(plate, 0, 2, P, 3, 0.4), { tone: "lo" }));
  out.push(D([[cx - 7.5, -22.5], [cx + 7.5, -22.5], [cx - 7.5, 22.5], [cx + 7.5, 22.5]].map(([x, y]) => at([x, y, 2])), { size: 0.4 }));
  out.push(S(k.slabOf({ x: cx - 8, y: -19, w: 16, d: 38, r: 1.2 }, 2, CRADLE_TOP - 2, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([cx - 5, -12], [cx + 5, -12], CRADLE_TOP, P), { tone: "faint" }), L(k.lineOnTop([cx - 5, 12], [cx + 5, 12], CRADLE_TOP, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: cx - 8, y: -24.8, w: 16, d: 3.4, r: 1 }, 2, 14, P, 2, 0.5), { tone: "mid" }));
  return out.join("");
}

function cradleFront(cx) {
  const out = [S(k.slabOf({ x: cx - 8, y: 21.4, w: 16, d: 3.4, r: 1 }, 2, 14, P, 2, 0.5), { tone: "mid" })];
  out.push(D([at([cx - 4, 23.1, 16]), at([cx + 4, 23.1, 16])], { size: 0.4 }));
  return out.join("");
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
  const half = HALF;
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
  add(-half + rc, half, 0, 1);
  add(half - rc, half, 0, 1);
  arc(half - rc, half - rc, 90, 0);
  add(half, -half + rc, 1, 0);
  arc(half - rc, -half + rc, 0, -90);
  add(-half + rc, -half, 0, -1);
  arc(-half + rc, -half + rc, -90, -180);
  add(-half, half - rc, -1, 0);
  arc(-half + rc, half - rc, 180, 90);
  const flags = points.map((p) => p.ny * W[0] + p.nz * W[1] > 0);
  const count = points.length;
  let start = 0;
  for (let i = 0; i < count; i++) if (flags[i] && !flags[(i + count - 1) % count]) start = i;
  const front = [];
  const back = [];
  let i = 0;
  while (i < count && flags[(start + i) % count]) front.push(points[(start + i++) % count]);
  const joinBack = front[front.length - 1];
  back.push(joinBack);
  while (i < count) back.push(points[(start + i++) % count]);
  back.push(front[0]);
  const project = (list) => pathOf(list.map((p) => at([at0, CY + p.y, CZ + p.z])));
  return { front: project(front), back: project(back) };
}

function wire(d, tone, extra = "") {
  return `<path class="rb-case" d="${d}"${extra}/><path class="rb-wire" data-tone="${tone}" d="${d}"${extra}/>`;
}

const xu = (mm) => mm / MM;
const MID_AT = (index, m) => MID_FROM + (MID_TO - MID_FROM) * (index + 1) / m;
const MID_START = (() => {
  const m = Math.ceil((MID_TO - MID_FROM) / SPACING.start);
  return Array.from({ length: MID_MAX }, (_, index) => (index < m - 1 ? MID_AT(index, m) : MID_TO));
})();

function stirrups() {
  const ordered = [...END_LEFT.map((mm) => ({ mm, tone: "hi", fixed: true })), ...MID_START.map((mm, index) => ({ mm, tone: "lit", index })), ...END_RIGHT.map((mm) => ({ mm, tone: "hi", fixed: true }))];
  const backs = [];
  const fronts = [];
  for (const item of ordered) {
    const built = loop(item.fixed ? xu(item.mm) : 0);
    const move = item.fixed ? "" : ` data-mid="${item.index}" transform="${k.translateAlong(P, [xu(item.mm), 0, 0])}"`;
    backs.push(`<g class="rb-stirrup"${move}>${wire(built.back, item.tone)}</g>`);
    fronts.push(`<g class="rb-stirrup"${move}>${wire(built.front, item.tone)}</g>`);
  }
  return { backs: backs.join(""), fronts: fronts.join("") };
}

function gauge() {
  const out = [];
  const x0 = GAUGE.x0 - 8;
  const x1 = GAUGE.x1 + 8;
  const strip = { x: x0, y: 56, w: x1 - x0, d: 9, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(GAUGE.x0, GAUGE.x1, 4, 5, strip.y + 0.8, 0.8, [2.6, 4.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([x0 + 2.5, 60.5, 0.8]), at([x1 - 2.5, 60.5, 0.8])], { size: 0.42 }));
  out.push(S(k.slabOf({ x: x0, y: 69, w: x1 - x0, d: 5, r: 1.2 }, 0, 2.4, P, 3, 0.4), { tone: "mid" }));
  for (const x of [x0 - 5, x1]) {
    out.push(S(k.slabOf({ x, y: 54, w: 5, d: 24, r: 1.2 }, 0, 6, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, 59, 6]), at([x + 2.5, 73, 6])], { size: 0.42 }));
  }
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
const knobAt = (spacing) => GAUGE.x0 + ((spacing - SPACING.min) * (GAUGE.x1 - GAUGE.x0)) / (SPACING.max - SPACING.min);

const label =
  "An isometric rebar column cage lying on two cradles on a workbench. Eight D25 main bars are held by D10 stirrups: four at 100 mm at each end, and a middle zone whose spacing follows a gauge on the bench. A drawing sheet in front of the cage marks every stirrup position directly across from it.";

const body = [
  `<g data-layer="bench">${bench()}${labelPlate()}${sheetBase()}</g>`,
  `<g data-layer="sheet-ticks"><path class="rb-tick" data-tone="hi" data-ticks="fixed" d=""/><path class="rb-tick" data-tone="lit" data-ticks="mid" d=""/></g>`,
  `<g data-layer="cradles-back">${CRADLES.map(cradleBack).join("")}</g>`,
  `<g data-layer="stirrups-back">${wires.backs}</g>`,
  `<g data-layer="mains">${sorted.map(bar).join("")}</g>`,
  `<g data-layer="stirrups-front">${wires.fronts}</g>`,
  `<g data-layer="cradles-front">${CRADLES.map(cradleFront).join("")}</g>`,
  `<g data-layer="gauge">${gauge()}</g>`,
  `<g data-part="spool">${spool()}</g>`,
  `<g data-part="carriage" tabindex="-1" transform="${k.translateAlong(P, [knobAt(SPACING.start), 0, 0])}">${carriage()}</g>`,
  `<path data-track d="${k.onTop([[GAUGE.x0 - 10, 53], [GAUGE.x1 + 10, 53], [GAUGE.x1 + 10, 80], [GAUGE.x0 - 10, 80]], 2, P, true)}"/>`,
].join("");

const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label, body, className: "rb-svg" });

const section = `<!-- rebar3d:start (generated by scripts/build-rebar3d.mjs) -->
  <section class="cage" id="cage">
    <div class="container">
      <p class="section-label fade-in" data-i18n="cage.label">SEE IT IN 3D 立體對位</p>
      <h2 class="section-heading fade-in" data-delay="1" data-i18n="cage.heading">拖動間距規<br>鋼筋籠即時重排</h2>
      <p class="section-lead fade-in" data-delay="2" data-i18n="cage.lead">圖面上的箍筋間距，就是現場的箍筋位置。拖動檯面上的間距規，看中段箍筋如何重新分配、支數與重量如何跟著改變。</p>

      <figure class="iso cage-figure fade-in" data-delay="3" data-theme="dark">
        <div class="iso-plate">
          <div class="iso-plate-corners" aria-hidden="true">
            <span class="iso-plate-corner" data-corner="fig">3D</span>
            <span class="iso-plate-corner" data-corner="title" data-i18n="cage.title">柱鋼筋籠</span>
            <span class="iso-plate-corner" data-corner="hint" data-i18n="cage.hint">拖動間距規</span>
            <span class="iso-plate-corner" data-corner="readout" data-readout></span>
          </div>
          <div class="iso-stage cage-stage" tabindex="0" role="slider" data-i18n-aria-label="cage.aria" aria-label="箍筋間距：方向鍵調整中段箍筋間距" aria-valuemin="${SPACING.min}" aria-valuemax="${SPACING.max}" aria-valuenow="${SPACING.start}">${svg}</div>
        </div>
        <figcaption class="iso-legend">
          <span class="iso-keys">
            <span class="iso-key"><svg class="iso-swatch" data-mark="lit" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg><span data-i18n="cage.key.mid">中段箍筋：跟隨間距規</span></span>
            <span class="iso-key"><svg class="iso-swatch" data-mark="edge" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg><span data-i18n="cage.key.end">端部加密區：固定 @100</span></span>
          </span>
          <span class="iso-caption" data-i18n="cage.caption">示意資料：8-D25 主筋、D10 箍筋、籠長 1.6 m。端部各 0.4 m 加密 @100，中段間距在 100–300 mm 之間可調，支數取能均分的最少值。</span>
        </figcaption>
      </figure>
    </div>
  </section>
  <!-- rebar3d:end -->`;

const html = readFileSync(join(ROOT, "index.html"), "utf8");
const pattern = /<!-- rebar3d:start[\s\S]*?<!-- rebar3d:end -->/;
if (!pattern.test(html)) throw new Error("index.html is missing the rebar3d markers");
writeFileSync(join(ROOT, "index.html"), html.replace(pattern, () => section));

const cameraK = k.cameraOf(P);
const origin = k.iso([0, 0, 0], P);
const config = {
  origin,
  sinA: cameraK.sinA,
  cosA: cameraK.cosA,
  sinE: cameraK.sinE,
  cosE: cameraK.cosE,
  k: cameraK.k,
  mm: MM,
  length: LENGTH,
  endLeft: END_LEFT,
  endRight: END_RIGHT,
  midFrom: MID_FROM,
  midTo: MID_TO,
  midMax: MID_MAX,
  spacing: SPACING,
  gauge: GAUGE,
  knobZ: 5.5,
  elev: ELEV,
  sheetZ: 0.8,
  barKg: Math.round(8 * 1.6 * 3.85 * 10) / 10,
  stirrupKg: 0.913,
};

const live = readFileSync(join(ROOT, "scripts", "rebar3d-live.js"), "utf8");
writeFileSync(join(ROOT, "rebar3d.js"), `(function () {\nvar CFG = ${JSON.stringify(config)};\n${live}\n})();\n`);

const iso = readFileSync(join(ROOT, "scripts", "anatomy-kit", "iso-kit.mjs"), "utf8");
const css = iso.match(/export const ISO_CSS = `([\s\S]*?)`;/)[1];
const overrides = readFileSync(join(ROOT, "scripts", "rebar3d-theme.css"), "utf8");
writeFileSync(join(ROOT, "rebar3d.css"), `${css.trim()}\n${overrides}`);
console.log("wrote index.html section, rebar3d.js, rebar3d.css");
