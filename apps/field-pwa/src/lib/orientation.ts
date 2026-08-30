export interface OrientationReading {
  headingDeg: number | null; // clockwise from north, best-effort — see note below
  pitchDeg: number | null;
  rollDeg: number | null;
}

export type OrientationStatus = "idle" | "listening" | "denied" | "unsupported";

export interface OrientationWatchHandle {
  stop: () => void;
}

// Android Chrome fires DeviceOrientationEvent directly once the page is a
// secure context — no explicit permission-prompt call needed, unlike iOS
// Safari 13+'s DeviceOrientationEvent.requestPermission(). Feature-detect
// that call defensively so this still works if this app is ever opened on
// an iPhone, without it being required on Android (the Tecno Camon 40 Pro
// this was built against).
export async function watchOrientation(
  onReading: (reading: OrientationReading) => void,
  onStatus: (status: OrientationStatus) => void,
): Promise<OrientationWatchHandle> {
  if (typeof DeviceOrientationEvent === "undefined") {
    onStatus("unsupported");
    return { stop: () => {} };
  }

  const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> })
    .requestPermission;
  if (typeof requestPermission === "function") {
    try {
      const result = await requestPermission();
      if (result !== "granted") {
        onStatus("denied");
        return { stop: () => {} };
      }
    } catch {
      onStatus("denied");
      return { stop: () => {} };
    }
  }

  const handler = (event: DeviceOrientationEvent) => {
    onStatus("listening");
    onReading({
      // `alpha` is degrees counter-clockwise from the device's arbitrary
      // starting orientation, not a true compass heading, unless the
      // browser fires `deviceorientationabsolute`/exposes
      // webkitCompassHeading (iOS-only) — this is a best-effort relative
      // heading, good enough to show something moving on the dashboard,
      // not a calibrated compass.
      headingDeg: event.alpha === null ? null : (360 - event.alpha) % 360,
      pitchDeg: event.beta,
      rollDeg: event.gamma,
    });
  };

  window.addEventListener("deviceorientation", handler);
  onStatus("listening");
  return { stop: () => window.removeEventListener("deviceorientation", handler) };
}
