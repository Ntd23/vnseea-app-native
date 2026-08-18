// Description: Decides when map Page discovery should trust and refresh a location fix.
export type MapDiscoveryCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapDiscoveryRegion = MapDiscoveryCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapDiscoveryViewport = MapDiscoveryCoordinate & {
  radiusKm: number;
};

export type MapDiscoveryLocationSource =
  | 'persisted'
  | 'profile'
  | 'gps'
  | 'viewport';

export const DISCOVERY_LOCATION_MAX_ACCURACY_METERS = 250;
export const DISCOVERY_PERSISTED_MAX_AGE_MS = 3 * 60 * 1000;
export const DISCOVERY_RELOAD_DISTANCE_METERS = 900;
export const DISCOVERY_RELOAD_MIN_INTERVAL_MS = 12 * 1000;
export const DISCOVERY_VIEWPORT_MIN_RADIUS_KM = 3;
export const DISCOVERY_VIEWPORT_MAX_RADIUS_KM = 50;
export const DISCOVERY_VIEWPORT_RELOAD_DISTANCE_METERS = 350;
export const DISCOVERY_VIEWPORT_RELOAD_MIN_INTERVAL_MS = 600;

const DISCOVERY_VIEWPORT_RADIUS_BUFFER = 1.15;
const DISCOVERY_VIEWPORT_RADIUS_CHANGE_RATIO = 0.2;
const DISCOVERY_VIEWPORT_MIN_RADIUS_CHANGE_KM = 0.75;

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

export function mapDiscoveryRadiusKmForRegion(region: MapDiscoveryRegion) {
  if (!isValidCoordinate(region)) {
    return DISCOVERY_VIEWPORT_MIN_RADIUS_KM;
  }

  const latitudeDelta = Math.abs(Number(region.latitudeDelta));
  const longitudeDelta = Math.abs(Number(region.longitudeDelta));
  if (!Number.isFinite(latitudeDelta) || !Number.isFinite(longitudeDelta)) {
    return DISCOVERY_VIEWPORT_MIN_RADIUS_KM;
  }

  const corner = {
    latitude: Math.max(
      -90,
      Math.min(90, region.latitude + Math.min(latitudeDelta / 2, 180)),
    ),
    longitude: Math.max(
      -180,
      Math.min(180, region.longitude + Math.min(longitudeDelta / 2, 360)),
    ),
  };
  const bufferedRadiusKm =
    (mapDiscoveryDistanceMeters(region, corner) / 1000) *
    DISCOVERY_VIEWPORT_RADIUS_BUFFER;
  const boundedRadiusKm = Math.max(
    DISCOVERY_VIEWPORT_MIN_RADIUS_KM,
    Math.min(DISCOVERY_VIEWPORT_MAX_RADIUS_KM, bufferedRadiusKm),
  );

  // Stable request radii improve both the client cache hit rate and the
  // backend's short-lived Page discovery cache while the map settles.
  return Number(boundedRadiusKm.toFixed(1));
}

export function shouldReloadViewportPages(input: {
  currentViewport: MapDiscoveryViewport | null;
  nextViewport: MapDiscoveryViewport;
  lastLoadedAt: number;
  now?: number;
}) {
  if (!isValidCoordinate(input.nextViewport)) return false;
  if (
    !Number.isFinite(input.nextViewport.radiusKm) ||
    input.nextViewport.radiusKm <= 0
  ) {
    return false;
  }
  if (!input.currentViewport) return true;

  const movedMeters = mapDiscoveryDistanceMeters(
    input.currentViewport,
    input.nextViewport,
  );
  const radiusChangeKm = Math.abs(
    input.nextViewport.radiusKm - input.currentViewport.radiusKm,
  );
  const meaningfulRadiusChangeKm = Math.max(
    DISCOVERY_VIEWPORT_MIN_RADIUS_CHANGE_KM,
    input.currentViewport.radiusKm * DISCOVERY_VIEWPORT_RADIUS_CHANGE_RATIO,
  );
  if (
    movedMeters < DISCOVERY_VIEWPORT_RELOAD_DISTANCE_METERS &&
    radiusChangeKm < meaningfulRadiusChangeKm
  ) {
    return false;
  }

  const now = input.now ?? Date.now();
  return now - input.lastLoadedAt >= DISCOVERY_VIEWPORT_RELOAD_MIN_INTERVAL_MS;
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
