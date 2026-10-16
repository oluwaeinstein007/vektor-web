// NW-014 — 03-nfr.md §8.1: "Map performance: >= 60fps on WebGL map with
// 1,000+ active tracks." Never measured; the dashboard had only ever been
// shown with a handful of real entities.
//
// This drives a REAL MapLibre GL map in a REAL headless Chrome
// (playwright-core against the system binary, the same no-bundled-browser
// pattern reporting-svc uses for puppeteer-core), with the SAME three
// symbol layers and the SAME layout/paint expressions as
// src/components/entity-layer.tsx, fed features in the exact shape
// src/lib/entity-geojson.ts emits.
//
// It is a layer-level benchmark, not a full-dashboard one: it does not run
// Next.js, Socket.io or the HUD panels. That is deliberate — the question
// NFR 8.1 asks is whether MapLibre can render N entity symbols at 60fps
// with this project's actual symbology, and mixing React re-render cost
// into that would answer a different question. A full-dashboard
// measurement is the obvious follow-up.
//
//   node scripts/map-perf-bench.mjs            # 100,500,1000,2000,5000
//   MAP_BENCH_COUNTS=1000,10000 node scripts/map-perf-bench.mjs
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const MAPLIBRE_JS = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const COUNTS = (process.env.MAP_BENCH_COUNTS ?? "100,500,1000,2000,5000").split(",").map(Number);
const CHROME = process.env.CHROME_EXECUTABLE_PATH ?? "/usr/bin/google-chrome";
const FRAMES = Number(process.env.MAP_BENCH_FRAMES ?? 180);

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<style>${MAPLIBRE_CSS} html,body,#map{margin:0;height:100vh;width:100vw;background:#0b1220}</style>
<script>${MAPLIBRE_JS}</script></head><body><div id="map"></div><script>
// A blank style: no basemap tiles, so the measurement isolates entity-symbol
// rendering rather than network tile fetches. Pessimistic in neither
// direction for the symbol question NFR 8.1 actually asks.
const map = new maplibregl.Map({
  container: 'map', center: [10, 59], zoom: 6, attributionControl: false,
  style: { version: 8, sources: {}, layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0b1220' } }
  ], glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf' }
});

function makeIcon(size, rgb) {
  const d = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) { d[i*4]=rgb[0]; d[i*4+1]=rgb[1]; d[i*4+2]=rgb[2]; d[i*4+3]=255; }
  return { width: size, height: size, data: d };
}

// Matches AFFILIATION_FRAME's shape set and the glyph ids entity-symbols.ts
// produces. Flat colour images stand in for the real SVG sprites — sprite
// *content* does not change symbol-layer draw cost, sprite *count* and
// overlap settings do, and both are preserved.
const FRAMES_ = ['frame-friendly','frame-hostile','frame-neutral','frame-unknown'];
const GLYPHS_ = ['glyph-air','glyph-ground','glyph-sea','glyph-unknown'];

