// Description: Custom bottom tab navigator with VnseeaRn brand design.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from './constants/routes';
import { TAB_ROUTES } from './routeRegistry';
import type { MainTabParamList } from './types';
import { useNotificationBadgeViewModel } from '../notifications';
import { Play } from 'lucide-react-native';
import { tabBarVisibility } from './tabBarVisibility';

const BRAND_COLOR = '#0000FF';
const BRAND_DARK = '#0000E6';
const BRAND_LIGHT_BG = 'rgba(0, 0, 255, 0.08)';

const TAB_LABELS: Record<string, string> = {
  [ROUTES.FEED]: 'Trang chủ',
  [ROUTES.EXPLORE]: 'Khám phá',
  [ROUTES.REELS]: 'Tạo',
  [ROUTES.NOTIFICATIONS]: 'Thông báo',
  [ROUTES.SETTINGS]: 'Cài đặt',
};

function CenterButton({ isFocused }: { isFocused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.05 : 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.centerBtn,
        { transform: [{ scale: scaleAnim }] },
        isFocused && styles.centerBtnActive,
      ]}>
      <View style={styles.videoIconOutline}>
        <Play size={10} color="#FFFFFF" fill="#FFFFFF" style={styles.videoIconPlay} />
      </View>
      <Text style={styles.centerBtnLabel}>Video</Text>
    </Animated.View>
  );
}

function CustomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { totalUnreadCount: notificationBadgeCount } =
    useNotificationBadgeViewModel();
  const bottom = Math.max(insets.bottom, 10);

  // All hooks MUST be called before any early return
  const [, setVisible] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  // Early return AFTER all hooks
  const currentRouteName = state.routes[state.index].name;
  if (currentRouteName === ROUTES.REELS) {
    return null;
  }

  const centerRoute = state.routes.find(route => route.name === ROUTES.REELS);
  const isCenterFocused =
    state.index === state.routes.findIndex(route => route.name === ROUTES.REELS);

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
    <Animated.View
      style={[
        styles.container,
        { bottom, transform: [{ translateY }], opacity: fadeAnim },
      ]}
    >
      {/* 1. Center Hump background and shadow */}
      <View style={styles.centerHump} />

      {/* 2. Hump Mask to cover top border of main bar inside the center hump */}
      <View style={styles.humpMask} />

      <View style={styles.bar}>
        <View style={styles.row}>
          {TAB_ROUTES.map(({ name, isCenter, Icon, accessibilityLabel }) => {
            const routeIdx = state.routes.findIndex(route => route.name === name);
            const focused = state.index === routeIdx;
            const route = state.routes[routeIdx];

            if (isCenter) {
              return <View key={name} style={styles.tabSlot} />;
            }

            return (
              <TouchableOpacity
                key={name}
                style={styles.tabSlot}
                onPress={() => onPress(route.name, route.key, focused)}
                activeOpacity={0.75}
                accessibilityLabel={accessibilityLabel}
              >
                <View style={styles.iconContainer}>
                  {focused && <View style={styles.activeGlow} />}
                  <Icon
                    size={22}
                    color={focused ? BRAND_COLOR : '#8A8D91'}
                    strokeWidth={focused ? 2.2 : 1.8}
                  />
                  {focused && name === ROUTES.FEED && (
                    <View style={styles.blueDot} />
                  )}
                  {name === ROUTES.NOTIFICATIONS && notificationBadgeCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {notificationBadgeCount > 99 ? '99+' : notificationBadgeCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                  {TAB_LABELS[name]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Absolute Position Center Button */}
      {centerRoute && (
        <TouchableOpacity
          style={styles.centerBtnContainer}
          onPress={() => onPress(ROUTES.REELS, centerRoute.key, isCenterFocused)}
          activeOpacity={0.85}
          accessibilityLabel="Tạo"
        >
          <CenterButton isFocused={isCenterFocused} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const Tab = createBottomTabNavigator<MainTabParamList>();

function renderCustomTabBar(props: BottomTabBarProps) {
  return <CustomTabBar {...props} />;
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={ROUTES.FEED}
      tabBar={renderCustomTabBar}
      screenOptions={{ headerShown: false }}
    >
      {TAB_ROUTES.map(({ name, component }) => (
        <Tab.Screen key={name} name={name} component={component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    overflow: 'visible',
  },
  centerHump: {
    position: 'absolute',
    top: -16,
    left: '50%',
    marginLeft: -34,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E6EB',
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  humpMask: {
    position: 'absolute',
    top: -1,
    left: '50%',
    marginLeft: -31,
    width: 62,
    height: 8,
    backgroundColor: '#FFFFFF',
    zIndex: 3,
  },
  bar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tabSlot: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND_LIGHT_BG,
    zIndex: -1,
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#8A8D91',
    marginTop: 3,
  },
  tabLabelActive: {
    color: BRAND_COLOR,
  },
  blueDot: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BRAND_COLOR,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -5,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 2.5,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4333C',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
  centerBtnContainer: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    zIndex: 5,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  centerBtnActive: {
    backgroundColor: BRAND_DARK,
    shadowOpacity: 0.6,
  },
  videoIconOutline: {
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    width: 22,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  videoIconPlay: {
    marginLeft: 1,
  },
  centerBtnLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
});

export type { MainTabParamList } from './types';
export default MainTabNavigator;