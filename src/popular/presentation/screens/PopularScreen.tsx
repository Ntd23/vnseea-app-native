// Renders popular content through the same interactive cards used by Feed.
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSharedValue } from 'react-native-reanimated';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import type {
  FeedJobPost,
  FeedPollPost,
  FeedPost,
  FeedProductPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import {
  FEED_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import {
  FeedJobPostCard,
  FeedProductPostCard,
} from '../../../feed/presentation/components/FeedCommercePostCards';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import { PostMenuActionSheet } from '../../../shared-kernel/presentation/components/PostMenuActionSheet';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { usePopularViewModel } from '../../application/view-models/usePopularViewModel';

type PopularNav = NativeStackNavigationProp<RootStackParamList>;

const feedRepository = createFeedRepository();
const pollRepository = createPollRepository();

function withReaction(
  post: FeedPost,
  reaction: ReactionType | null,
): FeedPost {
  if (!('myReaction' in post) || !('likeCount' in post)) return post;
  const previous = post.myReaction;
  const nextCount = Math.max(
    0,
    post.likeCount + (previous ? -1 : 0) + (reaction ? 1 : 0),
  );
  const nextTop = reaction
    ? [reaction, ...post.topReactions.filter(item => item !== reaction)].slice(0, 3)
    : post.topReactions.filter(item => item !== previous);
  return {
    ...post,
    myReaction: reaction,
    isLiked: Boolean(reaction),
    likeCount: nextCount,
    topReactions: nextTop,
  } as FeedPost;
}

function LoadingSkeleton() {
  return (
    <View className="mb-3 bg-white">
      <View className="flex-row items-center p-4">
        <View className="h-10 w-10 rounded-full bg-gray-200" />
        <View className="ml-3 flex-1">
          <View className="mb-1 h-4 w-32 rounded bg-gray-200" />
          <View className="h-3 w-20 rounded bg-gray-200" />
        </View>
      </View>
      <View className="h-64 bg-gray-100" />
    </View>
  );
}

function PopularScreen() {
  const navigation = useNavigation<PopularNav>();
  const language = useAppLanguage();
  const copy = FEED_COPY[language];
  const { posts, isLoading, error, reload, updatePost, removePost } =
    usePopularViewModel();
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [sharePost, setSharePost] = useState<FeedPost | undefined>();
  const [menuPost, setMenuPost] = useState<FeedPost | null>(null);
  const [reactionsPostId, setReactionsPostId] = useState<string | null>(null);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const hasDragged = useSharedValue(false);

  const handleToggleReaction = useCallback(
    async (postId: string, selected: ReactionType) => {
      const current = posts.find(post => post.id === postId);
      if (!current || !('myReaction' in current)) return;
      const previous = current.myReaction;
      const next = previous === selected ? null : selected;
      updatePost(postId, post => withReaction(post, next));
      try {
        const result = await feedRepository.setReaction(postId, next);
        if (result.reaction !== next) {
          updatePost(postId, post => withReaction(post, result.reaction));
        }
      } catch (caught) {
        updatePost(postId, post => withReaction(post, previous));
        Alert.alert(
          language === 'vi' ? 'Không thể thả cảm xúc' : 'Could not react',
          caught instanceof Error ? caught.message : copy.reportErrorMessage,
        );
      }
    },
    [copy.reportErrorMessage, language, posts, updatePost],
  );

  const handleOpenPicker = useCallback((postId: string, x: number, y: number) => {
    setPickerAnchor({ postId, x, y });
  }, []);

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      handleToggleReaction(pickerAnchor.postId, reaction).catch(() => undefined);
      setPickerAnchor(null);
    },
    [handleToggleReaction, pickerAnchor],
  );

  const handleOpenPost = useCallback(
    (post: FeedPost) => {
      navigation.navigate(ROUTES.POST_DETAIL, { postId: post.id, post });
    },
    [navigation],
  );

  const handleCommentTap = useCallback(
    (postId: string) => {
      const post = posts.find(item => item.id === postId);
      navigateToPostComments(navigation, postId, post);
    },
    [navigation, posts],
  );

  const handleProfilePress = useCallback(
    (userId: string) => navigateToUserProfile(navigation, userId),
    [navigation],
  );

  const handleVote = useCallback(
    async (_postId: string, optionId: string) => {
      try {
        await pollRepository.votePoll(optionId);
        await reload();
      } catch (caught) {
        Alert.alert(
          language === 'vi' ? 'Không thể bình chọn' : 'Could not vote',
          caught instanceof Error ? caught.message : copy.reportErrorMessage,
        );
      }
    },
    [copy.reportErrorMessage, language, reload],
  );

  const renderFallbackPost = useCallback(
    (post: FeedPost) => (
      <TouchableOpacity
        activeOpacity={0.85}
        className="mb-3 bg-white px-4 py-5"
        onPress={() => handleOpenPost(post)}
      >
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {post.publisher.name || copy.userFallback}
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          {language === 'vi' ? 'Xem nội dung bài viết' : 'View post content'}
        </Text>
      </TouchableOpacity>
    ),
    [copy.userFallback, handleOpenPost, language],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => {
      const sharedProps = {
        copy,
        onReact: handleToggleReaction,
        onOpenPicker: handleOpenPicker,
        onCommentTap: handleCommentTap,
        onShare: (post: FeedPost) => setSharePost(post),
        onOpenReactions: (postId: string) => setReactionsPostId(postId),
        navigateToProfile: handleProfilePress,
        onOpenPostMenu: (post: FeedPost) => setMenuPost(post),
      };

      switch (item.kind) {
        case 'video':
          return (
            <HomeVideoPostCard
              {...sharedProps}
              post={item as FeedVideoPost}
              isScreenFocused
            />
          );
        case 'text':
          return (
            <TextPostCard
              {...sharedProps}
              post={item as FeedTextPost}
              onPhotoPress={post => handleOpenPost(post)}
              onPostPress={handleOpenPost}
            />
          );
        case 'poll':
          return (
            <PollPostCard
              post={item as FeedPollPost}
              language={language}
              onVote={handleVote}
              onReact={handleToggleReaction}
              onOpenPicker={handleOpenPicker}
              onCommentTap={handleCommentTap}
              onShare={post => setSharePost(post)}
              onProfilePress={handleProfilePress}
              onMorePress={post => setMenuPost(post)}
            />
          );
        case 'product':
          return (
            <FeedProductPostCard
              post={item as FeedProductPost}
              onPress={product =>
                navigation.navigate(ROUTES.PRODUCT_DETAIL, {
                  productId: product.id,
                  product,
                })
              }
              onProfilePress={handleProfilePress}
              onSharePost={post => setSharePost(post)}
            />
          );
        case 'job':
          return (
            <FeedJobPostCard
              post={item as FeedJobPost}
              copy={copy}
              onPress={job =>
                navigation.navigate(ROUTES.JOB_DETAIL, {
                  jobId: String(job.id),
                  job,
                })
              }
              onSharePost={post => setSharePost(post)}
            />
          );
        default:
          return renderFallbackPost(item);
      }
    },
    [
      copy,
      handleCommentTap,
      handleOpenPicker,
      handleOpenPost,
      handleProfilePress,
      handleToggleReaction,
      handleVote,
      language,
      navigation,
      renderFallbackPost,
    ],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={APP_BRAND_COLOR} />
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          {language === 'vi' ? 'Bài viết phổ biến' : 'Popular posts'}
        </Text>
        <View className="w-6" />
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-body text-error">{error}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void reload()}
            className="rounded-full bg-brand-soft px-6 py-3"
          >
            <Text className="font-semibold text-brand">
              {language === 'vi' ? 'Thử lại' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading ? (
              <View>{[1, 2, 3].map(item => <LoadingSkeleton key={item} />)}</View>
            ) : (
              <View className="items-center justify-center py-20">
                <TrendingUp size={48} color="#94A3B8" />
                <Text className="mt-4 text-body text-secondary">
                  {language === 'vi'
                    ? 'Chưa có bài viết phổ biến'
                    : 'No popular posts yet'}
                </Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void reload()}
              colors={[APP_BRAND_COLOR]}
              tintColor={APP_BRAND_COLOR}
            />
          }
        />
      )}

      <FeedShareBottomSheet
        visible={Boolean(sharePost)}
        post={sharePost}
        onClose={() => setSharePost(undefined)}
        onInternalShare={input => feedRepository.sharePost(input)}
      />
      <PostReactionsSheet
        visible={Boolean(reactionsPostId)}
        postId={reactionsPostId}
        onClose={() => setReactionsPostId(null)}
      />
      <ReactionPickerOverlay
        anchor={pickerAnchor}
        onPick={handlePickReaction}
        onDismiss={() => setPickerAnchor(null)}
        gestureX={gestureX}
        gestureY={gestureY}
        gestureActive={gestureActive}
        hasDragged={hasDragged}
      />
      <PostMenuActionSheet
        visible={Boolean(menuPost)}
        post={menuPost}
        onClose={() => setMenuPost(null)}
        canDelete={menuPost?.permissions?.canDelete === true}
        onSave={async postId => {
          const result = await feedRepository.savePost(postId);
          updatePost(postId, post => ({ ...post, isSaved: result.saved }));
        }}
        onHide={postId => removePost(postId)}
        onDelete={async postId => {
          const result = await feedRepository.deletePost(postId);
          if (!result.deleted) throw new Error('Không thể xóa bài viết.');
          removePost(postId);
        }}
        onReport={(postId, input) => feedRepository.reportPost(postId, input).then(() => undefined)}
        onReportHide={postId => removePost(postId)}
      />
    </SafeAreaView>
  );
}

export default PopularScreen;
