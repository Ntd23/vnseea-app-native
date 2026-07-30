// Description: Renders a WoWonder-style group profile with composer, filters, and group metadata.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Camera,
  Check,
  Edit3,
  FileText,
  Globe2,
  Grid3X3,
  Info,
  Search,
  Tag,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSharedValue } from 'react-native-reanimated';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { FEED_CARD_CLASS } from '../../../feed/presentation/components/FeedCardChrome';
import {
  ComposerCard,
  type ComposerActionId,
} from '../../../feed/presentation/components/ComposerCard';
import {
  FEED_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
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
import {
  ImageCropperModal,
  type CropSourceImage,
  type CroppedImageAsset,
  type ImageCropTarget,
} from '../../../shared-kernel/presentation/components/ImageCropperModal';
import {
  PROFILE_IMAGE_PICKER_OPTIONS,
  prepareProfileImageForCrop,
  waitForImagePickerDismissal,
} from '../../../shared-kernel/presentation/utils/profileImagePicker';
import { GroupPostMenuActionSheet } from './GroupPostMenuActionSheet';
import { useSafeBottomPadding } from '../../../shared-kernel/presentation/layout/useSafeBottomLayout';
import { createCommunityRepository } from '../../infrastructure/repositories/ApiCommunityRepository';
import type {
  GroupItem,
  GroupMembershipStatus,
} from '../../domain/types/community.types';
import {
  PageMediaViewerModal,
  type PageMediaKind,
} from '../../../pages/presentation/components/PageMediaViewerModal';

type GroupDetailNav = NativeStackNavigationProp<RootStackParamList>;
type GroupDetailRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.GROUP_DETAIL
>;

const BRAND = APP_BRAND_COLOR;
const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop';
const GROUP_POST_LIMIT = 12;
const feedRepository = createFeedRepository();
const communityRepository = createCommunityRepository();

const GROUP_DETAIL_COPY = {
  vi: {
    membersCountSuffix: 'thành viên',
    btnEdit: 'Chỉnh sửa',
    btnView: 'Xem nhóm',
    joinGroup: 'Tham gia nhóm',
    joiningGroup: 'Đang tham gia...',
    joinRequested: 'Đang chờ duyệt',
    joinedGroup: 'Đã tham gia',
    groupCoverAction: 'Ảnh bìa',
    groupAvatarAction: 'Ảnh đại diện nhóm',
    groupMediaUpdateError: 'Không thể cập nhật ảnh nhóm. Vui lòng thử lại.',
    joinHint: 'Tham gia để đăng bài và kết nối cùng các thành viên.',
    requestedHint: 'Yêu cầu của bạn đang chờ quản trị viên phê duyệt.',
    joinError: 'Không thể tham gia nhóm. Vui lòng thử lại.',
    composerPlaceholder: 'Hôm nay bạn thế nào ?',
    actionPhoto: 'Hình ảnh',
    actionVideo: 'Video',
    actionProduct: 'Sản phẩm',
    actionJob: 'Việc làm',
    postsEmpty: 'Không có bài đăng nào để hiển thị',
    postsSearchEmpty: 'Không tìm thấy bài viết phù hợp.',
    postsSectionTitle: 'Bài viết trong nhóm',
    postsLoadedLabel: 'bài viết',
    retryPosts: 'Tải lại',
    searchTitle: 'Tìm kiếm các bài viết',
    searchPlaceholder: 'Tìm kiếm bài viết...',
    clearSearch: 'Xóa nội dung tìm kiếm',
    backLabel: 'Quay lại',
    sectionInfo: 'Thông tin',
    sectionAbout: 'Giới thiệu',
    noAbout: 'Chưa có mô tả nhóm.',
    membersStats: '+0 Tuần này',
    postsStatsSuffix: 'bài viết',
    fallbackUsername: 'Thành viên',
    privacyPublic: 'Công khai',
    privacyPrivate: 'Riêng tư',
    categoryOther: 'Khác',
    groupContextMissingTitle: 'Không đăng được',
    groupContextMissingMessage: 'Không tìm thấy nhóm để đăng bài.',
    groupMembershipRequiredMessage: 'Bạn cần tham gia nhóm trước khi đăng bài.',
    groupMembershipCheckError:
      'Không thể kiểm tra quyền đăng bài. Vui lòng thử lại.',
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
    membersCountSuffix: 'members',
    btnEdit: 'Edit',
    btnView: 'View Group',
    joinGroup: 'Join group',
    joiningGroup: 'Joining...',
    joinRequested: 'Request pending',
    joinedGroup: 'Joined',
    groupCoverAction: 'Cover photo',
    groupAvatarAction: 'Group profile photo',
    groupMediaUpdateError:
      'Unable to update the group image. Please try again.',
    joinHint: 'Join to create posts and connect with other members.',
    requestedHint: 'Your request is waiting for an admin to approve it.',
    joinError: 'Unable to join this group. Please try again.',
    composerPlaceholder: "What's on your mind?",
    actionPhoto: 'Photos',
    actionVideo: 'Videos',
    actionProduct: 'Product',
    actionJob: 'Job',
    postsEmpty: 'No posts to display',
    postsSearchEmpty: 'No matching posts found.',
    postsSectionTitle: 'Group posts',
    postsLoadedLabel: 'posts',
    retryPosts: 'Try again',
    searchTitle: 'Search Posts',
    searchPlaceholder: 'Search posts...',
    clearSearch: 'Clear post search',
    backLabel: 'Go back',
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
    groupMembershipRequiredMessage:
      'You need to join this group before posting.',
    groupMembershipCheckError:
      'Unable to verify posting access. Please try again.',
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
  },
};

function formatCompact(value?: number) {
  const safeValue = Number(value ?? 0);
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(Math.round(safeValue));
}

function getGroupMembershipStatus(
  group: GroupItem | undefined,
): GroupMembershipStatus {
  return (
    group?.membershipStatus ??
    (group?.isOwner ? 'owner' : group?.isJoined ? 'joined' : 'not_joined')
  );
}

function canCurrentUserPostToGroup(group: GroupItem | undefined) {
  const status = getGroupMembershipStatus(group);
  return status === 'owner' || status === 'joined';
}

function GroupAvatar({
  avatar,
  size = 88,
}: {
  avatar?: string;
  size?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar]);

  if (avatar && !imageFailed) {
    return (
      <Image
        source={{ uri: avatar }}
        style={{ height: size, width: size, borderRadius: size / 2 }}
        className="border-4 border-white bg-slate-100 shadow-lg"
        resizeMode="cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View
      style={{ height: size, width: size, borderRadius: size / 2 }}
      className="items-center justify-center border-4 border-white bg-brand-soft shadow-lg"
    >
      <Users size={Math.round(size * 0.45)} color={APP_BRAND_COLOR} />
    </View>
  );
}

function GroupCoverImage({ cover }: { cover?: string }) {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [cover]);

  return (
    <Image
      source={{ uri: !coverFailed && cover ? cover : FALLBACK_COVER }}
      style={{
        width: '100%',
        height: 172,
        backgroundColor: APP_COLORS.neutral.border,
      }}
      resizeMode="cover"
      onError={() => setCoverFailed(true)}
    />
  );
}

