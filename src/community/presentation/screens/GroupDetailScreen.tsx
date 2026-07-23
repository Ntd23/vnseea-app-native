// Description: Renders a WoWonder-style group profile with composer, filters, and group metadata.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Edit3,
  FileText,
  Globe2,
  Grid3X3,
  Info,
  Search,
  Tag,
  Users,
} from 'lucide-react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import {
  FeedFilterTabs,
  type FeedFilterTabKey,
} from '../../../feed/presentation/components/FeedFilterTabs';
import { ComposerCard } from '../../../feed/presentation/components/ComposerCard';
import {
  FEED_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { CreatePostModal } from '../../../feed/presentation/screens/CreatePostScreen';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import { usePostRealtimeScope } from '../../../feed/application/realtime/usePostRealtimeScope';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type {
  FeedPost,
  FeedPollPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import { isFeedPostShareable } from '../../../feed/domain/policies/feedPostPrivacy';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { GroupPostMenuActionSheet } from './GroupPostMenuActionSheet';

type GroupDetailNav = NativeStackNavigationProp<RootStackParamList>;
type GroupDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.GROUP_DETAIL>;

const BRAND = APP_BRAND_COLOR;
const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop';
const GROUP_POST_LIMIT = 12;
const feedRepository = createFeedRepository();

const GROUP_DETAIL_COPY = {
  vi: {
    membersCountSuffix: 'Các thành viên',
    btnEdit: 'Chỉnh sửa',
    btnView: 'Xem nhóm',
    composerPlaceholder: 'Hôm nay bạn thế nào ?',
    actionPhoto: 'Hình ảnh',
    actionVideo: 'Video',
    actionProduct: 'Sản phẩm',
    actionPoll: 'Thăm dò',
    postsEmpty: 'Không có bài đăng nào để hiển thị',
    searchTitle: 'Tìm kiếm các bài viết',
    searchPlaceholder: 'Tìm kiếm bài viết...',
    sectionInfo: 'Thông tin',
    sectionAbout: 'Về',
    noAbout: 'Chưa có mô tả nhóm.',
    membersStats: '+0 Tuần này',
    postsStatsSuffix: 'bài viết',
    fallbackUsername: 'Thành viên',
    privacyPublic: 'Công cộng',
    privacyPrivate: 'Riêng tư',
    categoryOther: 'Khác',
    groupContextMissingTitle: 'Không đăng được',
    groupContextMissingMessage: 'Không tìm thấy nhóm để đăng bài.',
    editPostTitle: 'Chỉnh sửa bài',
    editPostPlaceholder: 'Nội dung bài viết',
    editPostCancel: 'Hủy',
    editPostSave: 'Lưu',
    editPostSaving: 'Đang lưu...',
    editPostEmpty: 'Nội dung bài viết không được để trống.',
    deletePostError: 'Không xóa được bài viết.',
    commentsEnabledTitle: 'Đã bật nhận xét',
    commentsEnabledMessage: 'Thành viên có thể bình luận về bài viết này.',
    commentsDisabledTitle: 'Đã tắt nhận xét',
    commentsDisabledMessage: 'Thành viên không thể bình luận về bài viết này.',
    pinnedTitle: 'Đã ghim bài đăng',
    pinnedMessage: 'Bài đăng đã được ghim lên đầu nhóm.',
    unpinnedTitle: 'Đã bỏ ghim bài đăng',
    unpinnedMessage: 'Bài đăng không còn được ghim trong nhóm.',
    pinGroupMissing: 'Không tìm thấy nhóm để ghim bài viết.',
  },
  en: {
    membersCountSuffix: 'Members',
    btnEdit: 'Edit',
    btnView: 'View Group',
    composerPlaceholder: 'What\'s on your mind?',
    actionPhoto: 'Photos',
    actionVideo: 'Videos',
    actionProduct: 'Product',
    actionPoll: 'Poll',
    postsEmpty: 'No posts to display',
    searchTitle: 'Search Posts',
    searchPlaceholder: 'Search posts...',
    sectionInfo: 'Information',
    sectionAbout: 'About',
    noAbout: 'No group description yet.',
    membersStats: '+0 This week',
    postsStatsSuffix: 'posts',
    fallbackUsername: 'Member',
    privacyPublic: 'Public',
    privacyPrivate: 'Private',
    categoryOther: 'Other',
    groupContextMissingTitle: 'Cannot post',
    groupContextMissingMessage: 'Group context was not found.',
    editPostTitle: 'Edit post',
    editPostPlaceholder: 'Post content',
    editPostCancel: 'Cancel',
    editPostSave: 'Save',
    editPostSaving: 'Saving...',
    editPostEmpty: 'Post content cannot be empty.',
    deletePostError: 'Cannot delete this post.',
    commentsEnabledTitle: 'Comments enabled',
    commentsEnabledMessage: 'Members can comment on this post.',
    commentsDisabledTitle: 'Comments disabled',
    commentsDisabledMessage: 'Members cannot comment on this post.',
    pinnedTitle: 'Post pinned',
    pinnedMessage: 'The post was pinned to the top of this group.',
    unpinnedTitle: 'Post unpinned',
    unpinnedMessage: 'The post is no longer pinned in this group.',
    pinGroupMissing: 'Group context was not found for pinning this post.',
  }
};

function formatCompact(value?: number) {
  const safeValue = Number(value ?? 0);
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(Math.round(safeValue));
}

function GroupAvatar({
  avatar,
  size = 92,
}: {
  avatar?: string;
  size?: number;
}) {
  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        style={{ height: size, width: size, borderRadius: size / 2 }}
        className="border-2 border-white bg-slate-100"
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{ height: size, width: size, borderRadius: size / 2 }}
      className="items-center justify-center border-2 border-white bg-red-100"
    >
      <Users size={Math.round(size * 0.48)} color="#ff4d4f" />
    </View>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-brand">
        {icon}
      </View>
      <Text className="ml-2 text-title-primary">{title}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  right?: string;
}) {
  return (
    <View className="flex-row items-center border-b border-slate-100 px-4 py-2.5">
      <View className="w-7 items-center">{icon}</View>
      <Text className="ml-2 flex-1 text-caption-secondary">{label}</Text>
      {right ? <Text className="text-caption-primary text-green-600">{right}</Text> : null}
    </View>
  );
}

