// Description: Renders a modern, animated right-side profile and settings drawer.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  Alert,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  IdCard,
  LockKeyhole,
  Image as LucideImage,
  KeyRound,
  ShieldCheck,
  Bell,
  Link as LucideLink,
  BadgeCheck,
  Star,
  Monitor,
  Ban,
  Info,
  MapPin,
  CircleDollarSign,
  Gift,
  ChevronRight,
  LogOut,
  X,
  Wallet,
  Coins,
  UserPlus,
  Pointer,
  Images,
  Image as ImageLucide,
  Video,
  Bookmark,
  Users,
  Flag,
  UserSearch,
  MapPinned,
  Store,
  Briefcase,
  Tag,
  FileText,
  Flame,
  Calendar,
  Film,
  Radio,
  HeartHandshake,
  Rocket,
  Clock,
  LayoutGrid,
  Megaphone,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { SettingsPanelRouteParam } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { useMyInfoViewModel } from '../../../settings/application/view-models/useMyInfoViewModel';
import { useAuthViewModel } from '../../../auth/application/view-models/useAuthViewModel';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = SCREEN_W * 0.84;
const FALLBACK_AVATAR = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';

const DRAWER_COPY = {
  vi: {
    menuTitle: 'Cá nhân & Cài đặt',
    roleAdmin: 'Quản trị viên',
    rolePro: 'Thành viên Pro',
    roleMember: 'Thành viên',
    walletLabel: 'Ví của tôi',
    pointsLabel: 'Điểm VNSEEA',
    logoutLabel: 'Đăng xuất',
    logoutConfirmTitle: 'Xác nhận đăng xuất',
    logoutConfirmMsg: 'Bạn có chắc chắn muốn đăng xuất tài khoản?',
    cancel: 'Hủy',
    general: 'Chung',
    profile: 'Hồ sơ',
    privacy: 'Quyền riêng tư',
    avatar: 'Ảnh đại diện',
    password: 'Mật khẩu',
    twoFactor: 'Bảo mật 2FA',
    notifications: 'Thông báo',
    socialLinks: 'Mạng xã hội',
    verification: 'Xác thực tài khoản',
    myPoints: 'Điểm của tôi',
    sessions: 'Phiên đăng nhập',
    blockedUsers: 'Người đã chặn',
    myData: 'Quyền dữ liệu',
    addresses: 'Địa chỉ nhận hàng',
    monetization: 'Ví & Thu nhập',
    referralRewards: 'Thưởng giới thiệu',

    // Group titles
    groupAccount: 'Tài khoản',
    groupSecurity: 'Bảo mật & Quyền riêng tư',
    groupFinance: 'Tài chính & Kiếm tiền',

    // Feature labels
    featFollowing: 'Theo dõi',
    featPoke: 'Chọc bạn bè',
    featAlbums: 'Album ảnh',
    featPhotos: 'Ảnh',
    featVideos: 'Video của tôi',
    featSaved: 'Đã lưu',
    featGroups: 'Nhóm',
    featPages: 'Trang',
    featFindFriends: 'Tìm bạn bè',
    featNearby: 'Người ở gần',
    featMarket: 'Chợ',
    featJobs: 'Việc làm',
    featOffers: 'Ưu đãi',
    featBlogs: 'Bài viết',
    featPopular: 'Xu hướng',
    featEvents: 'Sự kiện',
    featMovies: 'Phim',
    featLive: 'Phát trực tiếp',
    featFunding: 'Gây quỹ',
    featBoosted: 'Quảng bá',
    featMemories: 'Kỷ niệm',
    featGeneral: 'Tổng quan',
    featAds: 'Quảng cáo',

    // Feature categories
    catCommunicate: '💬 Giao tiếp',
    catMedia: '📷 Nội dung & Media',
    catCommunity: '👥 Cộng đồng',
    catCommerce: '🛒 Thương mại',
    catNews: '📰 Nội dung & Tin tức',
    catEntertainment: '🎮 Giải trí',
    catFinance: '💰 Tài chính',
    catBusiness: '📈 Kinh doanh',
    catPersonal: '🕒 Cá nhân',
    catSystem: '⚙️ Hệ thống',
  },
  en: {
    menuTitle: 'Profile & Settings',
    roleAdmin: 'Administrator',
    rolePro: 'Pro Member',
    roleMember: 'Member',
    walletLabel: 'My Wallet',
    pointsLabel: 'VNSEEA Points',
    logoutLabel: 'Log Out',
    logoutConfirmTitle: 'Confirm Log Out',
    logoutConfirmMsg: 'Are you sure you want to log out of your account?',
    cancel: 'Cancel',
    general: 'General',
    profile: 'Profile',
    privacy: 'Privacy',
    avatar: 'Avatar & Cover',
    password: 'Password',
    twoFactor: '2FA Security',
    notifications: 'Notifications',
    socialLinks: 'Social Links',
    verification: 'Account Verification',
    myPoints: 'My Points',
    sessions: 'Login Sessions',
    blockedUsers: 'Blocked Users',
    myData: 'Data Sharing',
    addresses: 'Delivery Addresses',
    monetization: 'Monetization',
    referralRewards: 'Referral Rewards',

    groupAccount: 'Account Details',
    groupSecurity: 'Security & Privacy',
    groupFinance: 'Finance & Earnings',

    // Feature labels
    featFollowing: 'Following',
    featPoke: 'Poke',
    featAlbums: 'Albums',
    featPhotos: 'Photos',
    featVideos: 'My videos',
    featSaved: 'Saved',
    featGroups: 'Groups',
    featPages: 'Pages',
    featFindFriends: 'Find friends',
    featNearby: 'Nearby',
    featMarket: 'Marketplace',
    featJobs: 'Jobs',
    featOffers: 'Offers',
    featBlogs: 'Articles',
    featPopular: 'Trending',
    featEvents: 'Events',
    featMovies: 'Movies',
    featLive: 'Live',
    featFunding: 'Funding',
    featBoosted: 'Boosted',
    featMemories: 'Memories',
    featGeneral: 'General',
    featAds: 'Ads',

    // Feature categories
    catCommunicate: '💬 Communication',
    catMedia: '📷 Media',
    catCommunity: '👥 Community',
    catCommerce: '🛒 Commerce',
    catNews: '📰 News & Content',
    catEntertainment: '🎮 Entertainment',
    catFinance: '💰 Finance',
    catBusiness: '📈 Business',
    catPersonal: '🕒 Personal',
    catSystem: '⚙️ System',
  },
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HeaderProfileDrawer({ visible, onClose }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = DRAWER_COPY[language] || DRAWER_COPY.vi;
  const { profile } = useMyInfoViewModel();
  const { logout } = useAuthViewModel();

  const [shouldRender, setShouldRender] = useState(visible);
  const translateX = useRef(new Animated.Value(DRAWER_W)).current;
  const drawerScale = useRef(new Animated.Value(0.96)).current;
  const drawerOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const closeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Cancel any running close animation if drawer is re-opened mid-close
    if (closeAnimRef.current) {
      closeAnimRef.current.stop();
      closeAnimRef.current = null;
    }

    if (visible) {
      setShouldRender(true);
      // Wait for next frame so Modal mounts before animating in
      InteractionManager.runAfterInteractions(() => {
        Animated.parallel([
          // Backdrop fades in quickly (perceived responsiveness)
          Animated.timing(backdropOpacity, {
            toValue: 0.55,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Drawer slides in with subtle scale-up for premium feel
          Animated.spring(translateX, {
            toValue: 0,
            tension: 90,
            friction: 12,
            useNativeDriver: true,
          }),
          Animated.spring(drawerScale, {
            toValue: 1,
            tension: 110,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(drawerOpacity, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Content fades in slightly after drawer starts moving for layered reveal
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 220,
            delay: 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      const closeAnim = Animated.parallel([
        // Backdrop fades out fast — instant visual feedback that it's closing
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Content fades first for snappy perceived close
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 100,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Drawer slides out with subtle scale-down
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: DRAWER_W,
            duration: 200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(drawerScale, {
            toValue: 0.97,
            duration: 200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(drawerOpacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]);
      closeAnimRef.current = closeAnim;
      closeAnim.start(({ finished }) => {
        if (finished) {
          // Reset state for next open so animation starts clean
          translateX.setValue(DRAWER_W);
          drawerScale.setValue(0.96);
          drawerOpacity.setValue(0);
          contentOpacity.setValue(0);
          setShouldRender(false);
        }
      });
    }
  }, [visible, backdropOpacity, translateX, drawerScale, drawerOpacity, contentOpacity]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const openSettingsPanel = useCallback(
    (panel: SettingsPanelRouteParam) => {
      handleClose();
      navigation.navigate(ROUTES.MAIN_TABS, {
        screen: ROUTES.SETTINGS,
        params: { initialPanel: panel, fromDashboard: true },
      });
    },
    [navigation, handleClose],
  );

  const handleItemPress = useCallback(
    (action: { type: string; panel?: SettingsPanelRouteParam; route?: string; feature?: string }) => {
      handleClose();
      if (action.type === 'panel' && action.panel) {
        openSettingsPanel(action.panel);
        return;
      }
      if (action.type === 'editProfile') {
        navigation.navigate(ROUTES.EDIT_PROFILE);
        return;
      }
      if (action.type === 'feature' && action.feature) {
        switch (action.feature) {
          case 'following':
            navigation.navigate(ROUTES.FOLLOWING);
            return;
          case 'poke':
            navigation.navigate(ROUTES.POKE);
            return;
          case 'albums':
            navigation.navigate(ROUTES.ALBUMS);
            return;
          case 'photos':
            navigation.navigate(ROUTES.MY_PHOTOS);
            return;
          case 'videos':
            navigation.navigate(ROUTES.MY_VIDEOS);
            return;
          case 'saved':
            navigation.navigate(ROUTES.SAVED_POSTS);
            return;
          case 'groups':
            navigation.navigate(ROUTES.EXPLORE_GROUPS);
            return;
          case 'pages':
            navigation.navigate(ROUTES.PAGES);
            return;
          case 'findFriends':
            navigation.navigate(ROUTES.INVITE_FRIENDS);
            return;
          case 'nearby':
            navigation.navigate(ROUTES.NEARBY_USERS);
            return;
          case 'market':
            navigation.navigate(ROUTES.MARKETPLACE);
            return;
          case 'jobs':
            navigation.navigate(ROUTES.JOBS);
            return;
          case 'offers':
            navigation.navigate(ROUTES.OFFERS);
            return;
          case 'blogs':
            navigation.navigate(ROUTES.BLOGS);
            return;
          case 'popular':
            navigation.navigate(ROUTES.POPULAR);
            return;
          case 'events':
            navigation.navigate(ROUTES.EVENTS);
            return;
          case 'movies':
            navigation.navigate(ROUTES.MOVIES);
            return;
          case 'live':
            navigation.navigate(ROUTES.LIVE);
            return;
          case 'funding':
            navigation.navigate(ROUTES.FUNDING);
            return;
          case 'boosted':
            navigation.navigate(ROUTES.BOOSTED);
            return;
          case 'memories':
            navigation.navigate(ROUTES.MEMORIES);
            return;
          case 'general':
            navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.EXPLORE });
            return;
          case 'ads':
            navigation.navigate(ROUTES.ADVERTISING);
            return;
        }
        return;
      }
      if (action.type === 'route' && action.route) {
        if (action.route === 'myPoints') {
          navigation.navigate(ROUTES.MY_POINTS);
          return;
        }
        if (action.route === 'earnings') {
          navigation.navigate(ROUTES.EARNINGS);
          return;
        }
        if (action.route === 'affiliates') {
          navigation.navigate(ROUTES.AFFILIATES);
          return;
        }
      }
    },
    [navigation, handleClose, openSettingsPanel],
  );

  const handleLogout = useCallback(() => {
    Alert.alert(copy.logoutConfirmTitle, copy.logoutConfirmMsg, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.logoutLabel,
        style: 'destructive',
        onPress: async () => {
          handleClose();
          try {
            await logout();
          } catch (e) {
            console.warn('[HeaderProfileDrawer] Logout failed', e);
          }
        },
      },
    ]);
  }, [logout, handleClose, copy]);

  const handleOpenProfile = useCallback(() => {
    handleClose();
    navigation.navigate(ROUTES.PROFILE);
  }, [handleClose, navigation]);

  if (!shouldRender) return null;

  // Determine user role label
  const roleLabel = profile?.admin
    ? copy.roleAdmin
    : profile?.pro
    ? copy.rolePro
    : copy.roleMember;

  const roleColor = profile?.admin
    ? 'text-red-500 bg-red-50 border-red-100'
    : profile?.pro
    ? 'text-blue-500 bg-blue-50 border-blue-100'
    : 'text-slate-500 bg-slate-50 border-slate-100';

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <AnimatedPressable
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          onPress={handleClose}
        />

        {/* Drawer Content */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [
                { translateX },
                { scale: drawerScale },
              ],
              opacity: drawerOpacity,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{copy.menuTitle}</Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.8}
              style={styles.closeBtn}
            >
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.scrollWrapper, { opacity: contentOpacity }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="normal"
            scrollEventThrottle={16}
          >
            {/* User Profile Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenProfile}
              accessibilityRole="button"
              accessibilityLabel={profile?.name || 'VNSEEA'}
            >
              <View style={styles.profileCard}>
                <View style={styles.profileMain}>
                  <View style={styles.profileText}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {profile?.name || 'VNSEEA'}
                    </Text>
                    <Text style={styles.profileUsername} numberOfLines={1}>
                      @{profile?.username || 'user'}
                    </Text>
                    <View style={[styles.roleBadge, profile?.admin ? styles.roleAdmin : profile?.pro ? styles.rolePro : styles.roleMember]}>
                      <Text style={[styles.roleText, profile?.admin ? styles.roleTextAdmin : profile?.pro ? styles.roleTextPro : styles.roleTextMember]}>
                        {roleLabel}
                      </Text>
                    </View>
                  </View>
                  <Image
                    source={{ uri: profile?.avatarUrl || FALLBACK_AVATAR }}
                    style={styles.avatar as any}
                  />
                </View>

                {/* Wallet & Points widgets */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <View style={styles.statIconBgWallet}>
                      <Wallet size={16} color="#0052ff" strokeWidth={2.2} />
                    </View>
                    <View style={styles.statTexts}>
                      <Text style={styles.statLabel}>{copy.walletLabel}</Text>
                      <Text style={styles.statVal} numberOfLines={1}>
                        VND {profile?.wallet ? Number(profile.wallet).toLocaleString('vi-VN') : '0'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statBox}>
                    <View style={styles.statIconBgPoints}>
                      <Coins size={16} color="#eab308" strokeWidth={2.2} />
                    </View>
                    <View style={styles.statTexts}>
                      <Text style={styles.statLabel}>{copy.pointsLabel}</Text>
                      <Text style={styles.statVal} numberOfLines={1}>
                        {profile?.points ? Number(profile.points).toLocaleString('vi-VN') : '0'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Quick Access - 3 mục nổi bật đứng đầu drawer */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#fef3c7' }]}>
                <Star size={14} color="#a16207" fill="#a16207" />
              </View>
              <Text style={styles.sectionHeader}>Nổi bật</Text>
            </View>
            <MenuRow
              title={copy.featNearby}
              icon={
                <View style={[styles.highlightIconBubble, { backgroundColor: '#0ea5e9' }]}>
                  <MapPinned size={18} color="#ffffff" strokeWidth={2.4} />
                </View>
              }
              highlight
              onPress={() => handleItemPress({ type: 'feature', feature: 'nearby' })}
            />
            <MenuRow
              title={copy.featMarket}
              icon={
                <View style={[styles.highlightIconBubble, { backgroundColor: '#f59e0b' }]}>
                  <Store size={18} color="#ffffff" strokeWidth={2.4} />
                </View>
              }
              highlight
              onPress={() => handleItemPress({ type: 'feature', feature: 'market' })}
            />
            <MenuRow
              title={copy.myPoints}
              icon={
                <View style={[styles.highlightIconBubble, { backgroundColor: '#eab308' }]}>
                  <Star size={18} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />
                </View>
              }
              highlight
              onPress={() => handleItemPress({ type: 'route', route: 'myPoints' })}
            />

            {/* Account Settings Section - removed; moved to Cài đặt chung in SettingsScreen */}

            {/* Security Section - removed; moved to Cài đặt chung in SettingsScreen */}

            {/* Feature: Giao tiếp */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#eef2ff' }]}>
                <UserPlus size={14} color="#4338ca" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catCommunicate}</Text>
            </View>
            <MenuRow
              title={copy.featFollowing}
              icon={<UserPlus size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'following' })}
            />
            <MenuRow
              title={copy.featPoke}
              icon={<Pointer size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'poke' })}
            />

            {/* Feature: Nội dung & Media */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#fce7f3' }]}>
                <ImageLucide size={14} color="#be185d" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catMedia}</Text>
            </View>
            <MenuRow
              title={copy.featAlbums}
              icon={<Images size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'albums' })}
            />
            <MenuRow
              title={copy.featPhotos}
              icon={<ImageLucide size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'photos' })}
            />
            <MenuRow
              title={copy.featVideos}
              icon={<Video size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'videos' })}
            />
            <MenuRow
              title={copy.featSaved}
              icon={<Bookmark size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'saved' })}
            />

            {/* Feature: Cộng đồng */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#ecfeff' }]}>
                <Users size={14} color="#0e7490" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catCommunity}</Text>
            </View>
            <MenuRow
              title={copy.featGroups}
              icon={<Users size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'groups' })}
            />
            <MenuRow
              title={copy.featPages}
              icon={<Flag size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'pages' })}
            />
            <MenuRow
              title={copy.featFindFriends}
              icon={<UserSearch size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'findFriends' })}
            />

            {/* Feature: Thương mại */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#fef3c7' }]}>
                <Briefcase size={14} color="#b45309" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catCommerce}</Text>
            </View>
            <MenuRow
              title={copy.featJobs}
              icon={<Briefcase size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'jobs' })}
            />
            <MenuRow
              title={copy.featOffers}
              icon={<Tag size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'offers' })}
            />

            {/* Feature: Nội dung & Tin tức */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#eef2ff' }]}>
                <FileText size={14} color="#4338ca" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catNews}</Text>
            </View>
            <MenuRow
              title={copy.featBlogs}
              icon={<FileText size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'blogs' })}
            />
            <MenuRow
              title={copy.featPopular}
              icon={<Flame size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'popular' })}
            />
            <MenuRow
              title={copy.featEvents}
              icon={<Calendar size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'events' })}
            />
            <MenuRow
              title={copy.featMovies}
              icon={<Film size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'movies' })}
            />

            {/* Feature: Giải trí */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#fce7f3' }]}>
                <Radio size={14} color="#be185d" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catEntertainment}</Text>
            </View>
            <MenuRow
              title={copy.featLive}
              icon={<Radio size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'live' })}
            />

            {/* Feature: Tài chính */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#dcfce7' }]}>
                <HeartHandshake size={14} color="#15803d" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catFinance}</Text>
            </View>
            <MenuRow
              title={copy.featFunding}
              icon={<HeartHandshake size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'funding' })}
            />

            {/* Feature: Kinh doanh */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#fef9c3' }]}>
                <Rocket size={14} color="#a16207" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catBusiness}</Text>
            </View>
            <MenuRow
              title={copy.featBoosted}
              icon={<Rocket size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'boosted' })}
            />

            {/* Feature: Cá nhân */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#f1f5f9' }]}>
                <Clock size={14} color="#475569" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catPersonal}</Text>
            </View>
            <MenuRow
              title={copy.featMemories}
              icon={<Clock size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'memories' })}
            />

            {/* Feature: Hệ thống */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#e2e8f0' }]}>
                <LayoutGrid size={14} color="#334155" />
              </View>
              <Text style={styles.sectionHeader}>{copy.catSystem}</Text>
            </View>
            <MenuRow
              title={copy.featGeneral}
              icon={<LayoutGrid size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'general' })}
            />
            <MenuRow
              title={copy.featAds}
              icon={<Megaphone size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'feature', feature: 'ads' })}
            />

            {/* Finance & Monetization */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#fef9c3' }]}>
                <CircleDollarSign size={14} color="#a16207" />
              </View>
              <Text style={styles.sectionHeader}>{copy.groupFinance}</Text>
            </View>

            <MenuRow
              title={copy.monetization}
              icon={<CircleDollarSign size={18} color="#eab308" />}
              onPress={() => handleItemPress({ type: 'route', route: 'earnings' })}
            />
            <MenuRow
              title={copy.referralRewards}
              icon={<Gift size={18} color="#eab308" />}
              onPress={() => handleItemPress({ type: 'route', route: 'affiliates' })}
            />

            {/* Notifications and Socials */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBubble, { backgroundColor: '#ede9fe' }]}>
                <Bell size={14} color="#6d28d9" />
              </View>
              <Text style={styles.sectionHeader}>Cài đặt phụ</Text>
            </View>
            <MenuRow
              title={copy.notifications}
              icon={<Bell size={18} color="#6366f1" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-notifications' })}
            />
            <MenuRow
              title={copy.socialLinks}
              icon={<LucideLink size={18} color="#6366f1" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-social-links' })}
            />

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.8}
              style={styles.logoutBtn}
            >
              <LogOut size={18} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.logoutText}>{copy.logoutLabel}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Sub-component for individual settings rows
