import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import type { MessageItem } from '../../domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CONVERSATION_PINNED
>;

const repository = createMessagesRepository();

export default function ConversationPinnedScreen({ navigation, route }: Props) {
  const { chat } = route.params;
  const { isDark } = useAppTheme();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPinnedMessages = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const participantId = chat.participantId || chat.userId;
      const conversation =
        chat.hasConversationRecord && chat.chatId
          ? chat
          : await repository.findUserConversation(participantId);
      if (!conversation?.chatId) {
        throw new Error('Cuộc trò chuyện chưa có mã hợp lệ.');
      }
      setMessages(await repository.getPinnedMessages(conversation.chatId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể tải tin nhắn đã ghim.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [chat]);

  useEffect(() => {
    loadPinnedMessages().catch(() => undefined);
  }, [loadPinnedMessages]);

  const unpin = useCallback(
    async (message: MessageItem) => {
      try {
        const participantId = chat.participantId || chat.userId;
        const conversation =
          chat.hasConversationRecord && chat.chatId
            ? chat
            : await repository.findUserConversation(participantId);
        if (!conversation?.chatId) {
          throw new Error('Cuộc trò chuyện chưa có mã hợp lệ.');
        }
        await repository.setMessagePinned(
          conversation.chatId,
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
    [chat],
  );

  return (
    <SafeAreaView
      className="flex-1 surface-base"
      edges={['top']}
      style={isDark ? { backgroundColor: '#020617' } : undefined}
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
          <ActivityIndicator color="#0000FF" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-red-600">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-[#0000ff] px-4 py-3"
            onPress={loadPinnedMessages}
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            paddingBottom: 32,
          }}
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
                isDark
                  ? { backgroundColor: '#111827', borderColor: '#293241' }
                  : undefined
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
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