function GroupDetailScreen() {
  const language = useAppLanguage();
  const copy = GROUP_DETAIL_COPY[language] ?? GROUP_DETAIL_COPY.vi;
  const postCopy = FEED_COPY[language] ?? FEED_COPY.vi;
  const navigation = useNavigation<GroupDetailNav>();
  const isFocused = useIsFocused();
  const route = useRoute<GroupDetailRoute>();
  const group = route.params?.group;
  const profile = sessionStorage.getUserProfile();
  const activeUserAvatar = profile?.avatarUrl;
  const activeUserDisplayName = profile?.name || copy.fallbackUsername;
  const [activeFilterSource, setActiveFilterSource] = useState<FeedFilterTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerModalVisible, setComposerModalVisible] = useState(false);
  const [composerInitialAction, setComposerInitialAction] = useState<'photo' | 'video' | 'product' | 'poll' | undefined>(undefined);
  const [posts, setPosts] = useState<Array<FeedTextPost | FeedVideoPost | FeedPollPost>>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ postId: string; x: number; y: number } | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(undefined);
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<string | null>(null);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] = useState<FeedPost | null>(null);
  const [editingPost, setEditingPost] = useState<FeedTextPost | FeedVideoPost | FeedPollPost | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostError, setEditPostError] = useState<string | null>(null);
  const [isSavingEditedPost, setIsSavingEditedPost] = useState(false);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasDragged = useSharedValue(false);
  const groupTitle = group?.groupTitle || group?.groupName || 'Nhóm';
  const groupCover = group?.cover || FALLBACK_COVER;
  const groupAbout = group?.about || copy.noAbout;
  const privacyLabel = group?.privacy === 'private' ? copy.privacyPrivate : copy.privacyPublic;
  const membersCount = group?.members ?? 0;
  const categoryLabel = group?.category || copy.categoryOther;
  const canEdit = Boolean(group?.isOwner);
  const targetGroupId = group?.groupId || group?.id ? String(group?.groupId || group?.id) : undefined;
  const updatePostById = useCallback(
    (
      postId: string,
      updater: (
        post: FeedTextPost | FeedVideoPost | FeedPollPost,
      ) => FeedTextPost | FeedVideoPost | FeedPollPost,
    ) => {
      setPosts(prev =>
        prev.map(post => (post.id === postId ? updater(post) : post)),
      );
    },
    [],
  );
  const updateCommentCount = useCallback(
    (postId: string, delta: number) => {
      updatePostById(postId, post => ({
        ...post,
        commentCount: Math.max(0, post.commentCount + delta),
      }));
    },
    [updatePostById],
  );
  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: updateCommentCount,
  });
  usePostRealtimeScope({
    postIds: posts.slice(0, 20).map(post => post.id),
    posts: posts.slice(0, 20),
    enabled: isFocused,
    onSnapshot: nextPost => {
      setPosts(current =>
        current.map(post =>
          String(post.id) === String(nextPost.id)
            ? (nextPost as FeedTextPost | FeedVideoPost | FeedPollPost)
            : post,
        ),
      );
    },
    onDeleted: postId => {
      setPosts(current => current.filter(post => String(post.id) !== postId));
    },
    onCommentMutation: change => {
      if (String(commentVm.selectedCommentPostId) === change.postId) {
        void commentVm.refreshComments();
      }
    },
  });
  const loadGroupPosts = useCallback(
    async (refreshing = false) => {
      if (!targetGroupId) {
        setPosts([]);
        return;
      }

      if (refreshing) {
        setIsRefreshingPosts(true);
      } else {
        setIsLoadingPosts(true);
      }
      setPostsError(null);

      try {
        const page = await feedRepository.getGroupPosts(targetGroupId, GROUP_POST_LIMIT);
        setPosts(page.posts);
      } catch (err) {
        setPostsError(
          err instanceof Error
            ? err.message
            : 'Không thể tải bài viết nhóm.',
        );
      } finally {
        setIsLoadingPosts(false);
        setIsRefreshingPosts(false);
      }
    },
    [targetGroupId],
  );
  const handleCreatePost = useCallback(
    (initialAction?: 'photo' | 'video' | 'product' | 'poll') => {
      if (!targetGroupId) {
        Alert.alert(copy.groupContextMissingTitle, copy.groupContextMissingMessage);
        return;
      }

      setComposerInitialAction(initialAction);
      setComposerModalVisible(true);
    },
    [copy.groupContextMissingMessage, copy.groupContextMissingTitle, targetGroupId],
  );
  const handleCloseComposer = useCallback(() => {
    setComposerModalVisible(false);
    setComposerInitialAction(undefined);
  }, []);
  const handleComposerCreated = useCallback(() => {
    setComposerInitialAction(undefined);
    setActiveFilterSource('all');
    void loadGroupPosts(true);
  }, [loadGroupPosts]);
  const handleEditGroup = useCallback(
    () => {
      if (group) {
        navigation.navigate(ROUTES.EDIT_GROUP, { group });
      }
    },
    [group, navigation],
  );
  const handleComposerAction = useCallback(
    (action: 'photo' | 'video' | 'product' | 'poll') => {
      handleCreatePost(action);
    },
    [handleCreatePost],
  );
  const handleToggleReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedTextPost | FeedVideoPost | FeedPollPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      updatePostById(postId, post => {
        snapshot = post;
        const willClear = post.myReaction === nextReaction;
        targetReaction = willClear ? null : nextReaction;
        const wasReacted = post.myReaction !== null;
        const willBeReacted = targetReaction !== null;
        const countDelta = Number(willBeReacted) - Number(wasReacted);
        const prevReaction = post.myReaction;
        let nextTopReactions = [...post.topReactions];

        if (!prevReaction && post.likeCount <= 0) {
          nextTopReactions = [];
        }
        if (prevReaction && prevReaction !== targetReaction) {
          nextTopReactions = nextTopReactions.filter(type => type !== prevReaction);
        }
        if (targetReaction && !nextTopReactions.includes(targetReaction)) {
          nextTopReactions = [targetReaction, ...nextTopReactions].slice(0, 3);
        }

        const likeCount = Math.max(0, post.likeCount + countDelta);
        if (likeCount === 0) {
          nextTopReactions = [];
        }

        return {
          ...post,
          myReaction: targetReaction,
          isLiked: willBeReacted,
          likeCount,
          topReactions: nextTopReactions,
        };
      });

      try {
        await feedRepository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          updatePostById(postId, () => original);
        }
      }
    },
    [updatePostById],
  );
  const handleOpenPicker = useCallback((postId: string, x: number, y: number) => {
    setPickerAnchor({ postId, x, y });
  }, []);
  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      void handleToggleReaction(pickerAnchor.postId, reaction);
      setPickerAnchor(null);
    },
    [handleToggleReaction, pickerAnchor],
  );
  const handleCommentTap = useCallback(
    (postId: string) => {
      commentVm.openComments(postId);
    },
    [commentVm],
  );
  const handleSharePost = useCallback((post: FeedPost) => {
    if (!isFeedPostShareable(post)) return;
    setSharingPost(post);
    setShareModalVisible(true);
  }, []);
  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    setTimeout(() => setSharingPost(undefined), 300);
  }, []);
  const handleInternalSharePost = useCallback(
    async (input: SharePostInput) => feedRepository.sharePost(input),
    [],
  );
  const handleSharedPost = useCallback(() => {
    void loadGroupPosts(true);
  }, [loadGroupPosts]);
  const handleOpenReactions = useCallback((postId: string, _post: FeedPost) => {
    setReactionsSheetPostId(postId);
    setReactionsSheetVisible(true);
  }, []);
  const handleCloseReactionsSheet = useCallback(() => {
    setReactionsSheetVisible(false);
  }, []);
  const selectedCommentPost = useMemo(
    () =>
      posts.find(post => post.id === commentVm.selectedCommentPostId) ?? null,
    [commentVm.selectedCommentPostId, posts],
  );
  const handleRetryComments = useCallback(() => {
    if (commentVm.selectedCommentPostId) {
      commentVm.openComments(commentVm.selectedCommentPostId);
    }
  }, [commentVm]);
  const handlePhotoPress = useCallback((_post: FeedTextPost, _photoIndex: number) => {
    // Keep the shared card stable until the group detail photo viewer is mounted here.
  }, []);
  const handleNavigateToProfile = useCallback(
    (userId: string) => {
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );
  const handleOpenPostMenu = useCallback((post: FeedPost) => {
    setSelectedPostForMenu(post);
    setPostMenuVisible(true);
  }, []);
  const handleClosePostMenu = useCallback(() => {
    setPostMenuVisible(false);
    setTimeout(() => setSelectedPostForMenu(null), 200);
  }, []);
  const handleEditPost = useCallback((post: FeedPost) => {
    if (post.kind !== 'text' && post.kind !== 'video' && post.kind !== 'poll') {
      return;
    }

    setEditingPost(post);
    setEditPostText(post.caption ?? (post.kind === 'poll' ? post.pollQuestion ?? '' : ''));
    setEditPostError(null);
  }, []);
  const handleCloseEditPost = useCallback(() => {
    if (isSavingEditedPost) {
      return;
    }
    setEditingPost(null);
    setEditPostText('');
    setEditPostError(null);
  }, [isSavingEditedPost]);
  const handleSaveEditedPost = useCallback(async () => {
    if (!editingPost) {
      return;
    }

    const nextText = editPostText.trim();
    if (!nextText) {
      setEditPostError(copy.editPostEmpty);
      return;
    }

    setIsSavingEditedPost(true);
    setEditPostError(null);
    try {
      await feedRepository.editPost(editingPost.id, {
        text: nextText,
        privacy: editingPost.privacy,
      });
      updatePostById(editingPost.id, post => ({
        ...post,
        caption: nextText,
      }));
      setEditingPost(null);
      setEditPostText('');
    } catch (err) {
      setEditPostError(
        err instanceof Error ? err.message : 'Không chỉnh sửa được bài viết.',
      );
    } finally {
      setIsSavingEditedPost(false);
    }
  }, [copy.editPostEmpty, editPostText, editingPost, updatePostById]);
  const handleDeletePost = useCallback(
    async (post: FeedPost) => {
      const result = await feedRepository.deletePost(post.id);
      if (!result.deleted) {
        throw new Error(copy.deletePostError);
      }
      setPosts(prev => prev.filter(item => item.id !== post.id));
    },
    [copy.deletePostError],
  );
  const handleTogglePostComments = useCallback(
    async (post: FeedPost) => {
      const result = await feedRepository.togglePostComments(post.id);
      Alert.alert(
        result.enabled ? copy.commentsEnabledTitle : copy.commentsDisabledTitle,
        result.enabled ? copy.commentsEnabledMessage : copy.commentsDisabledMessage,
      );
    },
    [
      copy.commentsDisabledMessage,
      copy.commentsDisabledTitle,
      copy.commentsEnabledMessage,
      copy.commentsEnabledTitle,
    ],
  );
  const handlePinPost = useCallback(
    async (post: FeedPost) => {
      if (!targetGroupId) {
        throw new Error(copy.pinGroupMissing);
      }

      const result = await feedRepository.pinPost(post.id, {
        type: 'group',
        ownerId: targetGroupId,
      });
      Alert.alert(
        result.pinned ? copy.pinnedTitle : copy.unpinnedTitle,
        result.pinned ? copy.pinnedMessage : copy.unpinnedMessage,
      );
      if (result.pinned) {
        setPosts(current => {
          const pinnedPost = current.find(item => item.id === post.id);
          if (!pinnedPost) {
            return current;
          }
          return [pinnedPost, ...current.filter(item => item.id !== post.id)];
        });
      }
    },
    [
      copy.pinGroupMissing,
      copy.pinnedMessage,
      copy.pinnedTitle,
      copy.unpinnedMessage,
      copy.unpinnedTitle,
      targetGroupId,
    ],
  );
  const handlePostPress = useCallback(
    (post: FeedPost) => {
      navigation.navigate(ROUTES.POST_DETAIL, { postId: post.id });
    },
    [navigation],
  );
  useEffect(() => {
    void loadGroupPosts(false);
  }, [loadGroupPosts]);
  const displayedPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const tabFiltered = posts.filter(post => {
      if (activeFilterSource === 'photos') {
        return post.kind === 'text' && post.photos.length > 0;
      }
      return true;
    });

    if (!normalizedQuery) {
      return tabFiltered;
    }

    return tabFiltered.filter(post => {
      const text = [
        post.caption,
        post.publisher.name,
        post.publisher.username,
      ].filter(Boolean).join(' ').toLowerCase();

      return text.includes(normalizedQuery);
    });
  }, [activeFilterSource, posts, searchQuery]);
  const renderGroupPost = useCallback(
    (post: FeedTextPost | FeedVideoPost | FeedPollPost) => {
      if (post.kind === 'video') {
        return (
          <HomeVideoPostCard
            key={post.id}
            post={post}
            copy={postCopy}
            onReact={handleToggleReaction}
            onOpenPicker={handleOpenPicker}
            onCommentTap={handleCommentTap}
            onShare={handleSharePost}
            onOpenReactions={handleOpenReactions}
            navigateToProfile={handleNavigateToProfile}
            onOpenPostMenu={handleOpenPostMenu}
            isScreenFocused
          />
        );
      }

      if (post.kind === 'poll') {
        return (
          <PollPostCard
            key={post.id}
            post={post}
            language={language}
            onReact={handleToggleReaction}
            onOpenPicker={handleOpenPicker}
            onCommentTap={handleCommentTap}
            onShare={handleSharePost}
            onProfilePress={handleNavigateToProfile}
            onMorePress={handleOpenPostMenu}
            currentUserAvatar={activeUserAvatar}
          />
        );
      }

      return (
        <TextPostCard
          key={post.id}
          post={post}
          copy={postCopy}
          onReact={handleToggleReaction}
          onOpenPicker={handleOpenPicker}
          onCommentTap={handleCommentTap}
          onPhotoPress={handlePhotoPress}
          onShare={handleSharePost}
          onOpenReactions={handleOpenReactions}
          navigateToProfile={handleNavigateToProfile}
          onOpenPostMenu={handleOpenPostMenu}
          onPostPress={handlePostPress}
        />
      );
    },
    [
      activeUserAvatar,
      handleCommentTap,
      handleNavigateToProfile,
      handleOpenPicker,
      handleOpenPostMenu,
      handleOpenReactions,
      handlePhotoPress,
      handlePostPress,
      handleSharePost,
      handleToggleReaction,
      language,
      postCopy,
    ],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingPosts}
            onRefresh={() => loadGroupPosts(true)}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        <View className="bg-white">
          <Image source={{ uri: groupCover }} className="h-32 w-full bg-slate-200" resizeMode="cover" />
          <View className="items-center px-4 pb-5">
            <View className="-mt-12">
              <GroupAvatar avatar={group?.avatar} />
            </View>
            <Text className="mt-3 text-center text-heading">{groupTitle}</Text>
            <Text className="mt-1 text-center text-caption-secondary">
              {formatCompact(membersCount)} {copy.membersCountSuffix}
            </Text>
            {canEdit ? (
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={handleEditGroup}
                style={{
                  marginTop: 16,
                  minHeight: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <Edit3 size={15} color="#475569" />
                <Text className="ml-2 text-caption-primary" style={{ color: '#475569', fontWeight: '700' }}>{copy.btnEdit}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="mt-3 border-y border-slate-100 bg-white py-4">
          <ComposerCard
            onPress={() => handleCreatePost()}
            onPressAction={handleComposerAction}
            avatarUrl={activeUserAvatar}
            displayName={activeUserDisplayName}
            copy={{
              createPostBtn: copy.composerPlaceholder,
              composerPlaceholder: copy.composerPlaceholder,
              photo: copy.actionPhoto,
              video: copy.actionVideo,
              product: copy.actionProduct,
              poll: copy.actionPoll,
            }}
          />
        </View>

        <FeedFilterTabs
          activeSource={activeFilterSource}
          onChangeSource={setActiveFilterSource}
        />

        {isLoadingPosts ? (
          <View className="border-y border-slate-200 bg-white py-12">
            <ActivityIndicator color={BRAND} />
          </View>
        ) : postsError ? (
          <View className="border-y border-slate-200 bg-white px-4 py-6">
            <Text className="text-center text-caption-primary text-red-600">{postsError}</Text>
          </View>
        ) : displayedPosts.length > 0 ? (
          <View className="border-y border-slate-200 bg-white">
            {displayedPosts.map(renderGroupPost)}
          </View>
        ) : (
          <View className="border-y border-slate-200 bg-white py-12">
            <View className="items-center justify-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Grid3X3 size={28} color="#94A3B8" />
              </View>
              <Text className="mt-4 text-center text-body-secondary" style={{ color: '#64748B' }}>
                {copy.postsEmpty}
              </Text>
            </View>
          </View>
        )}

        <View className="bg-white px-4 py-4 border-y border-slate-100">
          <Text className="mb-2 text-title-primary" style={{ fontWeight: '700' }}>{copy.searchTitle}</Text>
          <View className="min-h-[44px] flex-row items-center border border-slate-200 rounded-xl px-3 bg-slate-50">
            <Search size={17} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="ml-2 flex-1 text-body-primary"
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View className="mt-3 bg-white">
          <SectionTitle icon={<Info size={14} color="#FFFFFF" />} title={copy.sectionInfo} />
          <InfoRow
            icon={<Users size={17} color="#64748B" />}
            label={`${formatCompact(membersCount)} ${copy.membersCountSuffix}`}
            right={copy.membersStats}
          />
          <InfoRow icon={<Globe2 size={17} color="#64748B" />} label={privacyLabel} />
          <InfoRow icon={<Tag size={17} color="#64748B" />} label={categoryLabel} />
          <InfoRow icon={<FileText size={17} color="#64748B" />} label={`0 ${copy.postsStatsSuffix}`} />
        </View>

        <View className="mt-3 bg-white">
          <SectionTitle icon={<FileText size={14} color="#FFFFFF" />} title={copy.sectionAbout} />
          <Text className="px-4 py-4 text-body-secondary">{groupAbout}</Text>
        </View>
      </ScrollView>

      <CreatePostModal
        visible={composerModalVisible}
        onClose={handleCloseComposer}
        onCreated={handleComposerCreated}
        groupId={targetGroupId}
        initialAction={composerInitialAction}
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
      <ReelCommentsSheet
        visible={commentVm.isCommentsOpen}
        comments={commentVm.comments}
        commentCount={selectedCommentPost?.commentCount ?? commentVm.comments.length}
        isLoading={commentVm.isCommentsLoading}
        isLoadingMore={commentVm.isCommentsLoadingMore}
        isSubmitting={commentVm.isSubmittingComment}
        error={commentVm.commentError}
        repliesById={commentVm.repliesById}
        loadingRepliesIds={commentVm.loadingRepliesIds}
        replyingTo={commentVm.replyingTo}
        onClose={commentVm.closeComments}
        onEndReached={commentVm.loadMoreComments}
        onRetry={handleRetryComments}
        onSubmit={commentVm.submitComment}
        onSubmitReply={commentVm.submitReply}
        onSetReaction={commentVm.setCommentReaction}
        onDelete={commentVm.deleteComment}
        onEdit={commentVm.editComment}
        onLoadReplies={commentVm.loadReplies}
        onCollapseReplies={commentVm.collapseReplies}
        onStartReply={commentVm.startReplyTo}
        onCancelReply={commentVm.cancelReply}
        onRetryFailedComment={commentVm.retryFailedComment}
        onDeleteFailedComment={commentVm.deleteFailedComment}
        sheetHeight="90%"
      />
      <PostReactionsSheet
        visible={reactionsSheetVisible}
        postId={reactionsSheetPostId}
        onClose={handleCloseReactionsSheet}
      />
      <FeedShareBottomSheet
        visible={shareModalVisible}
        onClose={handleCloseShareModal}
        post={sharingPost}
        onInternalShare={handleInternalSharePost}
        onShared={handleSharedPost}
      />
      <GroupPostMenuActionSheet
        visible={postMenuVisible}
        post={selectedPostForMenu}
        onClose={handleClosePostMenu}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onToggleComments={handleTogglePostComments}
        onPin={handlePinPost}
      />
      <Modal
        visible={editingPost !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditPost}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCloseEditPost}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
        />
        <View className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pb-6 pt-4">
          <Text className="text-xl font-bold text-slate-900">{copy.editPostTitle}</Text>
          <TextInput
            value={editPostText}
            onChangeText={setEditPostText}
            multiline
            textAlignVertical="top"
            editable={!isSavingEditedPost}
            placeholder={copy.editPostPlaceholder}
            placeholderTextColor="#94A3B8"
            className="mt-4 min-h-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
          />
          {editPostError ? (
            <Text className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">
              {editPostError}
            </Text>
          ) : null}
          <View className="mt-5 flex-row items-center justify-between">
            <TouchableOpacity
              disabled={isSavingEditedPost}
              onPress={handleCloseEditPost}
              className="min-h-[46px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white"
              activeOpacity={0.78}
            >
              <Text className="text-base font-bold text-slate-600">{copy.editPostCancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isSavingEditedPost}
              onPress={() => void handleSaveEditedPost()}
              className="ml-3 min-h-[46px] flex-1 items-center justify-center rounded-xl bg-brand"
              activeOpacity={0.82}
            >
              {isSavingEditedPost ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="ml-2 text-base font-bold text-white">{copy.editPostSaving}</Text>
                </View>
              ) : (
                <Text className="text-base font-bold text-white">{copy.editPostSave}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default GroupDetailScreen;
