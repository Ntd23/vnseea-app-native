import './global.css';
import React, {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {initializePushNotifications} from './src/shared-kernel/infrastructure/push/oneSignalPush';

// GestureHandlerRootView must wrap the entire app tree for any
// react-native-gesture-handler components to receive touch events.
// See: https://docs.swmansion.com/react-native-gesture-handler/docs/installation
function App() {
  useEffect(() => {
    initializePushNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
