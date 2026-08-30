// The Battery Status API was pulled from most browsers' default DOM lib
// types (and restricted/removed in several browsers entirely) over
// fingerprinting concerns — Chrome on Android still exposes
// navigator.getBattery(), just with no shipped TS type for it. Feature-
// detect via a loose cast and degrade to null (a valid, nullable field on
// FieldTelemetryBody) everywhere this isn't available.
interface BatteryManagerLike {
  level: number;
  addEventListener: (type: "levelchange", listener: () => void) => void;
  removeEventListener: (type: "levelchange", listener: () => void) => void;
}

export interface BatteryWatchHandle {
  stop: () => void;
}

export async function watchBatteryLevel(onReading: (batteryPct: number | null) => void): Promise<BatteryWatchHandle> {
  // Call through `nav` (not a destructured standalone reference) — getBattery
  // is a native method that requires `this === navigator`; destructuring it
  // into its own variable and calling that loses the binding and throws
  // "Illegal invocation" at call time, not at the typeof check above.
  const nav = navigator as unknown as { getBattery?: () => Promise<BatteryManagerLike> };
  if (typeof nav.getBattery !== "function") {
    onReading(null);
    return { stop: () => {} };
  }

  const battery = await nav.getBattery();
  const report = () => onReading(Math.round(battery.level * 100));
  report();
  battery.addEventListener("levelchange", report);
  return { stop: () => battery.removeEventListener("levelchange", report) };
}
