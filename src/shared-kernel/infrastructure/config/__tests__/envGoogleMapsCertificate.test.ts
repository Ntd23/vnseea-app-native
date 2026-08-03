jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://api.example.com',
  WEB_BASE_URL: 'https://example.com',
  SERVER_KEY: 'test-server-key',
  REQUEST_TIMEOUT_MS: '15000',
  GOOGLE_MAPS_ANDROID_CERT_SHA1: 'DEBUG_SHA1',
  GOOGLE_MAPS_ANDROID_CERT_SHA1_RELEASE: 'PLAY_SHA1',
}));

import { resolveGoogleMapsAndroidCertSha1 } from '../env';

describe('Google Maps Android signing certificate config', () => {
  it('uses the debug certificate in development builds', () => {
    expect(resolveGoogleMapsAndroidCertSha1(true)).toBe('DEBUG_SHA1');
  });

  it('uses the Play App Signing certificate in release builds', () => {
    expect(resolveGoogleMapsAndroidCertSha1(false)).toBe('PLAY_SHA1');
  });
});
