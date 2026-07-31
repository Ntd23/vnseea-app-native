// Description: Renders a modern, animated right-side profile and settings drawer.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { navigateToReels } from '../../../navigation/reelsNavigation';
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
  // MessageSquare,
  Compass,
  Settings,
  Newspaper,
  Map,
  Moon,
  Languages,
  Repeat,
  Keyboard,
  Globe,
  ShoppingBag,
  Tv,
  CreditCard,
  TrendingUp,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToOwnProfile } from '../../../navigation/profileNavigation';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { SettingsPanelRouteParam } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useAuthViewModel } from '../../../auth/application/view-models/useAuthViewModel';
import { useEarningsViewModel } from '../../../wallet';
import { useSettingsViewModel } from '../../../settings';
import { changeLocale } from '../../../shared-kernel/infrastructure/i18n';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = SCREEN_W * 0.84;
const FALLBACK_AVATAR = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';
const DRAWER_HEADER_BAR_HEIGHT = 68;
const DRAWER_CONTENT_DEFER_MS = 80;
const DRAWER_SKELETON_ROWS = Array.from({ length: 8 }, (_, index) => index);

const DRAWER_COPY = {
  vi: {
    menuTitle: 'Menu',
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
    featPoke: 'Chọc',
    featAlbums: 'Tập ảnh',
    featPhotos: 'Xem',
    featVideos: 'Video của tôi',
    featSaved: 'Bài đã lưu',
    featGroups: 'Nhóm của tôi',
    featPages: 'Các trang',
    featFindFriends: 'Tìm bạn',
 featMapAddress: 'Bản đồ tìm địa chỉ',
    featNearby: 'Người ở gần',
    featMarket: 'Thị trường',
    featJobs: 'Việc làm',
    featOffers: 'Ưu đãi',
    featBlogs: 'Blog',
    featPopular: 'Bài viết phổ biến',
    featEvents: 'Sự kiện',
    featMovies: 'Phim',
    featLive: 'Phát trực tiếp',
    featFunding: 'Kinh phí',
    featBoosted: 'Quảng bá',
    featMemories: 'Ký ức',
    featGeneral: 'Tổng quan',
    featAds: 'Quảng cáo',

    // New labels for the requested list
    featMyProducts: 'Sản phẩm của tôi',
    featMyArticles: 'Bài báo của tôi',
    featForums: 'Diễn đàn',
    featReels: 'cuộn phim',
    featExplore: 'Khám phá',
    settingsLabel: 'Cài đặt',
    subscriptionsLabel: 'Đăng ký',
    adminAreaLabel: 'Khu vực quản trị',

 // New copy for the 3-zone menu
 sectionContent: 'Quản lý nội dung',
 sectionAccount: 'Cài đặt',
 sectionMore: 'Khác',
 switchAccountLabel: 'Chuyển tài khoản',
 languageChangeVi: 'Đã đổi sang Tiếng Việt',
 languageChangeEn: 'Đã đổi sang Tiếng Anh',
 nightModeLabel: 'Chế độ',
 themeChangeDark: 'Đã đổi sang chế độ tối',
 themeChangeLight: 'Đã đổi sang chế độ sáng',

    // Feature categories
    catCommunicate: 'Giao tiếp',
    catMedia: 'Nội dung & Media',
    catCommunity: 'Cộng đồng',
    catCommerce: 'Thương mại',
    catNews: 'Nội dung & Tin tức',
    catEntertainment: 'Giải trí',
    catFinance: 'Tài chính',
    catBusiness: 'Kinh doanh',
    catPersonal: 'Cá nhân',
    catSystem: 'Hệ thống',
  },
  en: {
    menuTitle: 'Menu',
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
    featPhotos: 'Watch',
    featVideos: 'My videos',
    featSaved: 'Saved posts',
    featGroups: 'My groups',
    featPages: 'Pages',
    featFindFriends: 'Find friends',
 featMapAddress: 'Map address search',
    featNearby: 'Nearby',
    featMarket: 'Marketplace',
    featJobs: 'Jobs',
    featOffers: 'Offers',
    featBlogs: 'Blog',
    featPopular: 'Popular posts',
    featEvents: 'Events',
    featMovies: 'Movies',
    featLive: 'Live',
    featFunding: 'Funding',
    featBoosted: 'Boosted',
    featMemories: 'Memories',
    featGeneral: 'General',
    featAds: 'Ads',

    // New labels for the requested list
    featMyProducts: 'My products',
    featMyArticles: 'My articles',
    featForums: 'Forums',
    featReels: 'Reels',
    featExplore: 'Explore',
    settingsLabel: 'Settings',
    subscriptionsLabel: 'Subscriptions',
    adminAreaLabel: 'Admin Area',

 // New copy for the 3-zone menu
 sectionContent: 'Content management',
 sectionAccount: 'Settings',
 sectionMore: 'More',
 switchAccountLabel: 'Switch account',
 languageLabel: 'Language',
 languageChangeVi: 'Switched to Vietnamese',
 languageChangeEn: 'Switched to English',
 nightModeLabel: 'Night mode',
 themeChangeDark: 'Switched to dark mode',
 themeChangeLight: 'Switched to light mode',

    // Feature categories
    catCommunicate: 'Communication',
    catMedia: 'Media',
    catCommunity: 'Community',
    catCommerce: 'Commerce',
    catNews: 'News & Content',
    catEntertainment: 'Entertainment',
    catFinance: 'Finance',
    catBusiness: 'Business',
    catPersonal: 'Personal',
    catSystem: 'System',
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
  const { logout } = useAuthViewModel();
  const { walletOverview } = useEarningsViewModel();
  const {
    fullProfile,
    language: currentLanguage,
    setLanguage,
  } = useSettingsViewModel();
  const { theme: currentTheme, setTheme } = useAppTheme();

  const [shouldRender, setShouldRender] = useState(visible);
  const [contentReady, setContentReady] = useState(visible);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Read profile directly from MMKV cache — no fetch, no hook re-renders
  const cachedProfile = useMemo(() => sessionStorage.getUserProfile(), []);
  const profile = cachedProfile;

  const isAdmin = Boolean(fullProfile?.admin);
  const isPro = Boolean(fullProfile?.pro);
  // Drawer is always at translateX=0 by default so it is visible the moment
  // the Modal mounts. The "slide in" effect is created by the useEffect
  // jumping translateX to DRAWER_W right BEFORE the open animation runs;
  // if that effect somehow misses a frame, the user still sees the drawer
  // appear at its final position instead of being stuck off-screen.
  const translateX = useRef(new Animated.Value(0)).current;
  const drawerOpacity = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(visible ? 0.55 : 0)).current;
  const closeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const openAnimFrame = useRef<number | null>(null);
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancel any running close animation if drawer is re-opened mid-close
    if (closeAnimRef.current) {
      closeAnimRef.current.stop();
      closeAnimRef.current = null;
    }
    // Cancel any pending open frame from a previous render
    if (openAnimFrame.current !== null) {
      cancelAnimationFrame(openAnimFrame.current);
      openAnimFrame.current = null;
    }
    if (contentTimerRef.current !== null) {
      clearTimeout(contentTimerRef.current);
      contentTimerRef.current = null;
    }

    if (visible) {
      setShouldRender(true);
      setContentReady(false);
      translateX.setValue(DRAWER_W);
      drawerOpacity.setValue(1);
      backdropOpacity.setValue(0);
      openAnimFrame.current = requestAnimationFrame(() => {
        openAnimFrame.current = null;
        contentTimerRef.current = setTimeout(() => {
          contentTimerRef.current = null;
          setContentReady(true);
        }, DRAWER_CONTENT_DEFER_MS);
      });

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.55,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true, // Use native driver for smooth 60fps translation
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          translateX.setValue(0);
        }
      });
    } else {
      setLogoutConfirmVisible(false);
      const closeAnim = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: DRAWER_W,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true, // Use native driver for smooth 60fps translation
        }),
      ]);
      closeAnimRef.current = closeAnim;

      closeAnim.start(({ finished }) => {
        closeAnimRef.current = null;
        if (finished) {
          setShouldRender(false);
          setContentReady(false);
        }
      });
    }
  }, [visible, backdropOpacity, drawerOpacity, translateX]);

  useEffect(() => {
    return () => {
      if (openAnimFrame.current !== null) {
        cancelAnimationFrame(openAnimFrame.current);
        openAnimFrame.current = null;
      }
      if (contentTimerRef.current !== null) {
        clearTimeout(contentTimerRef.current);
        contentTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setLogoutConfirmVisible(false);
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
            navigation.navigate(ROUTES.WATCH);
            return;
          case 'videos':
            navigation.navigate(ROUTES.MY_VIDEOS);
            return;
          case 'saved':
            navigation.navigate(ROUTES.ACTIVITY_CENTER, {
              initialTab: 'saved',
            });
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
            case 'mapAddress':
            // The map/address search lives in the Nearby screen
            // (it renders a real MapView with place markers + a
            // search bar). Reusing it keeps the user inside the
            // in-app experience.
            navigation.navigate(ROUTES.NEARBY_USERS);
            return;
            case 'switchAccount':
            // Drop the cached credentials and bounce to login.
            // Using navigation.reset keeps the back-stack empty
            // so the user can't accidentally return to the previous
            // account's data.
            navigation.reset({
             index: 0,
             routes: [{ name: ROUTES.LOGIN }],
            });
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
          case 'myProducts':
            navigation.navigate(ROUTES.MY_PRODUCTS);
            return;
          case 'myArticles':
            navigation.navigate(ROUTES.MY_ARTICLES);
            return;
          case 'forum':
            navigation.navigate(ROUTES.FORUM);
            return;
          case 'reels':
            navigateToReels(navigation, { source: 'home' });
            return;
          case 'explore':
            navigation.navigate(ROUTES.SEARCH, { discovery: true });
            return;
          case 'settings':
            navigation.navigate(ROUTES.USER_DASHBOARD);
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

  const handleDismissLogoutConfirm = useCallback(() => {
    if (isLoggingOut) return;
    setLogoutConfirmVisible(false);
  }, [isLoggingOut]);

  const handleLogout = useCallback(() => {
    Vibration.vibrate(8);
    setLogoutConfirmVisible(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutConfirmVisible(false);
    handleClose();
    try {
      await logout();
    } catch (e) {
      console.warn('[HeaderProfileDrawer] Logout failed', e);
    } finally {
      setIsLoggingOut(false);
    }
  }, [handleClose, isLoggingOut, logout]);

  // Inline language toggle (drawer row + two pill buttons).
  // The user no longer has to navigate into a separate screen to
  // change the locale - tap VI or EN right here in the menu.
  const handleLanguageChange = useCallback(
   (next: 'vi' | 'en') => {
   if (next === currentLanguage) return;
   setLanguage(next);
   // Keep the i18next instance in sync with the MMKV store so any
   // consumer using useTranslation re-renders immediately.
   changeLocale(next);
    Alert.alert(
      next === 'vi' ? 'Ngôn ngữ / Language' : 'Language / Ngôn ngữ',
      next === 'vi' ? copy.languageChangeVi : copy.languageChangeEn,
    );
   },
   [copy.languageChangeEn, copy.languageChangeVi, currentLanguage, setLanguage],
);

  // Inline theme toggle (drawer row + two pill buttons).
  // Same shape as the language row: tap "T"oi or "S"ang to switch
  // the app theme on the fly, no separate screen required.
  const handleThemeChange = useCallback(
   (next: 'light' | 'dark') => {
   if (next === currentTheme) return;
   setTheme(next);
   Alert.alert(
   next === 'dark' ? copy.nightModeLabel : 'Chế độ sáng',
   next === 'dark' ? copy.themeChangeDark : copy.themeChangeLight,
   );
   },
   [copy.nightModeLabel, copy.themeChangeDark, copy.themeChangeLight, currentTheme, setTheme],
  );

  const handleOpenProfile = useCallback(() => {
    handleClose();
    navigateToOwnProfile(navigation);
  }, [handleClose, navigation]);

  if (!shouldRender) return null;

  const roleLabel = isAdmin
    ? copy.roleAdmin
    : isPro
    ? copy.rolePro
    : copy.roleMember;

  const roleStyle = isAdmin
    ? styles.roleAdmin
    : isPro
    ? styles.rolePro
    : styles.roleMember;

  const roleTextStyle = isAdmin
    ? styles.roleTextAdmin
    : isPro
    ? styles.roleTextPro
    : styles.roleTextMember;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      hardwareAccelerated
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={
        logoutConfirmVisible ? handleDismissLogoutConfirm : handleClose
      }
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
              transform: [{ translateX }],
              opacity: drawerOpacity,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                height: Math.max(insets.top, 12) + DRAWER_HEADER_BAR_HEIGHT,
                paddingTop: Math.max(insets.top, 12),
              },
            ]}
          >
            <Text style={styles.headerTitle}>{copy.menuTitle}</Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.8}
              style={styles.closeBtn}
            >
              <X size={20} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {contentReady ? (
          <View style={styles.scrollWrapper}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="normal"
            scrollEventThrottle={32}
            removeClippedSubviews
          >
            {/* User Profile & Wallet Block */}
            <View style={styles.topMenuBlock}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenProfile}
                style={styles.topProfileButton}
              >
                <Text style={styles.topProfileName} numberOfLines={1}>
                  {profile?.name || 'VNSEEA'}
                </Text>
                <Image
                  source={{ uri: profile?.avatarUrl || FALLBACK_AVATAR }}
                  style={styles.topProfileAvatar as any}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  handleClose();
                  navigation.navigate(ROUTES.MY_BALANCE);
                }}
                style={styles.topWalletButton}
              >
                <Wallet size={16} color="#64748b" strokeWidth={2.2} />
                <Text style={styles.topWalletText} numberOfLines={1}>
                  {`Ví VNSEEA: ${(Number(walletOverview?.balance) || 0).toLocaleString('vi-VN')} VNSEEA`}
                </Text>
              </TouchableOpacity>
            </View>

                        <MenuRow
             title={copy.featMapAddress}
             icon={<MapPin size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'mapAddress' })}
            />
            <MenuRow
             title={copy.featPages}
             icon={<Flag size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'pages' })}
            />
            <MenuRow
             title={copy.featMyProducts}
             icon={<ShoppingBag size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'myProducts' })}
            />
            <MenuRow
             title={copy.featMarket}
             icon={<Store size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'market' })}
            />
            <MenuRow
             title={copy.featBlogs}
             icon={<FileText size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'blogs' })}
            />
            <MenuRow
             title={copy.featMovies}
             icon={<Film size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'movies' })}
            />
            <MenuRow
             title={copy.featEvents}
             icon={<Calendar size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'events' })}
            />
            <MenuRow
             title={copy.featGroups}
             icon={<Users size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'groups' })}
            />
            {/*
            <MenuRow
              title={copy.featForums}
              icon={<MessageSquare size={18} color="#64748b" />}
              onPress={() =>
                handleItemPress({ type: 'feature', feature: 'forum' })
              }
            />
            */}
            <MenuRow
             title={copy.featAds}
             icon={<Megaphone size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'ads' })}
            />
            <MenuRow
             title={copy.featAlbums}
             icon={<LucideImage size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'albums' })}
            />
            <MenuRow
             title={copy.featPhotos}
             icon={<Tv size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'photos' })}
            />
            <MenuRow
             title={copy.featSaved}
             icon={<Bookmark size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'saved' })}
            />
            <MenuRow
             title={copy.featExplore}
             icon={<Compass size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'explore' })}
            />
            <MenuRow
             title={copy.featPopular}
             icon={<TrendingUp size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'popular' })}
            />
            <MenuRow
             title={copy.featJobs}
             icon={<Briefcase size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'jobs' })}
            />
            <MenuRow
             title={copy.featFunding}
             icon={<HeartHandshake size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'funding' })}
            />
            <MenuRow
             title={copy.featMemories}
             icon={<Clock size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'memories' })}
            />
            <MenuRow
             title={copy.featOffers}
             icon={<Tag size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'offers' })}
            />

            <View style={styles.separator} />

            <MenuRow
             title={copy.settingsLabel}
             icon={<Settings size={18} color="#64748b" />}
             onPress={() => handleItemPress({ type: 'feature', feature: 'settings' })}
            />
            <MenuRow
             title={copy.subscriptionsLabel}
             icon={<CreditCard size={18} color="#64748b" />}
             onPress={() => Linking.openURL(apiConfig.webBaseUrl + '/go-pro').catch(() => undefined)}
            />
            <LanguageRow
             currentLanguage={currentLanguage}
             onChange={handleLanguageChange}
            />

            {/* <View style={styles.separator} /> */}

            <MenuRow
             title={copy.logoutLabel}
             icon={<LogOut size={18} color="#ef4444" />}
             onPress={handleLogout}
            />
          </ScrollView>
          </View>
        ) : (
          <DrawerMenuSkeleton />
        )}
        </Animated.View>
        {logoutConfirmVisible ? (
          <View style={styles.logoutConfirmOverlay} pointerEvents="box-none">
            <Pressable
              style={styles.logoutConfirmBackdrop}
              onPress={handleDismissLogoutConfirm}
            />
            <View style={styles.logoutConfirmCard}>
              <View style={styles.logoutConfirmIconWrap}>
                <LogOut size={24} color="#dc2626" strokeWidth={2.4} />
              </View>
              <Text style={styles.logoutConfirmTitle}>
                {copy.logoutConfirmTitle}
              </Text>
              <Text style={styles.logoutConfirmMessage}>
                {copy.logoutConfirmMsg}
              </Text>
              <View style={styles.logoutConfirmActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDismissLogoutConfirm}
                  disabled={isLoggingOut}
                  style={styles.logoutConfirmCancelButton}
                >
                  <Text style={styles.logoutConfirmCancelText}>
                    {copy.cancel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={handleConfirmLogout}
                  disabled={isLoggingOut}
                  style={[
                    styles.logoutConfirmLogoutButton,
                    isLoggingOut && styles.logoutConfirmButtonDisabled,
                  ]}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <LogOut size={18} color="#ffffff" strokeWidth={2.5} />
                  )}
                  <Text style={styles.logoutConfirmLogoutText}>
                    {copy.logoutLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const DrawerMenuSkeleton = React.memo(function DrawerMenuSkeleton() {
  return (
    <View style={styles.skeletonContent} pointerEvents="none">
      <View style={styles.skeletonProfileCard}>
        <View style={styles.skeletonProfileTop}>
          <View style={styles.skeletonNameBlock}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLineMedium} />
          </View>
          <View style={styles.skeletonAvatar} />
        </View>
        <View style={styles.skeletonWalletLine} />
      </View>
      {DRAWER_SKELETON_ROWS.map(index => (
        <View key={`drawer-skeleton-${index}`} style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonRowText} />
          <View style={styles.skeletonChevron} />
        </View>
      ))}
    </View>
  );
});

