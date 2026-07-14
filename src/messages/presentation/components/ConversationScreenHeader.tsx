import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';

export function ConversationScreenHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const { isDark } = useAppTheme();
  const foreground = isDark ? '#F8FAFC' : '#0F172A';

  return (
    <View
      className="flex-row items-center border-b px-2 py-2"
      style={{
        minHeight: 56,
        borderBottomColor: isDark ? '#293241' : '#E2E8F0',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        className="h-11 w-11 items-center justify-center rounded-full"
        onPress={onBack}
      >
        <ChevronLeft size={27} color={foreground} />
      </TouchableOpacity>
      <Text
        className="flex-1 pr-11 text-center text-[17px] font-bold"
        style={{ color: foreground }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}
