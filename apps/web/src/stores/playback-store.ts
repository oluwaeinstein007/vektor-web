import { create } from "zustand";
import type { Entity, EntitySnapshotEntry } from "@vektor/shared";
import { clampToRange, type TimeRange } from "@/lib/playback";

/**
 * NW-018 — whether the map is showing live traffic or a moment in the past,
 * and which moment.
 *
 * Kept separate from useEntityStore on purpose. The live store is fed by
 * the socket and must keep accumulating entity:new/updated/lost the whole
 * time the operator is scrubbing — otherwise returning to live shows a map
 * frozen at whatever arrived before they started, with no way to tell how
 * much was missed. Historical state is therefore a parallel view, never a
 * mutation of the live one.
 */

export type PlaybackMode = "live" | "historical";

export interface PlaybackState {
  mode: PlaybackMode;
  /** Scrub position, epoch ms. Meaningless while mode === "live". */
  currentTs: number;
  /** What history actually exists; null until coverage has been fetched. */
  range: TimeRange | null;
  playing: boolean;
  speed: number;
  /** Last snapshot fetched for `currentTs`, keyed by entity_id. */
  snapshot: Map<string, EntitySnapshotEntry>;
  /** Entity whose full track line is drawn, if any. */
  selectedEntityId: string | null;
  loading: boolean;
  /** Set when the deployment has no history API, or a query failed. */
  error: string | null;

  enterHistorical: (range: TimeRange, startTs?: number) => void;
  returnToLive: () => void;
  setCurrentTs: (ts: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setSnapshot: (entries: EntitySnapshotEntry[]) => void;
  selectEntity: (entityId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  mode: "live",
  currentTs: 0,
  range: null,
  playing: false,
  speed: 1,
  snapshot: new Map(),
  selectedEntityId: null,
  loading: false,
  error: null,

  enterHistorical: (range, startTs) =>
    set({
      mode: "historical",
      range,
      // Default to the START of the window, not the end: entering playback
      // at `to` puts the operator at a scrub position indistinguishable
      // from live, with a play button that immediately reports "ended".
      currentTs: clampToRange(startTs ?? range.from, range),
      playing: false,
      error: null,
    }),

  returnToLive: () =>
    set({
      mode: "live",
      playing: false,
      // Snapshot and selection are dropped: they describe a past instant
      // and keeping them would leave stale historical tracks drawn over a
      // live map.
      snapshot: new Map(),
      selectedEntityId: null,
      error: null,
    }),

  setCurrentTs: (ts) =>
    set((state) => ({ currentTs: state.range ? clampToRange(ts, state.range) : ts })),

  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),

  setSnapshot: (entries) =>
    set({ snapshot: new Map(entries.map((entry) => [entry.entity_id, entry])) }),

  selectEntity: (entityId) => set({ selectedEntityId: entityId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));

/**
 * A snapshot entry carries everything the map symbology reads (position,
 * kinematics, affiliation, classification, confidence) but is not a full
 * `Entity` — it deliberately omits metadata and source_sensors, which a
 * track of thousands of points has no reason to repeat.
 *
 * The map layer wants one shape, so widen here, in one place, with the
 * omitted fields filled by explicit empty values rather than by casting.
 * A cast would compile and then throw the first time the layer read
 * `metadata.no_strike` on a historical track.
 */
export function snapshotEntryToEntity(entry: EntitySnapshotEntry): Entity {
  return {
    entity_id: entry.entity_id,
    classification: entry.classification,
    confidence: entry.confidence,
    status: entry.status,
    affiliation: entry.affiliation,
    source_sensors: [],
    position: entry.position,
    kinematics: entry.kinematics,
    metadata: { tags: [], analyst_notes: "", no_strike: false },
    first_detected: entry.observed_at,
    last_updated: entry.observed_at,
  };
}
