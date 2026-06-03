// Description: Popular screen showing most liked/trending posts from the API
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePopularViewModel } from '../../application/view-models/usePopularViewModel';
import type { PopularPost } from '../../domain/types/popular.types';
import type { RootStackParamList } from '../../../navigation/types';

type PopularNav = NativeStackNavigationProp<RootStackParamList>;

// ── Reaction helpers (matching FeedScreen) ────────────────────────────────────
const REACTION_EMOJI: Record<string, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const REACTION_BADGE_BG: Record<string, string> = {
  like: '#0866FF',
  love: '#F33E58',
  haha: '#F7B125',
  wow: '#F7B125',
  sad: '#F7B125',
  angry: '#E9710F',
};

// ── Format helpers ─────────────────────────────────────────────────────────
function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatPostTime(timestamp?: string | number) {
  if (!timestamp) return 'Vừa xong';
  const numTs = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(numTs)) return timestamp?.toString() || 'Vừa xong';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - numTs);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(numTs * 1000).toLocaleDateString('vi-VN');
}

function getTopReactions(reactionsCount: Record<string, number> | undefined): string[] {
  if (!reactionsCount) return [];
  return Object.entries(reactionsCount)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([type]) => type);
}

// ── Reaction Summary Row (Facebook-style) ── */
function ReactionSummary({
  reactionsCount,
  likeCount,
}: {
  reactionsCount: Record<string, number> | undefined;
  likeCount: number;
}) {
  const total = reactionsCount
    ? Object.values(reactionsCount).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
    : likeCount;

  if (total <= 0) return null;

  const topTypes = getTopReactions(reactionsCount);

  return (
    <View className="mb-3 flex-row items-center justify-between">
      {/* Left: stacked reaction badges */}
      <View className="flex-row items-center">
        {topTypes.map((type, index) => (
          <View
            key={type}
            className="h-5 w-5 items-center justify-center rounded-full"
            style={{
              backgroundColor: REACTION_BADGE_BG[type] || '#0866FF',
              marginLeft: index > 0 ? -4 : 0,
              zIndex: topTypes.length - index,
            }}
          >
            <Text style={{ fontSize: 10, color: '#fff' }}>
              {REACTION_EMOJI[type] || '👍'}
            </Text>
          </View>
        ))}
        <Text className="ml-2 text-caption-secondary">{formatCount(total)}</Text>
      </View>
    </View>
  );
}

