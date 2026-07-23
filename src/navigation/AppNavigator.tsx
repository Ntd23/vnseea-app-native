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
import { VNSEEA_NAVIGATION_THEME } from './navigationTheme';
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
  ROUTES.STORY_VIEWER,
]);

const PROFILE_PUSH_ROUTES: ReadonlySet<string> = new Set([
  ROUTES.PROFILE,
  ROUTES.USER_PROFILE,
]);

const PROFILE_PUSH_OPTIONS: NativeStackNavigationOptions = {
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
  gestureEnabled: false,
};

const PROFILE_MORE_OPTIONS: NativeStackNavigationOptions = {
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
  gestureEnabled: false,
};

const PROFILE_CONNECTIONS_OPTIONS: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 140,
  contentStyle: { backgroundColor: '#FFFFFF' },
};

const POST_DETAIL_OPTIONS: NativeStackNavigationOptions = {
  presentation: 'transparentModal',
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: 'transparent' },
  gestureEnabled: false,
};

function AppNavigator() {
  const initialRouteName = sessionStorage.getAccessToken()
    ? ROUTES.MAIN_TABS
    : ROUTES.LOGIN;

  return (
    <NavigationContainer ref={navigationRef} theme={VNSEEA_NAVIGATION_THEME}>
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
                  contentStyle: { backgroundColor: 'transparent' },
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
            if (name === ROUTES.REELS) {
              return (
                <Stack.Screen
                  key={name}
                  name={name}
                  component={component}
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                    contentStyle: { backgroundColor: 'transparent' },
                    gestureEnabled: false,
                  }}
                />
              );
            }
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={{ animation: 'fade' }}
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
          if (name === ROUTES.PROFILE_MORE) {
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={PROFILE_MORE_OPTIONS}
              />
            );
          }
          if (name === ROUTES.PROFILE_FRIENDS) {
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={PROFILE_CONNECTIONS_OPTIONS}
              />
            );
          }
          if (name === ROUTES.POST_DETAIL) {
            return (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={POST_DETAIL_OPTIONS}
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
