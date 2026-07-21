import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  ImageIcon,
  Mic,
  Pin,
  Video,
} from 'lucide-react-native';
import type { PinnedMessageItem } from '../../domain/types/messages.types';

type Props = {
  pinnedMessages: PinnedMessageItem[];
  partnerName: string;
  isLoading?: boolean;
  onOpenMessage: (messageId: string) => void;
};

function getPinnedMessageText(message: PinnedMessageItem) {
  if (message.sharedPost) return 'Bài viết được chia sẻ';
  if (message.callEvent) return 'Cuộc gọi';
  if (message.message.trim()) return message.message.trim();
  if (message.mediaType === 'image') return 'Hình ảnh';
  if (message.mediaType === 'video') return 'Video';
  if (message.mediaType === 'audio') return 'Tin nhắn thoại';
  if (message.media) return 'Tệp đính kèm';
  return 'Tin nhắn';
}

function PinnedMediaIcon({ message }: { message: PinnedMessageItem }) {
  if (message.mediaType === 'image') {
    return <ImageIcon size={16} color="#2563eb" />;
  }
  if (message.mediaType === 'video') {
    return <Video size={16} color="#2563eb" />;
  }
  if (message.mediaType === 'audio') {
    return <Mic size={16} color="#2563eb" />;
  }
  if (message.media) return <FileText size={16} color="#2563eb" />;
  return <Pin size={16} color="#2563eb" />;
}

export function PinnedMessagesBanner({
  pinnedMessages,
  partnerName,
  isLoading = false,
  onOpenMessage,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const latestPinnedMessage = pinnedMessages[0];
  const visibleMessages = useMemo(
    () => (expanded ? pinnedMessages : latestPinnedMessage ? [latestPinnedMessage] : []),
    [expanded, latestPinnedMessage, pinnedMessages],
  );

  if (!isLoading && pinnedMessages.length === 0) return null;

  return (
    <View className="border-b border-blue-100 bg-blue-50/80 px-3 py-2">
      <TouchableOpacity
        activeOpacity={0.75}
        className="flex-row items-center"
        onPress={() => {
          if (pinnedMessages.length > 1) setExpanded(current => !current);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? 'Thu gọn tin nhắn đã ghim' : 'Mở tất cả tin nhắn đã ghim'
        }
      >
        <Pin size={17} color="#1d4ed8" fill="#1d4ed8" />
        <Text className="ml-2 flex-1 text-sm font-bold text-blue-900">
          Tin nhắn đã ghim
          {pinnedMessages.length > 1 ? ` (${pinnedMessages.length})` : ''}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : pinnedMessages.length > 1 ? (
          expanded ? (
            <ChevronUp size={19} color="#1d4ed8" />
          ) : (
            <ChevronDown size={19} color="#1d4ed8" />
          )
        ) : null}
      </TouchableOpacity>

      {visibleMessages.length > 0 && (
        <ScrollView
          style={styles.list}
          className="mt-1"
          nestedScrollEnabled
          showsVerticalScrollIndicator={expanded}
        >
          {visibleMessages.map((message, index) => (
            <TouchableOpacity
              key={message.id}
              className={`flex-row items-center py-2 ${
                index > 0 ? 'border-t border-blue-100' : ''
              }`}
              activeOpacity={0.75}
              onPress={() => onOpenMessage(message.id)}
            >
              {message.mediaType === 'image' && message.media ? (
                <Image
                  source={{ uri: message.media }}
                  className="h-9 w-9 rounded-md bg-blue-100"
                />
              ) : (
                <View className="h-9 w-9 items-center justify-center rounded-md bg-blue-100">
                  <PinnedMediaIcon message={message} />
                </View>
              )}
              <View className="ml-2 flex-1">
                <Text className="text-xs font-semibold text-blue-800">
                  {message.isSentByMe ? 'Bạn' : partnerName}
                </Text>
                <Text
                  className="mt-0.5 text-sm text-gray-800"
                  numberOfLines={expanded ? 2 : 1}
                >
                  {getPinnedMessageText(message)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 240,
  },
});
