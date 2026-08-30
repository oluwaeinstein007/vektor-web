const DEVICE_ID_KEY = "vektor.fieldDeviceId";
const DEVICE_SHARED_KEY = "vektor.fieldDeviceKey";

/** A stable per-install identifier — becomes IotTelemetryEvent.sensor_id server-side. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceKey(): string {
  return localStorage.getItem(DEVICE_SHARED_KEY) ?? "";
}

export function setDeviceKey(key: string): void {
  localStorage.setItem(DEVICE_SHARED_KEY, key);
}
