import assert from "node:assert/strict";
import { renderScene, MID_MAX } from "./rebar3d-scene.mjs";

let renders = 0;
for (let azimuth = -360; azimuth <= 720; azimuth += 5) {
  for (const elevation of [12, 30.5, 60]) {
    const { body, cam } = renderScene(azimuth, elevation);
    const where = `az ${azimuth} el ${elevation}`;
    assert.ok(!/NaN|undefined|Infinity/.test(body), `bad number in ${where}`);
    assert.equal(body.split('data-mid="').length - 1, MID_MAX * 2, `mid stirrup halves in ${where}`);
    assert.equal(body.split("data-track").length - 1, 1, `track in ${where}`);
    assert.equal(body.split('data-part="carriage"').length - 1, 1, `carriage in ${where}`);
    assert.ok(Object.values(cam).flat().every(Number.isFinite), `camera in ${where}`);
    renders++;
  }
}
console.log(`rebar3d scene OK — ${renders} renders`);
