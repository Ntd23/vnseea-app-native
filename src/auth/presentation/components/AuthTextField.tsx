// Description: Branded text input with a leading icon chip, optional trailing
// password toggle, and an animated focus ring using Reanimated.

import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';

interface AuthTextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: React.ReactNode;
  isPassword?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: 'next' | 'done' | 'go' | 'send';
  onSubmitEditing?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

export default function AuthTextField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  isPassword = false,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = 'none',
  autoCorrect = false,
}: AuthTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  };

  const ringStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scale: 0.98 + focusProgress.value * 0.02 }],
  }));

  const borderColor = isFocused ? '#0000ff' : 'rgba(0, 0, 255, 0.12)';

  return (
    <View className="w-full">
      <Text className="mb-2 text-[13px] font-semibold text-slate-800">
        {label}
      </Text>
      <View className="relative">
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-2xl"
          style={[
            {
              borderWidth: 1.5,
              borderColor: '#0000ff',
            },
            ringStyle,
          ]}
        />
        <View
          className="flex-row items-center rounded-2xl bg-white px-3"
          style={{
            height: 52,
            borderWidth: 1,
            borderColor,
          }}
        >
          <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(0,0,255,0.08)]">
            {icon}
          </View>
          <TextInput
            className="flex-1 text-[14px] text-slate-900"
            placeholder={placeholder}
            placeholderTextColor="#9AA0A6"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isPassword && !showPassword}
            keyboardType={keyboardType}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            style={{ paddingVertical: 0 }}
          />
          {isPassword ? (
            <TouchableOpacity
              accessibilityLabel={showPassword ? 'hide-password' : 'show-password'}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setShowPassword(value => !value)}
              className="px-2"
            >
              {showPassword ? (
                <EyeOff size={20} color="#8A8D91" />
              ) : (
                <Eye size={20} color="#8A8D91" />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
