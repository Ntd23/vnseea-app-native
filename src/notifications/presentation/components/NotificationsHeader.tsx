// Description: Minimal title header for the notifications tab.
// Title on the left, filter button on the right (opens the filter sheet).

import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { ArrowLeft, ListFilter } from 'lucide-react-native';

interface NotificationsHeaderProps {
  title: string;
  onFilterPress?: () => void;
  filterActive?: boolean;
  onBackPress?: () => void;
  backAccessibilityLabel?: string;
}

export default function NotificationsHeader({
  title,
  onFilterPress,
  filterActive = false,
  onBackPress,
  backAccessibilityLabel = 'Back',
}: NotificationsHeaderProps) {
  const isAndroid = Platform.OS === 'android';
  const foregroundColor = isAndroid
    ? APP_COLORS.brand.onPrimary
    : '#0f172a';

  return (
    <View
      className={`min-h-[52px] flex-row items-center justify-between px-5 pt-3 pb-2 ${
        isAndroid ? 'border-t border-white bg-brand' : 'bg-transparent'
      }`}
    >
      <View className="min-w-0 flex-1 flex-row items-center">
        {onBackPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onBackPress}
            className={`mr-2 h-9 w-9 items-center justify-center rounded-full ${
              isAndroid ? 'bg-white/10' : 'bg-transparent'
            }`}
          >
            <ArrowLeft size={22} color={foregroundColor} strokeWidth={2.2} />
          </Pressable>
        ) : null}
        <Text
          className={`flex-1 text-[22px] font-extrabold ${
            isAndroid ? 'text-white' : 'text-[#0f172a]'
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="filter-notifications"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={onFilterPress}
        className={`h-9 w-9 items-center justify-center rounded-full ${
          isAndroid ? 'bg-white/10' : 'bg-transparent'
        }`}
      >
        <ListFilter
          size={20}
          color={
            isAndroid
              ? foregroundColor
              : filterActive
                ? APP_BRAND_COLOR
                : foregroundColor
          }
          strokeWidth={2.2}
        />
        {filterActive ? (
          <View
            className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
              isAndroid ? 'bg-white' : 'bg-brand'
            }`}
          />
        ) : null}
      </Pressable>
    </View>
  );
}
