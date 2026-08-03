// Description: Reads the device's current location for lightweight message sharing.
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export type CurrentDeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  provider?: string;
  timestamp?: number;
};

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
    throw new Error('Bạn cần cấp quyền vị trí để chia sẻ vị trí hiện tại.');
  }

  const nativeModule = getNativeCurrentLocationModule();
  if (!nativeModule) {
    throw new Error(
      'Chưa tìm thấy module vị trí. Hãy rebuild lại app Android.',
    );
  }

  return normalizeLocation(await nativeModule.getCurrentLocation(timeoutMs));
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
  if (Platform.OS === 'android') {
    return getAndroidCurrentLocation(timeoutMs);
  }

  const nativeModule = getNativeCurrentLocationModule();
  if (nativeModule) {
    return normalizeLocation(await nativeModule.getCurrentLocation(timeoutMs));
  }

  return getIosCurrentLocation(timeoutMs);
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
