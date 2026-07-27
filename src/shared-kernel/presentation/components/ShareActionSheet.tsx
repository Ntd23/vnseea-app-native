// Description: Renders the post/story share sheet with internal feed destinations and external share actions.
import { APP_BRAND_COLOR, APP_COLORS } from '../theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Flag,
  MessageCircle,
  Send,
  Users,
  X,
} from 'lucide-react-native';
import type {
  FeedPost,
} from '../../../feed/domain/types/feed.types';
import type {
  FeedShareDestination,
  SharePostInput,
} from '../../../feed/domain/repositories/FeedRepository';
import { useMyGroupsViewModel } from '../../../community';
import { useMyPagesViewModel } from '../../../pages';
// `useMessagesViewModel` powers the 'message' destination —
// we surface the user's recent chat list so they can pick a
// recipient without leaving the share sheet.
import { useMessagesViewModel } from '../../../messages';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { useShareViewModel } from '../../application/view-models/useShareViewModel';
import { useCurrentUserViewModel } from '../../application/view-models/useCurrentUserViewModel';
import { useSafeBottomPadding } from '../layout/useSafeBottomLayout';

type Destination = FeedShareDestination | 'message';

interface ShareActionSheetProps {
  visible: boolean;
  onClose: () => void;
  post?: FeedPost;
  story?: StoryItem;
  onCopied?: () => void;
  onInternalShare?: (input: SharePostInput) => Promise<FeedPost>;
  onShared?: (post: FeedPost) => void;
}

const DESTINATIONS: Array<{
  id: Destination;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}> = [
  { id: 'timeline', label: 'Dòng thời gian', icon: Send },
  { id: 'page', label: 'Trang', icon: Flag },
  { id: 'group', label: 'Nhóm', icon: Users },
  { id: 'message', label: 'Tin nhắn', icon: MessageCircle },
];

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

