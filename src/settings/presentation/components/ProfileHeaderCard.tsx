import React from 'react';
import {Text, TouchableOpacity, View, Image} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import type {UserProfile} from '../../domain/types/settings.types';

interface ProfileHeaderCardProps {
  profile: UserProfile | null;
  onPress?: () => void;
  viewProfileLabel?: string;
}

export default function ProfileHeaderCard({
  profile,
  onPress,
  viewProfileLabel = 'Xem hồ sơ',
}: ProfileHeaderCardProps) {
  // Handle loading state - show skeleton or placeholder
  if (!profile) {
    return (
      <View className="surface-card flex-row items-center gap-4 px-5 py-4">
        {/* Loading Skeleton */}
        <View className="h-16 w-16 rounded-full bg-gray-200" />
        <View className="flex-1">
          <View className="h-5 w-32 rounded bg-gray-200 mb-2" />
          <View className="h-4 w-24 rounded bg-gray-200" />
        </View>
        <View className="h-5 w-5 rounded-full bg-gray-200" />
      </View>
    );
  }

  const initials = profile.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="surface-card flex-row items-center gap-4 px-5 py-4">
      {/* Avatar - use real image if available, fallback to initials */}
      <View className="relative">
        {profile.avatarUrl ? (
          <Image
            source={{uri: profile.avatarUrl}}
            className="h-16 w-16 rounded-full border-2 border-brand"
            resizeMode="cover"
          />
        ) : (
          <View className="avatar-xl items-center justify-center rounded-full border-2 border-brand bg-[#eef0ff]">
            <Text className="text-heading text-brand">{initials}</Text>
          </View>
        )}
        {profile.isOnline && (
          <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
        )}
      </View>

      {/* Name + CTA */}
      <View className="flex-1">
        <Text className="text-heading">{profile.name}</Text>
        <Text className="text-label-primary text-brand mt-1">
          {viewProfileLabel}
        </Text>
      </View>

      {/* Chevron */}
      <ChevronRight size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}
