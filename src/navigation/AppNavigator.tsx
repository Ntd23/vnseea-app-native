// Description: Configures the root stack navigator from the centralized route registry.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { ROUTES } from './constants/routes';
import { createStackRoutes } from './routeRegistry';
import type { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';
import { navigationRef } from './navigationRef';
import { sessionStorage } from '../shared-kernel/infrastructure/storage/sessionStorage';

const Stack = createNativeStackNavigator<RootStackParamList>();
const STACK_ROUTES = createStackRoutes(MainTabNavigator);

// Screens that own their own enter/exit animation and must NOT run the
// default native-stack transition on top of it. Without this the story
// viewer's swipe-down dismiss shows a brief white flash because the
// native pop animation races the gesture-driven translateY animation.
const SCREENS_WITHOUT_DEFAULT_ANIMATION: ReadonlySet<string> = new Set([
  ROUTES.STORY_VIEWER,
  ROUTES.COVER_VIEWER,
  ROUTES.AVATAR_VIEWER,
  ROUTES.REELS,
]);

const TRANSPARENT_MODAL_ROUTES: ReadonlySet<string> = new Set([
  ROUTES.CREATE_POST,
]);

const PROFILE_PUSH_ROUTES: ReadonlySet<string> = new Set([
  ROUTES.PROFILE,
  ROUTES.USER_PROFILE,
]);

const PROFILE_PUSH_OPTIONS: NativeStackNavigationOptions = {
  animation: 'ios_from_right',
  animationTypeForReplace: 'push',
  gestureEnabled: true,
};

function AppNavigator() {
  const initialRouteName = sessionStorage.getAccessToken()
    ? ROUTES.MAIN_TABS
    : ROUTES.LOGIN;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {STACK_ROUTES.map(({ name, component }) => {
          if (TRANSPARENT_MODAL_ROUTES.has(name)) {
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={{
                  presentation: 'transparentModal',
                  animation: 'fade',
                }}
              />
            );
          }
          // Custom-animated screens get `fade` for both push/pop so the
          // screen-specific gesture can drive the visible motion. The
          // single shared fade keeps both transitions identical and
          // eliminates the white gap during dismissal.
          if (SCREENS_WITHOUT_DEFAULT_ANIMATION.has(name)) {
            // Per-route animation override. The default for the
            // custom-animated set is fade (used by the story
            // viewers so their internal gesture is not raced by a
            // native push/pop). REELS opens without a native transition
            // so a tapped feed video can keep the experience feeling
            // continuous and start playback immediately.
            const animation = name === ROUTES.REELS
              ? 'none'
              : 'fade';
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={{ animation }}
              />
            );
          }
          if (PROFILE_PUSH_ROUTES.has(name)) {
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={PROFILE_PUSH_OPTIONS}
              />
            );
          }
          return (
            <Stack.Screen key={name} name={name} component={component} />
          );
        })}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export type { RootStackParamList } from './types';
export default AppNavigator;
