import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PinOff, Pin } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import type {
  ChatItem,
  PinnedMessageItem,
} from '../../domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CONVERSATION_PINNED
>;

const repository = createMessagesRepository();
const styles = StyleSheet.create({
  darkScreen: { backgroundColor: '#020617' },
  listContent: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  darkCard: { backgroundColor: '#111827', borderColor: '#293241' },
});

export default function ConversationPinnedScreen({ navigation, route }: Props) {
  const { chat } = route.params;
  const { isDark } = useAppTheme();
  const [messages, setMessages] = useState<PinnedMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const resolvePinnedChat = useCallback(async (): Promise<ChatItem> => {
    if (chat.chatType === 'group') return chat;
    if (chat.hasConversationRecord && chat.chatId) return chat;
    const conversation = await repository.findUserConversation(
      chat.participantId || chat.userId,
    );
    if (!conversation?.chatId) {
      throw new Error('Cuộc trò chuyện chưa có mã hợp lệ.');
    }
    return conversation;
  }, [chat]);

  const loadPinnedMessages = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setMessages(await repository.getPinnedMessages(await resolvePinnedChat()));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể tải tin nhắn đã ghim.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [resolvePinnedChat]);

  useEffect(() => {
    loadPinnedMessages().catch(() => undefined);
  }, [loadPinnedMessages]);

  const unpin = useCallback(
    async (message: PinnedMessageItem) => {
      try {
        await repository.setMessagePinned(
          await resolvePinnedChat(),
          message.id,
          false,
        );
        setMessages(current => current.filter(item => item.id !== message.id));
      } catch (caught) {
        Alert.alert(
          'Không thể bỏ ghim',
          caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
        );
      }
    },
    [resolvePinnedChat],
  );

  return (
    <SafeAreaView
      className="flex-1 surface-base"
      edges={['top']}
      style={isDark ? styles.darkScreen : undefined}
    >
      <FocusAwareStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <ConversationScreenHeader
        title="Tin nhắn đã ghim"
        onBack={() => navigation.goBack()}
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={APP_BRAND_COLOR} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-red-600">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-brand px-4 py-3"
            onPress={loadPinnedMessages}
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Pin size={38} color="#94A3B8" />
              <Text className="mt-3 text-center text-sm text-slate-500">
                Chưa có tin nhắn nào được ghim.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="surface-card mb-2 flex-row items-center rounded-lg px-4 py-3"
              style={
                isDark ? styles.darkCard : undefined
              }
              onPress={() =>
                navigation.popTo(ROUTES.CHAT, {
                  chat,
                  highlightMessageId: item.id,
                })
              }
            >
              <View className="flex-1 pr-3">
                <Text className="text-xs font-semibold text-slate-500">
                  {item.isSentByMe ? 'Bạn' : chat.name}
                </Text>
                <Text
                  className="mt-1 text-sm text-slate-900 dark:text-white"
                  numberOfLines={3}
                >
                  {item.message || 'Tin nhắn có tệp đính kèm'}
                </Text>
              </View>
              {item.canUnpin ? (
                <TouchableOpacity
                  accessibilityLabel="Bỏ ghim tin nhắn"
                  className="h-11 w-11 items-center justify-center rounded-full bg-red-50"
                  onPress={event => {
                    event.stopPropagation();
                    unpin(item).catch(() => undefined);
                  }}
                >
                  <PinOff size={20} color="#DC2626" />
                </TouchableOpacity>
              ) : (
                <Text className="max-w-24 text-right text-xs text-slate-500">
                  {item.pinnedByName} đã ghim
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
