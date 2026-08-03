import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ExternalLink,
  MessageCircle,
  Play,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react-native';
import VideoPlayer from 'react-native-video';
import { createProfileRepository } from '../../../profile/infrastructure/repositories/ApiProfileRepository';
import { createReelsRepository } from '../../infrastructure/repositories/ApiReelsRepository';
import type { ReelsItem } from '../../domain/types/reels.types';
import type { UserProfile } from '../../../user/domain/types/user.types';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import type { ChatItem } from '../../../messages/domain/types/messages.types';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const AVATAR_FALLBACK = 'https://vnseea.vn/upload/photos/d-avatar.jpg';
const GRID_COLUMNS = 3;
const GRID_GAP = 1;

interface Props {
  visible: boolean;
  userId: string | null;
  currentReelId?: string | null;
  onClose: () => void;
  onPlayReel: (reel: ReelsItem) => void;
  onFollowToggled?: (userId: string, isFollowing: boolean) => void;
}

const profileRepo = createProfileRepository();
const reelsRepo = createReelsRepository();

function formatStat(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

const NON_VIDEO_FILE_EXT_PATTERN = /\.(?:jpe?g|png|gif|webp|bmp|heic|heif)(?:[?#].*)?$/i;

function hasPlayableVideoUrl(url: string | undefined) {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  return !NON_VIDEO_FILE_EXT_PATTERN.test(trimmed);
}

function getPlayablePublisherReels(items: ReelsItem[] | undefined) {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  return items.filter(item => {
    const videoUrl = item.videoUrl?.trim();
    if (!videoUrl || !hasPlayableVideoUrl(videoUrl)) return false;

    const key = videoUrl.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ReelGridPreview = memo(function ReelGridPreview({
  item,
}: {
  item: ReelsItem;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const thumbnailUrl = item.thumbnailUrl?.trim();
  const videoUrl = item.videoUrl?.trim();
  const shouldUsePausedVideo = Boolean(!thumbnailUrl && videoUrl && !videoFailed);

  return (
    <View pointerEvents="none" style={styles.gridPreview}>
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.gridThumb}
          resizeMode="cover"
        />
      ) : null}

      {shouldUsePausedVideo ? (
        <VideoPlayer
          source={{ uri: videoUrl }}
          style={[styles.gridThumb, videoReady ? null : styles.hiddenVideo]}
          resizeMode="cover"
          paused
          muted
          controls={false}
          repeat={false}
          playInBackground={false}
          playWhenInactive={false}
          useTextureView={false}
          onReadyForDisplay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      ) : null}

      {!thumbnailUrl && (!shouldUsePausedVideo || !videoReady) ? (
        <View style={styles.gridFallback}>
          <Image
            source={{ uri: item.publisher.avatarUrl || AVATAR_FALLBACK }}
            style={styles.gridFallbackAvatar}
          />
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.playOverlay}>
        <Play size={18} color="#fff" fill="#fff" />
      </View>
    </View>
  );
});

export function ReelPublisherOverlay({
  visible,
  userId,
  currentReelId,
  onClose,
  onPlayReel,
  onFollowToggled,
}: Props) {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [reels, setReels] = useState<ReelsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [gridWidth, setGridWidth] = useState(SCREEN_W);

  const gridItemWidth = Math.max(
    0,
    (gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );
  const gridItemHeight = Math.round(gridItemWidth * 1.35);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profileRes, reelsRes] = await Promise.all([
        profileRepo.loadProfile({ userId, includeFriends: true }),
        reelsRepo.fetchReels({ publisherId: userId, limit: 18 }),
      ]);

      if (profileRes?.profile) {
        setProfile(profileRes.profile);
        setFollowersCount(profileRes.followers?.length ?? 0);
      }
      if (reelsRes?.items) {
        setReels(getPlayablePublisherReels(reelsRes.items));
      }
    } catch (err) {
      console.error('[ReelPublisherOverlay] Error loading publisher data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      loadData();
    } else {
      setProfile(null);
      setReels([]);
      setFollowersCount(0);
    }
  }, [visible, userId, loadData]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const userIdStr = String(profile.id);
    const prevFollowing = !!profile.followedByCurrentUser;
    
    // Optimistic UI update
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        followedByCurrentUser: !prevFollowing,
      };
    });
    setFollowersCount(prev => prev + (prevFollowing ? -1 : 1));

    if (onFollowToggled) {
      onFollowToggled(userIdStr, !prevFollowing);
    }

    try {
      const nextState = await profileRepo.toggleFollow(userIdStr);
      const isFollowing = nextState === 'following';
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          followedByCurrentUser: isFollowing,
        };
      });
    } catch (err) {
      console.error('[ReelPublisherOverlay] Failed to toggle follow:', err);
      // Rollback on error
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          followedByCurrentUser: prevFollowing,
        };
      });
      setFollowersCount(prev => prev + (prevFollowing ? 1 : -1));
      if (onFollowToggled) {
        onFollowToggled(userIdStr, prevFollowing);
      }
    } finally {
      setFollowLoading(false);
    }
  }, [profile, followLoading, onFollowToggled]);

  const handleOpenMessages = useCallback(() => {
    if (!profile) return;
    onClose();

    const chat: ChatItem = {
      id: `user:${profile.id}`,
      chatType: 'user',
      userId: String(profile.id),
      username: profile.username ?? '',
      name: profile.name || profile.username || 'Người dùng',
      avatar: profile.avatarUrl ?? '',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: Boolean(profile.verified),
    };

    navigation.navigate(ROUTES.CHAT, { chat });
  }, [profile, navigation, onClose]);

  const handleViewFullProfile = useCallback(() => {
    if (!profile) return;
    onClose();
    navigateToUserProfile(navigation, String(profile.id));
  }, [profile, navigation, onClose]);

  // Compute total likes of loaded reels
  const totalLikes = reels.reduce((sum, item) => sum + (item.likeCount || 0), 0);

  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth <= 0) return;
    setGridWidth(prev => (prev === nextWidth ? prev : nextWidth));
  }, []);

  const renderGridItem = ({ item, index }: { item: ReelsItem; index: number }) => {
    const isCurrent = currentReelId != null && String(item.id) === String(currentReelId);
    const columnIndex = index % GRID_COLUMNS;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          onPlayReel(item);
          onClose();
        }}
        style={[
          styles.gridItem,
          {
            width: gridItemWidth,
            height: gridItemHeight,
            marginRight: columnIndex === GRID_COLUMNS - 1 ? 0 : GRID_GAP,
            marginBottom: GRID_GAP,
          },
        ]}
      >
        <ReelGridPreview item={item} />
        {isCurrent ? (
          <>
            <View pointerEvents="none" style={styles.currentVideoBorder} />
            <View pointerEvents="none" style={styles.currentVideoBadge}>
              <Text style={styles.currentVideoBadgeText}>Đang xem</Text>
            </View>
          </>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop press to dismiss */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContent}>
          <View style={styles.grabber} />
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Kênh video</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={APP_BRAND_COLOR} size="large" />
            </View>
          ) : profile ? (
            <View style={styles.profileContainer}>
              {/* Profile Details */}
              <View style={styles.profileHeader}>
                <Image
                  source={{ uri: profile.avatarUrl || AVATAR_FALLBACK }}
                  style={styles.avatar}
                />
                <Text style={styles.name} numberOfLines={1}>{profile.name || profile.username}</Text>
                <Text style={styles.username}>@{profile.username}</Text>
                
                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{formatStat(followersCount)}</Text>
                    <Text style={styles.statLabel}>Người theo dõi</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{formatStat(totalLikes)}</Text>
                    <Text style={styles.statLabel}>Lượt thích</Text>
                  </View>
                </View>

                {/* Profile Actions */}
                <View style={styles.actionsRow}>
                  {profile.followedByCurrentUser ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleOpenMessages}
                      style={[styles.actionBtn, styles.msgBtn]}
                    >
                      <MessageCircle size={16} color="#fff" style={styles.btnIcon} />
                      <Text style={styles.actionBtnText}>Nhắn tin</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleFollowToggle}
                      disabled={followLoading}
                      style={[styles.actionBtn, styles.followBtn]}
                    >
                      {followLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <UserPlus size={16} color="#fff" style={styles.btnIcon} />
                          <Text style={styles.actionBtnText}>Theo dõi</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleViewFullProfile}
                    style={[styles.actionBtn, styles.profileBtn]}
                  >
                    <ExternalLink size={16} color="#fff" style={styles.btnIcon} />
                    <Text style={styles.actionBtnText}>Trang cá nhân</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Video đã đăng</Text>
              </View>

              {reels.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có video nào</Text>
                </View>
              ) : (
                <View style={styles.gridContainer} onLayout={handleGridLayout}>
                  <FlatList
                    data={reels}
                    renderItem={renderGridItem}
                    keyExtractor={item => item.id}
                    numColumns={GRID_COLUMNS}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.gridList}
                    initialNumToRender={9}
                    maxToRenderPerBatch={6}
                    windowSize={5}
                    removeClippedSubviews
                    extraData={`${currentReelId ?? ''}:${gridItemWidth}`}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Không tải được thông tin kênh.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetContent: {
    height: SCREEN_H * 0.85,
    backgroundColor: '#16161a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#333',
    marginBottom: 8,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  username: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 100,
  },
  statVal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  followBtn: {
    backgroundColor: APP_BRAND_COLOR,
  },
  msgBtn: {
    backgroundColor: '#27272a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  profileBtn: {
    backgroundColor: '#27272a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnIcon: {
    marginRight: 6,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
    width: '100%',
  },
  gridList: {
    paddingBottom: 20,
  },
  gridItem: {
    backgroundColor: '#222',
    position: 'relative',
    overflow: 'hidden',
  },
  gridPreview: {
    flex: 1,
    backgroundColor: '#111',
  },
  gridThumb: {
    width: '100%',
    height: '100%',
  },
  hiddenVideo: {
    opacity: 0,
  },
  gridFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202026',
  },
  gridFallbackAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    opacity: 0.55,
  },
  playOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  currentVideoBorder: {
    position: 'absolute',
    top: 4,
    right: 4,
    bottom: 4,
    left: 4,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 3,
  },
  currentVideoBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    maxWidth: '72%',
    borderRadius: 999,
    backgroundColor: 'rgba(8, 102, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentVideoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
});
