// Description: Decides when map Page discovery should trust and refresh a location fix.
export type MapDiscoveryCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapDiscoveryLocationSource = 'persisted' | 'profile' | 'gps';

export const DISCOVERY_LOCATION_MAX_ACCURACY_METERS = 250;
export const DISCOVERY_PERSISTED_MAX_AGE_MS = 3 * 60 * 1000;
export const DISCOVERY_RELOAD_DISTANCE_METERS = 900;
export const DISCOVERY_RELOAD_MIN_INTERVAL_MS = 12 * 1000;

function isValidCoordinate(coordinate: MapDiscoveryCoordinate) {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180 &&
    !(coordinate.latitude === 0 && coordinate.longitude === 0)
  );
}

export function isDiscoveryLocationAccuracyAcceptable(accuracy?: number) {
  const numericAccuracy = Number(accuracy);
  return (
    !Number.isFinite(numericAccuracy) ||
    numericAccuracy <= DISCOVERY_LOCATION_MAX_ACCURACY_METERS
  );
}

export function isPersistedDiscoveryLocationFresh(
  location:
    | (MapDiscoveryCoordinate & { accuracy?: number; timestamp: number })
    | null
    | undefined,
  now = Date.now(),
) {
  if (!location || !isValidCoordinate(location)) return false;
  if (!isDiscoveryLocationAccuracyAcceptable(location.accuracy)) return false;

  const ageMs = now - Number(location.timestamp);
  return (
    Number.isFinite(ageMs) &&
    ageMs >= 0 &&
    ageMs <= DISCOVERY_PERSISTED_MAX_AGE_MS
  );
}

export function mapDiscoveryDistanceMeters(
  left: MapDiscoveryCoordinate,
  right: MapDiscoveryCoordinate,
) {
  const earthRadius = 6371000;
  const latFrom = (left.latitude * Math.PI) / 180;
  const lngFrom = (left.longitude * Math.PI) / 180;
  const latTo = (right.latitude * Math.PI) / 180;
  const lngTo = (right.longitude * Math.PI) / 180;
  const latDelta = latTo - latFrom;
  const lngDelta = lngTo - lngFrom;
  const angle =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(latDelta / 2) ** 2 +
          Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2,
      ),
    );
  return earthRadius * angle;
}

export function shouldReloadNearbyPages(input: {
  currentOrigin: MapDiscoveryCoordinate | null;
  currentSource: MapDiscoveryLocationSource | null;
  nextOrigin: MapDiscoveryCoordinate;
  nextSource: MapDiscoveryLocationSource;
  nextAccuracy?: number;
  lastLoadedAt: number;
  now?: number;
  force?: boolean;
}) {
  if (!isValidCoordinate(input.nextOrigin)) return false;
  if (!isDiscoveryLocationAccuracyAcceptable(input.nextAccuracy)) return false;
  if (input.force || !input.currentOrigin) return true;

  // The cached/profile coordinate is only a fast visual fallback. The first
  // accurate GPS fix must replace its Page dataset immediately.
  if (input.nextSource === 'gps' && input.currentSource !== 'gps') return true;

  const movedMeters = mapDiscoveryDistanceMeters(
    input.currentOrigin,
    input.nextOrigin,
  );
  if (movedMeters < DISCOVERY_RELOAD_DISTANCE_METERS) return false;

  const now = input.now ?? Date.now();
  return now - input.lastLoadedAt >= DISCOVERY_RELOAD_MIN_INTERVAL_MS;
}
