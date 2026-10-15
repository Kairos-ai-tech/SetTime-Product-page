import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
const variant = process.argv[3] || 'baseline';
const width = +process.env.W || 1440, height = +process.env.H || 900, dpr = +process.env.DPR || 2;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'perf-'))}`,
  `--window-size=${width},${height}`, '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--enable-gpu-rasterization', 'about:blank',
], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (ver.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(ver.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;

if(process.env.THROTTLE)await send('Emulation.setCPUThrottlingRate',{rate:+process.env.THROTTLE});
await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });

const css = {
  baseline: '',
  nocanvas: '#hero-canvas{display:none!important}',
  nobackdrop: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  noshiny: '.fx-shiny{animation:none!important}',
  noblur: '.fade-in{filter:none!important}',
}[variant.split('+')[0]] || '';
let pre = `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(variant.split('+').map(v => ({
  nocanvas: '#hero-canvas{display:none!important}', nobackdrop: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  noshiny: '.fx-shiny{animation:none!important}', baseline: '', nolenis: '', nofx: ''
}[v] || '')).join(''))};document.head.appendChild(s)});`;
if (variant.includes('nofx')) pre += `window.gsap=undefined;`;
await send('Page.addScriptToEvaluateOnNewDocument', { source: pre });
await send('Page.navigate', { url });
await sleep(6000);

await ev(`window.__f=[];window.__y=[];(function l(t){window.__f.push(t);window.__y.push(Math.round(scrollY));requestAnimationFrame(l)})(performance.now());0`);
const bver=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const bws=new WebSocket(bver.webSocketDebuggerUrl);await new Promise(r=>bws.onopen=r);
const bpend=new Map();let bid=0;bws.onmessage=e=>{const m=JSON.parse(e.data);if(bpend.has(m.id)){bpend.get(m.id)(m);bpend.delete(m.id)}};
const bsend=(method)=>new Promise(r=>{const i=++bid;bpend.set(i,r);bws.send(JSON.stringify({id:i,method}))});
const pi=async()=>{const r=(await bsend('SystemInfo.getProcessInfo')).result.processInfo;const o={};r.forEach(p=>o[p.type]=(o[p.type]||0)+p.cpuTime);return o};
const p0=await pi();
const m0 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(x => [x.name, x.value]));
const t0 = Date.now();
await sleep(3000);
const p1=await pi();
const idleFrames = await ev(`(()=>{const a=window.__f.splice(0);return a})()`);
const m1 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(x => [x.name, x.value]));

const ts=Date.now();
const total = process.env.SHOT ? 10 : +process.env.SCROLL || 9000, steps = 360;
for (let i = 0; i < steps; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: total / steps }); await sleep(16); }
await sleep(800);
const scrollSecs=(Date.now()-ts)/1000;
const scrollFrames = await ev(`window.__f.splice(0)`);
const ys = await ev(`window.__y.splice(0)`);
const spikes=scrollFrames.slice(1).map((v,i)=>[+(v-scrollFrames[i]).toFixed(0),ys[i+1]]).filter(x=>x[0]>100);
const m2 = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(x => [x.name, x.value]));
const p2=await pi();
await ev('window.__f.length=0;0');
const q0=await pi();const n0=Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(x => [x.name, x.value]));
await sleep(4000);
const midFrames=await ev('window.__f.splice(0)');
const q1=await pi();const n1=Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(x => [x.name, x.value]));
const y = await ev('window.scrollY');

const stats = a => { const d = a.slice(1).map((v, i) => v - a[i]); d.sort((x, y) => x - y); const q = p => d[Math.floor(p * (d.length - 1))]; return { n: d.length, avg: +(d.reduce((s, v) => s + v, 0) / d.length).toFixed(1), p50: +q(.5).toFixed(1), p95: +q(.95).toFixed(1), p99: +q(.99).toFixed(1), max: +q(1).toFixed(1), over33: d.filter(v => v > 33).length, over50: d.filter(v => v > 50).length }; };
const dm = (a, b) => Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map(k => [k, +((b[k] - a[k]) * 1000).toFixed(0) + 'ms']));
const pd=(a,b)=>Object.fromEntries(Object.keys(b).map(k=>[k,+((b[k]-(a[k]||0))*1000).toFixed(0)+'ms']));
console.log(JSON.stringify({ variant, url, scrollY: y, idle: stats(idleFrames), idleCPU: dm(m0, m1), idleProc: pd(p0,p1), midProc: pd(q0,q1), midCPU: dm(n0,n1), midFrames: midFrames.length, spikes, scrollSecs, scroll: stats(scrollFrames), scrollCPU: dm(m1, m2), scrollProc: pd(p1,p2) }));
if(process.env.SHOT){const {writeFileSync}=await import('node:fs');for(const y of process.env.SHOT.split(',')){await ev(`window.scrollTo({top:${y},behavior:'instant'});0`);await sleep(2500);const r=await send('Page.captureScreenshot',{format:'jpeg',quality:70});writeFileSync(process.env.OUT+'-'+y+'.jpg',Buffer.from(r.result.data,'base64'));}}
ws.close(); bws.close(); chrome.kill();
