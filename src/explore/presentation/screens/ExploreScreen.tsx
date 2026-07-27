// Description: Explore / Hashtags screen that lists trending hashtags and opens their post detail feed.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
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
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import {
  AlertCircle,
  ArrowLeft,
  Flag,
  Hash,
  MessageCircle,
  Search,
  Send,
  TrendingUp,
  Users,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import {
  EXPLORE_TABS,
  useExploreViewModel,
} from '../../application/view-models/useExploreViewModel';
import type { TrendingHashtag } from '../../domain/types/explore.types';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type {
  FeedPost,
  FeedTextPost,
} from '../../../feed/domain/types/feed.types';
import type {
  ReactionType,
  ReelComment,
} from '../../../reels/domain/types/reels.types';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import type {
  FeedShareDestination,
  SharePostInput,
} from '../../../feed/domain/repositories/FeedRepository';
import {
  FEED_COPY as POST_CARD_COPY,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import PostReactionsSheet from '../../../feed/presentation/components/PostReactionsSheet';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { useMyGroupsViewModel } from '../../../community';
import { useMyPagesViewModel } from '../../../pages';
import HashtagCard from '../components/HashtagCard';
import HashtagSkeleton from '../components/HashtagSkeleton';
import HashtagTabs from '../components/HashtagTabs';
import StatPill from '../components/StatPill';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';
import { useSafeBottomPadding } from '../../../shared-kernel/presentation/layout/useSafeBottomLayout';

const BRAND = APP_BRAND_COLOR;
const AVATAR_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
const feedRepository = createFeedRepository();

type ExploreNav = NativeStackNavigationProp<RootStackParamList>;
type ShareDestination = FeedShareDestination | 'message';

/**
 * Compact, Vietnamese-friendly counter for the StatPill row.
 *   330000 → "330K", 1500000 → "1.5M". Mirrors `formatCompactCount`
 *   inside HashtagCard so the two stay in lock-step.
 */
function formatCountVi(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const value = n / 1000;
    const rounded = Math.round(value * 10) / 10;
    return `${
      Number.isInteger(rounded)
        ? rounded
        : rounded.toFixed(1).replace(/\.0$/, '')
    }K`;
  }
  if (n < 1_000_000_000) {
    const value = n / 1_000_000;
    const rounded = Math.round(value * 10) / 10;
    return `${
      Number.isInteger(rounded)
        ? rounded
        : rounded.toFixed(1).replace(/\.0$/, '')
    }M`;
  }
  return `${Math.round(n / 1_000_000_000)}B`;
}

function formatShortTime(timestamp?: number): string {
  if (!timestamp) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
}

function HashtagCommentRow({
  comment,
  depth = 0,
  onReply,
  onLoadReplies,
  replies,
  isLoadingReplies,
}: {
  comment: ReelComment;
  depth?: number;
  onReply: (commentId: string, username: string) => void;
  onLoadReplies: (commentId: string) => void;
  replies?: ReelComment[];
  isLoadingReplies?: boolean;
}) {
  return (
    <View className={depth > 0 ? 'ml-12 mt-3' : 'mb-4'}>
      <View className="flex-row">
        <Image
          source={{ uri: comment.publisher.avatarUrl || AVATAR_FALLBACK }}
          className="h-9 w-9 rounded-full bg-[#e5e7eb]"
        />
        <View className="ml-3 flex-1">
          <View className="rounded-2xl bg-[#f1f5f9] px-3 py-2">
            <Text className="text-caption-primary text-[#0f172a]">
              {comment.publisher.name ||
                comment.publisher.username ||
                'Người dùng'}
            </Text>
            {comment.text ? (
              <Text className="mt-1 text-body-primary text-[#111827]">
                {comment.text}
              </Text>
            ) : null}
            {comment.isSending ? (
              <Text className="mt-1 text-caption-secondary text-[#64748b]">
                Đang gửi...
              </Text>
            ) : null}
            {comment.isFailed ? (
              <Text className="mt-1 text-caption-secondary text-[#ef4444]">
                Không gửi được
              </Text>
            ) : null}
          </View>
          <View className="mt-1 flex-row items-center gap-4 px-2">
            <Text className="text-caption-secondary text-[#64748b]">
              {formatShortTime(comment.postedAt)}
            </Text>
            <TouchableOpacity
              onPress={() =>
                onReply(
                  comment.id,
                  comment.publisher.username || comment.publisher.name || '',
                )
              }
              activeOpacity={0.8}
            >
              <Text className="text-caption-primary text-[#64748b]">
                Phản hồi
              </Text>
            </TouchableOpacity>
            {comment.likeCount > 0 ? (
              <Text className="text-caption-secondary text-[#64748b]">
                {formatCountVi(comment.likeCount)} thích
              </Text>
            ) : null}
          </View>

          {comment.replyCount > 0 && !replies?.length ? (
            <TouchableOpacity
              onPress={() => onLoadReplies(comment.id)}
              className="mt-2 px-2"
              activeOpacity={0.8}
            >
              <Text className="text-caption-primary text-[#64748b]">
                {isLoadingReplies
                  ? 'Đang tải phản hồi...'
                  : `Xem ${comment.replyCount} phản hồi`}
              </Text>
            </TouchableOpacity>
          ) : null}

          {replies?.map(reply => (
            <HashtagCommentRow
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onLoadReplies={onLoadReplies}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function HashtagCommentsOverlay({
  visible,
  comments,
  commentCount,
  isLoading,
  isLoadingMore,
  isSubmitting,
  error,
  repliesById,
  loadingRepliesIds,
  replyingTo,
  onClose,
  onEndReached,
  onRetry,
  onSubmit,
  onSubmitReply,
  onLoadReplies,
  onStartReply,
  onCancelReply,
}: {
  visible: boolean;
  comments: ReelComment[];
  commentCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  error: string | null;
  repliesById: Record<string, ReelComment[]>;
  loadingRepliesIds: string[];
  replyingTo: { commentId: string; username: string } | null;
  onClose: () => void;
  onEndReached: () => void;
  onRetry: () => void;
  onSubmit: (text: string) => Promise<ReelComment | null>;
  onSubmitReply: (
    commentId: string,
    text: string,
  ) => Promise<ReelComment | null>;
  onLoadReplies: (commentId: string) => void;
  onStartReply: (commentId: string, username: string) => void;
  onCancelReply: () => void;
}) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) {
      setDraft('');
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSubmitting) return;

    const created = replyingTo
      ? await onSubmitReply(replyingTo.commentId, text)
      : await onSubmit(text);
    if (created) {
      setDraft('');
    }
  }, [draft, isSubmitting, onSubmit, onSubmitReply, replyingTo]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      <Pressable
        className="absolute inset-0 bg-black/35"
        onPress={onClose}
        accessibilityLabel="Đóng bình luận"
      />
      <KeyboardSafeView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <View
          className="rounded-t-3xl bg-white px-4 pb-4 pt-3 shadow-2xl"
          style={{ maxHeight: '78%' }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-title-primary text-[#0f172a]">
              Bình luận ({formatCountVi(commentCount)})
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9]"
              activeOpacity={0.85}
            >
              <X size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View className="mb-3 flex-row items-center rounded-2xl bg-[#fef2f2] p-3">
              <Text className="flex-1 text-caption-primary text-brand">
                {error}
              </Text>
              <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
                <Text className="text-caption-primary text-brand">
                  Thử lại
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {replyingTo ? (
            <View className="mb-3 flex-row items-center rounded-2xl bg-brand-soft px-3 py-2">
              <Text className="flex-1 text-caption-primary text-brand">
                Đang phản hồi @{replyingTo.username}
              </Text>
              <TouchableOpacity onPress={onCancelReply} activeOpacity={0.8}>
                <X size={16} color={APP_BRAND_COLOR} />
              </TouchableOpacity>
            </View>
          ) : null}

          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            onEndReached={onEndReached}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              isLoading ? (
                <View className="items-center justify-center py-8">
                  <ActivityIndicator color={BRAND} />
                  <Text className="mt-2 text-body-secondary text-[#64748b]">
                    Đang tải bình luận...
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center py-8">
                  <MessageCircle size={26} color="#94a3b8" />
                  <Text className="mt-2 text-title-primary text-[#0f172a]">
                    Chưa có bình luận
                  </Text>
                  <Text className="mt-1 text-body-secondary text-[#64748b]">
                    Hãy là người đầu tiên bình luận.
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View className="py-3">
                  <ActivityIndicator color={BRAND} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <HashtagCommentRow
                comment={item}
                replies={repliesById[item.id]}
                isLoadingReplies={loadingRepliesIds.includes(item.id)}
                onReply={onStartReply}
                onLoadReplies={onLoadReplies}
              />
            )}
          />

          <View className="mt-3 flex-row items-end rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={
                replyingTo ? 'Viết phản hồi...' : 'Thêm bình luận...'
              }
              placeholderTextColor="#94a3b8"
              multiline
              className="max-h-24 flex-1 py-1 text-body-primary text-[#0f172a]"
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!draft.trim() || isSubmitting}
              className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${
                draft.trim() && !isSubmitting ? 'bg-brand' : 'bg-[#cbd5e1]'
              }`}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardSafeView>
    </View>
  );
}

function HashtagShareOverlay({
  visible,
  post,
  onClose,
  onInternalShare,
}: {
  visible: boolean;
  post?: FeedTextPost;
  onClose: () => void;
  onInternalShare: (input: SharePostInput) => Promise<FeedPost>;
}) {
  const safeBottomPadding = useSafeBottomPadding(20);
  const currentUserVm = useCurrentUserViewModel();
  const pagesVm = useMyPagesViewModel();
  const groupsVm = useMyGroupsViewModel();
  const [note, setNote] = useState('');
  const [destination, setDestination] = useState<ShareDestination>('timeline');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !post) return;
    setNote('');
    setDestination('timeline');
    setError(null);
    pagesVm.setActiveFilter('mine');
    groupsVm.setActiveFilter('mine');
    void pagesVm.loadFirstPage(false);
    void groupsVm.loadFirstPage(false);
    // Keep this effect tied to opening the inline sheet only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, post?.id]);

  useEffect(() => {
    if (!selectedPageId && pagesVm.pages.length > 0) {
      setSelectedPageId(String(pagesVm.pages[0].pageId || pagesVm.pages[0].id));
    }
  }, [pagesVm.pages, selectedPageId]);

  useEffect(() => {
    if (!selectedGroupId && groupsVm.groups.length > 0) {
      setSelectedGroupId(
        String(groupsVm.groups[0].groupId || groupsVm.groups[0].id),
      );
    }
  }, [groupsVm.groups, selectedGroupId]);

  const handleShare = useCallback(async () => {
    if (!post || isSharing) return;
    setIsSharing(true);
    setError(null);

    try {
      if (destination === 'message') {
        throw new Error('Chia sẻ qua tin nhắn sẽ được bổ sung sau.');
      }

      const input: SharePostInput = {
        postId: post.id,
        destination,
        text: note,
      };

      if (destination === 'timeline') {
        if (!currentUserVm.user?.userId) {
          throw new Error('Không tìm thấy tài khoản hiện tại.');
        }
        input.userId = currentUserVm.user.userId;
      } else if (destination === 'page') {
        if (!selectedPageId) {
          throw new Error('Bạn chưa có trang để chia sẻ.');
        }
        input.pageId = selectedPageId;
      } else if (destination === 'group') {
        if (!selectedGroupId) {
          throw new Error('Bạn chưa có nhóm để chia sẻ.');
        }
        input.groupId = selectedGroupId;
      }

      await onInternalShare(input);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể chia sẻ bài viết.',
      );
    } finally {
      setIsSharing(false);
    }
  }, [
    currentUserVm.user?.userId,
    destination,
    isSharing,
    note,
    onClose,
    onInternalShare,
    post,
    selectedGroupId,
    selectedPageId,
  ]);

  if (!visible || !post) return null;

  const destinations: Array<{
    id: ShareDestination;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }> = [
    { id: 'timeline', label: 'Dòng thời gian', Icon: Send },
    { id: 'page', label: 'Trang', Icon: Flag },
    { id: 'group', label: 'Nhóm', Icon: Users },
    { id: 'message', label: 'Tin nhắn', Icon: MessageCircle },
  ];

  return (
    <View className="absolute inset-0 z-50">
      <Pressable
        className="absolute inset-0 bg-black/35"
        onPress={onClose}
        accessibilityLabel="Đóng chia sẻ"
      />
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-4 pt-3 shadow-2xl"
        style={{ maxHeight: '86%', paddingBottom: safeBottomPadding }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-title-primary text-[#0f172a]">
            Chia sẻ bài viết
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9]"
            activeOpacity={0.85}
          >
            <X size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-2 text-caption-primary text-[#111827]">
            hoặc chia sẻ lên
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Thêm ghi chú cho bài chia sẻ..."
            placeholderTextColor="#94a3b8"
            multiline
            className="h-24 rounded-xl border border-[#cbd5e1] px-3 py-3 text-body-primary text-[#0f172a]"
            textAlignVertical="top"
          />

          <Text className="mb-2 mt-4 text-caption-primary text-[#111827]">
            Đích chia sẻ
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {destinations.map(({ id, label, Icon }) => {
              const active = destination === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setDestination(id)}
                  className={`min-h-[74px] flex-1 basis-[46%] items-center justify-center rounded-2xl border px-2 ${
                    active
                      ? 'border-brand bg-brand-soft'
                      : 'border-[#e2e8f0] bg-[#f8fafc]'
                  }`}
                  activeOpacity={0.85}
                >
                  <Icon size={18} color={active ? BRAND : '#64748b'} />
                  <Text
                    className={`mt-2 text-caption-primary ${
                      active ? 'text-brand' : 'text-[#64748b]'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {destination === 'timeline' ? (
            <View className="mt-3 rounded-2xl border border-brand-border bg-brand-soft p-3">
              <Text className="text-caption-primary text-[#0f172a]">
                Trang cá nhân của tôi
              </Text>
              <Text className="mt-1 text-body-secondary text-[#64748b]">
                Bài chia sẻ sẽ xuất hiện trên dòng thời gian cá nhân.
              </Text>
              <View className="mt-3 flex-row items-center rounded-xl border border-[#a5b4fc] bg-white p-2">
                <Image
                  source={{
                    uri: currentUserVm.user?.avatar || AVATAR_FALLBACK,
                  }}
                  className="h-10 w-10 rounded-full bg-[#e5e7eb]"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-caption-primary text-[#0f172a]">
                    {currentUserVm.user?.name || 'Tài khoản của tôi'}
                  </Text>
                  <Text className="text-caption-secondary text-[#64748b]">
                    @{currentUserVm.user?.username || 'me'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {destination === 'page' ? (
            <View className="mt-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              {pagesVm.isLoading ? (
                <ActivityIndicator color={BRAND} />
              ) : pagesVm.pages.length > 0 ? (
                pagesVm.pages.map(page => {
                  const id = String(page.pageId || page.id);
                  const active = selectedPageId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setSelectedPageId(id)}
                      className={`mb-2 flex-row items-center rounded-xl border p-2 ${
                        active
                          ? 'border-brand bg-white'
                          : 'border-transparent bg-white'
                      }`}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: page.avatar || AVATAR_FALLBACK }}
                        className="h-10 w-10 rounded-full bg-[#e5e7eb]"
                      />
                      <Text className="ml-3 flex-1 text-caption-primary text-[#0f172a]">
                        {page.pageTitle || page.pageName || 'Trang'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className="text-body-secondary text-[#64748b]">
                  Bạn chưa có trang để chia sẻ.
                </Text>
              )}
            </View>
          ) : null}

          {destination === 'group' ? (
            <View className="mt-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              {groupsVm.isLoading ? (
                <ActivityIndicator color={BRAND} />
              ) : groupsVm.groups.length > 0 ? (
                groupsVm.groups.map(group => {
                  const id = String(group.groupId || group.id);
                  const active = selectedGroupId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setSelectedGroupId(id)}
                      className={`mb-2 flex-row items-center rounded-xl border p-2 ${
                        active
                          ? 'border-brand bg-white'
                          : 'border-transparent bg-white'
                      }`}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: group.avatar || AVATAR_FALLBACK }}
                        className="h-10 w-10 rounded-full bg-[#e5e7eb]"
                      />
                      <Text className="ml-3 flex-1 text-caption-primary text-[#0f172a]">
                        {group.groupTitle || group.groupName || 'Nhóm'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className="text-body-secondary text-[#64748b]">
                  Bạn chưa có nhóm để chia sẻ.
                </Text>
              )}
            </View>
          ) : null}

          {error ? (
            <Text className="mt-3 text-caption-primary text-[#ef4444]">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleShare}
            disabled={isSharing}
            className="mt-4 h-12 items-center justify-center rounded-xl bg-brand"
            activeOpacity={0.9}
          >
            {isSharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-caption-primary text-white">Chia sẻ</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

function ExploreScreen() {
  const navigation = useNavigation<ExploreNav>();
  const language = useAppLanguage();
  const postCardCopy = POST_CARD_COPY[language];
  const {
    tags,
    isLoading,
    isRefreshing,
    error,
    activeTab,
    setActiveTab,
    reload,
    stats,
  } = useExploreViewModel();

  const lastScrollY = useRef(0);
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const hasDragged = useSharedValue(false);
  const [selectedHashtag, setSelectedHashtag] =
    useState<TrendingHashtag | null>(null);
  const [hashtagPosts, setHashtagPosts] = useState<FeedTextPost[]>([]);
  const [isHashtagLoading, setIsHashtagLoading] = useState(false);
  const [isHashtagRefreshing, setIsHashtagRefreshing] = useState(false);
  const [hashtagError, setHashtagError] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [commentSheetPostId, setCommentSheetPostId] = useState<string | null>(
    null,
  );
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedTextPost | undefined>();
  const [reactionsSheetVisible, setReactionsSheetVisible] = useState(false);
  const [reactionsSheetPostId, setReactionsSheetPostId] = useState<string | null>(null);

  const openReactionsSheet = useCallback((postId: string, _post: FeedPost) => {
    setReactionsSheetPostId(postId);
    setReactionsSheetVisible(true);
  }, []);

  const closeReactionsSheet = useCallback(() => {
    setReactionsSheetVisible(false);
  }, []);

  const updateHashtagCommentCount = useCallback(
    (postId: string, delta: number) => {
      setHashtagPosts(posts =>
        posts.map(post =>
          post.id === postId
            ? {
                ...post,
                commentCount: Math.max(0, post.commentCount + delta),
              }
            : post,
        ),
      );
    },
    [],
  );

  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: updateHashtagCommentCount,
  });

  const selectedCommentPost = useMemo(
    () =>
      hashtagPosts.find(
        post =>
          post.id === (commentSheetPostId || commentVm.selectedCommentPostId),
      ),
    [commentSheetPostId, commentVm.selectedCommentPostId, hashtagPosts],
  );

  // Hide the bottom tab bar when scrolling down, show on scroll up —
  // matches the pattern the previous mock screen used (kept here so the
  // real-data screen doesn't regress on UX).
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.current;
      if (currentY <= 50) {
        tabBarVisibility.setVisible(true);
      } else if (diff > 15) {
        tabBarVisibility.setVisible(false);
      } else if (diff < -15) {
        tabBarVisibility.setVisible(true);
      }
      lastScrollY.current = currentY;
    },
    [],
  );

  const loadHashtagPosts = useCallback(
    async (hashtag: TrendingHashtag, refresh = false) => {
      if (refresh) {
        setIsHashtagRefreshing(true);
      } else {
        setIsHashtagLoading(true);
      }
      setHashtagError(null);

      try {
        const posts = await feedRepository.getHashtagPosts(hashtag.tag, 20);
        setHashtagPosts(posts);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : 'Không thể tải bài viết của hashtag này.';
        setHashtagError(message);
      } finally {
        setIsHashtagLoading(false);
        setIsHashtagRefreshing(false);
      }
    },
    [],
  );

  const handleHashtagPress = useCallback(
    (hashtag: TrendingHashtag) => {
      setSelectedHashtag(hashtag);
      setHashtagPosts([]);
      void loadHashtagPosts(hashtag);
    },
    [loadHashtagPosts],
  );

  const handleBackToHashtags = useCallback(() => {
    setSelectedHashtag(null);
    setHashtagPosts([]);
    setHashtagError(null);
    setPickerAnchor(null);
    setCommentSheetPostId(null);
    setShareSheetVisible(false);
    setSharingPost(undefined);
    commentVm.closeComments();
    tabBarVisibility.setVisible(true);
  }, [commentVm]);

  const handleRefreshHashtag = useCallback(() => {
    if (selectedHashtag) {
      void loadHashtagPosts(selectedHashtag, true);
    }
  }, [loadHashtagPosts, selectedHashtag]);

  const navigateToProfile = useCallback(
    (userId: string) => {
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
  );

  const handlePostPress = useCallback(
    (post: FeedPost) => {
      navigation.navigate(ROUTES.POST_DETAIL, {
        postId: post.id,
        post,
      });
    },
    [navigation],
  );

  const handleCommentTap = useCallback(
    (postId: string) => {
      setCommentSheetPostId(postId);
      requestAnimationFrame(() => {
        commentVm.openComments(postId);
      });
    },
    [commentVm],
  );

  const handleRetryComments = useCallback(() => {
    const postId = commentSheetPostId || commentVm.selectedCommentPostId;
    if (postId) {
      commentVm.openComments(postId);
    }
  }, [commentSheetPostId, commentVm]);

  const handleCloseComments = useCallback(() => {
    setCommentSheetPostId(null);
    commentVm.closeComments();
  }, [commentVm]);

  const handlePhotoPress = useCallback(
    (post: FeedTextPost) => {
      handlePostPress(post);
    },
    [handlePostPress],
  );

  const handleOpenSharePost = useCallback((post: FeedPost) => {
    if (post.kind === 'text') {
      setSharingPost(post);
      requestAnimationFrame(() => {
        setShareSheetVisible(true);
        tabBarVisibility.setVisible(false);
      });
    }
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareSheetVisible(false);
    tabBarVisibility.setVisible(true);
    setTimeout(() => {
      setSharingPost(undefined);
    }, 180);
  }, []);

  const handleInternalSharePost = useCallback((input: SharePostInput) => {
    return feedRepository.sharePost(input);
  }, []);

  const handleHashtagReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedTextPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      setHashtagPosts(posts =>
        posts.map(post => {
          if (post.id !== postId) return post;
          snapshot = post;
          const willClear = post.myReaction === nextReaction;
          targetReaction = willClear ? null : nextReaction;
          const wasReacted = post.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);
          const prevReaction = post.myReaction;
          let topReactions = [...post.topReactions];

          if (!prevReaction && post.likeCount <= 0) {
            topReactions = [];
          }
          if (prevReaction && prevReaction !== targetReaction) {
            topReactions = topReactions.filter(type => type !== prevReaction);
          }
          if (targetReaction && !topReactions.includes(targetReaction)) {
            topReactions = [targetReaction, ...topReactions].slice(0, 3);
          }

          const likeCount = Math.max(0, post.likeCount + countDelta);
          if (likeCount === 0) {
            topReactions = [];
          }

          return {
            ...post,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount,
            topReactions,
          };
        }),
      );

      try {
        await feedRepository.setReaction(postId, targetReaction);
      } catch (caught) {
        if (snapshot) {
          const original = snapshot;
          setHashtagPosts(posts =>
            posts.map(post => (post.id === postId ? original : post)),
          );
        }
        setHashtagError(
          caught instanceof Error
            ? caught.message
            : 'Không thể cập nhật reaction.',
        );
      }
    },
    [],
  );

  const handleOpenReactionPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      void handleHashtagReaction(pickerAnchor.postId, reaction);
      setPickerAnchor(null);
    },
    [handleHashtagReaction, pickerAnchor],
  );

  const renderItem = useCallback<ListRenderItem<TrendingHashtag>>(
    ({ item, index }) => (
      <HashtagCard hashtag={item} index={index} onPress={handleHashtagPress} />
    ),
    [handleHashtagPress],
  );

  const keyExtractor = useCallback((item: TrendingHashtag) => item.id, []);
  const postKeyExtractor = useCallback((item: FeedTextPost) => item.id, []);

  const renderHashtagPost = useCallback<ListRenderItem<FeedTextPost>>(
    ({ item }) => (
      <TextPostCard
        post={item}
        copy={postCardCopy}
        onReact={handleHashtagReaction}
        onOpenPicker={handleOpenReactionPicker}
        onCommentTap={handleCommentTap}
        onPhotoPress={handlePhotoPress}
        onShare={handleOpenSharePost}
        navigateToProfile={navigateToProfile}
        onPostPress={handlePostPress}
        gestureX={gestureX}
        gestureY={gestureY}
        gestureActive={gestureActive}
        hasDragged={hasDragged}
        onOpenReactions={openReactionsSheet}
      />
    ),
    [
      handleCommentTap,
      handleHashtagReaction,
      handleOpenReactionPicker,
      handleOpenSharePost,
      handlePhotoPress,
      handlePostPress,
      postCardCopy,
      gestureActive,
      gestureX,
      gestureY,
      hasDragged,
      navigateToProfile,
    ],
  );

  const ListHeader = (
    <View>
      {/* Stat pills row */}
      <View className="mb-4 flex-row gap-3">
        <StatPill
          Icon={TrendingUp}
          value={formatCountVi(stats.totalPosts)}
          label="Bài viết thịnh hành"
        />
        <StatPill
          Icon={Hash}
          value={formatCountVi(stats.totalHashtags)}
          label="Hashtag đang theo dõi"
          brandTint
        />
      </View>

      {/* Tabs row */}
      <View className="mb-4">
        <HashtagTabs
          tabs={EXPLORE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {/* Inline error banner — non-blocking, keeps the skeleton out
          so the user can still see whatever was last loaded. */}
      {error && (
        <View
          className="mb-3 flex-row items-center rounded-2xl border border-[#ef4444]/30 bg-[#fef2f2] p-3"
          accessibilityLiveRegion="polite"
        >
          <AlertCircle size={18} color="#ef4444" strokeWidth={2.2} />
          <Text className="ml-2 flex-1 text-caption-primary text-brand">
            {error}
          </Text>
          <TouchableOpacity
            onPress={reload}
            className="ml-2 rounded-full bg-white/70 px-3 py-1"
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text className="text-caption-primary text-brand">Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const ListEmpty = !isLoading ? (
    <View className="items-center justify-center px-6 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand/8">
        <Hash size={28} color={BRAND} strokeWidth={2} />
      </View>
      <Text className="mt-4 text-title-primary text-center">
        Chưa có hashtag nào
      </Text>
      <Text className="mt-2 text-body-secondary text-center">
        Hiện chưa có chủ đề thịnh hành nào để hiển thị. Quay lại sau nhé.
      </Text>
      <TouchableOpacity
        onPress={reload}
        className="btn-primary mt-5"
        activeOpacity={0.9}
      >
        <Text className="text-caption-primary text-inverse">Thử lại</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const HashtagPostEmpty = !isHashtagLoading ? (
    <View className="items-center justify-center px-6 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand/8">
        <Hash size={28} color={BRAND} strokeWidth={2} />
      </View>
      <Text className="mt-4 text-title-primary text-center">
        Chưa có bài viết
      </Text>
      <Text className="mt-2 text-body-secondary text-center">
        Hashtag này hiện chưa có bài viết nào để hiển thị.
      </Text>
      {hashtagError ? (
        <Text className="mt-3 text-caption-primary text-center text-brand">
          {hashtagError}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={handleRefreshHashtag}
        className="btn-primary mt-5"
        activeOpacity={0.9}
      >
        <Text className="text-caption-primary text-inverse">Thử lại</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  if (selectedHashtag) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 surface-base" edges={['top']}>
          <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />

          <View className="surface-brand h-14 flex-row items-center justify-between px-4">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={handleBackToHashtags}
              accessibilityLabel="Quay lại danh sách hashtag"
            >
              <ArrowLeft size={23} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text className="text-title-primary text-inverse" numberOfLines={1}>
              #{selectedHashtag.tag}
            </Text>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() =>
                navigation.navigate(ROUTES.SEARCH, {
                  q: `#${selectedHashtag.tag}`,
                })
              }
              accessibilityLabel="Mở tìm kiếm"
            >
              <Search size={21} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={isHashtagLoading ? [] : hashtagPosts}
            renderItem={renderHashtagPost}
            keyExtractor={postKeyExtractor}
            contentContainerClassName="px-4 pb-28 pt-4"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            ListHeaderComponent={
              hashtagError && hashtagPosts.length > 0 ? (
                <View
                  className="mb-3 flex-row items-center rounded-2xl border border-[#ef4444]/30 bg-[#fef2f2] p-3"
                  accessibilityLiveRegion="polite"
                >
                  <AlertCircle size={18} color="#ef4444" strokeWidth={2.2} />
                  <Text className="ml-2 flex-1 text-caption-primary text-brand">
                    {hashtagError}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              isHashtagLoading ? (
                <View className="items-center justify-center py-16">
                  <ActivityIndicator color={BRAND} />
                </View>
              ) : (
                HashtagPostEmpty
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={isHashtagRefreshing}
                onRefresh={handleRefreshHashtag}
                tintColor={BRAND}
                colors={[BRAND]}
                progressViewOffset={8}
              />
            }
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
          <PostReactionsSheet
            visible={reactionsSheetVisible}
            postId={reactionsSheetPostId}
            onClose={closeReactionsSheet}
          />
          {Boolean(commentSheetPostId) || commentVm.isCommentsOpen ? (
            <HashtagCommentsOverlay
              visible
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
              onClose={handleCloseComments}
              onEndReached={commentVm.loadMoreComments}
              onRetry={handleRetryComments}
              onSubmit={commentVm.submitComment}
              onSubmitReply={commentVm.submitReply}
              onLoadReplies={commentVm.loadReplies}
              onStartReply={commentVm.startReplyTo}
              onCancelReply={commentVm.cancelReply}
            />
          ) : null}
          {shareSheetVisible && sharingPost ? (
            <HashtagShareOverlay
              visible
              onClose={handleCloseShareModal}
              post={sharingPost}
              onInternalShare={handleInternalSharePost}
            />
          ) : null}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header — gradient brand bar */}
      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Hash size={23} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <Text className="text-title-primary text-inverse">Hashtags</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
          accessibilityLabel="Mở tìm kiếm"
        >
          <Search size={21} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={isLoading ? [] : tags}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerClassName="px-4 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        ListHeaderComponent={isLoading ? null : ListHeader}
        ListEmptyComponent={
          isLoading ? <HashtagSkeleton count={4} /> : ListEmpty
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={reload}
            tintColor={BRAND}
            colors={[BRAND]}
            progressViewOffset={8}
          />
        }
      />
    </SafeAreaView>
  );
}

// Mark this file as a re-render boundary for React DevTools.
const MemoExploreScreen = React.memo(ExploreScreen);
export default MemoExploreScreen;
