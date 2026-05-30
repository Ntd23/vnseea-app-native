// Description: Renders real saved posts for the Settings -> Saved screen.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Play,
  Search,
  Share2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { SavedItem, SavedItemKind } from '../../domain/types/saved.types';
import {
  type SavedFilter,
  useSavedViewModel,
} from '../../application/view-models/useSavedViewModel';

type SavedPostsNav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS: Array<{ id: SavedFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'text', label: 'Bài viết' },
  { id: 'photo', label: 'Ảnh' },
  { id: 'video', label: 'Video' },
];

function formatPostTime(timestamp?: number) {
  if (!timestamp) return 'Đã lưu';

  const postedMs = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - postedMs) / 1000));

  if (diffSeconds < 60) return 'Bài viết vừa đăng';
  if (diffSeconds < 3600) return `Bài viết ${Math.floor(diffSeconds / 60)} phút trước`;
  if (diffSeconds < 86400) return `Bài viết ${Math.floor(diffSeconds / 3600)} giờ trước`;
  if (diffSeconds < 604800) return `Bài viết ${Math.floor(diffSeconds / 86400)} ngày trước`;

  return `Bài viết ${new Date(postedMs).toLocaleDateString('vi-VN')}`;
}

function getKindLabel(kind: SavedItemKind) {
  if (kind === 'video') return 'Video';
  if (kind === 'photo') return 'Ảnh';
  return 'Bài viết';
}

function SavedSkeleton() {
  return (
    <View className="gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="surface-card flex-row p-4">
          <View className="h-24 w-24 rounded-2xl bg-slate-200" />
          <View className="ml-4 flex-1">
            <View className="h-5 w-4/5 rounded-full bg-slate-200" />
            <View className="mt-3 h-4 w-1/2 rounded-full bg-slate-200" />
            <View className="mt-3 h-4 w-2/3 rounded-full bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        <Bookmark size={38} color="#0000FF" />
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? 'Không tải được bài đã lưu' : 'Chưa có bài viết đã lưu'}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ?? 'Những bài viết bạn lưu sẽ xuất hiện tại đây.'}
      </Text>
      <TouchableOpacity
        className="btn-primary mt-6 min-h-[46px] rounded-xl px-6"
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text className="text-title-primary text-inverse">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

function SavedThumbnail({ item }: { item: SavedItem }) {
  if (item.imageUrl) {
    return (
      <View className="overflow-hidden rounded-2xl">
        <Image
          source={{ uri: item.imageUrl }}
          className="h-24 w-24"
          resizeMode="cover"
        />
        {item.kind === 'video' ? (
          <View className="absolute inset-0 items-center justify-center bg-black/20">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-black/55">
              <Play size={17} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className="preview-panel h-24 w-24 items-center justify-center">
      {item.kind === 'photo' ? (
        <ImageIcon size={28} color="#0000FF" />
      ) : item.kind === 'video' ? (
        <Play size={28} color="#0000FF" />
      ) : (
        <FileText size={28} color="#0000FF" />
      )}
    </View>
  );
}

function SavedPostsScreen() {
  const navigation = useNavigation<SavedPostsNav>();
  const vm = useSavedViewModel();

  const handleShare = useCallback(async (item: SavedItem) => {
    if (!item.postUrl) return;
    await Share.share({
      message: item.postUrl,
      url: item.postUrl,
    });
  }, []);

  const renderSavedPost = useCallback(
    ({ item }: ListRenderItemInfo<SavedItem>) => (
      <View className="surface-card mb-4 overflow-hidden">
        <View className="flex-row p-4">
          <SavedThumbnail item={item} />
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <Text className="flex-1 text-title-primary" numberOfLines={2}>
                {item.title}
              </Text>
              <MoreHorizontal size={20} color="#94A3B8" />
            </View>
            <Text className="mt-1 text-caption-primary">{item.author}</Text>
            <Text className="mt-1 text-caption-secondary">
              {getKindLabel(item.kind)} · {formatPostTime(item.postedAt)}
            </Text>
            <TouchableOpacity
              className="mt-3 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => handleShare(item)}
            >
              <Share2 size={17} color="#0000FF" />
              <Text className="ml-2 text-caption-primary text-brand">
                Chia sẻ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [handleShare],
  );

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">Bài viết đã lưu</Text>
        </View>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={21} color="#0000FF" />
        </TouchableOpacity>
      </View>

      <FlatList
        className="flex-1"
        data={vm.filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderSavedPost}
        contentContainerClassName="px-4 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor="#0000FF"
            colors={['#0000FF']}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <>
            <View className="preview-panel mb-5 flex-row items-center p-4">
              <View className="icon-chip h-14 w-14 items-center justify-center">
                <Bookmark size={28} color="#0000FF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-heading">Đã lưu</Text>
                <Text className="mt-1 text-body-secondary">
                  Xem lại bài viết, ảnh và video bạn muốn đọc sau.
                </Text>
              </View>
            </View>

            <View className="mb-4 flex-row gap-3">
              {FILTERS.map(filter => (
                <TouchableOpacity
                  key={filter.id}
                  className={`rounded-full px-4 py-2 ${
                    vm.filter === filter.id ? 'surface-brand' : 'surface-muted'
                  }`}
                  activeOpacity={0.8}
                  onPress={() => vm.setFilter(filter.id)}
                >
                  <Text
                    className={
                      vm.filter === filter.id
                        ? 'text-caption-primary text-inverse'
                        : 'text-caption-secondary'
                    }
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <SavedSkeleton />
          ) : (
            <EmptyState error={vm.error} onRetry={vm.retry} />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator color="#0000FF" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default SavedPostsScreen;
