// Description: Provides the icon-only bottom tab navigator for the authenticated app shell.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Bell, Compass, Home, PlaySquare, Settings } from 'lucide-react-native';
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

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={ROUTES.FEED}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#0000FF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          height: 64,
          borderTopColor: 'rgba(0, 0, 255, 0.12)',
          backgroundColor: '#FFFFFF',
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
        },
      }}
    >
      <Tab.Screen
        name={ROUTES.FEED}
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.EXPLORE}
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Compass size={size} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.REELS}
        component={ReelsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <PlaySquare size={size} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.NOTIFICATIONS}
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} strokeWidth={2.4} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.SETTINGS}
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2.4} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default MainTabNavigator;
