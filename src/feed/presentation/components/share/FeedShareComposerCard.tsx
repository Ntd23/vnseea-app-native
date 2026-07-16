import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, Share2 } from 'lucide-react-native';

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

interface FeedShareComposerCardProps {
  avatarUri?: string;
  displayName: string;
  targetLabel: string;
  note: string;
  notePlaceholder: string;
  ctaLabel: string;
  isSubmitting: boolean;
  disabled: boolean;
  error?: string | null;
  preview?: ReactNode;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
}

export function FeedShareComposerCard({
  avatarUri,
  displayName,
  targetLabel,
  note,
  notePlaceholder,
  ctaLabel,
  isSubmitting,
  disabled,
  error,
  preview,
  onNoteChange,
  onSubmit,
}: FeedShareComposerCardProps) {
  return (
    <View className="surface-card rounded-lg border border-slate-200 p-3">
      <View className="flex-row items-center">
        <Image
          source={{ uri: avatarUri || FALLBACK_AVATAR }}
          className="h-11 w-11 rounded-full bg-slate-200"
        />
        <View className="ml-2.5 flex-1">
          <Text
            className="text-[15px] font-extrabold text-slate-900"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View className="mt-1 self-start flex-row items-center rounded-md bg-slate-100 px-2 py-1">
            <Text
              className="max-w-[190px] text-[11px] font-extrabold text-slate-600"
              numberOfLines={1}
            >
              {targetLabel}
            </Text>
            <ChevronDown size={12} color="#64748b" />
          </View>
        </View>
      </View>

      <TextInput
        value={note}
        onChangeText={onNoteChange}
        placeholder={notePlaceholder}
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        className="mt-3 min-h-[66px] px-1 py-2 text-[15px] font-semibold text-slate-900"
      />

      {preview ? (
        <View className="mb-3 w-[150px] self-center">{preview}</View>
      ) : null}

      {error ? (
        <View className="mb-2 rounded-md bg-red-50 p-2.5">
          <Text className="text-[12px] font-bold text-red-700">{error}</Text>
        </View>
      ) : null}

      <View className="flex-row justify-end">
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={disabled}
          onPress={onSubmit}
          className={`min-h-11 flex-row items-center justify-center rounded-lg bg-[#0000ff] px-4 ${
            disabled ? 'opacity-40' : ''
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Share2 size={16} color="#ffffff" />
              <Text className="ml-2 text-[13px] font-extrabold text-white">
                {ctaLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
