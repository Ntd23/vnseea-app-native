// Description: Top app bar for the notifications tab.
// White surface, brand-blue icons, animated filter button (rotates 45° when active).

import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CheckCheck, SlidersHorizontal } from 'lucide-react-native';

interface NotificationsHeaderProps {
  title: string;
  onMarkAllRead: () => void;
  onFilterPress: () => void;
  filterActive: boolean;
}

export default function NotificationsHeader({
  title,
  onMarkAllRead,
  onFilterPress,
  filterActive,
}: NotificationsHeaderProps) {
  const filterRotation = useSharedValue(0);

  useEffect(() => {
    filterRotation.value = withTiming(filterActive ? 90 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [filterActive, filterRotation]);

  const filterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${filterRotation.value}deg` }],
  }));

  return (
    <View className="surface-topbar flex-row items-center justify-between px-5 py-3">
      <Text className="text-heading">{title}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="filter"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onFilterPress}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Animated.View style={filterAnimatedStyle}>
            <SlidersHorizontal
              size={22}
              color={filterActive ? '#0000ff' : '#1e293b'}
            />
          </Animated.View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="mark-all-read"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onMarkAllRead}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <CheckCheck size={22} color="#0000ff" />
        </Pressable>
      </View>
    </View>
  );
}
