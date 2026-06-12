// Description: Two-tab segmented control (All / Unread) with an animated
// blue underline that slides between tabs using Reanimated shared values.

import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type NotificationTabKey = 'all' | 'unread';

interface NotificationsTabsProps {
  labels: { all: string; unread: string };
  active: NotificationTabKey;
  onChange: (tab: NotificationTabKey) => void;
  unreadCount: number;
}

const TAB_WIDTH = 96;
const INDICATOR_WIDTH = 36;
const UNDERLINE_HEIGHT = 3;

export default function NotificationsTabs({
  labels,
  active,
  onChange,
  unreadCount,
}: NotificationsTabsProps) {
  const containerWidth = TAB_WIDTH * 2;
  const activeIndex = active === 'all' ? 0 : 1;
  const centerX = TAB_WIDTH * activeIndex + TAB_WIDTH / 2;
  const underlineLeft = useSharedValue(centerX - INDICATOR_WIDTH / 2);
  const previousActive = useRef(active);

  useEffect(() => {
    if (previousActive.current === active) {
      return;
    }
    previousActive.current = active;
    underlineLeft.value = withTiming(centerX - INDICATOR_WIDTH / 2, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, centerX, underlineLeft]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineLeft.value }],
  }));

  return (
    <View
      className="bg-white px-5"
      style={{ width: containerWidth + 40, alignSelf: 'flex-start' }}
    >
      <View className="flex-row border-b border-slate-200/70">
        <TabButton
          label={labels.all}
          isActive={active === 'all'}
          onPress={() => onChange('all')}
        />
        <TabButton
          label={labels.unread}
          isActive={active === 'unread'}
          onPress={() => onChange('unread')}
          badge={unreadCount > 0 ? unreadCount : undefined}
        />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 20,
            width: INDICATOR_WIDTH,
            height: UNDERLINE_HEIGHT,
            borderRadius: 4,
            backgroundColor: '#0000ff',
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

function TabButton({
  label,
  isActive,
  onPress,
  badge,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={{ width: TAB_WIDTH }}
      className="items-center justify-center py-3"
    >
      <View className="flex-row items-center">
        <Text
          className={`text-[15px] font-semibold ${
            isActive ? 'text-[#0000ff]' : 'text-slate-500'
          }`}
        >
          {label}
        </Text>
        {typeof badge === 'number' && badge > 0 ? (
          <View className="ml-1.5 min-w-[20px] items-center justify-center rounded-full bg-[#0000ff] px-1.5 py-0.5">
            <Text className="text-[10px] font-bold text-white">
              {badge > 99 ? '99+' : String(badge)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
