import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, ChevronUp, Pin } from 'lucide-react-native';
import type { PinnedMessageItem } from '../../domain/types/messages.types';

type Props = {
  pinnedMessages: PinnedMessageItem[];
  partnerName: string;
  isLoading?: boolean;
  onOpenMessage: (messageId: string) => void;
};

function getPinnedMessageText(message: PinnedMessageItem) {
  if (message.storyReply) return 'Trả lời một tin';
  if (message.sharedPost) return 'Bài viết được chia sẻ';
  if (message.callEvent) return 'Cuộc gọi';
  if (message.message.trim()) return message.message.trim();
  if (message.mediaType === 'image') return 'Hình ảnh';
  if (message.mediaType === 'video') return 'Video';
  if (message.mediaType === 'audio') return 'Tin nhắn thoại';
  if (message.media) return 'Tệp đính kèm';
  return 'Tin nhắn';
}

function getPinnedActorName(
  message: PinnedMessageItem,
  partnerName: string,
) {
  if (message.pinnedByName && message.pinnedByName !== 'Người dùng') {
    return message.pinnedByName;
  }
  return partnerName;
}

export function PinnedMessagesBanner({
  pinnedMessages,
  partnerName,
  isLoading = false,
  onOpenMessage,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const latestPinnedMessage = pinnedMessages[0];

  if (!isLoading && pinnedMessages.length === 0) return null;

  return (
    <View className="border-b border-blue-100 bg-blue-50/80 px-3 py-1.5">
      <View className="min-h-10 flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.75}
          className="min-h-10 flex-1 flex-row items-center"
          disabled={!latestPinnedMessage}
          onPress={() => {
            if (latestPinnedMessage) onOpenMessage(latestPinnedMessage.id);
          }}
          accessibilityRole="button"
          accessibilityLabel="Mở tin nhắn ghim mới nhất"
        >
          <Pin size={17} color="#1d4ed8" fill="#1d4ed8" />
          <Text
            className="ml-2 flex-1 text-sm font-semibold text-blue-950"
            numberOfLines={1}
          >
            {latestPinnedMessage
              ? `${getPinnedMessageText(latestPinnedMessage)} (${pinnedMessages.length})`
              : 'Đang tải tin nhắn đã ghim'}
          </Text>
        </TouchableOpacity>

        {isLoading && pinnedMessages.length === 0 ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center"
            activeOpacity={0.7}
            onPress={() => setExpanded(current => !current)}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? 'Thu gọn tin nhắn đã ghim'
                : 'Mở tất cả tin nhắn đã ghim'
            }
          >
            {expanded ? (
              <ChevronUp size={20} color="#1d4ed8" />
            ) : (
              <ChevronDown size={20} color="#1d4ed8" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {expanded && pinnedMessages.length > 0 ? (
        <ScrollView
          style={styles.list}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {pinnedMessages.map((message, index) => (
            <TouchableOpacity
              key={message.id}
              className={`min-h-12 flex-row items-center py-2 ${
                index > 0 ? 'border-t border-blue-100' : ''
              }`}
              activeOpacity={0.75}
              onPress={() => onOpenMessage(message.id)}
            >
              <Pin size={15} color="#2563eb" />
              <View className="ml-2 flex-1">
                <Text className="text-xs font-semibold text-blue-800">
                  {getPinnedActorName(message, partnerName)} đã ghim
                </Text>
                <Text className="mt-0.5 text-sm text-gray-800" numberOfLines={2}>
                  {getPinnedMessageText(message)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 240,
  },
});
