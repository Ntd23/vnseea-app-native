import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import type {UserProfile} from '../../domain/types/settings.types';

interface ProfileHeaderCardProps {
  profile: UserProfile;
  onPress?: () => void;
}

export default function ProfileHeaderCard({
  profile,
  onPress,
}: ProfileHeaderCardProps) {
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
      {/* Avatar */}
      <View className="relative">
        <View className="avatar-xl items-center justify-center rounded-full border-2 border-[#0000ff] bg-[#eef0ff]">
          <Text className="text-heading text-brand">{initials}</Text>
        </View>
        {profile.isOnline && (
          <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
        )}
      </View>

      {/* Name + CTA */}
      <View className="flex-1">
        <Text className="text-heading">{profile.name}</Text>
        <Text className="text-label-primary text-brand mt-1">Xem hồ sơ</Text>
      </View>

      {/* Chevron */}
      <ChevronRight size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}
