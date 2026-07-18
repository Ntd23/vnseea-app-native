// Description: Renders private saved, reaction, comment, and share collections.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Heart,
  MessageCircle,
  Play,
  RefreshCw,
  Share2,
} from 'lucide-react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToReels } from '../../../navigation/reelsNavigation';
import type { RootStackParamList } from '../../../navigation/types';
import type { FeedVideoPost } from '../../../feed/domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type {
  ActivityCenterTab,
  PostActivityItem,
} from '../../domain/types/activity.types';
import { useActivityCenterViewModel } from '../../application/view-models/useActivityCenterViewModel';

type ActivityNavigation = NativeStackNavigationProp<RootStackParamList>;
type ActivityRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.ACTIVITY_CENTER | typeof ROUTES.SAVED_POSTS
>;

const TABS: ActivityCenterTab[] = ['saved', 'reaction', 'comment', 'share'];
const REACTION_LABELS: Record<ReactionType, { vi: string; en: string }> = {
  like: { vi: 'Thích', en: 'Liked' },
  love: { vi: 'Yêu thích', en: 'Loved' },
  haha: { vi: 'Haha', en: 'Haha' },
  wow: { vi: 'Wow', en: 'Wow' },
  sad: { vi: 'Buồn', en: 'Sad' },
  angry: { vi: 'Phẫn nộ', en: 'Angry' },
};

const COPY = {
  vi: {
    title: 'Hoạt động của bạn',
    tabs: {
      saved: 'Đã lưu',
      reaction: 'Cảm xúc',
      comment: 'Bình luận',
      share: 'Chia sẻ',
    },
    empty: {
      saved: 'Bạn chưa lưu bài viết nào.',
      reaction: 'Bạn chưa bày tỏ cảm xúc với bài viết nào.',
      comment: 'Bạn chưa bình luận trong bài viết nào.',
      share: 'Bạn chưa chia sẻ bài viết nào trên VNSEEA.',
    },
    retry: 'Thử lại',
    saved: 'Đã lưu bài viết',
    comments: (count: number) => `${count} bình luận và phản hồi`,
    shared: 'Đã chia sẻ trên VNSEEA',
    destinations: {
      timeline: 'Dòng thời gian',
      page: 'Trang',
      group: 'Nhóm',
    },
  },
  en: {
    title: 'Your activity',
    tabs: {
      saved: 'Saved',
      reaction: 'Reactions',
      comment: 'Comments',
      share: 'Shares',
    },
    empty: {
      saved: 'You have not saved any posts.',
      reaction: 'You have not reacted to any posts.',
      comment: 'You have not commented on any posts.',
      share: 'You have not shared any posts on VNSEEA.',
    },
    retry: 'Try again',
    saved: 'Saved post',
    comments: (count: number) => `${count} comments and replies`,
    shared: 'Shared on VNSEEA',
    destinations: {
      timeline: 'Timeline',
      page: 'Page',
      group: 'Group',
    },
  },
} as const;

function buildVideoPost(item: PostActivityItem): FeedVideoPost {
  const rawPublisher =
    ((item.rawPost.publisher ?? item.rawPost.user_data) as
      | Record<string, unknown>
      | undefined) ?? {};
  const username = String(rawPublisher.username ?? rawPublisher.user_name ?? 'user');
  const avatarUrl = String(rawPublisher.avatar ?? rawPublisher.profile_picture ?? '');
  return {
    kind: 'video',
    id: item.postId,
    caption: item.title,
    videoUrl: item.videoUrl ?? '',
    thumbnailUrl: item.imageUrl,
    postedAt: item.postedAt,
    likeCount: Number(item.rawPost.postLikes ?? item.rawPost.likes ?? 0),
    commentCount: Number(
      item.rawPost.post_comments ?? item.rawPost.commentCount ?? 0,
    ),
    isLiked: Boolean(item.reaction),
    myReaction: item.reaction ?? null,
    topReactions: [],
    privacy: 'public',
    publisher: {
      id: String(rawPublisher.user_id ?? rawPublisher.id ?? '0'),
      name: item.author,
      username,
      avatarUrl: avatarUrl || item.authorAvatarUrl,
    },
  };
}

function ActivityThumbnail({ item }: { item: PostActivityItem }) {
  if (item.imageUrl) {
    return (
      <View style={{ width: 88, height: 88, borderRadius: 12, overflow: 'hidden' }}>
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 88, height: 88 }}
          resizeMode="cover"
        />
        {item.mediaKind === 'video' ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.18)',
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
            >
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  const EmptyIcon = item.mediaKind === 'video' ? Play : FileText;
  return (
    <View
      style={{
        width: 88,
        height: 88,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
      }}
    >
      <EmptyIcon size={28} color="#0000FF" />
    </View>
  );
}

