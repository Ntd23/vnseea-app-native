// Description: Top app bar for the notifications tab.
// Matches the updated layout: Bell icon on the left, Title in the center, and Checkmark icon on the right.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bell, CheckSquare } from 'lucide-react-native';

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
  return (
    <View className="flex-row items-center justify-between px-5 py-4 bg-transparent">
      {/* Left Bell Icon inside a white rounded-2xl card */}
      <View 
        style={{
          shadowColor: '#94a3b8',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 3,
        }}
        className="h-12 w-12 items-center justify-center rounded-[16px] bg-white border border-slate-100"
      >
        <Bell size={22} color="#000000" />
      </View>

      {/* Center Title */}
      <Text className="text-[20px] font-bold text-[#1e293b]">{title}</Text>

      {/* Right Mark All Read Check Square Icon inside a white rounded-2xl card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="mark-all-read"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={onMarkAllRead}
        style={{
          shadowColor: '#94a3b8',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 3,
        }}
        className="h-12 w-12 items-center justify-center rounded-[16px] bg-white border border-slate-100 relative"
      >
        <CheckSquare size={22} color="#000000" />
        {/* Tiny blue notification dot */}
        <View className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-[#0000ff]" />
      </Pressable>
    </View>
  );
}