/* ── Post Card ── */
function PostCard({ item, isFirst }: { item: PopularPost; isFirst?: boolean }) {
  // Calculate total reactions from reactionsCount
  const reactionsCount = item.reactionsCount;
  const totalReactions = reactionsCount
    ? Object.values(reactionsCount).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
    : 0;

  // Calculate like count - use reactionsCount or fall back to direct fields
  const likeCount = totalReactions > 0
    ? totalReactions
    : item.commentsCount || 0; // Fallback

  // Get media URL - check postFile first (which should be normalized by now)
  const mediaUrl = item.postFile || item.postFileUrl || '';
  const hasMedia = Boolean(mediaUrl);

  // Get publisher info
  const publisherName = item.publisher?.name || item.publisher?.username || 'Người dùng';
  const publisherAvatar = item.publisher?.avatarUrl || '';
  const publisherId = item.publisher?.id || '';

  // Get post time
  const postTime = item.time_text || item.time || '';

  // Get stats
  const commentCount = item.commentsCount ?? 0;
  const sharesCount = item.sharesCount ?? 0;

  // Get top reactions
  const topReactions = getTopReactions(reactionsCount);

  console.log('[PopularScreen] PostCard:', {
    id: item.post_id,
    postText: item.postText?.substring(0, 50),
    mediaUrl: mediaUrl?.substring(0, 50),
    reactionsCount,
    likeCount,
    commentCount,
    sharesCount,
    publisher: publisherName,
  });

  return (
    <View className="surface-card mx-4 mb-4 overflow-hidden rounded-2xl">
      <View className="p-4">
        {/* Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.8}>
            {publisherAvatar ? (
              <Image
                source={{ uri: publisherAvatar }}
                className="h-10 w-10 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-sm font-bold text-white">
                  {publisherName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="text-title-primary font-semibold">
                  {publisherName}
                </Text>
                <View className="ml-2 flex-row items-center rounded-full bg-[#eef0ff] px-2 py-0.5">
                  <TrendingUp size={10} color="#0000ff" />
                  <Text className="ml-1 text-[10px] font-medium text-brand">Xu hướng</Text>
                </View>
              </View>
              <View className="mt-0.5 flex-row items-center">
                <Text className="text-xs text-[#94a3b8]">{formatPostTime(postTime)}</Text>
                <Text className="mx-1 text-xs text-[#94a3b8]">•</Text>
                <Globe size={11} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MoreHorizontal size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {item.postText ? (
          <Text className="text-body text-primary leading-relaxed" numberOfLines={6}>
            {item.postText}
          </Text>
        ) : null}
      </View>

      {/* Media */}
      {hasMedia && (
        <Image
          source={{ uri: mediaUrl }}
          className="w-full"
          style={{ height: 280 }}
          resizeMode="cover"
        />
      )}

      {/* Reaction summary */}
      <View className="px-4 pt-3">
        <ReactionSummary reactionsCount={reactionsCount} likeCount={likeCount} />

        {/* Stats row */}
        <View className="mb-3 flex-row items-center justify-between border-b border-[rgba(0,0,255,0.08)] pb-3">
          <View className="flex-row items-center gap-1">
            {/* Show actual reaction emojis if available */}
            {topReactions.length > 0 ? (
              <View className="flex-row">
                {topReactions.slice(0, 3).map((type, idx) => (
                  <View
                    key={type}
                    className="mr-1 h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: REACTION_BADGE_BG[type] || '#0866FF' }}
                  >
                    <Text style={{ fontSize: 11, color: '#fff' }}>
                      {REACTION_EMOJI[type] || '👍'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="mr-1 h-5 w-5 items-center justify-center rounded-full bg-red-500">
                <ThumbsUp size={11} color="#fff" />
              </View>
            )}
            <Text className="text-caption-secondary">
              {formatCount(totalReactions)} lượt thích
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Text className="text-caption-secondary">
              {formatCount(commentCount)} bình luận
            </Text>
            <Text className="text-caption-secondary">
              {formatCount(sharesCount)} chia sẻ
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row items-center justify-between pb-2">
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.75}>
            <Heart size={20} color="#64748b" />
            <Text className="ml-2 text-caption-primary font-medium">Thích</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.75}>
            <MessageCircle size={20} color="#64748b" />
            <Text className="ml-2 text-caption-primary font-medium">Bình luận</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.75}>
            <Share2 size={20} color="#64748b" />
            <Text className="ml-2 text-caption-primary font-medium">Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ── Loading Skeleton ── */
function LoadingSkeleton() {
  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-2xl">
      <View className="flex-row items-center p-4">
        <View className="h-10 w-10 rounded-full bg-gray-200" />
        <View className="ml-3 flex-1">
          <View className="mb-1 h-4 w-32 rounded bg-gray-200" />
          <View className="h-3 w-20 rounded bg-gray-200" />
        </View>
      </View>
      <View className="h-64 bg-gray-100" />
      <View className="p-4">
        <View className="mb-3 h-4 w-24 rounded bg-gray-200" />
        <View className="h-8 flex-row items-center justify-between border-t border-[rgba(0,0,255,0.08)] pt-3">
          <View className="h-6 w-16 rounded bg-gray-200" />
          <View className="h-6 w-20 rounded bg-gray-200" />
          <View className="h-6 w-16 rounded bg-gray-200" />
        </View>
      </View>
    </View>
  );
}

/* ── Main Screen ── */
function PopularScreen() {
  const navigation = useNavigation<PopularNav>();
  const { posts, isLoading, error, reload } = usePopularViewModel();

  console.log('[PopularScreen] Posts count:', posts.length);
  console.log('[PopularScreen] First post:', posts[0] ? {
    id: posts[0].post_id,
    text: posts[0].postText?.substring(0, 50),
    media: posts[0].postFile?.substring(0, 50),
    reactions: posts[0].reactionsCount,
    comments: posts[0].commentsCount,
  } : null);

  const renderItem = useCallback(
    ({ item, index }: { item: PopularPost; index: number }) => (
      <PostCard item={item} isFirst={index === 0} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: PopularPost) => String(item.post_id), []);

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <TrendingUp size={48} color="#94a3b8" />
      <Text className="mt-4 text-body text-secondary">
        Chưa có bài viết xu hướng nào
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top App Bar */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          Xu hướng
        </Text>
        <View className="w-10" />
      </View>

      {/* Content */}
      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-body text-center text-error mb-4">
            Đã xảy ra lỗi: {error}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void reload()}
            className="rounded-full bg-[#eef0ff] px-6 py-3">
            <Text className="text-body font-semibold text-brand">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerClassName="py-4"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <View>{[1, 2, 3].map((i) => <LoadingSkeleton key={i} />)}</View>
            ) : (
              renderEmpty()
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void reload()}
              colors={['#0000ff']}
              tintColor="#0000ff"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

export default PopularScreen;