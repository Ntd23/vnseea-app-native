import { APP_BRAND_COLOR } from '../../../../shared-kernel/presentation/theme/appColors';
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
import { Check, CircleAlert, Users } from 'lucide-react-native';
import type { ChatItem } from '../../../../messages/domain/types/messages.types';
import {
  getMessageShareRecipient,
  type MessageRecipientStatuses,
} from '../../../application/sharing/shareMessageRecipients';

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

interface FeedShareRecipientCarouselProps {
  title: string;
  emptyLabel: string;
  loadingLabel: string;
  errorLabel?: string | null;
  retryLabel: string;
  selectedLabel: string;
  chats: ChatItem[];
  selectedIds: string[];
  statuses: MessageRecipientStatuses;
  isLoading: boolean;
  disabled: boolean;
  onToggle: (recipientId: string) => void;
  onRetry: () => void;
}

export function FeedShareRecipientCarousel({
  title,
  emptyLabel,
  loadingLabel,
  errorLabel,
  retryLabel,
  selectedLabel,
  chats,
  selectedIds,
  statuses,
  isLoading,
  disabled,
  onToggle,
  onRetry,
}: FeedShareRecipientCarouselProps) {
  return (
    <View className="mt-5">
      <View className="mb-3 flex-row items-center justify-between px-1">
        <Text className="text-[16px] font-extrabold text-slate-900">
          {title}
        </Text>
        {selectedIds.length > 0 ? (
          <Text className="text-[12px] font-bold text-brand">
            {selectedLabel}
          </Text>
        ) : null}
      </View>

      {!isLoading && errorLabel ? (
        <View className="mb-3 justify-center rounded-lg bg-amber-50 px-3 py-2.5">
          <Text className="text-[13px] font-semibold text-amber-800">
            {errorLabel}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={disabled}
            onPress={onRetry}
            className="mt-2 min-h-10 self-start justify-center rounded-lg bg-brand px-4"
          >
            <Text className="text-[12px] font-extrabold text-white">
              {retryLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading ? (
        <View className="min-h-[116px] items-center justify-center">
          <ActivityIndicator color={APP_BRAND_COLOR} />
          <Text className="mt-2 text-[12px] font-semibold text-slate-500">
            {loadingLabel}
          </Text>
        </View>
      ) : chats.length === 0 && !errorLabel ? (
        <View className="min-h-[84px] justify-center rounded-lg bg-slate-50 px-3">
          <Text className="text-[13px] font-semibold text-slate-500">
            {emptyLabel}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalContent}
        >
          {chats.map(chat => {
            const recipient = getMessageShareRecipient(chat);
            if (!recipient) return null;
            const selected = selectedIds.includes(recipient.key);
            const status = statuses[recipient.key];
            const sent = status === 'sent';
            const failed = status === 'failed';

            return (
              <TouchableOpacity
                key={recipient.key}
                activeOpacity={0.85}
                disabled={disabled || sent}
                onPress={() => onToggle(recipient.key)}
                className="mr-3 w-[72px] items-center"
              >
                <View
                  className={`relative rounded-full border-2 p-0.5 ${
                    selected ? 'border-brand' : 'border-transparent'
                  }`}
                >
                  <Image
                    source={{ uri: chat.avatar || FALLBACK_AVATAR }}
                    className="h-14 w-14 rounded-full bg-slate-200"
                  />
                  {chat.chatType === 'group' ? (
                    <View className="absolute -right-0.5 -top-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-700">
                      <Users size={10} color="#ffffff" strokeWidth={2.5} />
                    </View>
                  ) : null}
                  {status === 'sending' ? (
                    <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  ) : selected || sent ? (
                    <View
                      className={`absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
                        failed ? 'bg-red-600' : 'bg-brand'
                      }`}
                    >
                      {failed ? (
                        <CircleAlert size={11} color="#ffffff" />
                      ) : (
                        <Check size={11} color="#ffffff" strokeWidth={3} />
                      )}
                    </View>
                  ) : null}
                </View>
                <Text
                  className="mt-1.5 text-center text-[11px] font-bold text-slate-700"
                  numberOfLines={2}
                >
                  {chat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContent: {
    paddingRight: 8,
  },
});
