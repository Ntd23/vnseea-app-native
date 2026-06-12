// Description: Sticky-style section header used to bucket the
// notifications list by time (Today, This week, This month, Earlier).

import React from 'react';
import { Text, View } from 'react-native';

interface NotificationSectionHeaderProps {
  title: string;
}

export default function NotificationSectionHeader({
  title,
}: NotificationSectionHeaderProps) {
  return (
    <View className="mb-2 mt-1 px-1">
      <Text className="text-label-secondary">{title}</Text>
    </View>
  );
}
