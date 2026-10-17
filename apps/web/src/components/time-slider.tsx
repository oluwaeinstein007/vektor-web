"use client";

import { useEffect, useState } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { fetchHistoryCoverage, HistoryUnavailableError } from "@/lib/history-client";
import {
  PLAYBACK_SPEEDS,
  formatPlaybackClock,
  formatRangeLabel,
  fractionToTs,
  rangeFraction,
} from "@/lib/playback";

/**
 * NW-018 — the playback transport: LIVE/HISTORICAL toggle, scrub bar,
 * play/pause and speed.
 *
 * Anchored across the bottom of the map rather than in a HudPanel: the
 * slider needs the full width to be scrubbable at any useful precision, and
 * a 24h window inside a 200px panel gives roughly 7 minutes per pixel.
 */
export function TimeSlider() {
  const mode = usePlaybackStore((s) => s.mode);
  const range = usePlaybackStore((s) => s.range);
  const currentTs = usePlaybackStore((s) => s.currentTs);
  const playing = usePlaybackStore((s) => s.playing);
  const speed = usePlaybackStore((s) => s.speed);
  const error = usePlaybackStore((s) => s.error);
  const enterHistorical = usePlaybackStore((s) => s.enterHistorical);
  const returnToLive = usePlaybackStore((s) => s.returnToLive);
  const setCurrentTs = usePlaybackStore((s) => s.setCurrentTs);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const setError = usePlaybackStore((s) => s.setError);

  const [checking, setChecking] = useState(false);

  async function onEnterHistorical() {
    setChecking(true);
    try {
      const coverage = await fetchHistoryCoverage();
      if (!coverage.earliest || !coverage.latest || coverage.point_count === 0) {
        // An empty history is not an error — a freshly deployed system has
        // none yet. Saying so is more useful than an empty slider the
        // operator assumes is broken.
        setError("No history recorded yet on this deployment.");
        return;
      }
      enterHistorical({ from: Date.parse(coverage.earliest), to: Date.parse(coverage.latest) });
    } catch (e: unknown) {
      setError(
        e instanceof HistoryUnavailableError
          ? e.message
          : `Could not read history coverage: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setChecking(false);
    }
  }

  // Space toggles play/pause, arrows step. Standard transport keys — an
  // operator scrubbing a timeline should not have to go back to the mouse
  // for every pause. Ignored while focus is in a text field so typing in
  // the search box does not start playback.
  useEffect(() => {
    if (mode !== "historical" || !range) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!range) return;

      if (event.code === "Space") {
        event.preventDefault();
        setPlaying(!usePlaybackStore.getState().playing);
      } else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        const step = (range.to - range.from) / 200;
        setCurrentTs(usePlaybackStore.getState().currentTs + (event.code === "ArrowRight" ? step : -step));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, range, setPlaying, setCurrentTs]);

  if (mode === "live") {
    return (
      <div style={BAR_STYLE}>
        <span style={{ ...PILL_STYLE, background: "#16a34a22", borderColor: "#16a34a", color: "#4ade80" }}>
          ● LIVE
        </span>
        <button type="button" onClick={onEnterHistorical} disabled={checking} style={BUTTON_STYLE}>
          {checking ? "CHECKING…" : "HISTORICAL PLAYBACK"}
        </button>
        {error && <span style={ERROR_STYLE}>{error}</span>}
      </div>
    );
  }

  const fraction = range ? rangeFraction(currentTs, range) : 0;

  return (
    <div style={BAR_STYLE}>
      <button type="button" onClick={returnToLive} style={{ ...BUTTON_STYLE, borderColor: "#16a34a", color: "#4ade80" }}>
        ← LIVE
      </button>

      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? "Pause playback" : "Play"}
        style={{ ...BUTTON_STYLE, minWidth: 44 }}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <span style={{ ...PILL_STYLE, fontVariantNumeric: "tabular-nums", minWidth: 92 }}>
        {formatPlaybackClock(currentTs)}
      </span>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 180 }}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.0001}
          value={fraction}
          onChange={(e) => range && setCurrentTs(fractionToTs(Number(e.target.value), range))}
          aria-label="Playback position"
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.6 }}>
          <span>{range ? formatRangeLabel(range.from) : "—"}</span>
          <span>{range ? formatRangeLabel(range.to) : "—"}</span>
        </div>
      </div>

      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        aria-label="Playback speed"
        style={{ ...BUTTON_STYLE, cursor: "pointer" }}
      >
        {PLAYBACK_SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>

      {error && <span style={ERROR_STYLE}>{error}</span>}
    </div>
  );
}

const BAR_STYLE: React.CSSProperties = {
  position: "absolute",
  left: 12,
  right: 12,
  bottom: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  padding: "8px 12px",
  background: "#0b1220e6",
  border: "1px solid #1e293b",
  borderRadius: 6,
  color: "#e5e7eb",
  font: "11px ui-monospace, SFMono-Regular, Menlo, monospace",
  letterSpacing: "0.04em",
  zIndex: 5,
};

const BUTTON_STYLE: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #334155",
  borderRadius: 4,
  color: "#e5e7eb",
  padding: "6px 10px",
  font: "inherit",
  cursor: "pointer",
  minHeight: 32,
};

const PILL_STYLE: React.CSSProperties = {
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "6px 10px",
  whiteSpace: "nowrap",
};

const ERROR_STYLE: React.CSSProperties = {
  color: "#fca5a5",
  flexBasis: "100%",
};
