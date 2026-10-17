import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceClock,
  clampToRange,
  rangeFraction,
  fractionToTs,
  stalenessOpacity,
  formatPlaybackClock,
  formatRangeLabel,
  snapshotIntervalMs,
  type TimeRange,
} from "../src/lib/playback.ts";
import { toTrackLine, toTrackPoints } from "../src/lib/track-geojson.ts";
import type { EntityHistoryPoint } from "@vektor/shared";

const RANGE: TimeRange = { from: 1_000_000, to: 2_000_000 };

test("advanceClock scales elapsed real time by the playback speed", () => {
  const { ts, ended } = advanceClock(1_000_000, RANGE, 10, 100);
  assert.equal(ts, 1_001_000); // 100ms of real time at 10x = 1s of scenario
  assert.equal(ended, false);
});

test("advanceClock pins at the end of the range and reports it ended", () => {
  // Without the `ended` flag the transport would sit at `to` with a play
  // button that looks like it is still running.
  const { ts, ended } = advanceClock(1_999_000, RANGE, 60, 1000);
  assert.equal(ts, RANGE.to);
  assert.equal(ended, true);
});

test("advanceClock does not run past the start when stepping backwards", () => {
  const { ts, ended } = advanceClock(1_000_500, RANGE, -10, 1000);
  assert.equal(ts, RANGE.from);
  assert.equal(ended, false);
});

test("clampToRange keeps a scrub inside the available window", () => {
  assert.equal(clampToRange(500_000, RANGE), RANGE.from);
  assert.equal(clampToRange(9_000_000, RANGE), RANGE.to);
  assert.equal(clampToRange(1_500_000, RANGE), 1_500_000);
});

test("clampToRange turns a non-finite scrub into the range start, not NaN", () => {
  assert.equal(clampToRange(Number.NaN, RANGE), RANGE.from);
});

test("rangeFraction and fractionToTs round-trip", () => {
  const ts = 1_250_000;
  assert.equal(rangeFraction(ts, RANGE), 0.25);
  assert.equal(fractionToTs(0.25, RANGE), ts);
});

test("rangeFraction returns 0 rather than NaN for a zero-width range", () => {
  // A deployment with a single instant of history. NaN here renders the
  // thumb at the far left and reads as a data bug rather than an empty one.
  assert.equal(rangeFraction(5, { from: 5, to: 5 }), 0);
});

test("rangeFraction clamps out-of-range timestamps to the ends", () => {
  assert.equal(rangeFraction(0, RANGE), 0);
  assert.equal(rangeFraction(9_000_000, RANGE), 1);
});

test("fractionToTs clamps a slider value outside 0..1", () => {
  assert.equal(fractionToTs(-3, RANGE), RANGE.from);
  assert.equal(fractionToTs(42, RANGE), RANGE.to);
});

test("stalenessOpacity is fully opaque for a fresh observation", () => {
  assert.equal(stalenessOpacity(0), 1);
  assert.equal(stalenessOpacity(30), 1);
});

test("stalenessOpacity fades with age but never reaches zero", () => {
  const mid = stalenessOpacity(165); // midway between fadeStart 30 and max 300
  assert.ok(mid > 0.25 && mid < 1, `expected a partial fade, got ${mid}`);
  assert.equal(stalenessOpacity(300), 0.25);
  // An invisible track that is still in the data is worse than a faint
  // one: the operator cannot tell "stale" from "gone".
  assert.equal(stalenessOpacity(100_000), 0.25);
});

test("formatPlaybackClock renders UTC with an explicit Z", () => {
  assert.equal(formatPlaybackClock(Date.parse("2026-10-16T14:12:33.000Z")), "14:12:33Z");
  assert.equal(formatPlaybackClock(Number.NaN), "--:--:--Z");
});

test("formatRangeLabel renders a full UTC stamp", () => {
  assert.equal(formatRangeLabel(Date.parse("2026-10-16T14:12:33.000Z")), "2026-10-16 14:12:33Z");
  assert.equal(formatRangeLabel(Number.NaN), "—");
});

test("snapshotIntervalMs backs off the request rate as speed rises", () => {
  // The point is a roughly flat request count regardless of speed: faster
  // playback covers more scenario time per request.
  assert.equal(snapshotIntervalMs(1), 1000);
  assert.equal(snapshotIntervalMs(5), 500);
  assert.equal(snapshotIntervalMs(60), 250);
});

function point(ts: string, lon: number, lat: number): EntityHistoryPoint {
  return { ts, lon, lat, alt_m: 0, speed_kmh: 12, heading_deg: 90, confidence: 0.8 };
}

const TRACK = [
  point("2026-10-16T14:00:00.000Z", 4.0, 52.0),
  point("2026-10-16T14:01:00.000Z", 4.1, 52.0),
  point("2026-10-16T14:02:00.000Z", 4.2, 52.0),
];

test("toTrackLine emits one segment per consecutive pair, not one whole-track feature", () => {
  // One feature could only be all-played or all-unplayed, so the scrub head
  // would have nothing to fade against.
  const fc = toTrackLine(TRACK, "#ef4444");
  assert.equal(fc.features.length, 2);
  assert.deepEqual(fc.features[0]!.geometry.coordinates, [[4.0, 52.0], [4.1, 52.0]]);
});

test("toTrackLine stamps each segment with its LATER endpoint's time", () => {
  // A segment must not read as complete before the entity finished
  // traversing it.
  const fc = toTrackLine(TRACK, "#ef4444");
  assert.equal(fc.features[0]!.properties!.ts, Date.parse("2026-10-16T14:01:00.000Z"));
  assert.equal(fc.features[1]!.properties!.ts, Date.parse("2026-10-16T14:02:00.000Z"));
});

test("toTrackLine produces no segments for a track of fewer than two points", () => {
  assert.equal(toTrackLine([], "#fff").features.length, 0);
  assert.equal(toTrackLine([TRACK[0]!], "#fff").features.length, 0);
});

test("toTrackPoints keeps every real observation, so coverage gaps stay visible", () => {
  const fc = toTrackPoints(TRACK, "#ef4444");
  assert.equal(fc.features.length, 3);
  assert.deepEqual(fc.features[2]!.geometry.coordinates, [4.2, 52.0]);
  assert.equal(fc.features[2]!.properties!.speed_kmh, 12);
});
