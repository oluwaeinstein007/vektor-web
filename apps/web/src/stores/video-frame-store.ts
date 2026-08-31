import { create } from "zustand";
import type { VideoFrameSocketEvent } from "@vektor/shared";

export interface VideoFrameState {
  frames: Map<string, VideoFrameSocketEvent>;
  upsertFrame: (frame: VideoFrameSocketEvent) => void;
}

export const useVideoFrameStore = create<VideoFrameState>((set) => ({
  frames: new Map(),
  upsertFrame: (frame) =>
    set((state) => {
      const next = new Map(state.frames);
      next.set(frame.sensor_id, frame);
      return { frames: next };
    }),
}));
