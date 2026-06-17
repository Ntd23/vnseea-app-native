// Description: Animated bottom-sheet variant of the post-share overlay.
// Slides up from the bottom with a grabber handle, dimmed backdrop that
// closes on tap, and hides the bottom tab bar while open.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Globe,
  MessageCircle,
  Send,
  Share2,
  Users,
  X,
} from 'lucide-react-native';
import { useMyPagesViewModel } from '../../../pages';
import { useMyGroupsViewModel } from '../../../community';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useShareViewModel } from '../../../shared-kernel/application/view-models/useShareViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getShareCopy } from '../../application/i18n/shareCopy';
import type {
  FeedPost,
} from '../../domain/types/feed.types';
import type {
  FeedShareDestination,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';

// Fallback avatar for the "me" row in the destination picker when the
// current user hasn't set one. Mirrors the placeholder used in
// FeedScreen's local `FALLBACK_AVATAR`.
const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/847/847969.png';

type ShareTarget = FeedShareDestination | 'message';

const SHEET_HEIGHT_PERCENT = 86;
const ANIMATION_MS = 280;

const DESTINATION_ITEMS: Array<{
  id: ShareTarget;
  key: 'destTimeline' | 'destPage' | 'destGroup' | 'destMessage';
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}> = [
  { id: 'timeline', key: 'destTimeline', Icon: Send },
  { id: 'page', key: 'destPage', Icon: Globe },
  { id: 'group', key: 'destGroup', Icon: Users },
  { id: 'message', key: 'destMessage', Icon: MessageCircle },
];

export interface FeedShareBottomSheetProps {
  visible: boolean;
  post?: FeedPost;
  onClose: () => void;
  onInternalShare: (input: SharePostInput) => Promise<FeedPost>;
  onShared?: (post: FeedPost) => void;
}

export function FeedShareBottomSheet({
  visible,
  post,
  onClose,
  onInternalShare,
  onShared,
}: FeedShareBottomSheetProps) {
  // Mirror the bilingual pattern used by comment / notification surfaces:
  // useAppLanguage subscribes to the MMKV-backed language setting so the
  // sheet re-renders the moment the user switches language in Settings.
  const language = useAppLanguage();
  const copy = getShareCopy(language);
  const insets = useSafeAreaInsets();
  const currentUserVm = useCurrentUserViewModel();
  const pagesVm = useMyPagesViewModel();
  const groupsVm = useMyGroupsViewModel();
  const { copyToClipboard, sharePost } = useShareViewModel();

  const [note, setNote] = useState('');
  const [destination, setDestination] = useState<ShareTarget>('timeline');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const translateY = useSharedValue(1000);
  const backdropOpacity = useSharedValue(0);
  // Separate "rendered" flag so the sheet can stay mounted briefly during
  // the close animation; without it the modal unmounts instantly.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setNote('');
      setDestination('timeline');
      setError(null);
      setSelectedPageId(null);
      setSelectedGroupId(null);
      pagesVm.setActiveFilter('mine');
      groupsVm.setActiveFilter('mine');
      void pagesVm.loadFirstPage(false);
      void groupsVm.loadFirstPage(false);
      tabBarVisibility.setVisible(false);
      translateY.value = withTiming(0, {
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, {
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else if (mounted) {
      // Animate out, then unmount after the duration finishes.
      translateY.value = withTiming(1000, {
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
      });
      tabBarVisibility.setVisible(true);
      const timeout = setTimeout(() => setMounted(false), ANIMATION_MS);
      return () => clearTimeout(timeout);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Restore tab visibility if the sheet unmounts while still visible
  // (defensive — covers navigation away mid-open).
  useEffect(() => {
    return () => {
      tabBarVisibility.setVisible(true);
    };
  }, []);

  useEffect(() => {
    if (!selectedPageId && pagesVm.pages.length > 0) {
      const first = pagesVm.pages[0] as any;
      setSelectedPageId(String(first.pageId || first.id));
    }
  }, [pagesVm.pages, selectedPageId]);

  useEffect(() => {
    if (!selectedGroupId && groupsVm.groups.length > 0) {
      const first = groupsVm.groups[0] as any;
      setSelectedGroupId(String(first.groupId || first.id));
    }
  }, [groupsVm.groups, selectedGroupId]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!post) return;
    setIsSharing(true);
    setError(null);
    try {
      await copyToClipboard(post.id, 'post');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.copyFailed);
    } finally {
      setIsSharing(false);
    }
  }, [copyToClipboard, onClose, post, copy]);

  const handleExternalShare = useCallback(async () => {
    if (!post) return;
    setIsSharing(true);
    setError(null);
    try {
      await sharePost(post, {
        title: copy.sharePostTitle,
        subject: copy.sharePostSubject,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.shareFailed);
    } finally {
      setIsSharing(false);
    }
  }, [copy, onClose, post, sharePost]);

  const handleShare = useCallback(async () => {
    if (!post || isSharing) return;
    setIsSharing(true);
    setError(null);
    try {
      if (destination === 'message') {
        throw new Error(copy.messageUnavailable);
      }

      const input: SharePostInput = {
        postId: post.id,
        destination,
        text: note,
      };

      if (destination === 'timeline') {
        const userId = currentUserVm.user?.userId;
        if (!userId) throw new Error(copy.noAccount);
        input.userId = userId;
      } else if (destination === 'page') {
        if (!selectedPageId) throw new Error(copy.noPages);
        input.pageId = selectedPageId;
      } else if (destination === 'group') {
        if (!selectedGroupId) throw new Error(copy.noGroups);
        input.groupId = selectedGroupId;
      }

      const shared = await onInternalShare(input);
      onShared?.(shared);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : copy.shareError,
      );
    } finally {
      setIsSharing(false);
    }
  }, [
    copy,
    currentUserVm.user?.userId,
    destination,
    isSharing,
    note,
    onClose,
    onInternalShare,
    onShared,
    post,
    selectedGroupId,
    selectedPageId,
  ]);

  if (!mounted || !post) return null;

  return (
    <View className="absolute inset-0 z-[1100] justify-end">
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[backdropStyle, { backgroundColor: 'rgba(0,0,0,0.36)' }]}
        className="absolute inset-0"
      >
        <Pressable
          accessibilityLabel={copy.closeAria}
          onPress={handleClose}
          className="flex-1"
        />
      </Animated.View>

      <Animated.View
        style={[
          sheetStyle,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
        className="bg-white rounded-t-[20px] overflow-hidden max-h-[86%]"
      >
        <View className="items-center pt-2 pb-1">
          <View className="w-9 h-[5px] rounded-full bg-slate-300" />
        </View>

        <View className="flex-row items-center justify-between px-4 min-h-[52px] border-b border-slate-100">
          <View className="w-9" />
          <Text className="flex-1 text-center text-[17px] font-extrabold text-slate-900">
            {copy.title}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 22 }}
        >
          <Text className="mb-2 text-[14px] font-extrabold text-slate-900">
            {copy.orShareTo}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={copy.addNotePlaceholder}
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            className="min-h-[96px] mb-4 border border-slate-300 bg-white px-3.5 py-3 text-[14px] font-semibold text-slate-900 rounded-xl"
          />

          <Text className="mb-2 text-[14px] font-extrabold text-slate-900">
            {copy.destinationLabel}
          </Text>
          <View className="flex-row gap-2.5 mb-3">
            {DESTINATION_ITEMS.map(({ id, key, Icon }) => {
              const active = destination === id;
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.86}
                  disabled={isSharing}
                  onPress={() => {
                    setDestination(id);
                    setError(
                      id === 'message' ? copy.messageUnavailable : null,
                    );
                  }}
                  className={`flex-1 min-h-[74px] items-center justify-center rounded-2xl border px-1.5 ${
                    active
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Icon
                    size={17}
                    color={active ? '#0000ff' : '#64748b'}
                  />
                  <Text
                    className={`mt-2 text-center text-[11px] font-extrabold ${
                      active ? 'text-brand' : 'text-slate-500'
                    }`}
                  >
                    {copy[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {destination === 'timeline' ? (
            <View className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
              <Text className="text-[15px] font-extrabold text-slate-900">
                {copy.myProfile}
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-slate-500">
                {copy.myProfileDesc}
              </Text>
              <View className="mt-3 flex-row items-center rounded-[14px] border border-indigo-300 bg-indigo-50 p-2.5">
                <Image
                  source={{ uri: currentUserVm.user?.avatar || FALLBACK_AVATAR }}
                  className="w-[42px] h-[42px] rounded-full bg-slate-200"
                />
                <View className="ml-2.5 flex-1">
                  <Text className="text-[14px] font-extrabold text-slate-900">
                    {currentUserVm.user?.name || copy.myProfile}
                  </Text>
                  <Text className="mt-0.5 text-[12px] font-bold text-slate-500">
                    @{currentUserVm.user?.username || 'me'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {destination === 'page' ? (
            <View className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
              <Text className="mb-2 text-[15px] font-extrabold text-slate-900">
                {copy.myPages}
              </Text>
              {pagesVm.isLoading ? (
                <ActivityIndicator color="#0000ff" />
              ) : pagesVm.pages.length > 0 ? (
                pagesVm.pages.map(rawPage => {
                  const page = rawPage as any;
                  const id = String(page.pageId || page.id);
                  const active = selectedPageId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      activeOpacity={0.86}
                      onPress={() => setSelectedPageId(id)}
                      className={`mt-3 flex-row items-center rounded-[14px] border p-2.5 ${
                        active
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Image
                        source={{ uri: page.avatar || FALLBACK_AVATAR }}
                        className="w-[42px] h-[42px] rounded-full bg-slate-200"
                      />
                      <Text className="ml-2.5 text-[14px] font-extrabold text-slate-900">
                        {page.pageTitle || page.pageName || copy.destPage}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className="text-[13px] font-semibold text-slate-500">
                  {pagesVm.isLoading ? copy.loadingPages : copy.noPages}
                </Text>
              )}
            </View>
          ) : null}

          {destination === 'group' ? (
            <View className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
              <Text className="mb-2 text-[15px] font-extrabold text-slate-900">
                {copy.myGroups}
              </Text>
              {groupsVm.isLoading ? (
                <ActivityIndicator color="#0000ff" />
              ) : groupsVm.groups.length > 0 ? (
                groupsVm.groups.map(rawGroup => {
                  const group = rawGroup as any;
                  const id = String(group.groupId || group.id);
                  const active = selectedGroupId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      activeOpacity={0.86}
                      onPress={() => setSelectedGroupId(id)}
                      className={`mt-3 flex-row items-center rounded-[14px] border p-2.5 ${
                        active
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Image
                        source={{ uri: group.avatar || FALLBACK_AVATAR }}
                        className="w-[42px] h-[42px] rounded-full bg-slate-200"
                      />
                      <Text className="ml-2.5 text-[14px] font-extrabold text-slate-900">
                        {group.groupTitle || group.groupName || copy.destGroup}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className="text-[13px] font-semibold text-slate-500">
                  {groupsVm.isLoading ? copy.loadingGroups : copy.noGroups}
                </Text>
              )}
            </View>
          ) : null}

          {error ? (
            <View className="mb-3 rounded-[14px] bg-red-50 p-3">
              <Text className="text-[13px] font-bold text-red-700">
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={isSharing || destination === 'message'}
            onPress={handleShare}
            className={`mt-1 mb-4 items-center justify-center rounded-[14px] py-3.5 bg-brand ${
              isSharing || destination === 'message' ? 'opacity-40' : ''
            }`}
          >
            {isSharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Share2 size={16} color="#fff" />
                <Text className="text-[14px] font-extrabold text-white">
                  {copy.shareNow}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text className="mb-2 text-[14px] font-extrabold text-slate-900">
            {copy.shareOutside}
          </Text>
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isSharing}
              onPress={handleCopyLink}
              className="flex-1 min-h-[48px] flex-row items-center justify-center rounded-[14px] border border-slate-200 bg-white"
            >
              <Text className="text-[13px] font-extrabold text-slate-600">
                {copy.copyLink}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isSharing}
              onPress={handleExternalShare}
              className="flex-1 min-h-[48px] flex-row items-center justify-center rounded-[14px] border border-slate-200 bg-white"
            >
              <Text className="text-[13px] font-extrabold text-slate-600">
                {copy.more}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export default FeedShareBottomSheet;