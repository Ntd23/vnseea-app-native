import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
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
import { useMyGroupsViewModel } from '../../../community';
import { createFeedRepository } from '../../../feed';
import { useMessagesViewModel } from '../../../messages';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useShareViewModel } from '../../../shared-kernel/application/view-models/useShareViewModel';
import { useMyPagesViewModel } from '../../application/view-models/useMyPagesViewModel';
import type { PagesItem } from '../../domain/types/pages.types';
import { useSafeBottomPadding } from '../../../shared-kernel/presentation/layout/useSafeBottomLayout';

type Destination = 'timeline' | 'page' | 'group' | 'message';

interface PageShareActionSheetProps {
  visible: boolean;
  onClose: () => void;
  page: PagesItem | null;
  onCopied?: () => void;
}

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

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

const feedRepository = createFeedRepository();

export function PageShareActionSheet({
  visible,
  onClose,
  page,
  onCopied,
}: PageShareActionSheetProps) {
  const safeBottomPadding = useSafeBottomPadding(30);
  const { copyToClipboard } = useShareViewModel();
  const currentUserVm = useCurrentUserViewModel();
  const pagesVm = useMyPagesViewModel();
  const groupsVm = useMyGroupsViewModel();
  const messagesVm = useMessagesViewModel();

  const [destination, setDestination] = useState<Destination>('timeline');
  const [note, setNote] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicUrl = page?.url ?? '';
  const pageTitle = page?.pageTitle || page?.pageName || 'Trang';
  const shareText = useMemo(() => {
    const body = [pageTitle, publicUrl].filter(Boolean).join('\n');
    return note.trim() ? `${note.trim()}\n\n${body}` : body;
  }, [note, pageTitle, publicUrl]);
  const pagePreviewDescription = useMemo(() => {
    const description = page?.pageDescription?.trim();
    if (description) return description;

    const summary = [
      page?.followersCount
        ? `${page.followersCount} người theo dõi`
        : undefined,
      page?.postCount ? `${page.postCount} bài viết` : undefined,
    ].filter(Boolean);
    return summary.join(' · ') || 'Khám phá Trang trên VNSEEA';
  }, [page?.followersCount, page?.pageDescription, page?.postCount]);

  useEffect(() => {
    if (!visible || !page) return;

    setDestination('timeline');
    setNote('');
    setSelectedPageId(null);
    setSelectedGroupId(null);
    setSelectedChatUserId(null);
    setIsLoading(false);
    setCopied(false);
    setError(null);

    pagesVm.setActiveFilter('mine');
    groupsVm.setActiveFilter('mine');
    void pagesVm.loadFirstPage(false);
    void groupsVm.loadFirstPage(false);
    messagesVm.loadChats(true).catch(() => undefined);
    // Keep this scoped to opening the sheet. Adding every VM callback here
    // makes the modal reload while typing because those hooks own local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, page?.id]);

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

  const userChats = useMemo(
    () => messagesVm.chats.filter(chat => chat.chatType === 'user'),
    [messagesVm.chats],
  );

  useEffect(() => {
    if (
      destination === 'message' &&
      !selectedChatUserId &&
      userChats.length > 0
    ) {
      setSelectedChatUserId(String(userChats[0].userId));
    }
  }, [destination, selectedChatUserId, userChats]);

  const selectedPage = useMemo(
    () =>
      pagesVm.pages.find(
        item => String(item.pageId || item.id) === String(selectedPageId),
      ),
    [pagesVm.pages, selectedPageId],
  );

  const selectedGroup = useMemo(
    () =>
      groupsVm.groups.find(
        item => String(item.groupId || item.id) === String(selectedGroupId),
      ),
    [groupsVm.groups, selectedGroupId],
  );

  const selectedChat = useMemo(
    () =>
      userChats.find(
        item => String(item.userId) === String(selectedChatUserId),
      ),
    [selectedChatUserId, userChats],
  );

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) return;
    setIsLoading(true);
    setError(null);
    setCopied(false);

    try {
      await copyToClipboard(publicUrl, 'page');
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không sao chép được liên kết.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [copyToClipboard, onCopied, publicUrl]);

  const handleExternalShare = useCallback(async () => {
    if (!publicUrl) return;
    setIsLoading(true);
    setError(null);

    try {
      await Share.share({
        title: pageTitle,
        message: [pageTitle, publicUrl].filter(Boolean).join('\n'),
        url: publicUrl,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể mở chia sẻ hệ thống.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [onClose, pageTitle, publicUrl]);

  const handleInternalShare = useCallback(async () => {
    if (!page || !publicUrl) return;
    setIsLoading(true);
    setError(null);

    try {
      if (destination === 'message') {
        const recipientId = selectedChat?.userId ?? selectedChatUserId;
        if (!recipientId) {
          throw new Error('Bạn chưa chọn cuộc trò chuyện để gửi trang.');
        }

        const ok = await messagesVm.sendBulkMessages(
          [String(recipientId)],
          shareText,
        );
        if (!ok) {
          throw new Error('Không gửi được liên kết trang.');
        }
      } else {
        const draft = {
          text: note.trim(),
          photos: [],
          privacy: 'public' as const,
          linkPreview: {
            url: publicUrl,
            title: pageTitle,
            description: pagePreviewDescription,
            image: page.cover || page.avatar,
          },
          pageId: undefined as string | undefined,
          groupId: undefined as string | undefined,
        };

        if (destination === 'page') {
          const targetPageId = selectedPage?.pageId || selectedPage?.id;
          if (!targetPageId) {
            throw new Error('Bạn chưa có trang để chia sẻ.');
          }
          draft.pageId = String(targetPageId);
        }

        if (destination === 'group') {
          const targetGroupId = selectedGroup?.groupId || selectedGroup?.id;
          if (!targetGroupId) {
            throw new Error('Bạn chưa có nhóm để chia sẻ.');
          }
          draft.groupId = String(targetGroupId);
        }

        await feedRepository.createPost(draft);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chia sẻ trang.');
    } finally {
      setIsLoading(false);
    }
  }, [
    destination,
    messagesVm,
    onClose,
    page,
    pagePreviewDescription,
    pageTitle,
    publicUrl,
    selectedChat?.userId,
    selectedChatUserId,
    selectedGroup,
    selectedPage,
    note,
    shareText,
  ]);

  if (!visible || !page) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chia sẻ trang</Text>
            <Text style={styles.subtitle}>
              Chọn nơi bạn muốn chia sẻ trang này
            </Text>
          </View>
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
          <View style={styles.previewCard}>
            {page.cover ? (
              <Image source={{ uri: page.cover }} style={styles.previewCover} />
            ) : (
              <View style={styles.previewCoverFallback}>
                <Image
                  source={{ uri: page.avatar || FALLBACK_AVATAR }}
                  style={styles.previewAvatarInner}
                />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {pageTitle}
              </Text>
              <Text style={styles.previewHandle} numberOfLines={1}>
                {page.pageName ? `@${page.pageName}` : publicUrl}
              </Text>
            </View>
          </View>

          {!publicUrl ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Trang này chưa có liên kết công khai để chia sẻ.
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Ghi chú</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Thêm lời nhắn cho bài chia sẻ..."
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
                  ]}
                >
                  <Icon
                    size={16}
                    color={active ? APP_BRAND_COLOR : '#64748B'}
                  />
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
              emptyText={
                pagesVm.isLoading
                  ? 'Đang tải trang...'
                  : 'Bạn chưa có trang để chia sẻ.'
              }
              items={pagesVm.pages}
              selectedId={selectedPageId}
              onSelect={setSelectedPageId}
              getId={item => String(item.pageId || item.id)}
              getTitle={item => item.pageTitle || item.pageName}
              getSubtitle={item =>
                item.pageName ? `@${item.pageName}` : 'Trang'
              }
              getAvatar={item => item.avatar}
            />
          ) : null}

          {destination === 'group' ? (
            <EntityTargetList
              title="Nhóm của tôi"
              emptyText={
                groupsVm.isLoading
                  ? 'Đang tải nhóm...'
                  : 'Bạn chưa có nhóm để chia sẻ.'
              }
              items={groupsVm.groups}
              selectedId={selectedGroupId}
              onSelect={setSelectedGroupId}
              getId={item => String(item.groupId || item.id)}
              getTitle={item => item.groupTitle || item.groupName}
              getSubtitle={item =>
                item.groupName ? `@${item.groupName}` : 'Nhóm'
              }
              getAvatar={item => item.avatar}
            />
          ) : null}

          {destination === 'message' ? (
            <EntityTargetList
              title="Gửi tới bạn bè"
              emptyText={
                messagesVm.isLoadingChats
                  ? 'Đang tải cuộc trò chuyện...'
                  : 'Bạn chưa có cuộc trò chuyện để chia sẻ.'
              }
              items={userChats}
              selectedId={selectedChatUserId}
              onSelect={setSelectedChatUserId}
              getId={item => String(item.userId)}
              getTitle={item => item.name}
              getSubtitle={item =>
                item.username ? `@${item.username}` : item.lastMessage
              }
              getAvatar={item => item.avatar}
            />
          ) : null}

          {isLoading || error ? (
            <View style={styles.statusRow}>
              {isLoading ? <ActivityIndicator color={APP_BRAND_COLOR} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={isLoading || !publicUrl}
            style={[
              styles.primaryButton,
              (isLoading || !publicUrl) && styles.primaryButtonDisabled,
            ]}
            onPress={handleInternalShare}
          >
            <Text style={styles.primaryButtonText}>Chia sẻ ngay</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Chia sẻ ngoài ứng dụng</Text>
          <View style={styles.externalRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isLoading || !publicUrl}
              style={[
                styles.externalButton,
                copied && styles.externalButtonActive,
              ]}
              onPress={handleCopyLink}
            >
              {copied ? (
                <CheckCircle2 size={17} color={APP_BRAND_COLOR} />
              ) : (
                <Copy size={17} color="#64748B" />
              )}
              <Text
                style={[
                  styles.externalText,
                  copied && styles.externalTextActive,
                ]}
              >
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isLoading || !publicUrl}
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

function TimelineTarget({
  user,
}: {
  user: ReturnType<typeof useCurrentUserViewModel>['user'];
}) {
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
          <Text style={styles.targetName} numberOfLines={1}>
            {user?.name || 'Tài khoản của tôi'}
          </Text>
          <Text style={styles.targetHandle} numberOfLines={1}>
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
  getSubtitle: (item: TItem) => string | undefined;
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
              {selected ? (
                <CheckCircle2 size={18} color={APP_BRAND_COLOR} />
              ) : null}
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
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
  subtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
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
    paddingBottom: 30,
  },
  previewCard: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  previewCover: {
    width: 64,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  previewCoverFallback: {
    width: 64,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  previewAvatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  previewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  previewHandle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  warningBox: {
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    marginBottom: 8,
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  noteInput: {
    minHeight: 82,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
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
    borderColor: '#A5B4FC',
    backgroundColor: APP_COLORS.brand.soft,
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
  externalButtonActive: {
    borderColor: '#A5B4FC',
    backgroundColor: APP_COLORS.brand.soft,
  },
  externalText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  externalTextActive: {
    color: APP_BRAND_COLOR,
  },
});

export default PageShareActionSheet;
