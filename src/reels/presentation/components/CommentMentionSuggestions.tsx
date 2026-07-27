import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReelCaptionSuggestion } from '../../domain/types/reels.types';
import { APP_COLORS } from '../../../shared-kernel/presentation/theme/appColors';

interface Props {
  visible: boolean;
  loading: boolean;
  suggestions: ReelCaptionSuggestion[];
  onSelect: (suggestion: ReelCaptionSuggestion) => void;
}

export function CommentMentionSuggestions({
  visible,
  loading,
  suggestions,
  onSelect,
}: Props) {
  if (!visible) return null;

  return (
    <View className="mb-2 max-h-[190px] overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
      <ScrollView
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={suggestions.length > 3}
        contentContainerStyle={styles.contentContainer}
      >
        {loading && suggestions.length === 0 ? (
          <View className="flex-row items-center px-3 py-3">
            <ActivityIndicator size="small" color={APP_COLORS.brand.primary} />
            <Text className="ml-2 text-caption-primary text-slate-500">
              Đang tìm người để gắn thẻ...
            </Text>
          </View>
        ) : suggestions.length === 0 ? (
          <Text className="px-3 py-3 text-caption-primary text-slate-500">
            Không tìm thấy người phù hợp.
          </Text>
        ) : (
          suggestions.map(suggestion => (
            <TouchableOpacity
              key={`${suggestion.id}-${
                suggestion.backendValue || suggestion.value
              }`}
              activeOpacity={0.75}
              className="flex-row items-center border-b border-slate-100 bg-white px-3 py-2.5"
              onPress={() => onSelect(suggestion)}
            >
              {suggestion.avatarUrl ? (
                <Image
                  source={{ uri: suggestion.avatarUrl }}
                  className="mr-2.5 h-9 w-9 rounded-full bg-slate-200"
                />
              ) : (
                <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-full bg-red-50">
                  <Text className="text-body-primary font-extrabold text-brand">
                    @
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-body-primary font-extrabold text-slate-900"
                >
                  {suggestion.label}
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-caption-secondary text-slate-500"
                >
                  {suggestion.backendValue ||
                    suggestion.subtitle ||
                    suggestion.value}
                </Text>
              </View>
              <ChevronRight size={18} color={APP_COLORS.brand.primary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 4,
  },
});
