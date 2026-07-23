// Description: Pill-style tab switcher used by the auth screens.
// Active tab has a brand-blue background with a soft brand shadow.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LogIn, UserPlus } from 'lucide-react-native';

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
      className="flex-row rounded-[20px] border border-slate-100 bg-white p-1.5"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 22,
        elevation: 3,
      }}
    >
      <TabPill
        label={labels.active}
        isActive={activeIsLogin}
        Icon={LogIn}
        onPress={onPressLogin}
      />
      <TabPill
        label={labels.inactive}
        isActive={!activeIsLogin}
        Icon={UserPlus}
        onPress={onPressRegister}
      />
    </View>
  );
}

function TabPill({
  label,
  isActive,
  Icon,
  onPress,
}: {
  label: string;
  isActive: boolean;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  onPress: () => void;
}) {
  const color = isActive ? APP_BRAND_COLOR : '#8A91A3';

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      activeOpacity={0.85}
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center rounded-2xl py-3 ${
        isActive ? 'bg-[#EEF4FF]' : 'bg-transparent'
      }`}
      style={
        isActive
          ? {
              shadowColor: APP_BRAND_COLOR,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 18,
              elevation: 2,
            }
          : undefined
      }
    >
      <Icon size={19} color={color} strokeWidth={2.4} />
      <Text
        className={`ml-2 text-[14px] font-extrabold ${
          isActive ? 'text-brand' : 'text-slate-400'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
