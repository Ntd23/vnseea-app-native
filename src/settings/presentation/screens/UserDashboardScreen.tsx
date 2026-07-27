// Description: Modern user dashboard — links to account features.
// Style follows the reference screenshots: clean white cards with a
// soft border, circular pastel icon, and a chevron trailing each row.
// No "featured" rows, no hero gradient card — every item has the same
// visual weight so the menu reads as one calm list.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bell,
  ChevronRight,
  Gift,
  IdCard,
  Image as ImageIcon,
  Info,
  KeyRound,
  Link,
  LockKeyhole,
  Mail,
  MapPin,
  Monitor,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  User,
  Users,
  Wallet,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
  SettingsPanelRouteParam,
} from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useMyInfoViewModel } from '../../application/view-models/useMyInfoViewModel';

type DashboardNav = NativeStackNavigationProp<RootStackParamList>;
type IconNode = React.ReactNode;

type DashboardAction =
  | { type: 'panel'; panel: SettingsPanelRouteParam }
  | { type: 'editProfile' }
  | { type: 'route'; route: 'earnings' | 'affiliates' | 'my-points' | 'my-balance' | 'settings-address' | 'settings-my-info' | 'delete-account' };

type DashboardItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: IconNode;
  iconBg: string;
  iconColor: string;
  action: DashboardAction;
  destructive?: boolean;
};

const BRAND = APP_BRAND_COLOR;
const ICON_BG = APP_COLORS.brand.soft;
const ICON_COLOR = BRAND;

const DASHBOARD_COPY = {
  vi: {
    title: 'Cài đặt',
    subtitle: 'Quản lý tài khoản và dữ liệu cá nhân',
    general: 'Chung',
    profile: 'Hồ sơ',
    privacy: 'Sự riêng tư',
    avatar: 'Hình đại diện & Ảnh bìa',
    password: 'Mật khẩu',
    twoFactor: '2FA',
    notifications: 'Thiết lập thông báo',
    email: 'Email',
    socialLinks: 'đường liên kết mạng xã hội',
    verification: 'Xác thực',
    wallet: 'Kiếm tiền',
    sessions: 'Quản lý phiên',
    blockedUsers: 'Người dùng bị chặn',
    myData: 'Thông tin của tôi',
    addresses: 'Địa chỉ của tôi',
    referralRewards: 'Các chi nhánh của tôi',
    points: 'Điểm của tôi',
    balance: 'Ví & Tín dụng',
    deleteAccount: 'Xóa tài khoản',
    generalHint: 'Tên đăng nhập, email, số điện thoại',
    profileHint: 'Tên, giới thiệu, công việc, trường học',
    privacyHint: 'Ai có thể xem và tương tác với bạn',
    avatarHint: 'Cập nhật ảnh đại diện và ảnh bìa',
    passwordHint: 'Đổi mật khẩu tài khoản',
    twoFactorHint: 'Bật hoặc tắt xác thực hai yếu tố',
    notificationsHint: 'Cài đặt thông báo tài khoản',
    emailHint: 'Thông báo email khi có tương tác',
    socialLinksHint: 'Facebook, Instagram, YouTube...',
    verificationHint: 'Gửi hồ sơ xác thực tài khoản',
    walletHint: 'Số dư và rút tiền VNSEEA',
    sessionsHint: 'Quản lý các phiên đăng nhập',
    blockedUsersHint: 'Xem và bỏ chặn người dùng',
    myDataHint: 'Quyền chia sẻ dữ liệu cá nhân',
    addressesHint: 'Địa chỉ giao hàng và liên hệ',
    referralRewardsHint: 'Link mời và phần thưởng giới thiệu',
    pointsHint: 'Xem điểm tích lũy và đổi quà',
    deleteHint: 'Tài khoản của bạn sẽ bị xóa vĩnh viễn',
    deleteTitle: 'Xóa tài khoản',
    deleteMessage:
      'Mình chưa thấy endpoint xóa tài khoản an toàn trong app hiện tại, nên chưa bật thao tác này để tránh mất dữ liệu ngoài ý muốn.',
    ok: 'Đã hiểu',
  },
  en: {
    title: 'Settings',
    subtitle: 'Manage account and personal data',
    general: 'General',
    profile: 'Profile',
    privacy: 'Privacy',
    avatar: 'Avatar & Cover',
    password: 'Password',
    twoFactor: '2FA',
    notifications: 'Notification settings',
    email: 'Email',
    socialLinks: 'Social links',
    verification: 'Verification',
    wallet: 'Monetization',
    sessions: 'Manage sessions',
    blockedUsers: 'Blocked users',
    myData: 'My info',
    addresses: 'My addresses',
    referralRewards: 'My affiliates',
    points: 'My points',
    balance: 'Wallet & Credit',
    deleteAccount: 'Delete account',
    generalHint: 'Username, email, phone number',
    profileHint: 'Name, bio, work, school',
    privacyHint: 'Who can see and interact with you',
    avatarHint: 'Update avatar and cover photo',
    passwordHint: 'Change account password',
    twoFactorHint: 'Enable or disable two-factor auth',
    notificationsHint: 'Account notification settings',
    emailHint: 'Email alerts for interactions',
    socialLinksHint: 'Facebook, Instagram, YouTube...',
    verificationHint: 'Submit account verification',
    walletHint: 'Balance and VNSEEA withdrawals',
    sessionsHint: 'Manage login sessions',
    blockedUsersHint: 'View and unblock users',
    myDataHint: 'Personal data sharing preferences',
    addressesHint: 'Shipping and contact addresses',
    referralRewardsHint: 'Invite link and referral rewards',
    pointsHint: 'View accumulated points and redeem',
    deleteHint: 'Your account will be permanently deleted',
    deleteTitle: 'Delete account',
    deleteMessage:
      'I did not find a safe account deletion endpoint wired in the app yet, so this action is disabled to avoid accidental data loss.',
    ok: 'Got it',
  },
};

