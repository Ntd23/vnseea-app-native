// Description: Pill-style tab switcher used by the auth screens.
// Active tab has a brand-blue background with a soft brand shadow.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface AuthTabsProps {
  labels: { active: string; inactive: string };
  activeIsLogin: boolean;
  onPressLogin: () => void;
  onPressRegister: () => void;
}

export default function AuthTabs({
  labels,
  activeIsLogin,
  onPressLogin,
  onPressRegister,
}: AuthTabsProps) {
  return (
    <View
      className="flex-row rounded-2xl bg-white p-1"
      style={{
        shadowColor: '#0000ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <TabPill
        label={labels.active}
        isActive={activeIsLogin}
        onPress={onPressLogin}
      />
      <TabPill
        label={labels.inactive}
        isActive={!activeIsLogin}
        onPress={onPressRegister}
      />
    </View>
  );
}

function TabPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      activeOpacity={0.85}
      onPress={onPress}
      className={`flex-1 items-center justify-center rounded-xl py-3 ${
        isActive ? 'bg-[#0000ff]' : 'bg-transparent'
      }`}
      style={
        isActive
          ? {
              shadowColor: '#0000ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.28,
              shadowRadius: 8,
              elevation: 3,
            }
          : undefined
      }
    >
      <Text
        className={`text-[14px] font-bold ${
          isActive ? 'text-inverse' : 'text-slate-500'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
