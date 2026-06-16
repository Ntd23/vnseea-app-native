// Description: Renders real saved posts for the Settings -> Saved screen.
import React, { useCallback, useEffect, useRef } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Play,
  Search,
  Share2,
  Calendar,
  Video,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { SavedItem, SavedItemKind } from '../../domain/types/saved.types';
import type { FeedVideoPost } from '../../../feed/domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import {
  type SavedFilter,
  useSavedViewModel,
} from '../../application/view-models/useSavedViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

type SavedPostsNav = NativeStackNavigationProp<RootStackParamList>;

const SAVED_COPY = {
  vi: {
    headerTitle: 'Bài viết đã lưu',
    bannerTitle: 'Đã lưu',
    bannerSubtitle: 'Xem lại bài viết, ảnh và video bạn muốn đọc sau.',
    filterAll: 'Tất cả',
    filterPost: 'Bài viết',
    filterPhoto: 'Ảnh',
    filterVideo: 'Video',
    emptyTitle: 'Chưa có bài viết đã lưu',
    emptySubtitle: 'Những bài viết bạn lưu sẽ xuất hiện tại đây.',
    errorTitle: 'Không tải được bài đã lưu',
    retry: 'Thử lại',
    share: 'Chia sẻ',
    kindPhoto: 'Ảnh',
    kindVideo: 'Video',
    kindPost: 'Bài viết',
    timeJustNow: 'vừa đăng',
    timeMinutesAgo: (count: number) => `${count} phút trước`,
    timeHoursAgo: (count: number) => `${count} giờ trước`,
    timeDaysAgo: (count: number) => `${count} ngày trước`,
    timeFormatted: (dateStr: string) => `${dateStr}`,
  },
  en: {
    headerTitle: 'Saved posts',
    bannerTitle: 'Saved',
    bannerSubtitle: 'Review posts, photos, and videos you want to read later.',
    filterAll: 'All',
    filterPost: 'Posts',
    filterPhoto: 'Photos',
    filterVideo: 'Videos',
    emptyTitle: 'No saved items yet',
    emptySubtitle: 'Posts you save will appear here.',
    errorTitle: 'Could not load saved items',
    retry: 'Try again',
    share: 'Share',
    kindPhoto: 'Photo',
    kindVideo: 'Video',
    kindPost: 'Post',
    timeJustNow: 'just now',
    timeMinutesAgo: (count: number) => `${count} min ago`,
    timeHoursAgo: (count: number) => `${count} hours ago`,
    timeDaysAgo: (count: number) => `${count} days ago`,
    timeFormatted: (dateStr: string) => `${dateStr}`,
  },
};

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}

function ScaleButton({
  children,
  onPress,
  style,
  disabled,
}: ScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    if (!disabled) scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function formatPostTime(timestamp: number | undefined, copy: typeof SAVED_COPY.vi) {
  if (!timestamp) return copy.kindPost;

  const postedMs = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - postedMs) / 1000));

  if (diffSeconds < 60) return copy.timeJustNow;
  if (diffSeconds < 3600) return copy.timeMinutesAgo(Math.floor(diffSeconds / 60));
  if (diffSeconds < 86400) return copy.timeHoursAgo(Math.floor(diffSeconds / 3600));
  if (diffSeconds < 604800) return copy.timeDaysAgo(Math.floor(diffSeconds / 86400));

  const dateStr = new Date(postedMs).toLocaleDateString(
    copy === SAVED_COPY.vi ? 'vi-VN' : 'en-US',
  );
  return copy.timeFormatted(dateStr);
}

function getKindLabel(kind: SavedItemKind, copy: typeof SAVED_COPY.vi) {
  if (kind === 'video') return copy.kindVideo;
  if (kind === 'photo') return copy.kindPhoto;
  return copy.kindPost;
}

