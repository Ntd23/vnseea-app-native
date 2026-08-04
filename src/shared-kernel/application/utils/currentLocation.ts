// Description: Reads the device's current location for lightweight message sharing.
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export type CurrentDeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  provider?: string;
  timestamp?: number;
};

export type LocationAccessErrorCode =
  | 'permission_denied'
  | 'services_disabled'
  | 'timeout'
  | 'unavailable'
  | 'failed';

export class LocationAccessError extends Error {
  readonly code: LocationAccessErrorCode;

  constructor(code: LocationAccessErrorCode, message: string) {
    super(message);
    this.name = 'LocationAccessError';
    this.code = code;
  }
}

export function isLocationAccessError(
  error: unknown,
): error is LocationAccessError {
  return error instanceof LocationAccessError;
}

function readNativeErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code ?? '').trim();
}

function readErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Không lấy được vị trí hiện tại của bạn.';
}

export function normalizeLocationAccessError(error: unknown) {
  if (isLocationAccessError(error)) return error;

  const nativeCode = readNativeErrorCode(error);
  const code: LocationAccessErrorCode =
    nativeCode === 'permission_denied'
      ? 'permission_denied'
      : nativeCode === 'provider_unavailable'
        ? 'services_disabled'
        : nativeCode === 'timeout'
          ? 'timeout'
          : nativeCode === 'unavailable'
            ? 'unavailable'
            : 'failed';
  return new LocationAccessError(code, readErrorMessage(error));
}

type CurrentLocationNativeModule = {
  getCurrentLocation(timeoutMs: number): Promise<CurrentDeviceLocation>;
};

type GeolocationLike = {
  getCurrentPosition: (
    success: (position: {
      coords: {
        latitude: number;
        longitude: number;
        accuracy?: number;
      };
      timestamp?: number;
    }) => void,
    error: (error: { message?: string }) => void,
    options: {
      enableHighAccuracy: boolean;
      maximumAge: number;
      timeout: number;
    },
  ) => void;
  requestAuthorization?: () => void;
};

type GlobalWithNavigator = typeof globalThis & {
  navigator?: {
    geolocation?: GeolocationLike;
  };
};

const DEFAULT_TIMEOUT_MS = 6000;
const LOCATION_CACHE_TTL_MS = 45000;

let cachedLocation:
  | {
      value: CurrentDeviceLocation;
      receivedAt: number;
    }
  | undefined;
let inFlightLocationPromise: Promise<CurrentDeviceLocation> | undefined;

function getNativeCurrentLocationModule() {
  return NativeModules.VnseeaCurrentLocation as
    | CurrentLocationNativeModule
    | undefined;
}

export async function requestAndroidLocationPermission() {
  const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarsePermission =
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const [hasFine, hasCoarse] = await Promise.all([
    PermissionsAndroid.check(finePermission),
    PermissionsAndroid.check(coarsePermission),
  ]);
  if (hasFine || hasCoarse) return true;

  const result = await PermissionsAndroid.requestMultiple([
    finePermission,
    coarsePermission,
  ]);

  return (
    result[finePermission] === PermissionsAndroid.RESULTS.GRANTED ||
    result[coarsePermission] === PermissionsAndroid.RESULTS.GRANTED
  );
}

function normalizeLocation(value: CurrentDeviceLocation) {
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Không đọc được tọa độ hiện tại.');
  }

  const rawTimestamp = Number(value.timestamp);
  const timestamp = Number.isFinite(rawTimestamp)
    ? rawTimestamp < 10000000000
      ? rawTimestamp * 1000
      : rawTimestamp
    : undefined;

  return {
    ...value,
    latitude,
    longitude,
    timestamp,
  };
}

async function getAndroidCurrentLocation(timeoutMs: number) {
  const granted = await requestAndroidLocationPermission();
  if (!granted) {
    throw new LocationAccessError(
      'permission_denied',
      'Bạn cần cấp quyền vị trí để sử dụng tính năng này.',
    );
  }

  const nativeModule = getNativeCurrentLocationModule();
  if (!nativeModule) {
    throw new Error(
      'Chưa tìm thấy module vị trí. Hãy rebuild lại app Android.',
    );
  }

  try {
    return normalizeLocation(await nativeModule.getCurrentLocation(timeoutMs));
  } catch (error) {
    throw normalizeLocationAccessError(error);
  }
}

function getIosCurrentLocation(timeoutMs: number) {
  const geolocation = (globalThis as GlobalWithNavigator).navigator
    ?.geolocation;
  if (!geolocation?.getCurrentPosition) {
    return Promise.reject(
      new Error('Thiết bị chưa hỗ trợ lấy vị trí hiện tại trong chat.'),
    );
  }

  if (typeof geolocation.requestAuthorization === 'function') {
    geolocation.requestAuthorization();
  }

  return new Promise<CurrentDeviceLocation>((resolve, reject) => {
    geolocation.getCurrentPosition(
      position => {
        resolve(
          normalizeLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            provider: 'ios',
            timestamp: position.timestamp,
          }),
        );
      },
      error => {
        reject(
          new Error(
            error?.message || 'Không lấy được vị trí hiện tại của bạn.',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: timeoutMs,
      },
    );
  });
}

async function requestCurrentDeviceLocation(timeoutMs: number) {
  try {
    if (Platform.OS === 'android') {
      return await getAndroidCurrentLocation(timeoutMs);
    }

    const nativeModule = getNativeCurrentLocationModule();
    if (nativeModule) {
      return normalizeLocation(await nativeModule.getCurrentLocation(timeoutMs));
    }

    return await getIosCurrentLocation(timeoutMs);
  } catch (error) {
    throw normalizeLocationAccessError(error);
  }
}

export async function getCurrentDeviceLocation(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const now = Date.now();
  if (
    cachedLocation &&
    now - cachedLocation.receivedAt <= LOCATION_CACHE_TTL_MS
  ) {
    return cachedLocation.value;
  }

  if (inFlightLocationPromise) {
    return inFlightLocationPromise;
  }

  const request = requestCurrentDeviceLocation(timeoutMs);
  inFlightLocationPromise = request;

  try {
    const location = await request;
    cachedLocation = {
      value: location,
      receivedAt: Date.now(),
    };
    return location;
  } finally {
    if (inFlightLocationPromise === request) {
      inFlightLocationPromise = undefined;
    }
  }
}
