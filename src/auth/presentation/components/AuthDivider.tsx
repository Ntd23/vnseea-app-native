// Description: Horizontal divider with a centered text label,
// e.g. "hoặc" / "or" between two auth actions.

import React from 'react';
import { Text, View } from 'react-native';

interface AuthDividerProps {
  label: string;
}

export default function AuthDivider({ label }: AuthDividerProps) {
  return (
    <View className="my-5 flex-row items-center">
      <View className="h-px flex-1 bg-slate-200" />
      <Text className="mx-4 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </Text>
      <View className="h-px flex-1 bg-slate-200" />
    </View>
  );
}
