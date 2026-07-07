import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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
const AVATAR_FALLBACK = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';

interface Props {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
  onPlayReel: (reelId: string, rawPost: any) => void;
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

export function ReelPublisherOverlay({
  visible,
  userId,
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
        setReels(reelsRes.items);
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

  const renderGridItem = ({ item }: { item: ReelsItem }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          onClose();
          onPlayReel(item.id, item.raw);
        }}
        style={styles.gridItem}
      >
        <Image
          source={{ uri: item.thumbnailUrl || AVATAR_FALLBACK }}
          style={styles.gridThumb}
          resizeMode="cover"
        />
        <View style={styles.viewCountContainer}>
          <Play size={10} color="#fff" fill="#fff" style={styles.viewCountIcon} />
          <Text style={styles.viewCountText}>{formatStat(item.viewCount || 0)}</Text>
        </View>
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
              <ActivityIndicator color="#0866ff" size="large" />
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
                <FlatList
                  data={reels}
                  renderItem={renderGridItem}
                  keyExtractor={item => item.id}
                  numColumns={3}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.gridList}
                />
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
    backgroundColor: '#0866ff',
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
  gridList: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  gridItem: {
    width: (SCREEN_W - 26) / 3,
    height: ((SCREEN_W - 26) / 3) * 1.35,
    margin: 1,
    backgroundColor: '#222',
    position: 'relative',
  },
  gridThumb: {
    width: '100%',
    height: '100%',
  },
  viewCountContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewCountIcon: {
    marginRight: 3,
  },
  viewCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
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
