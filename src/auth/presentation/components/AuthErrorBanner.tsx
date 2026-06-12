// Description: Inline error banner for the auth screens.
// Fades in / out using Reanimated layout transitions.

import React from 'react';
import { Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface AuthErrorBannerProps {
  message: string | null;
}

export default function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  if (!message) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(160)}
      className="mt-4 flex-row items-center rounded-xl bg-red-50 px-3.5 py-2.5"
    >
      <AlertCircle size={18} color="#dc2626" />
      <Text className="ml-2.5 flex-1 text-[13px] font-semibold text-red-600">
        {message}
      </Text>
    </Animated.View>
  );
}
