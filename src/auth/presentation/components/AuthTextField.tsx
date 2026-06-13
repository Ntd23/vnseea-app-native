// Description: Branded text input with a leading icon chip, optional trailing
// password toggle, and a clean border transition for focus state.

import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  LayoutChangeEvent,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  onFocus?: () => void;
  onBlur?: () => void;
  onContainerLayout?: (event: LayoutChangeEvent) => void;
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
  onFocus,
  onBlur,
  onContainerLayout,
}: AuthTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const borderColor = isFocused ? '#0000ff' : 'rgba(0, 0, 255, 0.12)';

  return (
    <View className="w-full" onLayout={onContainerLayout}>
      {label ? (
        <Text className="mb-2 text-[14px] font-extrabold text-slate-900">
          {label}
        </Text>
      ) : null}
      <View className="relative">
        <View
          className="flex-row items-center rounded-[20px] bg-white px-3.5"
          style={{
            height: 56,
            borderWidth: isFocused ? 1.5 : 1,
            borderColor,
            shadowColor: '#0000ff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isFocused ? 0.1 : 0,
            shadowRadius: 12,
            elevation: isFocused ? 2 : 0,
          }}
        >
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF]">
            {icon}
          </View>
          <TextInput
            className="flex-1 text-[15px] font-medium text-slate-900"
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
