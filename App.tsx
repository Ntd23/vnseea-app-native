// Description: Mounts the VNSEEA React Native shell and app-level services.
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {
  IncomingCallWatcher,
  GroupLiveKitCallSessionProvider,
  LiveKitCallSessionProvider,
  LiveKitMiniCallBar,
} from './src/messages';
import {
  initializePushNotifications,
  requestPushNotificationPermissionOnFirstLaunch,
} from './src/shared-kernel/infrastructure/push/oneSignalPush';
import { initializePushDeviceRegistrationLifecycle } from './src/shared-kernel/infrastructure/push/pushDeviceRegistration';
import { initializePushNotificationNavigation } from './src/notifications/application/navigation/pushNotificationNavigation';
import { initializeAndroidMessagePushOpen } from './src/messages/application/notifications/androidMessagePushOpen';
import { initI18n } from './src/shared-kernel/infrastructure/i18n';
import { SnackbarProvider } from './src/shared-kernel/presentation/components/Snackbar';

// Initialize i18n before any component subscribes to translations.
initI18n();

// GestureHandlerRootView must wrap the entire app tree for any
// react-native-gesture-handler components to receive touch events.
// See: https://docs.swmansion.com/react-native-gesture-handler/docs/installation
function App() {
  useEffect(() => {
    initializePushDeviceRegistrationLifecycle();
    initializePushNotificationNavigation();
    initializeAndroidMessagePushOpen();
    initializePushNotifications();
    requestPushNotificationPermissionOnFirstLaunch().catch(error => {
      console.warn(
        '[OneSignal] Could not request first-launch notification permission',
        error,
      );
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SnackbarProvider>
          <LiveKitCallSessionProvider>
            <GroupLiveKitCallSessionProvider>
              <AppNavigator />
              <IncomingCallWatcher />
              <LiveKitMiniCallBar />
            </GroupLiveKitCallSessionProvider>
          </LiveKitCallSessionProvider>
        </SnackbarProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
