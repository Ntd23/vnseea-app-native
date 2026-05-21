// Description: Declares typed React Native config values used by the app.
declare module 'react-native-config' {
  interface NativeConfig {
    API_BASE_URL?: string;
    WEB_BASE_URL?: string;
    SERVER_KEY?: string;
    REQUEST_TIMEOUT_MS?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
