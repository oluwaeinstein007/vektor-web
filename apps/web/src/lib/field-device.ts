const DEVICE_ID_KEY = "vektor.fieldDeviceId";
const DEVICE_KEY_KEY = "vektor.fieldDeviceKey";

export function getFieldDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `phone-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function setFieldDeviceId(id: string): void {
  window.localStorage.setItem(DEVICE_ID_KEY, id);
}

export function getFieldDeviceKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(DEVICE_KEY_KEY) ?? "";
}

export function setFieldDeviceKey(key: string): void {
  window.localStorage.setItem(DEVICE_KEY_KEY, key);
}