function SavedSkeleton() {
  return (
    <View className="gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 14,
            flexDirection: 'row',
            borderStyle: 'solid',
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <View style={{ width: 96, height: 96, borderRadius: 18, backgroundColor: '#f1f5f9' }} />
          <View style={{ flex: 1, marginLeft: 16, justifyContent: 'space-between', paddingVertical: 2 }}>
            <View>
              <View style={{ height: 16, width: '85%', borderRadius: 8, backgroundColor: '#f1f5f9' }} />
              <View style={{ height: 12, width: '40%', borderRadius: 6, backgroundColor: '#f1f5f9', marginTop: 8 }} />
            </View>
            <View style={{ height: 12, width: '60%', borderRadius: 6, backgroundColor: '#f8fafc' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
  copy,
}: {
  error: string | null;
  onRetry: () => void;
  copy: typeof SAVED_COPY.vi;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
        <Bookmark size={38} color="#002fff" fill="#002fff" />
      </View>
      <Text className="mt-5 text-center text-[#0f172a]" style={{ fontSize: 17, fontWeight: '800' }}>
        {error ? copy.errorTitle : copy.emptyTitle}
      </Text>
      <Text className="mt-2 text-center text-[#64748b]" style={{ fontSize: 13, fontWeight: '500' }}>
        {error ?? copy.emptySubtitle}
      </Text>
      <TouchableOpacity
        style={{
          marginTop: 24,
          minHeight: 46,
          backgroundColor: '#002fff',
          borderRadius: 12,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{copy.retry}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SavedThumbnail({ item }: { item: SavedItem }) {
  if (item.imageUrl) {
    return (
      <View style={{ width: 96, height: 96, borderRadius: 18, overflow: 'hidden' }}>
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 96, height: 96 }}
          resizeMode="cover"
        />
        {item.kind === 'video' ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ width: 96, height: 96, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
      {item.kind === 'photo' ? (
        <ImageIcon size={28} color="#002fff" />
      ) : item.kind === 'video' ? (
        <Play size={28} color="#002fff" fill="#002fff" />
      ) : (
        <FileText size={28} color="#002fff" />
      )}
    </View>
  );
}

function buildFeedVideoPost(item: SavedItem): FeedVideoPost {
  const raw = item.rawPost || {};

  const rawPublisher = (raw.publisher || raw.user_data || {}) as Record<string, any>;
  const publisherId = String(rawPublisher.user_id || rawPublisher.id || '0');
  const publisherUsername = String(rawPublisher.username || rawPublisher.user_name || item.author || 'user');
  const publisherName = item.author || publisherUsername || 'Người dùng';
  const publisherAvatar = String(rawPublisher.avatar || rawPublisher.profile_picture || '');

  const likeCount = Number(raw.postLikes || raw.likes || 0);
  const commentCount = Number(raw.post_comments || raw.commentCount || 0);
  const isLiked = Boolean(raw.isLiked || raw.postReacted || false);

  let myReaction: ReactionType | null = null;
  if (raw.reaction && typeof raw.reaction === 'object') {
    const reactionObj = raw.reaction as Record<string, any>;
    if (typeof reactionObj.type === 'string') {
      myReaction = reactionObj.type as ReactionType;
    }
  }

  return {
    kind: 'video',
    id: item.id,
    caption: item.title,
    videoUrl: item.videoUrl || '',
    thumbnailUrl: item.imageUrl,
    postedAt: item.postedAt,
    likeCount,
    commentCount,
    isLiked,
    myReaction,
    topReactions: [],
    publisher: {
      id: publisherId,
      name: publisherName,
      username: publisherUsername,
      avatarUrl: publisherAvatar || undefined,
    },
  };
}

function SavedPostsScreen() {
  const navigation = useNavigation<SavedPostsNav>();
  const vm = useSavedViewModel();
  const language = useAppLanguage();
  const copy = SAVED_COPY[language];

  const filters = [
    { id: 'all' as SavedFilter, label: copy.filterAll },
    { id: 'text' as SavedFilter, label: copy.filterPost },
    { id: 'photo' as SavedFilter, label: copy.filterPhoto },
    { id: 'video' as SavedFilter, label: copy.filterVideo },
  ];

  const handleShare = useCallback(async (item: SavedItem) => {
    if (!item.postUrl) return;
    await Share.share({
      message: item.postUrl,
      url: item.postUrl,
    });
  }, []);

  const handlePressItem = useCallback(
    (item: SavedItem) => {
      if (item.kind === 'video') {
        const post = buildFeedVideoPost(item);
        (navigation as any).navigate(ROUTES.MAIN_TABS, {
          screen: ROUTES.REELS,
          params: { initialVideoId: item.id, post, source: 'saved' },
        });
      } else {
        navigation.navigate(ROUTES.POST_DETAIL, {
          postId: item.id,
        });
      }
    },
    [navigation],
  );

  const renderSavedPost = useCallback(
    ({ item, index }: ListRenderItemInfo<SavedItem>) => {
      const MetaIcon = item.kind === 'video' ? Video : item.kind === 'photo' ? Calendar : FileText;

      return (
        <Animated.View
          entering={FadeInDown.delay(index * 70).springify().damping(15)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            marginBottom: 16,
            borderStyle: 'solid',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handlePressItem(item)}
            style={{ padding: 14, flexDirection: 'row' }}
          >
            <SavedThumbnail item={item} />
            <View style={{ flex: 1, marginLeft: 16, justifyContent: 'space-between', paddingVertical: 2 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: '#0f172a', lineHeight: 20 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <TouchableOpacity activeOpacity={0.7} style={{ padding: 4, marginLeft: 8 }}>
                    <MoreHorizontal size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 4 }}>
                  {item.author || copy.kindPost}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <MetaIcon size={14} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>
                  {getKindLabel(item.kind, copy)} · {formatPostTime(item.postedAt, copy)}
                </Text>
              </View>

              {item.postUrl ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, alignSelf: 'flex-start' }}
                  activeOpacity={0.7}
                  onPress={() => handleShare(item)}
                >
                  <Share2 size={15} color="#002fff" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#002fff', marginLeft: 6 }}>
                    {copy.share}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [handleShare, handlePressItem, copy],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View
        style={{
          height: 64,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
            {copy.headerTitle}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={20} color="#002fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={vm.filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderSavedPost}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor="#002fff"
            colors={['#002fff']}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <>
            <View
              style={{
                backgroundColor: '#f0f3ff',
                borderRadius: 24,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#002fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Bookmark size={22} color="#ffffff" fill="#ffffff" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{copy.bannerTitle}</Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 4, lineHeight: 18 }}>
                  {copy.bannerSubtitle}
                </Text>
              </View>
              <Image
                source={require('../../../assets/saved_banner_art.png')}
                style={{ width: 110, height: 96 }}
                resizeMode="contain"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {filters.map(filter => {
                const isActive = vm.filter === filter.id;
                return (
                  <ScaleButton
                    key={filter.id}
                    onPress={() => vm.setFilter(filter.id)}
                  >
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isActive ? '#002fff' : '#ffffff',
                        borderWidth: isActive ? 0 : 1,
                        borderColor: '#e2e8f0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: isActive ? '#ffffff' : '#475569',
                        }}
                      >
                        {filter.label}
                      </Text>
                    </View>
                  </ScaleButton>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <SavedSkeleton />
          ) : (
            <EmptyState error={vm.error} onRetry={vm.retry} copy={copy} />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color="#002fff" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default SavedPostsScreen;
