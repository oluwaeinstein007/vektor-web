"use client";

import { useMemo } from "react";
import type { Entity } from "@vektor/shared";
import { useEntityStore } from "@/stores/entity-store";
import { usePlaybackStore, snapshotEntryToEntity } from "@/stores/playback-store";

/**
 * NW-018 — the single place that decides whether the map is drawing live
 * entities or a historical snapshot.
 *
 * EntityLayer reads this instead of useEntityStore directly, so adding
 * playback did not require the layer to learn anything about playback. The
 * live store keeps accumulating socket events throughout, untouched — see
 * playback-store.ts for why that matters.
 */
export function useDisplayedEntities(): Map<string, Entity> {
  const live = useEntityStore((s) => s.entities);
  const mode = usePlaybackStore((s) => s.mode);
  const snapshot = usePlaybackStore((s) => s.snapshot);

  return useMemo(() => {
    if (mode === "live") return live;
    const widened = new Map<string, Entity>();
    for (const [id, entry] of snapshot) widened.set(id, snapshotEntryToEntity(entry));
    return widened;
  }, [mode, live, snapshot]);
}