export function ShareActionSheet({
  visible,
  onClose,
  post,
  story,
  onCopied,
  onInternalShare,
  onShared,
}: ShareActionSheetProps) {
  const { sharePost, shareStory, copyToClipboard } = useShareViewModel();
  const currentUserVm = useCurrentUserViewModel();
  const pagesVm = useMyPagesViewModel();
  const groupsVm = useMyGroupsViewModel();
  const safeBottomPadding = useSafeBottomPadding(28);
  // Recent chats — used to populate the recipient picker when
  // `destination === 'message'`. We lazy-load on first open so
  // the chat endpoint doesn't fire on every Feed mount.
  const messagesVm = useMessagesViewModel();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [destination, setDestination] = useState<Destination>('timeline');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  // Selected chat recipient for the 'message' destination. We
  // store the user id (not the chat id) because the wire endpoint
  // is keyed by user.
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !post) return;
    setError(null);
    setNote('');
    setDestination('timeline');
    setSelectedChatUserId(null);
    pagesVm.setActiveFilter('mine');
    groupsVm.setActiveFilter('mine');
    void pagesVm.loadFirstPage(false);
    void groupsVm.loadFirstPage(false);
    // Load recent chats the first time the modal opens so the
    // 'message' target list is ready when the user picks it. The
    // view-model short-circuits if the chats are already loaded.
    messagesVm.loadChats(true).catch(() => undefined);
    // The view-model functions are stable enough for modal open; including
    // every method would reload while typing in the composer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, post?.id]);

  useEffect(() => {
    if (!selectedPageId && pagesVm.pages.length > 0) {
      setSelectedPageId(String(pagesVm.pages[0].pageId || pagesVm.pages[0].id));
    }
  }, [pagesVm.pages, selectedPageId]);

  useEffect(() => {
    if (!selectedGroupId && groupsVm.groups.length > 0) {
      setSelectedGroupId(String(groupsVm.groups[0].groupId || groupsVm.groups[0].id));
    }
  }, [groupsVm.groups, selectedGroupId]);

  // Auto-pick the most recent user chat when the user opens the
  // 'message' destination. Skip group chats — those still need
  // a separate wire endpoint and aren't part of this iteration.
  useEffect(() => {
    if (
      destination === 'message' &&
      !selectedChatUserId &&
      messagesVm.chats.length > 0
    ) {
      const firstUserChat = messagesVm.chats.find(
        chat => chat.chatType === 'user',
      );
      if (firstUserChat) {
        setSelectedChatUserId(String(firstUserChat.userId));
      }
    }
  }, [destination, messagesVm.chats, selectedChatUserId]);

  const selectedPage = useMemo(
    () =>
      pagesVm.pages.find(
        page => String(page.pageId || page.id) === String(selectedPageId),
      ),
    [pagesVm.pages, selectedPageId],
  );
  const selectedGroup = useMemo(
    () =>
      groupsVm.groups.find(
        group => String(group.groupId || group.id) === String(selectedGroupId),
      ),
    [groupsVm.groups, selectedGroupId],
  );
  // Filter to user-only chats — the share-to-message wire
  // endpoint accepts `user_id` only. Group chat shares still
  // route through the 'group' destination.
  const availableChatsForShare = useMemo(
    () => messagesVm.chats.filter(chat => chat.chatType === 'user'),
    [messagesVm.chats],
  );
  const selectedChat = useMemo(
    () =>
      availableChatsForShare.find(
        chat => String(chat.userId) === String(selectedChatUserId),
      ),
    [availableChatsForShare, selectedChatUserId],
  );

  const handleCopyLink = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const targetType = post ? 'post' : 'story';
      const targetId = post?.id ?? story?.id;
      if (!targetId) {
        throw new Error('Không có nội dung để chia sẻ.');
      }

      await copyToClipboard(targetId, targetType);
      onCopied?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi sao chép liên kết.');
    } finally {
      setIsLoading(false);
    }
  }, [copyToClipboard, onClose, onCopied, post, story]);

  const handleExternalShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (post) {
        await sharePost(post, {
          title: 'Chia sẻ bài viết',
          subject: 'Xem bài viết này từ VNSEEA',
        });
      } else if (story) {
        await shareStory(story, {
          title: 'Chia sẻ tin',
          subject: 'Xem tin mới từ VNSEEA',
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi chia sẻ.');
    } finally {
      setIsLoading(false);
    }
  }, [onClose, post, sharePost, shareStory, story]);

  const handleInternalShare = useCallback(async () => {
    if (!post) return;
    setIsLoading(true);
    setError(null);

    try {
      if (!onInternalShare) {
        throw new Error('Chưa cấu hình chia sẻ nội bộ.');
      }

      const input: SharePostInput = {
        postId: post.id,
        destination,
        text: note,
      };

      if (destination === 'timeline') {
        const userId = currentUserVm.user?.userId;
        if (!userId) {
          throw new Error('Không tìm thấy tài khoản hiện tại.');
        }
        input.userId = userId;
      } else if (destination === 'page') {
        const pageId = selectedPage?.pageId || selectedPage?.id;
        if (!pageId) {
          throw new Error('Bạn chưa có trang để chia sẻ.');
        }
        input.pageId = String(pageId);
      } else if (destination === 'group') {
        const groupId = selectedGroup?.groupId || selectedGroup?.id;
        if (!groupId) {
          throw new Error('Bạn chưa có nhóm để chia sẻ.');
        }
        input.groupId = String(groupId);
      } else if (destination === 'message') {
        // Backend doesn't expose a wire-level "share post to chat"
        // endpoint; the repo synthesises a text message containing
        // the shareable URL. So all we need here is the recipient
        // id.
        const recipientId =
          selectedChat?.userId ?? selectedChatUserId;
        if (!recipientId) {
          throw new Error('Bạn chưa có cuộc trò chuyện để chia sẻ.');
        }
        input.recipientUserId = String(recipientId);
      }

      const sharedPost = await onInternalShare(input);
      onShared?.(sharedPost);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chia sẻ bài viết.');
    } finally {
      setIsLoading(false);
    }
  }, [
    currentUserVm.user?.userId,
    destination,
    note,
    onClose,
    onInternalShare,
    onShared,
    post,
    selectedGroup,
    selectedPage,
  ]);

  if (!visible || (!post && !story)) {
    return null;
  }

  const canInternalShare = Boolean(post);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{post ? 'Chia sẻ bài viết' : 'Chia sẻ tin'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: safeBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {canInternalShare ? (
            <>
              <Text style={styles.sectionLabel}>hoặc chia sẻ lên</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Thêm ghi chú cho bài chia sẻ..."
                placeholderTextColor="#9CA3AF"
                multiline
                style={styles.noteInput}
                textAlignVertical="top"
              />

              <Text style={styles.sectionLabel}>Đích chia sẻ</Text>
              <View style={styles.destinationGrid}>
                {DESTINATIONS.map(option => {
                  const Icon = option.icon;
                  const active = destination === option.id;
                  // 'message' was previously disabled because the
                  // backend had no wire endpoint. We've now added
                  // a fallback path that sends the post URL as a
                  // chat message — so the destination is live.
                  const disabled = false;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      activeOpacity={0.86}
                      disabled={isLoading}
                      onPress={() => {
                        setDestination(option.id);
                        setError(null);
                      }}
                      style={[
                        styles.destinationCard,
                        active && styles.destinationCardActive,
                        disabled && styles.destinationCardDisabled,
                      ]}
                    >
                      <Icon size={15} color={active ? APP_BRAND_COLOR : '#64748B'} />
                      <Text
                        style={[
                          styles.destinationText,
                          active && styles.destinationTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {destination === 'timeline' ? (
                <TimelineTarget user={currentUserVm.user} />
              ) : null}
              {destination === 'page' ? (
                <EntityTargetList
                  title="Trang của tôi"
                  emptyText={pagesVm.isLoading ? 'Đang tải trang...' : 'Bạn chưa có trang để chia sẻ.'}
                  items={pagesVm.pages}
                  selectedId={selectedPageId}
                  onSelect={id => setSelectedPageId(id)}
                  getId={item => String(item.pageId || item.id)}
                  getTitle={item => item.pageTitle || item.pageName}
                  getSubtitle={item => (item.pageName ? `@${item.pageName}` : 'Trang')}
                  getAvatar={item => item.avatar}
                />
              ) : null}
              {destination === 'group' ? (
                <EntityTargetList
                  title="Nhóm của tôi"
                  emptyText={groupsVm.isLoading ? 'Đang tải nhóm...' : 'Bạn chưa có nhóm để chia sẻ.'}
                  items={groupsVm.groups}
                  selectedId={selectedGroupId}
                  onSelect={id => setSelectedGroupId(id)}
                  getId={item => String(item.groupId || item.id)}
                  getTitle={item => item.groupTitle || item.groupName}
                  getSubtitle={item => (item.groupName ? `@${item.groupName}` : 'Nhóm')}
                  getAvatar={item => item.avatar}
                />
              ) : null}
              {destination === 'message' ? (
                <EntityTargetList
                  title="Gửi tới bạn bè"
                  emptyText={
                    messagesVm.isLoadingChats
                      ? 'Đang tải cuộc trò chuyện...'
                      : 'Bạn chưa có cuộc trò chuyện nào để chia sẻ.'
                  }
                  items={availableChatsForShare}
                  selectedId={selectedChatUserId}
                  onSelect={id => setSelectedChatUserId(id)}
                  getId={item => String(item.userId)}
                  getTitle={item => item.name}
                  getSubtitle={item =>
                    item.username ? `@${item.username}` : item.lastMessage
                  }
                  getAvatar={item => item.avatar}
                />
              ) : null}
            </>
          ) : null}

          {(isLoading || error) ? (
            <View style={styles.statusRow}>
              {isLoading ? <ActivityIndicator color={APP_BRAND_COLOR} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : null}

          {canInternalShare ? (
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isLoading}
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleInternalShare}
            >
              <Text style={styles.primaryButtonText}>Chia sẻ ngay</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.sectionLabel}>Chia sẻ ngoài ứng dụng</Text>
          <View style={styles.externalRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isLoading}
              style={styles.externalButton}
              onPress={handleCopyLink}
            >
              <Copy size={17} color="#64748B" />
              <Text style={styles.externalText}>Sao chép</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isLoading}
              style={styles.externalButton}
              onPress={handleExternalShare}
            >
              <ExternalLink size={17} color="#64748B" />
              <Text style={styles.externalText}>Khác</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function TimelineTarget({ user }: { user: ReturnType<typeof useCurrentUserViewModel>['user'] }) {
  return (
    <View style={styles.targetPanel}>
      <Text style={styles.targetTitle}>Trang cá nhân của tôi</Text>
      <Text style={styles.targetDescription}>
        Bài chia sẻ sẽ xuất hiện trên dòng thời gian cá nhân.
      </Text>
      <View style={styles.targetRowActive}>
        <Image
          source={{ uri: user?.avatar || FALLBACK_AVATAR }}
          style={styles.targetAvatar}
        />
        <View style={styles.targetInfo}>
          <Text style={styles.targetName}>{user?.name || 'Tài khoản của tôi'}</Text>
          <Text style={styles.targetHandle}>
            {user?.username ? `@${user.username}` : 'Dòng thời gian'}
          </Text>
        </View>
        <CheckCircle2 size={18} color={APP_BRAND_COLOR} />
      </View>
    </View>
  );
}

function EntityTargetList<TItem>({
  title,
  emptyText,
  items,
  selectedId,
  onSelect,
  getId,
  getTitle,
  getSubtitle,
  getAvatar,
}: {
  title: string;
  emptyText: string;
  items: TItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getId: (item: TItem) => string;
  getTitle: (item: TItem) => string;
  getSubtitle: (item: TItem) => string;
  getAvatar: (item: TItem) => string | undefined;
}) {
  return (
    <View style={styles.targetPanel}>
      <Text style={styles.targetTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.targetDescription}>{emptyText}</Text>
      ) : (
        items.slice(0, 6).map(item => {
          const id = getId(item);
          const selected = String(selectedId) === String(id);
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.86}
              style={[styles.targetRow, selected && styles.targetRowActive]}
              onPress={() => onSelect(id)}
            >
              <Image
                source={{ uri: getAvatar(item) || FALLBACK_AVATAR }}
                style={styles.targetAvatar}
              />
              <View style={styles.targetInfo}>
                <Text style={styles.targetName} numberOfLines={1}>
                  {getTitle(item)}
                </Text>
                <Text style={styles.targetHandle} numberOfLines={1}>
                  {getSubtitle(item)}
                </Text>
              </View>
              {selected ? <CheckCircle2 size={18} color={APP_BRAND_COLOR} /> : null}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  sectionLabel: {
    marginBottom: 8,
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  noteInput: {
    minHeight: 96,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  destinationGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  destinationCard: {
    flex: 1,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
  },
  destinationCardActive: {
    borderColor: '#A5B4FC',
    backgroundColor: APP_COLORS.brand.soft,
  },
  destinationCardDisabled: {
    opacity: 0.7,
  },
  destinationText: {
    marginTop: 7,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
  },
  destinationTextActive: {
    color: APP_BRAND_COLOR,
  },
  targetPanel: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  targetTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  targetDescription: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  targetRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  targetRowActive: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A5B4FC',
    backgroundColor: APP_COLORS.brand.soft,
    padding: 10,
  },
  targetAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E5E7EB',
  },
  targetInfo: {
    marginLeft: 10,
    flex: 1,
  },
  targetName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  targetHandle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 4,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: APP_BRAND_COLOR,
    paddingVertical: 13,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  externalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  externalButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 7,
  },
  externalText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
});
