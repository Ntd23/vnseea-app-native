// Description: Footer row for auth screens that prompts the user to switch
// between login and register flows.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface AuthFooterLinkProps {
  prompt: string;
  action: string;
  onPress: () => void;
}

export default function AuthFooterLink({
  prompt,
  action,
  onPress,
}: AuthFooterLinkProps) {
  return (
    <View className="mt-7 flex-row items-center justify-center">
      <Text className="text-[14px] text-slate-500">{prompt}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        activeOpacity={0.75}
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="ml-1.5"
      >
        <Text className="text-[14px] font-bold text-[#0000ff]">{action}</Text>
      </TouchableOpacity>
    </View>
  );
}
