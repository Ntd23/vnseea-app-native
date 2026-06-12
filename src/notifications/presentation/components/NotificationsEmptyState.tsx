// Description: Empty state shown when the filtered list has no items.
// Two flavors: completely empty (no notifications) vs unread tab empty.

import React from 'react';
import { Text, View } from 'react-native';
import { BellOff, CheckCircle2 } from 'lucide-react-native';

interface NotificationsEmptyStateProps {
  variant: 'all' | 'unread';
  title: string;
  description: string;
}

export default function NotificationsEmptyState({
  variant,
  title,
  description,
}: NotificationsEmptyStateProps) {
  const Icon = variant === 'unread' ? CheckCircle2 : BellOff;
  const iconColor = variant === 'unread' ? '#34A853' : '#94A3B8';

  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100">
        <Icon size={42} color={iconColor} />
      </View>
      <Text className="mt-5 text-center text-heading text-slate-700">
        {title}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {description}
      </Text>
    </View>
  );
}
