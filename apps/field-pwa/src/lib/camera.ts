// Fallback camera capture: getUserMedia() + periodic canvas snapshot, no
// RTSP app required. This is a secondary capture mode, not the recommended
// one — mobile browsers throttle camera access hard once a tab backgrounds
// or the screen locks, so continuous monitoring is better served by a real
// RTSP source (e.g. IP Webcam) into ingest-svc's RTSP adapter, which also
// feeds cv-inference-svc for real detection. This exists for the "no extra
// app, quick check" case, POSTing periodic snapshots that land on the same
// video.frame topic (see ingest-svc's field/snapshot route) so they show up
// in the same dashboard camera panel either way.
export type CameraStatus = "idle" | "starting" | "streaming" | "denied" | "unsupported" | "error";

export interface CameraHandle {
  stop: () => void;
}

export async function startCameraPreview(
  videoEl: HTMLVideoElement,
  onStatus: (status: CameraStatus) => void,
): Promise<CameraHandle> {
  if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
    onStatus("unsupported");
    return { stop: () => {} };
  }

  onStatus("starting");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch (err) {
    onStatus(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error");
    return { stop: () => {} };
  }

  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {}); // autoplay can reject before a user gesture on some browsers; onStatus below still reflects reality
  onStatus("streaming");

  return {
    stop: () => {
      for (const track of stream.getTracks()) track.stop();
      videoEl.srcObject = null;
    },
  };
}

/** Draws the video element's current frame to an offscreen canvas and encodes it as JPEG. Returns null if the video has no frame yet (e.g. still starting). */
export function captureSnapshotBlob(videoEl: HTMLVideoElement, quality = 0.8): Promise<Blob | null> {
  if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return Promise.resolve(null);

  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
}
