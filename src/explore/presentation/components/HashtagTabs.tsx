// Description: Filter chip row for the Explore screen (Tất cả / Đang hot / Mới).
// Uses Reanimated to slide a brand-colored indicator pill under the
// active chip — gives the tab change a clear, responsive feel without
// re-laying out the row.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ExploreTab } from '../../application/view-models/useExploreViewModel';

const BRAND = APP_BRAND_COLOR;

export interface HashtagTabsProps {
  tabs: ReadonlyArray<{ id: ExploreTab; label: string }>;
  activeTab: ExploreTab;
  onChange: (next: ExploreTab) => void;
}

function HashtagTabs({ tabs, activeTab, onChange }: HashtagTabsProps) {
  // We don't know each chip's width up front, so we measure them on
  // layout and store the offsets in a plain array indexed by tab id.
  const [tabWidths, setTabWidths] = React.useState<number[]>(
    () => tabs.map(() => 0),
  );
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === activeTab);
    if (idx < 0) return;
    const offset = tabWidths
      .slice(0, idx)
      .reduce((sum, w) => sum + w, 0);
    const width = tabWidths[idx] ?? 0;
    indicatorX.value = withTiming(offset, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    indicatorWidth.value = withTiming(width, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeTab, indicatorWidth, indicatorX, tabWidths, tabs]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const handleTabLayout =
    (index: number) => (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      setTabWidths(prev => {
        if (prev[index] === width) return prev;
        const next = [...prev];
        next[index] = width;
        return next;
      });
    };

  return (
    <View className="relative flex-row items-center gap-1 self-start rounded-full bg-brand/8 p-1">
      {/* The brand-colored active pill. Sits BEHIND the chips so the
          chips' own backgrounds paint on top. */}
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 top-1 bottom-1 rounded-full"
        style={[
          {
            backgroundColor: BRAND,
          },
          indicatorStyle,
        ]}
      />
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            onLayout={handleTabLayout(tabs.findIndex(t => t.id === tab.id))}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            className="rounded-full px-4 py-2"
          >
            <Text
              className={`text-caption-primary ${
                isActive ? 'text-inverse' : 'text-caption-secondary'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default React.memo(HashtagTabs);
