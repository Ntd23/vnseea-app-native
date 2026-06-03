// Description: Renders the settings shortcut grid with token-aligned blue feature icons.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Bell,
  Bookmark,
  Briefcase,
  Calendar,
  Clock,
  Film,
  Flag,
  FileText,
  Flame,
  Gamepad2,
  HeartHandshake,
  Image,
  Images,
  LayoutGrid,
  Link,
  MapPinned,
  Megaphone,
  MessageCircle,
  Pointer,
  Radio,
  Rocket,
  Store,
  Tag,
  UserPlus,
  UserSearch,
  Users,
  Video,
} from 'lucide-react-native';
import type { FeatureGridItem } from '../../domain/types/settings.types';

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size: number; color: string }>
> = {
  MessageCircle,
  UserPlus,
  Pointer,
  Images,
  Image,
  Video,
  Bookmark,
  Users,
  Flag,
  FileText,
  Store,
  Rocket,
  Flame,
  Calendar,
  UserSearch,
  Tag,
  Film,
  Briefcase,
  LayoutGrid,
  Clock,
  HeartHandshake,
  Gamepad2,
  Radio,
  Megaphone,
  Bell,
  Link,
  MapPinned,
};

interface FeatureGridProps {
  features: FeatureGridItem[];
  onFeaturePress?: (id: string) => void;
}

function FeatureGridItemView({
  item,
  onPress,
}: {
  item: FeatureGridItem;
  onPress?: () => void;
}) {
  const IconComponent = ICON_MAP[item.iconKey];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="items-center gap-2"
      style={styles.item}
    >
      {IconComponent ? <IconComponent size={24} color="#0000FF" /> : null}
      <Text
        className="text-center text-[10px] font-semibold leading-tight text-[#1e293b]"
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 8,
    width: '25%',
  },
});

export default function FeatureGrid({
  features,
  onFeaturePress,
}: FeatureGridProps) {
  return (
    <View className="flex-row flex-wrap">
      {features.map(item => (
        <FeatureGridItemView
          key={item.id}
          item={item}
          onPress={() => onFeaturePress?.(item.id)}
        />
      ))}
    </View>
  );
}
