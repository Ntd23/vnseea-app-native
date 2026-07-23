// Description: Minimal title header for the notifications tab.
// Title on the left, filter button on the right (opens the filter sheet).

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
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
  return (
    <View className="flex-row items-center justify-between bg-transparent px-5 pt-3 pb-2">
      <View className="min-w-0 flex-1 flex-row items-center">
        {onBackPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onBackPress}
            className="mr-2 h-9 w-9 items-center justify-center rounded-full"
          >
            <ArrowLeft size={22} color="#0f172a" strokeWidth={2.2} />
          </Pressable>
        ) : null}
        <Text
          className="flex-1 text-[22px] font-extrabold text-[#0f172a]"
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
        className="h-9 w-9 items-center justify-center rounded-full"
      >
        <ListFilter
          size={20}
          color={filterActive ? APP_BRAND_COLOR : '#0f172a'}
          strokeWidth={2.2}
        />
        {filterActive ? (
          <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />
        ) : null}
      </Pressable>
    </View>
  );
}
