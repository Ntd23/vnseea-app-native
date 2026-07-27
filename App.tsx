// Description: Mounts the VNSEEA React Native shell and app-level services.
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {
  IncomingCallWatcher,
  GroupLiveKitCallSessionProvider,
  LiveKitCallSessionProvider,
  LiveKitMiniCallBar,
} from './src/messages';
import { initializePushNotifications } from './src/shared-kernel/infrastructure/push/oneSignalPush';
import { initializePushNotificationNavigation } from './src/notifications/application/navigation/pushNotificationNavigation';
import { initI18n } from './src/shared-kernel/infrastructure/i18n';
import { SnackbarProvider } from './src/shared-kernel/presentation/components/Snackbar';

// Initialize i18n before any component subscribes to translations.
initI18n();

// GestureHandlerRootView must wrap the entire app tree for any
// react-native-gesture-handler components to receive touch events.
// See: https://docs.swmansion.com/react-native-gesture-handler/docs/installation
function App() {
  useEffect(() => {
    initializePushNotificationNavigation();
    initializePushNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

export default App;
