import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FileText, Link as LinkIcon, Play, X } from 'lucide-react-native';
import VideoPlayer from 'react-native-video';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import type {
  ConversationAssetCategory,
  ConversationAssetsCursor,
  MessageItem,
} from '../../domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import { extractConversationLink } from '../utils/conversationLinks';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CONVERSATION_MEDIA
>;

const repository = createMessagesRepository();
const TABS: Array<{ key: ConversationAssetCategory; label: string }> = [
  { key: 'media', label: 'Ảnh & Video' },
  { key: 'files', label: 'Tệp' },
  { key: 'links', label: 'Liên kết' },
];
function getMessageUrl(message: MessageItem) {
  return message.media || extractConversationLink(message.message);
}

export default function ConversationMediaScreen({ navigation, route }: Props) {
  const { chat } = route.params;
  const { isDark } = useAppTheme();
  const participantId = chat.participantId || chat.userId;
  const [activeTab, setActiveTab] =
    useState<ConversationAssetCategory>('media');
  const [items, setItems] = useState<MessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<ConversationAssetsCursor>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [viewerItem, setViewerItem] = useState<MessageItem>();
  const requestVersionRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const loadPage = useCallback(
    async (
      category: ConversationAssetCategory,
      cursor: ConversationAssetsCursor | undefined,
      append: boolean,
      requestVersion: number,
    ) => {
      if (!participantId) return;
      if (append) {
        if (!cursor || isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError('');
      try {
        const page = await repository.getConversationAssets(
          participantId,
          category,
          cursor,
        );
        if (requestVersion !== requestVersionRef.current) return;
        setItems(current => {
          const merged = append ? [...current, ...page.items] : page.items;
          return Array.from(
            new Map(merged.map(item => [item.id, item])).values(),
          );
        });
        setNextCursor(page.nextCursor);
      } catch (caught) {
        if (requestVersion !== requestVersionRef.current) return;
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không thể tải nội dung đã chia sẻ.',
        );
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        }
      }
    },
    [participantId],
  );

  useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    isLoadingMoreRef.current = false;
    setItems([]);
    setNextCursor(undefined);
    loadPage(activeTab, undefined, false, requestVersion).catch(
      () => undefined,
    );
  }, [activeTab, loadPage, participantId]);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    loadPage(activeTab, nextCursor, true, requestVersionRef.current).catch(
      () => undefined,
    );
  }, [activeTab, loadPage, nextCursor]);

  const emptyCopy = useMemo(() => {
    if (activeTab === 'files') return 'Chưa có tệp nào được chia sẻ.';
    if (activeTab === 'links') return 'Chưa có liên kết nào được chia sẻ.';
    return 'Chưa có ảnh hoặc video nào được chia sẻ.';
  }, [activeTab]);

  const openItem = useCallback((item: MessageItem) => {
    const url = getMessageUrl(item);
    if (!url) return;
    if (item.mediaType === 'image' || item.mediaType === 'video') {
      setViewerItem(item);
      return;
    }
    Linking.openURL(url).catch(() => undefined);
  }, []);

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
        title="File phương tiện, liên kết và tệp"
        onBack={() => navigation.goBack()}
      />
      <View
        className="mx-4 my-3 flex-row rounded-xl p-1"
        style={{ backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            className="min-h-[42px] flex-1 items-center justify-center rounded-lg"
            style={
              activeTab === tab.key
                ? { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }
                : undefined
            }
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              className="text-[13px] font-semibold"
              style={{ color: activeTab === tab.key ? '#0000FF' : '#64748B' }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0000FF" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-red-600">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-[#0000ff] px-4 py-3"
            onPress={() => {
              const requestVersion = requestVersionRef.current + 1;
              requestVersionRef.current = requestVersion;
              loadPage(activeTab, undefined, false, requestVersion).catch(
                () => undefined,
              );
            }}
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={activeTab === 'media' ? 'media-grid' : 'asset-list'}
          data={items}
          keyExtractor={item => item.id}
          numColumns={activeTab === 'media' ? 3 : 1}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 12,
            paddingBottom: 32,
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator className="my-4" color="#0000FF" />
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8">
              {activeTab === 'links' ? (
                <LinkIcon size={38} color="#94A3B8" />
              ) : (
                <FileText size={38} color="#94A3B8" />
              )}
              <Text className="mt-3 text-center text-sm text-slate-500">
                {emptyCopy}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const url = getMessageUrl(item);
            if (activeTab === 'media') {
              return (
                <TouchableOpacity
                  className="m-0.5 aspect-square flex-1 overflow-hidden bg-slate-200"
                  onPress={() => openItem(item)}
                >
                  <Image
                    source={{ uri: item.thumbnail || url }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                  {item.mediaType === 'video' ? (
                    <View className="absolute inset-0 items-center justify-center bg-black/20">
                      <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                className="surface-card mb-2 min-h-[58px] flex-row items-center rounded-lg px-4 py-3"
                style={
                  isDark
                    ? { backgroundColor: '#111827', borderColor: '#293241' }
                    : undefined
                }
                onPress={() => openItem(item)}
              >
                {activeTab === 'links' ? (
                  <LinkIcon size={22} color="#0000FF" />
                ) : (
                  <FileText size={22} color="#0000FF" />
                )}
                <Text
                  className="ml-3 flex-1 text-sm text-slate-900 dark:text-white"
                  numberOfLines={2}
                >
                  {activeTab === 'links'
                    ? url
                    : url.split('/').pop() || 'Tệp đính kèm'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={Boolean(viewerItem)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerItem(undefined)}
      >
        <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
          <TouchableOpacity
            accessibilityLabel="Đóng"
            className="absolute right-4 top-4 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/20"
            onPress={() => setViewerItem(undefined)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {viewerItem?.mediaType === 'video' ? (
            <VideoPlayer
              source={{ uri: viewerItem.media }}
              style={{ flex: 1 }}
              controls
              resizeMode="contain"
            />
          ) : viewerItem ? (
            <Image
              source={{ uri: viewerItem.media }}
              className="flex-1"
              resizeMode="contain"
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
