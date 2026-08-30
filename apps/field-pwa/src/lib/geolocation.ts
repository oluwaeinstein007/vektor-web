export interface GeoReading {
  lat: number;
  lon: number;
  altM: number | null;
  accuracyM: number | null;
  timestampMs: number;
}

export type GeoStatus = "idle" | "locating" | "locked" | "denied" | "unsupported";

export interface GeoWatchHandle {
  stop: () => void;
}

export function watchGeoPosition(onReading: (reading: GeoReading) => void, onStatus: (status: GeoStatus) => void): GeoWatchHandle {
  if (!("geolocation" in navigator)) {
    onStatus("unsupported");
    return { stop: () => {} };
  }

  onStatus("locating");
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onStatus("locked");
      onReading({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        altM: position.coords.altitude,
        accuracyM: position.coords.accuracy,
        timestampMs: position.timestamp,
      });
    },
    (error) => {
      onStatus(error.code === error.PERMISSION_DENIED ? "denied" : "locating");
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
  );

  return { stop: () => navigator.geolocation.clearWatch(watchId) };
}
