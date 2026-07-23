import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {
  Bell,
  ChevronRight,
  Globe2,
  HelpCircle,
  Info,
  Link,
  Lock,
  LogOut,
  MapPin,
  User,
  Wallet,
} from 'lucide-react-native';
import type {SettingsMenuItem} from '../../domain/types/settings.types';

const ICON_MAP: Record<string, React.ComponentType<{size: number; color: string}>> = {
  User,
  Globe2,
  Lock,
  Bell,
  Link,
  Info,
  MapPin,
  Wallet,
  HelpCircle,
  LogOut,
};

interface SettingsMenuListProps {
  items: SettingsMenuItem[];
  onItemPress?: (id: string) => void;
  sectionTitle?: string;
}

function SettingsMenuRow({
  item,
  onPress,
  isLast,
}: {
  item: SettingsMenuItem;
  onPress?: () => void;
  isLast: boolean;
}) {
  const IconComponent = ICON_MAP[item.iconKey];
  const iconColor = item.isDestructive ? '#ef4444' : APP_BRAND_COLOR;
  const textColorClass = item.isDestructive
    ? 'text-[#ef4444]'
    : 'text-[#1a1c1e]';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`flex-row items-center gap-4 px-5 py-4 ${
        !isLast ? 'border-b border-slate-200' : ''
      }`}>
      <View>
        {IconComponent ? (
          <IconComponent size={22} color={iconColor} />
        ) : null}
      </View>
      <View className="flex-1">
        <Text className={`text-[16px] leading-6 ${textColorClass}`}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text className="mt-0.5 text-[13px] leading-5 text-[#64748b]">
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight
        size={18}
        color={item.isDestructive ? '#ef4444' : '#94a3b8'}
      />
    </TouchableOpacity>
  );
}

export default function SettingsMenuList({
  items,
  onItemPress,
  sectionTitle = 'OTHER SETTINGS',
}: SettingsMenuListProps) {
  return (
    <View>
      {/* Section header */}
      <Text className="text-label-secondary mb-3 px-2">{sectionTitle}</Text>

      {/* Menu card */}
      <View className="surface-card overflow-hidden">
        {items.map((item, index) => (
          <SettingsMenuRow
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
            onPress={() => onItemPress?.(item.id)}
          />
        ))}
      </View>
    </View>
  );
}
