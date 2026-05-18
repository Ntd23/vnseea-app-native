// Description: Provides the icon-only bottom tab navigator for the authenticated app shell.
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from './constants/routes';
import { TAB_ROUTES } from './routeRegistry';
import type { MainTabParamList } from './types';

const BRAND = '#0000FF';
const ICON_ACTIVE = '#FFFFFF';
const ICON_INACTIVE = 'rgba(255,255,255,0.45)';

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  const currentRouteName = state.routes[state.index].name;
  if (currentRouteName === ROUTES.REELS) {
    return null;
  }

  function onPress(name: string, key: string, isFocused: boolean) {
    const event = navigation.emit({
      type: 'tabPress',
      target: key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  }

  return (
    <View style={[styles.container, { bottom }]}>
      <View style={styles.bar}>
        <View style={styles.gloss} pointerEvents="none" />

        <View style={styles.row}>
          {TAB_ROUTES.map(({ name, isCenter, Icon, accessibilityLabel }) => {
            const idx = state.routes.findIndex(route => route.name === name);
            const focused = state.index === idx;
            const route = state.routes[idx];

            return (
              <TouchableOpacity
                key={name}
                style={
                  isCenter
                    ? [styles.tabSlot, styles.centerSlot]
                    : styles.tabSlot
                }
                onPress={() => onPress(route.name, route.key, focused)}
                activeOpacity={isCenter ? 0.85 : 0.75}
                accessibilityLabel={accessibilityLabel}
              >
                <View style={isCenter ? styles.centerBtn : undefined}>
                  <Icon
                    size={22}
                    color={focused || isCenter ? ICON_ACTIVE : ICON_INACTIVE}
                    strokeWidth={2.2}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={ROUTES.FEED}
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TAB_ROUTES.map(({ name, component }) => (
        <Tab.Screen key={name} name={name} component={component} />
      ))}
    </Tab.Navigator>
  );
}

const ITEM_HEIGHT = 48;
const CENTER_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  bar: {
    backgroundColor: 'rgba(0, 0, 255, 0.82)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabSlot: {
    flex: 1,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSlot: {
    height: ITEM_HEIGHT,
  },
  centerBtn: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
});

export type { MainTabParamList } from './types';
export default MainTabNavigator;