// map.on('load') fires exactly once for the life of the map, so awaiting
// it on every call hangs every run after the first. Guard on map.loaded().
// (No backticks in this comment on purpose - it lives inside the PAGE
// template literal, and a backtick here terminates it.)
window.__bench = async function (count, frames) {
  if (!map.loaded()) await new Promise(r => map.once('load', r));
  for (const id of FRAMES_) if (!map.hasImage(id)) map.addImage(id, makeIcon(24,[255,255,255]), { sdf: true });
  for (const id of GLYPHS_) if (!map.hasImage(id)) map.addImage(id, makeIcon(16,[255,255,255]), { sdf: true });

  const features = [];
  for (let i = 0; i < count; i++) {
    features.push({ type:'Feature',
      geometry:{ type:'Point', coordinates:[ 8 + (i % 120) * 0.04, 58 + Math.floor(i/120) * 0.03 ] },
      properties:{
        entity_id:'e'+i,
        frame: FRAMES_[i % FRAMES_.length],
        glyph: GLYPHS_[i % GLYPHS_.length],
        color: ['#22c55e','#ef4444','#eab308','#9ca3af'][i % 4],
        label: 'TRK-' + i,
        rotation: (i * 7) % 360,
      }});
  }
  const data = { type:'FeatureCollection', features };

  if (map.getSource('entities')) {
    map.getSource('entities').setData(data);
  } else {
    map.addSource('entities', { type:'geojson', data });
    // ---- identical to entity-layer.tsx ----
    map.addLayer({ id:'entity-frames', type:'symbol', source:'entities',
      layout:{ 'icon-image':['get','frame'], 'icon-size':0.5,
               'icon-allow-overlap':true, 'icon-ignore-placement':true },
      paint:{ 'icon-color':['get','color'], 'icon-opacity':0.95 } });
    map.addLayer({ id:'entity-glyphs', type:'symbol', source:'entities',
      layout:{ 'icon-image':['get','glyph'], 'icon-size':0.34,
               'icon-rotate':['get','rotation'], 'icon-rotation-alignment':'map',
               'icon-allow-overlap':true, 'icon-ignore-placement':true } });
    map.addLayer({ id:'entity-labels', type:'symbol', source:'entities',
      layout:{ 'text-field':['get','label'], 'text-font':['Open Sans Semibold'],
               'text-size':11, 'text-offset':[0,1.3], 'text-anchor':'top',
               'text-allow-overlap':false, 'text-optional':true },
      paint:{ 'text-color':'#e5e7eb','text-halo-color':'#0b1220','text-halo-width':1.4 } });
  }
  // Same class of hazard: if the map is already idle when we attach, 'idle'
  // may not fire again. Nudge it, and never block the whole run on it.
  map.triggerRepaint();
  await new Promise(r => {
    const t = setTimeout(r, 10000);
    map.once('idle', () => { clearTimeout(t); r(); });
  });

  // Continuous pan+zoom forces a real re-render every frame; a static map
  // would idle at whatever the compositor feels like and report a
  // meaningless 60.
  const deltas = [];
  let last = performance.now();
  let n = 0;
  await new Promise(resolve => {
    function step(now) {
      deltas.push(now - last); last = now;
      const t = n / 60;
      map.jumpTo({ center: [10 + Math.sin(t) * 0.4, 59 + Math.cos(t) * 0.25], zoom: 6 + Math.sin(t/2) * 0.6 });
      if (++n >= frames) return resolve();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  const warm = deltas.slice(10);           // drop first frames: tile/sprite warmup
  const sorted = [...warm].sort((a,b)=>a-b);
  const mean = warm.reduce((a,b)=>a+b,0)/warm.length;
  const pct = p => sorted[Math.min(sorted.length-1, Math.ceil(p/100*sorted.length)-1)];
  return { count, meanMs:mean, meanFps:1000/mean, p95Ms:pct(95), p95Fps:1000/pct(95),
           worstMs:sorted[sorted.length-1], frames: warm.length };
};
</script></body></html>`;

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(PAGE);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: CHROME,
  // SwiftShader: this machine has no GPU exposed to headless Chrome, so
  // WebGL runs on a software rasteriser. Absolute FPS here is therefore a
  // FLOOR, not what real hardware gives. The SHAPE of the curve across
  // entity counts is the meaningful signal.
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url);

console.log(`NW-014 map render benchmark — ${FRAMES} frames per run, software WebGL\n`);
console.log("entities |  mean fps |   p95 fps |  worst frame | NFR 8.1 (>=60fps)");
console.log("---------+-----------+-----------+--------------+------------------");
const results = [];
for (const count of COUNTS) {
  const r = await page.evaluate(([c, f]) => window.__bench(c, f), [count, FRAMES]);
  results.push(r);
  const verdict = r.p95Fps >= 60 ? "PASS" : "FAIL";
  console.log(
    `${String(count).padStart(8)} | ${r.meanFps.toFixed(1).padStart(9)} | ${r.p95Fps.toFixed(1).padStart(9)} | ` +
    `${r.worstMs.toFixed(1).padStart(9)} ms | ${verdict}`,
  );
}
await browser.close();
server.close();

const at1000 = results.find((r) => r.count >= 1000);
if (at1000) {
  console.log(
    `\nNFR 8.1 target is >=60fps with 1,000+ tracks. At ${at1000.count}: ` +
      `${at1000.p95Fps.toFixed(1)} fps p95 (${at1000.p95Fps >= 60 ? "meets" : "misses"} it on software WebGL).`,
  );
}
