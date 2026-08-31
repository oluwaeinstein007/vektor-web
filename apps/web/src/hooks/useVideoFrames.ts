"use client";

import { useEffect } from "react";
import { useVektorSocket } from "@/lib/socket-provider";
import { onValidated } from "@/lib/socket-client";
import { useVideoFrameStore } from "@/stores/video-frame-store";

/** Keeps useVideoFrameStore in sync with the throttled video:frame relay (RTSP/phone-camera sources — fusion-svc's videoFrameConsumer.ts). */
export function useVideoFrames(onInvalid?: (event: string, error: unknown) => void) {
  const socket = useVektorSocket();
  const upsertFrame = useVideoFrameStore((s) => s.upsertFrame);

  useEffect(() => {
    if (!socket) return;
    const unsubscribe = onValidated(socket, "video:frame", (frame) => upsertFrame(frame), onInvalid);
    return unsubscribe;
  }, [socket, upsertFrame, onInvalid]);
}
