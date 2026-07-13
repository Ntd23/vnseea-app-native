# Google Maps iOS setup

Use this checklist when enabling the Nearby address map on iOS.

## Google Cloud

1. Open Google Cloud Console and select the VNSEEA mobile project.
2. Enable **Maps SDK for iOS**.
3. Enable the existing Android map APIs for `com.vnseea.android` if they are not already active.
4. Create or update an iOS API key restricted to the bundle id `com.vnseea.vnseea`.
5. Keep the Android API key restricted to `com.vnseea.android`.

## Local app configuration

Add the iOS key to the local `.env` file:

```env
GOOGLE_MAPS_IOS_API_KEY=your-ios-key
```

If a platform-specific key is not set, the app can fall back to `GOOGLE_MAPS_API_KEY`, but using `GOOGLE_MAPS_IOS_API_KEY` keeps iOS and Android restrictions clean.

## Install and rebuild

```sh
corepack pnpm@10.23.0 install --frozen-lockfile
cd ios && pod install
```

After pods finish, rebuild the iOS app so `react-native-config` can expose the new key to `AppDelegate.swift`.
