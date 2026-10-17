/**
 * NW-018 — playback clock maths, kept pure and separate from React so it
 * can be tested with `node --test` like entity-geojson.ts. Everything here
 * is a function of its arguments; nothing reads a store or a timer.
 */

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 5, 10, 30, 60] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface TimeRange {
  /** epoch ms */
  from: number;
  /** epoch ms */
  to: number;
}

/**
 * Advance the playback clock by `elapsedMs` of real time at `speed`×.
 *
 * Returns `ended: true` when the clock reaches the end of the range, so the
 * caller stops the transport rather than silently pinning at `to` and
 * leaving a play button that looks like it is still running.
 */
export function advanceClock(
  currentTs: number,
  range: TimeRange,
  speed: number,
  elapsedMs: number,
): { ts: number; ended: boolean } {
  const next = currentTs + elapsedMs * speed;
  if (next >= range.to) return { ts: range.to, ended: true };
  if (next < range.from) return { ts: range.from, ended: false };
  return { ts: next, ended: false };
}

/** Clamp an arbitrary timestamp (a slider drag) into the available range. */
export function clampToRange(ts: number, range: TimeRange): number {
  if (!Number.isFinite(ts)) return range.from;
  return Math.min(range.to, Math.max(range.from, ts));
}

/**
 * Position within the range as 0..1, for the slider thumb. A zero-width
 * range (a deployment with a single instant of history) returns 0 rather
 * than NaN — NaN here silently renders the thumb at the far left and looks
 * like a data bug rather than an empty-range one.
 */
export function rangeFraction(ts: number, range: TimeRange): number {
  const span = range.to - range.from;
  if (span <= 0) return 0;
  return (clampToRange(ts, range) - range.from) / span;
}

/** Inverse of rangeFraction — slider thumb back to a timestamp. */
export function fractionToTs(fraction: number, range: TimeRange): number {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return range.from + f * (range.to - range.from);
}

/**
 * How transparent a track should be, given how stale its last observation
 * is. A snapshot shows each entity's last known state at or before the
 * scrub instant, which means an entity last seen 4 minutes ago is drawn at
 * a position it may well have left. Fading it is the difference between
 * "here is where it was" and an implied "here is where it is".
 *
 * Fully opaque until `fadeStartS`, then linear down to `minOpacity` at
 * `maxStalenessS`. Never returns 0: an invisible track that is still in the
 * data is worse than a faint one, because the operator cannot tell the
 * difference between "stale" and "gone".
 */
export function stalenessOpacity(
  stalenessS: number,
  { fadeStartS = 30, maxStalenessS = 300, minOpacity = 0.25 } = {},
): number {
  if (!Number.isFinite(stalenessS) || stalenessS <= fadeStartS) return 1;
  if (stalenessS >= maxStalenessS) return minOpacity;
  const t = (stalenessS - fadeStartS) / (maxStalenessS - fadeStartS);
  return 1 - t * (1 - minOpacity);
}

/**
 * Clock readout for the transport bar. Always UTC with an explicit "Z":
 * every timestamp crossing the wire in this system is UTC, and a playback
 * clock silently rendered in the operator's local timezone is how two
 * people on the same incident end up disagreeing about when something
 * happened.
 */
export function formatPlaybackClock(ts: number): string {
  if (!Number.isFinite(ts)) return "--:--:--Z";
  return `${new Date(ts).toISOString().slice(11, 19)}Z`;
}

/** Full UTC stamp for the range endpoints under the slider. */
export function formatRangeLabel(ts: number): string {
  if (!Number.isFinite(ts)) return "—";
  return new Date(ts).toISOString().slice(0, 19).replace("T", " ") + "Z";
}

/**
 * How often to re-query the snapshot while playing. Scrubbing at 60× would
 * otherwise fire a request per animation frame and flood the service; this
 * caps the request rate while keeping the visible motion smooth, because
 * the clock itself still advances every frame.
 *
 * Faster speeds get a slightly longer interval in wall-clock terms but
 * cover more scenario time per request, which is the tradeoff that keeps
 * the request count roughly flat regardless of speed.
 */
export function snapshotIntervalMs(speed: number): number {
  if (speed <= 1) return 1000;
  if (speed <= 5) return 500;
  return 250;
}
