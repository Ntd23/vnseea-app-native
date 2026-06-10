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

export const apiConfig = {
  apiBaseUrl: requireEnv('API_BASE_URL'),
  webBaseUrl: requireEnv('WEB_BASE_URL'),
  serverKey: requireEnv('SERVER_KEY'),
  requestTimeoutMs: parseRequiredNumber('REQUEST_TIMEOUT_MS'),
  oneSignalAppId: Config.ONESIGNAL_APP_ID || '',
  googleMapsApiKey: Config.GOOGLE_MAPS_API_KEY || '',
  liveKitWsUrl: Config.LIVEKIT_WS_URL || '',
  socketUrl: Config.SOCKET_URL || '',
} as const;
