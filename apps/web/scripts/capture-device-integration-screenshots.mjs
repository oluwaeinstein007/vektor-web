// Screenshot evidence for the MAVLink bridge + real AIS feed device
// integrations, following the same pattern as capture-demo-screenshots.mjs
// (real headless Chrome via playwright-core, window.__vektorMap for exact
// zoom control). Both data sources (live Kystverket AIS feed, the
// synthetic-but-real-protocol MAVLink bridge) run continuously in the
// background while this captures, so fresh entity:new/updated socket
// emits keep arriving after this page connects — no reliance on replaying
// anything from before connection.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const OUT_DIR = "/home/hp/Desktop/Software Projects/VEKTOR/demo-screenshots";
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

async function shot(name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}` });
  console.log(`saved ${name}`);
}

await page.goto("http://localhost:3005", { waitUntil: "networkidle" });
await page.waitForTimeout(9000); // fallback basemap style's external vector tiles paint after networkidle

// --- MAVLink bridge: synthetic drone orbiting the SF Bay demo region ---
await page.evaluate(() => {
  window.__vektorMap.jumpTo({ center: [-122.4, 37.85], zoom: 10 });
});
await page.waitForTimeout(6000); // let a few live entity:updated emits land
await shot("08-mavlink-bridge-friendly-uas-track.png");

// --- Real AIS feed: live vessels off the Norwegian coast (Kystverket) ---
await page.evaluate(() => {
  window.__vektorMap.jumpTo({ center: [10, 63.5], zoom: 5 });
});
await page.waitForTimeout(6000);
await shot("09-real-ais-feed-norway-coast.png");

await browser.close();
console.log(`done — screenshots in ${OUT_DIR}`);
