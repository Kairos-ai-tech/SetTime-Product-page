import assert from "node:assert/strict";
import * as k from "./anatomy-kit/iso-kit.mjs";
import * as G from "./anatomy-kit/lathe.mjs";
import { renderScene, projectionAt, MID_MAX } from "./rebar3d-scene.mjs";

let renders = 0;
for (let azimuth = -360; azimuth <= 720; azimuth += 5) {
  for (const elevation of [12, 30.5, 60]) {
    const { body, cam } = renderScene(azimuth, elevation);
    const where = `az ${azimuth} el ${elevation}`;
    assert.ok(!/NaN|undefined|Infinity/.test(body), `bad number in ${where}`);
    assert.equal(body.split('data-mid="').length - 1, MID_MAX * 2, `mid stirrup halves in ${where}`);
    assert.equal(body.split("data-track").length - 1, 1, `track in ${where}`);
    assert.equal(body.split('data-part="carriage"').length - 1, 1, `carriage in ${where}`);
    assert.equal(body.split('data-ticks="').length - 1, 2, `sheet ticks in ${where}`);
    assert.equal(body.split('data-pin="mid"').length - 1, 2, `mid pins in ${where}`);
    assert.ok(Object.values(cam).flat().every(Number.isFinite), `camera in ${where}`);
    renders++;
  }
}
console.log(`rebar3d scene OK — ${renders} renders`);

function bounds(points, project) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  const screen = points.map((p) => {
    const s = project(p);
    x0 = Math.min(x0, s[0]);
    x1 = Math.max(x1, s[0]);
    y0 = Math.min(y0, s[1]);
    y1 = Math.max(y1, s[1]);
    return s;
  });
  return { screen, x0, x1, y0, y1 };
}

function describe(item) {
  const range = (axis) => {
    const values = item.pts.map((p) => p[axis]);
    return `${Math.min(...values).toFixed(0)}..${Math.max(...values).toFixed(0)}`;
  };
  return `x${range(0)} y${range(1)} z${range(2)}${item.solid ? " box" : ""}`;
}

function orderFaults(azimuth, elevation) {
  const scene = renderScene(azimuth, elevation, { trace: [] });
  const trace = [...scene.body.matchAll(/<!--t(\d+)-->/g)].map((m) => scene.trace[Number(m[1])]);
  const P = projectionAt(azimuth, elevation);
  const V = G.viewOf(P);
  const scale = k.cameraOf(P).k;
  const project = (p) => k.iso(p, P);
  const depth = (p) => p[0] * V[0] + p[1] * V[1] + p[2] * V[2];
  const extent = (item, pick) => [0, 1, 2].map((axis) => pick(...item.pts.map((p) => p[axis])));
  const items = trace.map((item) => ({ ...item, ...bounds(item.pts, project), depth: item.pts.map(depth), min: extent(item, Math.min), max: extent(item, Math.max) }));
  const faults = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.solid && b.solid) {
        const wrong = [];
        let blind = false;
        for (let axis = 0; axis < 3; axis++) {
          const aLow = a.max[axis] <= b.min[axis];
          const bLow = b.max[axis] <= a.min[axis];
          if (!aLow && !bLow) continue;
          if (Math.abs(V[axis]) < 1e-6) blind = true;
          wrong.push(aLow === V[axis] < 0);
        }
        if (blind) continue;
        if (wrong.length && wrong.every(Boolean)) faults.push({ first: i, second: j, by: 99, a: describe(a), b: describe(b) });
        continue;
      }
      const reach = (a.r + b.r) * scale * 0.55;
      if (a.x1 + reach < b.x0 || b.x1 + reach < a.x0 || a.y1 + reach < b.y0 || b.y1 + reach < a.y0) continue;
      const slack = (a.r + b.r) * 2 + 2.5;
      const contact = a.r + b.r + 0.4;
      const dist3 = (p, q) => Math.hypot(a.pts[p][0] - b.pts[q][0], a.pts[p][1] - b.pts[q][1], a.pts[p][2] - b.pts[q][2]);
      let worst = 0;
      let touching = false;
      for (let p = 0; p < a.pts.length && !(a.solid && b.solid && touching); p++) {
        for (let q = 0; q < b.pts.length; q++) {
          const dx = a.screen[p][0] - b.screen[q][0];
          const dy = a.screen[p][1] - b.screen[q][1];
          if (dx * dx + dy * dy > reach * reach) continue;
          if (dist3(p, q) < contact) {
            touching = true;
            continue;
          }
          worst = Math.max(worst, a.depth[p] - b.depth[q] - slack);
        }
      }
      if (a.solid && b.solid && touching) continue;
      if (worst > 0) faults.push({ first: i, second: j, by: worst, a: describe(a), b: describe(b) });
    }
  }
  return faults;
}

if (process.env.ORDER_VIEW) {
  const [az, el] = process.env.ORDER_VIEW.split(",").map(Number);
  for (const f of orderFaults(az, el).sort((a, b) => b.by - a.by).slice(0, 14)) console.log(f.by.toFixed(1), "|", f.a, "|", f.b);
  process.exit(0);
}

let views = 0;
const failures = [];
for (let azimuth = 0; azimuth < 360; azimuth += 10) {
  for (const elevation of [12, 30, 60]) {
    const faults = orderFaults(azimuth, elevation);
    views++;
    if (faults.length) failures.push(`az ${azimuth} el ${elevation}: ${faults.length} (worst ${Math.max(...faults.map((f) => f.by)).toFixed(1)})`);
  }
}
if (failures.length) {
  console.error(failures.slice(0, 40).join("\n"));
  process.exit(1);
}
console.log(`rebar3d draw order OK — ${views} views`);