// Sub-component for individual settings rows — memoized, no per-row Animated
// values to keep the list cheap to render. Native activeOpacity + a thin
// highlight overlay are enough for tactile feedback at this scale.
const MenuRow = React.memo(function MenuRow({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const handlePress = useCallback(() => {
    Vibration.vibrate(8);
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      delayPressIn={0}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIconBg}>
          {icon}
        </View>
        <Text style={styles.rowTitle}>
          {title}
        </Text>
      </View>
      <ChevronRight size={16} color="#94a3b8" strokeWidth={2.5} />
    </TouchableOpacity>
  );
});

const LanguageRow = React.memo(function LanguageRow({
  currentLanguage,
  onChange,
}: {
  currentLanguage: 'vi' | 'en';
  onChange: (language: 'vi' | 'en') => void;
}) {
  const handlePress = useCallback(
    (language: 'vi' | 'en') => {
      Vibration.vibrate(8);
      onChange(language);
    },
    [onChange],
  );

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIconBg}>
          <Languages size={18} color="#64748b" />
        </View>
      </View>
      <View style={styles.langPillRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => handlePress('vi')}
          style={[
            styles.langPill,
            currentLanguage === 'vi' ? styles.langPillActive : styles.langPillInactive,
          ]}
        >
          <Text
            style={[
              styles.langPillText,
              currentLanguage === 'vi' ? styles.langPillTextActive : styles.langPillTextInactive,
            ]}
          >
            Tiếng Việt
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => handlePress('en')}
          style={[
            styles.langPill,
            currentLanguage === 'en' ? styles.langPillActive : styles.langPillInactive,
          ]}
        >
          <Text
            style={[
              styles.langPillText,
              currentLanguage === 'en' ? styles.langPillTextActive : styles.langPillTextInactive,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

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
  skeletonContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonProfileCard: {
    minHeight: 122,
    borderRadius: 24,
    backgroundColor: '#eef2f7',
    padding: 16,
    marginBottom: 20,
  },
  skeletonProfileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  skeletonNameBlock: {
    flex: 1,
    marginRight: 18,
  },
  skeletonLineWide: {
    width: '58%',
    height: 18,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  skeletonLineMedium: {
    width: '72%',
    height: 14,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f0',
  },
  skeletonWalletLine: {
    width: '76%',
    height: 15,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  skeletonRow: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginRight: 14,
  },
  skeletonRowText: {
    flex: 1,
    height: 15,
    borderRadius: 999,
    backgroundColor: '#e8edf5',
  },
  skeletonChevron: {
    width: 10,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    marginLeft: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    backgroundColor: APP_COLORS.brand.soft,
    borderColor: APP_COLORS.brand.border,
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
    color: APP_BRAND_COLOR,
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
    backgroundColor: APP_COLORS.brand.soft,
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
  langPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  langPill: {
    minWidth: 76,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillActive: {
    borderColor: '#0052ff',
    backgroundColor: APP_COLORS.brand.soft,
  },
  langPillInactive: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  langPillTextActive: {
    color: '#0052ff',
  },
  langPillTextInactive: {
    color: '#94a3b8',
  },
  zoneLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
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
  logoutConfirmOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoutConfirmBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  logoutConfirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 20,
  },
  logoutConfirmIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoutConfirmTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutConfirmMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  logoutConfirmActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  logoutConfirmCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  logoutConfirmLogoutButton: {
    flex: 1.18,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  logoutConfirmButtonDisabled: {
    opacity: 0.72,
  },
  logoutConfirmLogoutText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
    marginHorizontal: 16,
  },
  topMenuBlock: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  topProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  topProfileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  topProfileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#cbd5e1',
  },
  topWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
    gap: 10,
  },
  topWalletText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