function MenuRow({ title, icon, onPress, highlight = false }: { title: string; icon: React.ReactNode; onPress: () => void; highlight?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const iconBounce = useRef(new Animated.Value(1)).current;
  const pressInRef = useRef<Animated.CompositeAnimation | null>(null);
  const pressOutRef = useRef<Animated.CompositeAnimation | null>(null);

  const handlePressIn = useCallback(() => {
    // Cancel any running rebound to prevent jitter
    if (pressOutRef.current) {
      pressOutRef.current.stop();
      pressOutRef.current = null;
    }
    pressInRef.current = Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 220,
        friction: 14,
      }),
      Animated.timing(opacity, {
        toValue: 0.78,
        duration: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(iconBounce, {
        toValue: 1.18,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
    ]);
    pressInRef.current.start();
  }, [scale, opacity, iconBounce]);

  const handlePressOut = useCallback(() => {
    if (pressInRef.current) {
      pressInRef.current.stop();
      pressInRef.current = null;
    }
    pressOutRef.current = Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 240,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(iconBounce, {
        toValue: 1,
        useNativeDriver: true,
        tension: 220,
        friction: 9,
      }),
    ]);
    pressOutRef.current.start();
  }, [scale, opacity, iconBounce]);

  const handlePress = useCallback(() => {
    // Subtle haptic feedback for premium feel — sharper for highlight rows
    // Vibration is built into RN so no extra dependency needed
    if (highlight) {
      Vibration.vibrate(15);
    } else {
      Vibration.vibrate(8);
    }
    onPress();
  }, [highlight, onPress]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        opacity,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayPressIn={0}
        style={[styles.row, highlight ? styles.rowHighlight : null]}
      >
        <View style={styles.rowLeft}>
          <Animated.View
            style={[
              styles.rowIconBg,
              highlight ? styles.rowIconBgHighlight : null,
              { transform: [{ scale: iconBounce }] },
            ]}
          >
            {icon}
          </Animated.View>
          <Text style={[styles.rowTitle, highlight ? styles.rowTitleHighlight : null]}>
            {title}
          </Text>
          {highlight ? (
            <View style={styles.highlightBadge}>
              <Text style={styles.highlightBadgeText}>★</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={16} color={highlight ? '#0052ff' : '#94a3b8'} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#f8fafc',
    shadowColor: '#0f172a',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  scrollWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileText: {
    flex: 1,
    marginRight: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleAdmin: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  rolePro: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  roleMember: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleTextAdmin: {
    color: '#ef4444',
  },
  roleTextPro: {
    color: '#3b82f6',
  },
  roleTextMember: {
    color: '#64748b',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 14,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconBgWallet: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statIconBgPoints: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statTexts: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 1,
  },
  statVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  rowHighlight: {
    backgroundColor: '#eef2ff',
    borderColor: '#0052ff',
    borderWidth: 1.5,
    shadowColor: '#0052ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  rowIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconBgHighlight: {
    backgroundColor: 'transparent',
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  highlightIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  rowTitleHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#001a66',
  },
  highlightBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#0052ff',
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
});