function GroupMetaRow({
  membersLabel,
  privacyLabel,
  categoryLabel,
}: {
  membersLabel: string;
  privacyLabel: string;
  categoryLabel: string;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap items-center">
      <Text className="text-body-secondary">{membersLabel}</Text>
      <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
      <Globe2 size={15} color={APP_COLORS.neutral.textMuted} />
      <Text className="ml-1 text-body-secondary">{privacyLabel}</Text>
      <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
      <Text className="text-body-secondary">{categoryLabel}</Text>
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
    <View className="flex-row items-center border-b border-slate-100 px-3 py-3">
      {icon}
      <Text className="ml-2 text-title-primary">{title}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-3 py-3 ${
        isLast ? '' : 'border-b border-slate-200'
      }`}
    >
      <View className="w-7 items-center">{icon}</View>
      <Text className="ml-2 flex-1 text-body-secondary">{label}</Text>
    </View>
  );
}

function GroupDetailScreen() {
  const editSheetBottomPadding = useSafeBottomPadding(24);
  const language = useAppLanguage();
  const copy = GROUP_DETAIL_COPY[language] ?? GROUP_DETAIL_COPY.vi;
  const postCopy = FEED_COPY[language] ?? FEED_COPY.vi;
  const navigation = useNavigation<GroupDetailNav>();
  const isFocused = useIsFocused();
  const route = useRoute<GroupDetailRoute>();
  const routeGroup = route.params?.group;
  const routeGroupId = routeGroup?.groupId || routeGroup?.id;
  const [group, setGroup] = useState(routeGroup);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [updatingGroupMedia, setUpdatingGroupMedia] = useState<
    'avatar' | 'cover' | null
  >(null);
  const [groupCropRequest, setGroupCropRequest] = useState<{
    target: ImageCropTarget;
    image: CropSourceImage;
  } | null>(null);
  const [groupMediaViewer, setGroupMediaViewer] =
    useState<PageMediaKind | null>(null);
  const [isCheckingPostAccess, setIsCheckingPostAccess] = useState(false);
  const profile = sessionStorage.getUserProfile();
  const activeUserAvatar = profile?.avatarUrl;
  const activeUserDisplayName = profile?.name || copy.fallbackUsername;
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<
    Array<FeedTextPost | FeedVideoPost | FeedPollPost>
  >([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(
    undefined,
  );
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<
    string | null
  >(null);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] =
    useState<FeedPost | null>(null);
  const [editingPost, setEditingPost] = useState<
    FeedTextPost | FeedVideoPost | FeedPollPost | null
  >(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostError, setEditPostError] = useState<string | null>(null);
  const [isSavingEditedPost, setIsSavingEditedPost] = useState(false);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const hasDragged = useSharedValue(false);
  const groupTitle = group?.groupTitle || group?.groupName || 'Nhóm';
  const groupCover = group?.cover || FALLBACK_COVER;
  const groupAbout = group?.about || copy.noAbout;
  const privacyLabel =
    group?.privacy === 'private' ? copy.privacyPrivate : copy.privacyPublic;
  const membersCount = group?.members ?? 0;
  const categoryLabel = group?.category || copy.categoryOther;
  const membershipStatus = getGroupMembershipStatus(group);
  const canEdit = membershipStatus === 'owner';
  const canCreatePost = canCurrentUserPostToGroup(group);
  const isJoinRequested = membershipStatus === 'requested';
  const targetGroupId =
    group?.groupId || group?.id || routeGroupId
      ? String(group?.groupId || group?.id || routeGroupId)
      : undefined;
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
  useEffect(() => {
    setGroup(routeGroup);
  }, [routeGroup]);

  useFocusEffect(
    useCallback(() => {
      if (!targetGroupId) return undefined;

      let active = true;
      communityRepository
        .getGroupById(targetGroupId)
        .then(nextGroup => {
          if (!active) return;
          setGroup(nextGroup);
        })
        .catch(error => {
          console.warn(
            '[GroupDetailScreen] canonical group load failed',
            error,
          );
        });

      return () => {
        active = false;
      };
    }, [targetGroupId]),
  );
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
        const page = await feedRepository.getGroupPosts(
          targetGroupId,
          GROUP_POST_LIMIT,
        );
        setPosts(page.posts);
      } catch (err) {
        setPostsError(
          err instanceof Error ? err.message : 'Không thể tải bài viết nhóm.',
        );
      } finally {
        setIsLoadingPosts(false);
        setIsRefreshingPosts(false);
      }
    },
    [targetGroupId],
  );
  const handleCreatePost = useCallback(
    async (initialAction?: ComposerActionId) => {
      if (!targetGroupId) {
        Alert.alert(
          copy.groupContextMissingTitle,
          copy.groupContextMissingMessage,
        );
        return;
      }

      if (!canCreatePost) {
        Alert.alert(
          copy.groupContextMissingTitle,
          copy.groupMembershipRequiredMessage,
        );
        return;
      }

      if (isCheckingPostAccess) return;
      setIsCheckingPostAccess(true);

      try {
        const canonicalGroup = await communityRepository.getGroupById(
          targetGroupId,
        );
        setGroup(canonicalGroup);

        if (!canCurrentUserPostToGroup(canonicalGroup)) {
          Alert.alert(
            copy.groupContextMissingTitle,
            copy.groupMembershipRequiredMessage,
          );
          return;
        }

        if (initialAction === 'product') {
          navigation.navigate(ROUTES.CREATE_PRODUCT);
          return;
        }
        if (initialAction === 'job') {
          navigation.navigate(ROUTES.CREATE_JOB);
          return;
        }

        navigation.navigate(ROUTES.CREATE_POST, {
          groupId: targetGroupId,
          initialAction,
        });
      } catch (error) {
        console.warn(
          '[GroupDetailScreen] group_post_access_check_failed',
          error,
        );
        Alert.alert(
          copy.groupContextMissingTitle,
          copy.groupMembershipCheckError,
        );
      } finally {
        setIsCheckingPostAccess(false);
      }
    },
    [
      canCreatePost,
      copy.groupContextMissingMessage,
      copy.groupContextMissingTitle,
      copy.groupMembershipCheckError,
      copy.groupMembershipRequiredMessage,
      isCheckingPostAccess,
      navigation,
      targetGroupId,
    ],
  );
  const handleEditGroup = useCallback(() => {
    if (group) {
      navigation.navigate(ROUTES.EDIT_GROUP, { group });
    }
  }, [group, navigation]);
  const uploadGroupMedia = useCallback(
    async (field: ImageCropTarget, asset: CroppedImageAsset) => {
      if (!canEdit || !targetGroupId || updatingGroupMedia) return;

      setUpdatingGroupMedia(field);
      try {
        const updatedGroup = await communityRepository.updateGroupMedia(
          targetGroupId,
          field,
          asset,
        );

        setGroup(current => {
          if (!current) return updatedGroup;

          return {
            ...current,
            ...updatedGroup,
            groupName: updatedGroup.groupName || current.groupName,
            groupTitle: updatedGroup.groupTitle || current.groupTitle,
            avatar:
              field === 'avatar'
                ? updatedGroup.avatar || asset.uri
                : updatedGroup.avatar || current.avatar,
            cover:
              field === 'cover'
                ? updatedGroup.cover || asset.uri
                : updatedGroup.cover || current.cover,
          };
        });
      } catch (error) {
        Alert.alert(
          field === 'cover' ? copy.groupCoverAction : copy.groupAvatarAction,
          error instanceof Error ? error.message : copy.groupMediaUpdateError,
        );
      } finally {
        setUpdatingGroupMedia(null);
      }
    },
    [
      canEdit,
      copy.groupAvatarAction,
      copy.groupCoverAction,
      copy.groupMediaUpdateError,
      targetGroupId,
      updatingGroupMedia,
    ],
  );
  const handleUpdateGroupMedia = useCallback(
    async (field: ImageCropTarget) => {
      if (
        !canEdit ||
        !targetGroupId ||
        updatingGroupMedia ||
        groupCropRequest
      ) {
        return;
      }

      try {
        const result = await launchImageLibrary(PROFILE_IMAGE_PICKER_OPTIONS);
        if (result.didCancel) return;
        if (result.errorCode) {
          throw new Error(result.errorMessage || copy.groupMediaUpdateError);
        }

        const asset = result.assets?.[0];
        if (!asset?.uri) return;

        await waitForImagePickerDismissal();
        const preparedAsset = await prepareProfileImageForCrop(asset, field);
        setGroupCropRequest({
          target: field,
          image: {
            uri: preparedAsset.uri!,
            width: preparedAsset.width,
            height: preparedAsset.height,
            fileName: preparedAsset.fileName,
            type: preparedAsset.type,
          },
        });
      } catch (error) {
        Alert.alert(
          field === 'cover' ? copy.groupCoverAction : copy.groupAvatarAction,
          error instanceof Error ? error.message : copy.groupMediaUpdateError,
        );
      }
    },
    [
      canEdit,
      copy.groupAvatarAction,
      copy.groupCoverAction,
      copy.groupMediaUpdateError,
      groupCropRequest,
      targetGroupId,
      updatingGroupMedia,
    ],
  );
  const handleCroppedGroupMedia = useCallback(
    async (asset: CroppedImageAsset) => {
      const target = groupCropRequest?.target;
      if (!target) return;

      setGroupCropRequest(null);
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve()),
      );
      await uploadGroupMedia(target, asset);
    },
    [groupCropRequest?.target, uploadGroupMedia],
  );
  const handleViewGroupAvatar = useCallback(() => {
    if (!group?.avatar) return;
    setGroupMediaViewer('avatar');
  }, [group?.avatar]);
  const handleViewGroupCover = useCallback(() => {
    if (!group?.cover) return;
    setGroupMediaViewer('cover');
  }, [group?.cover]);
  const handleCloseGroupMediaViewer = useCallback(() => {
    setGroupMediaViewer(null);
  }, []);
  const handleChangeGroupMediaFromViewer = useCallback(async () => {
    const target = groupMediaViewer;
    if (!target) return;

    setGroupMediaViewer(null);
    await new Promise<void>(resolve =>
      setTimeout(resolve, Platform.OS === 'ios' ? 240 : 160),
    );
    await handleUpdateGroupMedia(target);
  }, [groupMediaViewer, handleUpdateGroupMedia]);
  const handleComposerAction = useCallback(
    (action: ComposerActionId) => {
      void handleCreatePost(action);
    },
    [handleCreatePost],
  );
  const handleJoinGroup = useCallback(async () => {
    if (!targetGroupId || isJoiningGroup || isJoinRequested) return;

    setIsJoiningGroup(true);
    try {
      const nextStatus = await communityRepository.joinGroup(targetGroupId);
      setGroup(current =>
        current
          ? {
              ...current,
              membershipStatus: nextStatus,
              isJoined: nextStatus === 'joined' || nextStatus === 'owner',
              isOwner: nextStatus === 'owner',
            }
          : current,
      );

      if (nextStatus === 'joined' || nextStatus === 'owner') {
        void loadGroupPosts(true);
      }

      try {
        const canonicalGroup = await communityRepository.getGroupById(
          targetGroupId,
        );
        setGroup(canonicalGroup);
      } catch (refreshError) {
        console.warn(
          '[GroupDetailScreen] group_detail_refresh_after_join_failed',
          refreshError,
        );
      }
    } catch (error) {
      Alert.alert(
        copy.joinGroup,
        error instanceof Error ? error.message : copy.joinError,
      );
    } finally {
      setIsJoiningGroup(false);
    }
  }, [
    copy.joinError,
    copy.joinGroup,
    isJoinRequested,
    isJoiningGroup,
    loadGroupPosts,
    targetGroupId,
  ]);
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
          nextTopReactions = nextTopReactions.filter(
            type => type !== prevReaction,
          );
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
  const handleOpenPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );
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
  const handlePhotoPress = useCallback(
    (_post: FeedTextPost, _photoIndex: number) => {
      // Keep the shared card stable until the group detail photo viewer is mounted here.
    },
    [],
  );
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
    setEditPostText(
      post.caption ?? (post.kind === 'poll' ? post.pollQuestion ?? '' : ''),
    );
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
        result.enabled
          ? copy.commentsEnabledMessage
          : copy.commentsDisabledMessage,
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
  useFocusEffect(
    useCallback(() => {
      void loadGroupPosts(false);
    }, [loadGroupPosts]),
  );
  const displayedPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return posts;
    }

    return posts.filter(post => {
      const text = [post.caption, post.publisher.name, post.publisher.username]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(normalizedQuery);
    });
  }, [posts, searchQuery]);
  const hasSearchQuery = searchQuery.trim().length > 0;
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
    <View className="flex-1 surface-base">
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={
          Platform.OS === 'android'
            ? APP_BRAND_COLOR
            : APP_COLORS.neutral.surface
        }
        translucent={false}
      />
      <SafeAreaFeedHeader
        safeAreaBackgroundColor={
          Platform.OS === 'android'
            ? APP_BRAND_COLOR
            : APP_COLORS.neutral.surface
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        keyboardShouldPersistTaps="handled"
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
        <View className={`${FEED_CARD_CLASS} overflow-hidden`}>
          <View className="relative">
            <TouchableOpacity
              activeOpacity={0.96}
              accessibilityRole="imagebutton"
              accessibilityLabel={copy.groupCoverAction}
              disabled={!group?.cover || Boolean(updatingGroupMedia)}
              onPress={handleViewGroupCover}
            >
              <GroupCoverImage cover={groupCover} />
            </TouchableOpacity>
            <View
              pointerEvents="none"
              className="absolute inset-0 bg-black/15"
            />
            {updatingGroupMedia === 'cover' ? (
              <View className="absolute inset-0 items-center justify-center bg-black/30">
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={copy.backLabel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => navigation.goBack()}
              className="absolute left-3 top-3 h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/95 shadow-sm"
            >
              <ArrowLeft size={22} color={APP_COLORS.neutral.text} />
            </TouchableOpacity>
            {canEdit ? (
              <TouchableOpacity
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={copy.groupCoverAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={Boolean(updatingGroupMedia)}
                onPress={() => void handleUpdateGroupMedia('cover')}
                className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#E4E6EB] shadow-sm"
              >
                {updatingGroupMedia === 'cover' ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Camera size={18} color="#050505" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="px-4 pb-5">
            <View className="-mt-11 flex-row items-end justify-between">
              <View className="relative">
                <TouchableOpacity
                  activeOpacity={0.9}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={copy.groupAvatarAction}
                  disabled={!group?.avatar || Boolean(updatingGroupMedia)}
                  onPress={handleViewGroupAvatar}
                  className="rounded-full"
                >
                  <GroupAvatar avatar={group?.avatar} />
                </TouchableOpacity>
                {updatingGroupMedia === 'avatar' ? (
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : null}
                {canEdit ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={copy.groupAvatarAction}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={Boolean(updatingGroupMedia)}
                    onPress={() => void handleUpdateGroupMedia('avatar')}
                    className="absolute bottom-0 right-0 h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-[#E4E6EB]"
                  >
                    {updatingGroupMedia === 'avatar' ? (
                      <ActivityIndicator size="small" color="#0F172A" />
                    ) : (
                      <Camera size={14} color="#050505" />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
              {canEdit ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.btnEdit}
                  onPress={handleEditGroup}
                  className="btn-secondary mb-1 min-h-[42px] px-4 py-2"
                >
                  <Edit3 size={16} color={APP_COLORS.neutral.textMuted} />
                  <Text className="ml-2 text-caption-primary text-slate-600">
                    {copy.btnEdit}
                  </Text>
                </TouchableOpacity>
              ) : canCreatePost ? (
                <View className="mb-1 flex-row items-center rounded-full border border-brand-border bg-brand-soft px-3 py-2">
                  <Check size={15} color={APP_BRAND_COLOR} strokeWidth={2.6} />
                  <Text className="ml-1.5 text-caption-primary text-brand">
                    {copy.joinedGroup}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text className="mt-3 text-heading" numberOfLines={2}>
              {groupTitle}
            </Text>
            <GroupMetaRow
              membersLabel={`${formatCompact(membersCount)} ${
                copy.membersCountSuffix
              }`}
              privacyLabel={privacyLabel}
              categoryLabel={categoryLabel}
            />

            {!canCreatePost && !canEdit ? (
              <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <Text className="text-body-secondary">
                  {isJoinRequested ? copy.requestedHint : copy.joinHint}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isJoinRequested ? copy.joinRequested : copy.joinGroup
                  }
                  disabled={!targetGroupId || isJoiningGroup || isJoinRequested}
                  onPress={() => void handleJoinGroup()}
                  className="btn-primary mt-3 min-h-[48px] self-stretch"
                  style={{
                    opacity:
                      !targetGroupId || isJoiningGroup || isJoinRequested
                        ? 0.62
                        : 1,
                  }}
                >
                  {isJoiningGroup ? (
                    <ActivityIndicator
                      size="small"
                      color={APP_COLORS.brand.onPrimary}
                    />
                  ) : isJoinRequested ? (
                    <Check
                      size={18}
                      color={APP_COLORS.brand.onPrimary}
                      strokeWidth={2.6}
                    />
                  ) : (
                    <UserPlus
                      size={18}
                      color={APP_COLORS.brand.onPrimary}
                      strokeWidth={2.4}
                    />
                  )}
                  <Text className="ml-2 text-body-primary font-bold text-white">
                    {isJoiningGroup
                      ? copy.joiningGroup
                      : isJoinRequested
                      ? copy.joinRequested
                      : copy.joinGroup}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        <View className={FEED_CARD_CLASS}>
          <SectionTitle
            icon={<Info size={18} color={APP_BRAND_COLOR} strokeWidth={2.3} />}
            title={copy.sectionAbout}
          />
          <Text className="px-3 py-3 text-body-secondary">{groupAbout}</Text>
          <View className="border-t border-slate-100 bg-white">
            <InfoRow
              icon={<Users size={17} color={APP_COLORS.neutral.textMuted} />}
              label={`${formatCompact(membersCount)} ${
                copy.membersCountSuffix
              }`}
            />
            <InfoRow
              icon={<Globe2 size={17} color={APP_COLORS.neutral.textMuted} />}
              label={privacyLabel}
            />
            <InfoRow
              icon={<Tag size={17} color={APP_COLORS.neutral.textMuted} />}
              label={categoryLabel}
            />
            <InfoRow
              icon={<FileText size={17} color={APP_COLORS.neutral.textMuted} />}
              label={`${formatCompact(posts.length)} ${copy.postsLoadedLabel}`}
              isLast
            />
          </View>
        </View>

        {canCreatePost ? (
          <ComposerCard
            onPress={() => void handleCreatePost()}
            onPressAction={handleComposerAction}
            avatarUrl={activeUserAvatar}
            displayName={activeUserDisplayName}
            copy={{
              createPostBtn: copy.composerPlaceholder,
              composerPlaceholder: copy.composerPlaceholder,
              photo: copy.actionPhoto,
              video: copy.actionVideo,
              product: copy.actionProduct,
              job: copy.actionJob,
            }}
          />
        ) : null}

        <View className={`${FEED_CARD_CLASS} px-3 py-3`}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-title-primary">
                {copy.postsSectionTitle}
              </Text>
              <Text className="mt-1 text-caption-secondary">
                {hasSearchQuery
                  ? `${displayedPosts.length}/${posts.length} ${copy.postsLoadedLabel}`
                  : `${posts.length} ${copy.postsLoadedLabel}`}
              </Text>
            </View>
            <FileText size={20} color={APP_BRAND_COLOR} />
          </View>
          <View className="input-shell mt-3 min-h-[46px] flex-row items-center px-3">
            <Search size={18} color={APP_COLORS.neutral.iconMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="ml-2 flex-1 text-body-primary"
              placeholder={copy.searchPlaceholder}
              placeholderTextColor={APP_COLORS.neutral.iconMuted}
              returnKeyType="search"
            />
            {hasSearchQuery ? (
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={copy.clearSearch}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setSearchQuery('')}
                className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={16} color={APP_COLORS.neutral.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {isLoadingPosts ? (
          <View className={`${FEED_CARD_CLASS} py-12`}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : postsError ? (
          <View className={`${FEED_CARD_CLASS} px-3 py-8`}>
            <Text className="text-center text-body-secondary">
              {postsError}
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={copy.retryPosts}
              onPress={() => void loadGroupPosts(false)}
              className="btn-primary mt-4 min-h-[44px] self-center"
            >
              <Text className="text-body-primary font-bold text-white">
                {copy.retryPosts}
              </Text>
            </TouchableOpacity>
          </View>
        ) : displayedPosts.length > 0 ? (
          <View>{displayedPosts.map(renderGroupPost)}</View>
        ) : (
          <View className={`${FEED_CARD_CLASS} px-3 py-12`}>
            <View className="items-center justify-center">
              <View className="icon-chip h-16 w-16 items-center justify-center">
                {hasSearchQuery ? (
                  <Search size={28} color={APP_BRAND_COLOR} />
                ) : (
                  <Grid3X3 size={28} color={APP_BRAND_COLOR} />
                )}
              </View>
              <Text className="mt-4 text-center text-body-secondary">
                {hasSearchQuery ? copy.postsSearchEmpty : copy.postsEmpty}
              </Text>
              {hasSearchQuery ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={copy.clearSearch}
                  onPress={() => setSearchQuery('')}
                  className="btn-ghost mt-2"
                >
                  <Text className="text-body-primary font-semibold text-brand">
                    {copy.clearSearch}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      <PageMediaViewerModal
        visible={groupMediaViewer !== null}
        uri={groupMediaViewer === 'avatar' ? group?.avatar : group?.cover}
        kind={groupMediaViewer ?? 'avatar'}
        pageTitle={groupTitle}
        canEdit={canEdit}
        isUploading={
          groupMediaViewer === 'avatar'
            ? updatingGroupMedia === 'avatar'
            : updatingGroupMedia === 'cover'
        }
        onClose={handleCloseGroupMediaViewer}
        onChange={handleChangeGroupMediaFromViewer}
      />
      <ImageCropperModal
        visible={groupCropRequest !== null}
        image={groupCropRequest?.image ?? null}
        target={groupCropRequest?.target ?? 'avatar'}
        onCancel={() => setGroupCropRequest(null)}
        onComplete={handleCroppedGroupMedia}
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
        commentCount={
          selectedCommentPost?.commentCount ?? commentVm.comments.length
        }
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
        onSearchMentions={commentVm.searchCommentMentions}
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
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pt-4"
          style={{ paddingBottom: editSheetBottomPadding }}
        >
          <Text className="text-xl font-bold text-slate-900">
            {copy.editPostTitle}
          </Text>
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
              <Text className="text-base font-bold text-slate-600">
                {copy.editPostCancel}
              </Text>
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
                  <Text className="ml-2 text-base font-bold text-white">
                    {copy.editPostSaving}
                  </Text>
                </View>
              ) : (
                <Text className="text-base font-bold text-white">
                  {copy.editPostSave}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default GroupDetailScreen;