function ActivityCenterScreen() {
  const navigation = useNavigation<ActivityNavigation>();
  const route = useRoute<ActivityRoute>();
  const language = useAppLanguage();
  const copy = COPY[language];
  const initialTab =
    route.name === ROUTES.SAVED_POSTS
      ? 'saved'
      : route.params?.initialTab ?? 'saved';
  const [activeTab, setActiveTab] = useState<ActivityCenterTab>(initialTab);
  const {
    state,
    ensureLoaded,
    refresh,
    retry,
    loadMore,
  } = useActivityCenterViewModel();
  const current = state[activeTab];
  const activeTabRef = useRef(activeTab);
  const refreshRef = useRef(refresh);
  const hasFocusedRef = useRef(false);

  activeTabRef.current = activeTab;
  refreshRef.current = refresh;

  useEffect(() => {
    ensureLoaded(activeTab);
  }, [activeTab, ensureLoaded]);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedRef.current) {
        refreshRef.current(activeTabRef.current);
      } else {
        hasFocusedRef.current = true;
      }
      return undefined;
    }, []),
  );

  const handlePress = useCallback(
    (item: PostActivityItem) => {
      if (item.mediaKind === 'video') {
        navigateToReels(navigation, {
          initialVideoId: item.postId,
          post: buildVideoPost(item),
          source: 'saved',
        });
        return;
      }
      navigation.navigate(ROUTES.POST_DETAIL, { postId: item.postId });
    },
    [navigation],
  );

  const metadata = useCallback(
    (item: PostActivityItem) => {
      if (item.category === 'saved') return copy.saved;
      if (item.category === 'reaction') {
        return item.reaction
          ? REACTION_LABELS[item.reaction][language]
          : copy.tabs.reaction;
      }
      if (item.category === 'comment') {
        return copy.comments(item.interactionCount ?? 0);
      }
      const destination = item.shareDestination
        ? copy.destinations[item.shareDestination]
        : undefined;
      return destination ? `${copy.shared} · ${destination}` : copy.shared;
    },
    [copy, language],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PostActivityItem>) => (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => handlePress(item)}
        style={{
          minHeight: 116,
          flexDirection: 'row',
          padding: 14,
          marginHorizontal: 14,
          marginBottom: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
        }}
      >
        <ActivityThumbnail item={item} />
        <View style={{ flex: 1, minWidth: 0, marginLeft: 13 }}>
          <Text
            numberOfLines={2}
            style={{ color: '#111827', fontSize: 15, fontWeight: '800', lineHeight: 20 }}
          >
            {item.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 4 }}
          >
            {item.author}
          </Text>
          <Text
            numberOfLines={2}
            style={{ color: '#0000FF', fontSize: 12, fontWeight: '700', marginTop: 8 }}
          >
            {metadata(item)}
          </Text>
          {item.latestCommentText ? (
            <Text
              numberOfLines={1}
              style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}
            >
              “{item.latestCommentText}”
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [handlePress, metadata],
  );

  const EmptyIcon =
    activeTab === 'saved'
      ? Bookmark
      : activeTab === 'reaction'
        ? Heart
        : activeTab === 'comment'
          ? MessageCircle
          : Share2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View
        style={{
          height: 58,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={language === 'vi' ? 'Quay lại' : 'Go back'}
          onPress={() => navigation.goBack()}
          style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={23} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 19, fontWeight: '900', color: '#111827', marginLeft: 6 }}>
          {copy.title}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        {TABS.map(tab => {
          const selected = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: selected ? '#0000FF' : '#64748B',
                  fontSize: 12,
                  fontWeight: selected ? '900' : '700',
                }}
              >
                {copy.tabs[tab]}
              </Text>
              <View
                style={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 0,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: selected ? '#0000FF' : 'transparent',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        key={activeTab}
        data={current.items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: 28,
          flexGrow: current.items.length === 0 ? 1 : undefined,
        }}
        refreshControl={
          <RefreshControl
            refreshing={current.refreshing}
            onRefresh={() => refresh(activeTab)}
            tintColor="#0000FF"
            colors={['#0000FF']}
          />
        }
        onEndReached={() => loadMore(activeTab)}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          current.loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color="#0000FF" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          current.loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#0000FF" />
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 28,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#EEF2FF',
                }}
              >
                <EmptyIcon size={31} color="#0000FF" />
              </View>
              <Text
                style={{
                  marginTop: 15,
                  color: '#475569',
                  textAlign: 'center',
                  fontSize: 14,
                  lineHeight: 20,
                  fontWeight: '600',
                }}
              >
                {current.error ?? copy.empty[activeTab]}
              </Text>
              {current.error ? (
                <TouchableOpacity
                  onPress={() => retry(activeTab)}
                  style={{
                    marginTop: 18,
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 18,
                    borderRadius: 12,
                    backgroundColor: '#0000FF',
                  }}
                >
                  <RefreshCw size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', marginLeft: 8 }}>
                    {copy.retry}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

export default ActivityCenterScreen;
