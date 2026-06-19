// Description: Custom bottom tab navigator with VnseeaRn brand design.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { ROUTES } from './constants/routes';
import { TAB_ROUTES } from './routeRegistry';
import type { MainTabParamList } from './types';
import { useNotificationBadgeViewModel } from '../notifications';
import { tabBarVisibility } from './tabBarVisibility';
import {
  createIosNativeTabOptions,
  getCustomTabRoutes,
  getIosNativeTabRoutes,
} from './mainTabConfig';

const BRAND_COLOR = '#2563FF';
const BRAND_LIGHT_BG = 'rgba(37, 99, 255, 0.08)';

function CustomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { notificationCount: notificationBadgeCount } =
    useNotificationBadgeViewModel();
  const bottom = Math.max(insets.bottom, 10);

  // All hooks MUST be called before any early return
  const [, setVisible] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);

  const activeRouteIdx = state.index;
  const slideAnim = useRef(new Animated.Value(activeRouteIdx)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    // Reset tab bar visibility to true on tab change
    tabBarVisibility.setVisible(true);
  }, [state.index]);

  useEffect(() => {
    return tabBarVisibility.subscribe((isVisible) => {
      setVisible(isVisible);
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 120, // Slide down off-screen
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [translateY]);

  // Animate the pill to the new index
  useEffect(() => {
    if (activeRouteIdx !== 2) {
      Animated.spring(slideAnim, {
        toValue: activeRouteIdx,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();
    }
  }, [activeRouteIdx, slideAnim]);

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

  const slotWidth = barWidth / 5;
  const PILL_WIDTH = 58;
  const PILL_HEIGHT = 42;
  const leftOffset = (slotWidth - PILL_WIDTH) / 2;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      leftOffset,
      slotWidth + leftOffset,
      slotWidth * 2 + leftOffset,
      slotWidth * 3 + leftOffset,
      slotWidth * 4 + leftOffset,
    ],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom, transform: [{ translateY }], opacity: fadeAnim },
      ]}
    >
      <View
        style={styles.bar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Glassmorphic Background Blur only on iOS, high-fidelity frosted fallback on Android */}
        {Platform.OS === 'ios' ? (
          <View style={styles.glassBackground}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={25}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.85)"
            />
          </View>
        ) : (
          <View style={styles.androidFrostedBackground} />
        )}

        {/* Animated Moving Pill Border */}
        {barWidth > 0 && activeRouteIdx !== 2 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pillIndicator,
              {
                width: PILL_WIDTH,
                height: PILL_HEIGHT,
                transform: [{ translateX }],
              },
            ]}
          />
        )}

        <View style={styles.row}>
          {TAB_ROUTES.map(({ name, Icon, accessibilityLabel }) => {
            const routeIdx = state.routes.findIndex(route => route.name === name);
            const focused = state.index === routeIdx;
            const route = state.routes[routeIdx];

            return (
              <TouchableOpacity
                key={name}
                style={styles.tabSlot}
                onPress={() => onPress(route.name, route.key, focused)}
                activeOpacity={0.75}
                accessibilityLabel={accessibilityLabel}
              >
                <View style={styles.iconContainer}>
                  <Icon
                    size={22}
                    color={focused ? BRAND_COLOR : '#9CA3AF'}
                    strokeWidth={focused ? 2.2 : 1.8}
                  />
                  {name === ROUTES.NOTIFICATIONS && notificationBadgeCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {notificationBadgeCount > 99 ? '99+' : notificationBadgeCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const CustomTab = createBottomTabNavigator<MainTabParamList>();
const NativeTab = createNativeBottomTabNavigator<MainTabParamList>();

function renderCustomTabBar(props: BottomTabBarProps) {
  if (Platform.OS === 'android') {
    return null;
  }
  return <CustomTabBar {...props} />;
}

function CustomMainTabNavigator() {
  return (
    <CustomTab.Navigator
      initialRouteName={ROUTES.FEED}
      tabBar={renderCustomTabBar}
      screenOptions={{ headerShown: false }}
    >
      {getCustomTabRoutes(TAB_ROUTES).map(({ name, component }) => (
        <CustomTab.Screen key={name} name={name} component={component} />
      ))}
    </CustomTab.Navigator>
  );
}

function NativeIosTabNavigator() {
  const { notificationCount: notificationBadgeCount } =
    useNotificationBadgeViewModel();

  return (
    <NativeTab.Navigator
      initialRouteName={ROUTES.FEED}
      screenOptions={{
        headerShown: false,
        tabBarControllerMode: 'tabBar',
        tabBarMinimizeBehavior: 'onScrollDown',
        tabBarBlurEffect: 'systemDefault',
        overrideScrollViewContentInsetAdjustmentBehavior: false,
      }}
    >
      {getIosNativeTabRoutes(TAB_ROUTES).map(({ name, component }) => (
        <NativeTab.Screen
          key={name}
          name={name}
          component={component}
          options={createIosNativeTabOptions(name, notificationBadgeCount)}
        />
      ))}
    </NativeTab.Navigator>
  );
}

function MainTabNavigator() {
  if (Platform.OS === 'ios') {
    return <NativeIosTabNavigator />;
  }

  return <CustomMainTabNavigator />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    overflow: 'visible',
  },
  bar: {
    backgroundColor: 'transparent',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 2,
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    zIndex: -1,
  },
  androidFrostedBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: -1,
  },
  pillIndicator: {
    position: 'absolute',
    top: 16, // (74px height of bar - 42px height of pill) / 2 = 16px
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: BRAND_COLOR,
    backgroundColor: BRAND_LIGHT_BG,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 2,
  },
  tabSlot: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
});

export type { MainTabParamList } from './types';
export default MainTabNavigator;
