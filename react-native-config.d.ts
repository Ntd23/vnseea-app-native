// Description: Declares typed React Native config values used by the app.
declare module 'react-native-config' {
  interface NativeConfig {
    API_BASE_URL?: string;
    WEB_BASE_URL?: string;
    SERVER_KEY?: string;
    REQUEST_TIMEOUT_MS?: string;
    ONESIGNAL_APP_ID?: string;
    GOOGLE_MAPS_API_KEY?: string;
    GOOGLE_MAPS_ANDROID_CERT_SHA1?: string;
    GOOGLE_MAPS_ANDROID_CERT_SHA1_RELEASE?: string;
    GOOGLE_MAPS_IOS_API_KEY?: string;
    GOOGLE_MAPS_MAP_ID?: string;
    LIVEKIT_WS_URL?: string;
    SOCKET_URL?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
