// Description: Normalizes React Native environment variables for API integration.
import Config from 'react-native-config';

function requireEnv(name: keyof typeof Config) {
  const value = Config[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function parseRequiredNumber(name: keyof typeof Config) {
  const value = requireEnv(name);
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid environment variable: ${name}`);
  }

  return parsed;
}

export function resolveGoogleMapsAndroidCertSha1(
  isDevelopmentBuild: boolean,
) {
  const debugCertificate = Config.GOOGLE_MAPS_ANDROID_CERT_SHA1 || '';
  const releaseCertificate =
    Config.GOOGLE_MAPS_ANDROID_CERT_SHA1_RELEASE || debugCertificate;

  return (isDevelopmentBuild ? debugCertificate : releaseCertificate).trim();
}

const isDevelopmentBuild =
  typeof __DEV__ !== 'undefined' && Boolean(__DEV__);

export const apiConfig = {
  apiBaseUrl: requireEnv('API_BASE_URL'),
  webBaseUrl: requireEnv('WEB_BASE_URL'),
  serverKey: requireEnv('SERVER_KEY'),
  requestTimeoutMs: parseRequiredNumber('REQUEST_TIMEOUT_MS'),
  oneSignalAppId: Config.ONESIGNAL_APP_ID || '',
  googleMapsApiKey: Config.GOOGLE_MAPS_API_KEY || '',
  googleMapsAndroidCertSha1:
    resolveGoogleMapsAndroidCertSha1(isDevelopmentBuild),
  googleMapsMapId: Config.GOOGLE_MAPS_MAP_ID || '',
  liveKitWsUrl: Config.LIVEKIT_WS_URL || '',
  socketUrl: Config.SOCKET_URL || '',
} as const;
