// Description: Pill-style segmented control (All / Unread) matching the screenshot.
// No slider underline, instead using active/inactive background and border styles.

import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type NotificationTabKey = 'all' | 'unread';

interface NotificationsTabsProps {
  labels: { all: string; unread: string };
  active: NotificationTabKey;
  onChange: (tab: NotificationTabKey) => void;
  unreadCount: number;
}

export default function NotificationsTabs({
  labels,
  active,
  onChange,
  unreadCount,
}: NotificationsTabsProps) {
  return (
    <View className="flex-row items-center px-5 py-2.5 gap-4">
      {/* Tab: All */}
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'all' }}
        onPress={() => onChange('all')}
        style={
          active === 'all'
            ? {
                backgroundColor: '#edf4ff',
              }
            : {
                backgroundColor: '#ffffff',
                shadowColor: '#94a3b8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 1.5,
              }
        }
        className={`flex-1 items-center justify-center py-3.5 rounded-[16px] border ${
          active === 'all' ? 'border-brand/10' : 'border-slate-100'
        }`}
      >
        <Text
          className={`text-[15px] font-bold ${
            active === 'all' ? 'text-brand' : 'text-slate-500'
          }`}
        >
          {labels.all}
        </Text>
      </Pressable>

      {/* Tab: Unread */}
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'unread' }}
        onPress={() => onChange('unread')}
        style={
          active === 'unread'
            ? {
                backgroundColor: '#edf4ff',
              }
            : {
                backgroundColor: '#ffffff',
                shadowColor: '#94a3b8',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 1.5,
              }
        }
        className={`flex-1 items-center justify-center py-3.5 rounded-[16px] border ${
          active === 'unread' ? 'border-brand/10' : 'border-slate-100'
        }`}
      >
        <View className="flex-row items-center justify-center">
          <Text
            className={`text-[15px] font-bold ${
              active === 'unread' ? 'text-brand' : 'text-slate-500'
            }`}
          >
            {labels.unread}
          </Text>
          {active !== 'unread' && unreadCount > 0 ? (
            <View className="ml-2 min-w-[20px] h-5 items-center justify-center rounded-full bg-brand px-1.5">
              <Text className="text-[10px] font-bold text-white leading-none">
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
