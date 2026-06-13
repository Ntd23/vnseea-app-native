// Description: Branded primary button for the auth screens.
// Includes a press-scale spring animation, loading spinner, and a trailing
// chevron icon for affordance.

import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';

interface AuthSubmitButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function AuthSubmitButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
}: AuthSubmitButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.92}
        disabled={disabled || isLoading}
        onPressIn={() => {
          scale.value = withSpring(0.97, {
            damping: 14,
            stiffness: 240,
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {
            damping: 14,
            stiffness: 240,
          });
        }}
        onPress={onPress}
        className={`mt-5 h-14 flex-row items-center justify-center rounded-[18px] ${
          disabled || isLoading ? 'bg-blue-400' : 'bg-[#0000ff]'
        }`}
        style={{
          shadowColor: '#0000ff',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: disabled || isLoading ? 0.12 : 0.26,
          shadowRadius: 22,
          elevation: 5,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View className="flex-row items-center">
            <Text className="text-[16px] font-bold text-inverse">{label}</Text>
            <View className="ml-5">
              <ArrowRight size={24} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
