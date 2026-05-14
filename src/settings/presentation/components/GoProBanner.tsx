import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {ArrowRight, Crown} from 'lucide-react-native';

interface GoProBannerProps {
  onPress?: () => void;
}

export default function GoProBanner({onPress}: GoProBannerProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="surface-brand overflow-hidden rounded-[32px] px-6 py-5">
      {/* Decorative circle */}
      <View className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          {/* Icon circle */}
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Crown size={24} color="#ffffff" />
          </View>
          <View>
            <Text className="text-heading text-inverse">Go Pro Account</Text>
            <Text className="text-body-secondary mt-0.5 text-white/80">
              Mở khóa tất cả tính năng cao cấp
            </Text>
          </View>
        </View>
        <ArrowRight size={22} color="#ffffff" />
      </View>
    </TouchableOpacity>
  );
}