function DashboardRow({
  item,
  index,
  onPress,
}: {
  item: DashboardItem;
  index: number;
  onPress: (item: DashboardItem) => void;
}) {
  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: index * 18,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 18,
        friction: 9,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const iconBackground = item.destructive ? '#fee2e2' : item.iconBg;
  const chevronColor = item.destructive ? '#ef4444' : '#94a3b8';
  const titleColor = item.destructive ? '#ef4444' : '#0f172a';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item)}
        className="mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-white px-3.5 py-3"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBackground }}
        >
          {item.icon}
        </View>

        <View className="ml-3 flex-1">
          <Text
            className="text-[15px] font-semibold text-slate-800"
            style={{ color: titleColor }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        <ChevronRight size={18} color={chevronColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function UserDashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = DASHBOARD_COPY[language] || DASHBOARD_COPY.vi;

  const items = useMemo<DashboardItem[]>(
    () => [
      {
        id: 'profile',
        title: copy.profile,
        subtitle: copy.profileHint,
        icon: <IdCard size={20} color="#00acc1" />,
        iconBg: '#e0f7fa',
        iconColor: '#00acc1',
        action: { type: 'editProfile' },
      },
      {
        id: 'social-links',
        title: copy.socialLinks,
        subtitle: copy.socialLinksHint,
        icon: <Link size={20} color={APP_BRAND_COLOR} />,
        iconBg: APP_COLORS.brand.soft,
        iconColor: APP_BRAND_COLOR,
        action: { type: 'panel', panel: 'general-social-links' },
      },
      {
        id: 'notifications',
        title: copy.notifications,
        subtitle: copy.notificationsHint,
        icon: <Bell size={20} color="#8b5cf6" />,
        iconBg: '#f5f3ff',
        iconColor: '#8b5cf6',
        action: { type: 'panel', panel: 'general-notifications' },
      },
      {
        id: 'avatar',
        title: copy.avatar,
        subtitle: copy.avatarHint,
        icon: <ImageIcon size={20} color="#0284c7" />,
        iconBg: '#e0f2fe',
        iconColor: '#0284c7',
        action: { type: 'panel', panel: 'general-avatar' },
      },
      {
        id: 'privacy',
        title: copy.privacy,
        subtitle: copy.privacyHint,
        icon: <LockKeyhole size={20} color="#8b5cf6" />,
        iconBg: '#f5f3ff',
        iconColor: '#8b5cf6',
        action: { type: 'panel', panel: 'general-privacy' },
      },
      {
        id: 'password',
        title: copy.password,
        subtitle: copy.passwordHint,
        icon: <KeyRound size={20} color="#06b6d4" />,
        iconBg: '#ecfeff',
        iconColor: '#06b6d4',
        action: { type: 'panel', panel: 'general-password' },
      },
      {
        id: 'sessions',
        title: copy.sessions,
        subtitle: copy.sessionsHint,
        icon: <Monitor size={20} color="#d946ef" />,
        iconBg: '#fdf4ff',
        iconColor: '#d946ef',
        action: { type: 'panel', panel: 'general-sessions' },
      },
      {
        id: 'blocked-users',
        title: copy.blockedUsers,
        subtitle: copy.blockedUsersHint,
        icon: <Ban size={20} color="#ea580c" />,
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        action: { type: 'panel', panel: 'general-blocked-users' },
      },
      {
        id: 'general',
        title: copy.general,
        subtitle: copy.generalHint,
        icon: <SettingsIcon size={20} color="#475569" />,
        iconBg: '#f1f5f9',
        iconColor: '#475569',
        action: { type: 'panel', panel: 'general-common' },
      },
      {
        id: 'my-data',
        title: copy.myData,
        subtitle: copy.myDataHint,
        icon: <Info size={20} color="#475569" />,
        iconBg: '#f1f5f9',
        iconColor: '#475569',
        action: { type: 'route', route: 'settings-my-info' },
      },
      {
        id: 'addresses',
        title: copy.addresses,
        subtitle: copy.addressesHint,
        icon: <MapPin size={20} color="#475569" />,
        iconBg: '#f1f5f9',
        iconColor: '#475569',
        action: { type: 'route', route: 'settings-address' },
      },
      {
        id: 'wallet',
        title: copy.wallet,
        subtitle: copy.walletHint,
        icon: <Wallet size={20} color="#8b5cf6" />,
        iconBg: '#f5f3ff',
        iconColor: '#8b5cf6',
        action: { type: 'route', route: 'earnings' },
      },
      {
        id: 'referral-rewards',
        title: copy.referralRewards,
        subtitle: copy.referralRewardsHint,
        icon: <Users size={20} color="#ea580c" />,
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        action: { type: 'route', route: 'affiliates' },
      },
      {
        id: 'points',
        title: copy.points,
        subtitle: copy.pointsHint,
        icon: <Gift size={20} color="#ea580c" />,
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        action: { type: 'route', route: 'my-points' },
      },
      {
        id: 'balance',
        title: copy.balance,
        subtitle: copy.walletHint,
        icon: <Wallet size={20} color="#06b6d4" />,
        iconBg: '#ecfeff',
        iconColor: '#06b6d4',
        action: { type: 'route', route: 'my-balance' },
      },
      {
        id: 'delete-account',
        title: copy.deleteAccount,
        subtitle: copy.deleteHint,
        icon: <Trash2 size={20} color="#ef4444" />,
        iconBg: '#fee2e2',
        iconColor: '#ef4444',
        action: { type: 'route', route: 'delete-account' },
        destructive: true,
      },
    ],
    [copy],
  );

  const openSettingsPanel = useCallback(
    (panel: SettingsPanelRouteParam) => {
      navigation.navigate(ROUTES.MAIN_TABS, {
        screen: ROUTES.SETTINGS,
        params: { initialPanel: panel, fromDashboard: true },
      });
    },
    [navigation],
  );

  const handlePress = useCallback(
    (item: DashboardItem) => {
      if (item.action.type === 'panel') {
        openSettingsPanel(item.action.panel);
        return;
      }

      if (item.action.type === 'editProfile') {
        navigation.navigate(ROUTES.EDIT_PROFILE);
        return;
      }

      if (item.action.type === 'route') {
        if (item.action.route === 'earnings') {
          navigation.navigate(ROUTES.EARNINGS);
          return;
        }
        if (item.action.route === 'affiliates') {
          navigation.navigate(ROUTES.AFFILIATES);
          return;
        }
        if (item.action.route === 'my-points') {
          navigation.navigate(ROUTES.MY_POINTS);
          return;
        }
        if (item.action.route === 'my-balance') {
          navigation.navigate(ROUTES.MY_BALANCE);
          return;
        }
        if (item.action.route === 'settings-address') {
          navigation.navigate(ROUTES.SETTINGS_ADDRESS);
          return;
        }
        if (item.action.route === 'settings-my-info') {
          navigation.navigate(ROUTES.SETTINGS_MY_INFO);
          return;
        }
        if (item.action.route === 'delete-account') {
          navigation.navigate(ROUTES.DELETE_ACCOUNT);
          return;
        }
        return;
      }
    },
    [navigation, openSettingsPanel],
  );

  const groupedSections = useMemo(() => {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const findItem = (id: string) => itemMap.get(id);

    return [
      {
        id: 'sec-1',
        items: ['general', 'profile', 'social-links', 'notifications'].map(findItem).filter(Boolean) as DashboardItem[],
      },
      {
        id: 'sec-2',
        items: ['avatar'].map(findItem).filter(Boolean) as DashboardItem[],
      },
      {
        id: 'sec-3',
        items: ['privacy', 'password', 'sessions', 'blocked-users'].map(findItem).filter(Boolean) as DashboardItem[],
      },
      {
        id: 'sec-4',
        items: ['my-data', 'addresses'].map(findItem).filter(Boolean) as DashboardItem[],
      },
      {
        id: 'sec-5',
        items: ['wallet', 'referral-rewards', 'points', 'balance'].map(findItem).filter(Boolean) as DashboardItem[],
      },
      {
        id: 'sec-6',
        items: ['delete-account'].map(findItem).filter(Boolean) as DashboardItem[],
      },
    ];
  }, [items]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Top app bar — matches the header "Chung" with circular gear icon */}
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="back"
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft
            size={24}
            color="#0f172a"
          />
        </TouchableOpacity>
        
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-extrabold text-slate-950">
            {copy.title}
          </Text>
        </View>

        <View className="h-11 w-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {groupedSections.map((section, secIndex) => (
          <React.Fragment key={section.id}>
            {secIndex > 0 ? (
              <View className="mb-4 mt-2 border-b border-slate-100" />
            ) : null}
            {section.items.map((item, index) => (
              <DashboardRow
                key={item.id}
                item={item}
                index={secIndex * 10 + index}
                onPress={handlePress}
              />
            ))}
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default UserDashboardScreen;
