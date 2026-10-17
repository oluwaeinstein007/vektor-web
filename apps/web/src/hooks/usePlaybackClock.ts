"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { usePlaybackStore } from "@/stores/playback-store";
import { advanceClock, snapshotIntervalMs } from "@/lib/playback";
import { fetchSnapshotAt, HistoryUnavailableError } from "@/lib/history-client";

/**
 * NW-018 — drives the playback clock and keeps the snapshot in step with it.
 *
 * Two separate rates, deliberately:
 *   - the clock advances every animation frame, so the readout and the
 *     track's played/unplayed split move smoothly;
 *   - the snapshot is re-queried at most every snapshotIntervalMs, because
 *     a request per frame at 60× would be ~3,600 requests a minute against
 *     a service that has to hit Postgres for each one.
 *
 * Driven by requestAnimationFrame rather than setInterval so playback stops
 * when the tab is backgrounded instead of accumulating a backlog of ticks
 * and jumping forward when the operator returns.
 */
export function usePlaybackClock(map: MapLibreMap | null) {
  const mode = usePlaybackStore((s) => s.mode);
  const playing = usePlaybackStore((s) => s.playing);
  const speed = usePlaybackStore((s) => s.speed);
  const range = usePlaybackStore((s) => s.range);
  const currentTs = usePlaybackStore((s) => s.currentTs);
  const setCurrentTs = usePlaybackStore((s) => s.setCurrentTs);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const setSnapshot = usePlaybackStore((s) => s.setSnapshot);
  const setError = usePlaybackStore((s) => s.setError);

  const lastSnapshotAt = useRef(0);
  const inFlight = useRef(false);

  // The clock. Reads/writes the store rather than holding its own state so
  // a slider drag and the running clock cannot disagree about the time.
  useEffect(() => {
    if (mode !== "historical" || !playing || !range) return;

    let frame = 0;
    let previous = performance.now();

    const step = (now: number) => {
      const elapsed = now - previous;
      previous = now;

      const { ts, ended } = advanceClock(usePlaybackStore.getState().currentTs, range, speed, elapsed);
      setCurrentTs(ts);
      if (ended) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [mode, playing, speed, range, setCurrentTs, setPlaying]);

  // The snapshot, rate-limited and viewport-scoped.
  useEffect(() => {
    if (mode !== "historical" || !Number.isFinite(currentTs) || currentTs === 0) return;

    const minInterval = playing ? snapshotIntervalMs(speed) : 0;
    const now = performance.now();
    if (inFlight.current) return;
    if (minInterval > 0 && now - lastSnapshotAt.current < minInterval) return;

    lastSnapshotAt.current = now;
    inFlight.current = true;

    // Scoped to what is actually on screen, so scrubbing a map showing one
    // harbour does not pull every entity on earth for that instant.
    const bounds = map?.getBounds();
    const bbox = bounds
      ? ([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [
          number,
          number,
          number,
          number,
        ])
      : undefined;

    fetchSnapshotAt(new Date(currentTs), bbox)
      .then((response) => setSnapshot(response.entities))
      .catch((error: unknown) => {
        setError(
          error instanceof HistoryUnavailableError
            ? error.message
            : `Could not load snapshot: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [mode, currentTs, playing, speed, map, setSnapshot, setError]);
}
