import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, X } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import type { MessageItem } from '../../domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CONVERSATION_SEARCH
>;

const repository = createMessagesRepository();

function formatMessageTime(time: number) {
  if (!time) return '';
  return new Date(time * 1000).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSearchResultPreview(message: MessageItem) {
  if (message.storyReply) {
    return message.message
      ? `Trả lời một tin · ${message.message}`
      : 'Trả lời một tin';
  }
  if (message.message) return message.message;
  if (message.media) return 'Tin nhắn có tệp đính kèm';
  return 'Tin nhắn';
}

export default function ConversationSearchScreen({ navigation, route }: Props) {
  const { chat } = route.params;
  const { isDark } = useAppTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setResults([]);
      setError('');
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');
    const timeout = setTimeout(() => {
      repository
        .searchConversationMessages(chat, normalizedQuery)
        .then(items => {
          if (!cancelled) {
            setResults(items);
            setError('');
          }
        })
        .catch(caught => {
          if (!cancelled) {
            setError(
              caught instanceof Error
                ? caught.message
                : 'Không thể tìm kiếm tin nhắn.',
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [chat, query]);

  const openMessage = useCallback(
    (messageId: string) => {
      navigation.popTo(ROUTES.CHAT, {
        chat,
        highlightMessageId: messageId,
      });
    },
    [chat, navigation],
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
        title="Tìm kiếm trong cuộc trò chuyện"
        onBack={() => navigation.goBack()}
      />
      <View
        className="mx-4 my-3 min-h-[48px] flex-row items-center rounded-xl border px-3"
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        }}
      >
        <Search size={20} color="#64748B" />
        <TextInput
          autoFocus
          className="ml-2 flex-1 text-[15px] text-slate-950 dark:text-white"
          placeholder="Nhập nội dung tin nhắn"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity
            accessibilityLabel="Xóa từ khóa"
            className="h-9 w-9 items-center justify-center"
            onPress={() => setQuery('')}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={APP_BRAND_COLOR} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-red-600">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingBottom: 28,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              <Search size={34} color="#94A3B8" />
              <Text className="mt-3 text-center text-sm text-slate-500">
                {query.trim().length < 2
                  ? 'Nhập ít nhất 2 ký tự để tìm tin nhắn.'
                  : 'Không tìm thấy tin nhắn phù hợp.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="surface-card mb-2 rounded-lg px-4 py-3"
              style={
                isDark
                  ? { backgroundColor: '#111827', borderColor: '#293241' }
                  : undefined
              }
              onPress={() => openMessage(item.id)}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  {item.isSentByMe ? 'Bạn' : chat.name}
                </Text>
                <Text className="text-[11px] text-slate-400">
                  {formatMessageTime(item.time)}
                </Text>
              </View>
              <Text
                className="mt-1 text-[14px] text-slate-900 dark:text-white"
                numberOfLines={3}
              >
                {getSearchResultPreview(item)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
