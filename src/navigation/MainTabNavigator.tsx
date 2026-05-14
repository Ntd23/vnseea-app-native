// Description: Provides the icon-only bottom tab navigator for the authenticated app shell.
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { Bell, Compass, Home, PlaySquare, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from './constants/routes';
import FeedScreen from '../feed/presentation/screens/FeedScreen';
import ExploreScreen from '../explore/presentation/screens/ExploreScreen';
import ReelsScreen from '../reels/presentation/screens/ReelsScreen';
import NotificationsScreen from '../notifications/presentation/screens/NotificationsScreen';
import SettingsScreen from '../settings/presentation/screens/SettingsScreen';

export type MainTabParamList = {
  [ROUTES.FEED]: undefined;
  [ROUTES.EXPLORE]: undefined;
  [ROUTES.REELS]: undefined;
  [ROUTES.NOTIFICATIONS]: undefined;
  [ROUTES.SETTINGS]: undefined;
};

const BRAND = '#0000FF';
const ICON_ACTIVE = '#FFFFFF';
const ICON_INACTIVE = 'rgba(255,255,255,0.45)';

type TabDef = {
  route: string;
  isCenter?: boolean;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
};

const TABS: TabDef[] = [
  { route: ROUTES.FEED, Icon: Home },
  { route: ROUTES.EXPLORE, Icon: Compass },
  { route: ROUTES.REELS, Icon: PlaySquare, isCenter: true },
  { route: ROUTES.NOTIFICATIONS, Icon: Bell },
  { route: ROUTES.SETTINGS, Icon: Settings },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Both platforms: absolute at bottom, float above content
  const bottom = Math.max(insets.bottom, 10);

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
      {/* Glass bar — blue with no visible border-top */}
      <View style={styles.bar}>
        {/* Gloss highlight at top edge (glass illusion only, very subtle) */}
        <View style={styles.gloss} pointerEvents="none" />

        <View style={styles.row}>
          {TABS.map(({ route, isCenter, Icon }) => {
            const idx = state.routes.findIndex(r => r.name === route);
            const focused = state.index === idx;
            const r = state.routes[idx];

            if (isCenter) {
              return (
                <View key={route} style={styles.tabSlot}>
                  <TouchableOpacity
                    style={styles.centerBtn}
                    onPress={() => onPress(r.name, r.key, focused)}
                    activeOpacity={0.85}
                    accessibilityLabel="Reels"
                  >
                    <PlaySquare size={22} color="#FFFFFF" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={route}
                style={styles.tabSlot}
                onPress={() => onPress(r.name, r.key, focused)}
                activeOpacity={0.75}
                accessibilityLabel={route}
              >
                <Icon
                  size={22}
                  color={focused ? ICON_ACTIVE : ICON_INACTIVE}
                  strokeWidth={2.2}
                />
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
      <Tab.Screen name={ROUTES.FEED} component={FeedScreen} />
      <Tab.Screen name={ROUTES.EXPLORE} component={ExploreScreen} />
      <Tab.Screen name={ROUTES.REELS} component={ReelsScreen} />
      <Tab.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Tab.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const ITEM_HEIGHT = 48;
const CENTER_SIZE = 40;

const styles = StyleSheet.create({
  // Floats above content on BOTH platforms
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
  },

  // Blue glass pill — NO separate border-top
  bar: {
    backgroundColor: 'rgba(0, 0, 255, 0.82)',
    borderRadius: 28,
    // subtle glass border all around (no extra border-top)
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },

  // Thin gloss line at very top to create glass illusion
  gloss: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
  },

  // Horizontal row — all items same height
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  // Each tab slot — equal width via flex:1, same height
  tabSlot: {
    flex: 1,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center button circle — same height slot, just styled as a circle
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

export default MainTabNavigator;
