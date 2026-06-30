// Description: Modern user dashboard — links to account features.
// Style follows the reference screenshots: clean white cards with a
// soft border, circular pastel icon, and a chevron trailing each row.
// No "featured" rows, no hero gradient card — every item has the same
// visual weight so the menu reads as one calm list.
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
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
  ShieldCheck,
  Trash2,
  User,
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
  | { type: 'route'; route: 'earnings' | 'affiliates' }
  | { type: 'alert'; alert: 'deleteAccount' };

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

const BRAND = '#0000ff';
const ICON_BG = '#eef2ff';
const ICON_COLOR = BRAND;
const FALLBACK_AVATAR =
  'https://ui-avatars.com/api/?background=eef2ff&color=0000ff&name=VNSEEA';

const DASHBOARD_COPY = {
  vi: {
    title: 'Bảng điều khiển',
    subtitle: 'Quản lý tài khoản và dữ liệu cá nhân',
    general: 'Chung',
    profile: 'Hồ sơ',
    privacy: 'Quyền riêng tư',
    avatar: 'Ảnh đại diện',
    password: 'Mật khẩu',
    twoFactor: '2FA',
    notifications: 'Thông báo',
    email: 'Email',
    socialLinks: 'Liên kết mạng xã hội',
    verification: 'Xác thực',
    wallet: 'Ví VNSEEA',
    sessions: 'Phiên đăng nhập',
    blockedUsers: 'Người đã chặn',
    myData: 'Dữ liệu của tôi',
    addresses: 'Địa chỉ',
    referralRewards: 'Thưởng giới thiệu',
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
    deleteHint: 'Chức năng nguy hiểm, cần API xóa an toàn',
    deleteTitle: 'Xóa tài khoản',
    deleteMessage:
      'Mình chưa thấy endpoint xóa tài khoản an toàn trong app hiện tại, nên chưa bật thao tác này để tránh mất dữ liệu ngoài ý muốn.',
    ok: 'Đã hiểu',
  },
  en: {
    title: 'Dashboard',
    subtitle: 'Manage account and personal data',
    general: 'General',
    profile: 'Profile',
    privacy: 'Privacy',
    avatar: 'Avatar',
    password: 'Password',
    twoFactor: '2FA',
    notifications: 'Notifications',
    email: 'Email',
    socialLinks: 'Social links',
    verification: 'Verification',
    wallet: 'VNSEEA wallet',
    sessions: 'Sessions',
    blockedUsers: 'Blocked users',
    myData: 'My data',
    addresses: 'Addresses',
    referralRewards: 'Referral rewards',
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
    deleteHint: 'Dangerous action, requires safe delete API',
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

  // Destructive row gets a red tint on the icon and chevron but keeps
  // the same card geometry so it still reads as part of the list.
  const iconBackground = item.destructive ? '#fee2e2' : ICON_BG;
  const iconFg = item.destructive ? '#ef4444' : item.iconColor;
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
            className="text-[15px] font-semibold"
            style={{ color: titleColor }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            className="mt-0.5 text-[12px] text-slate-500"
            numberOfLines={1}
          >
            {item.subtitle}
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
  const { profile } = useMyInfoViewModel();

  const items = useMemo<DashboardItem[]>(
    () => [
      {
        id: 'profile',
        title: copy.profile,
        subtitle: copy.profileHint,
        icon: <IdCard size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'editProfile' },
      },
      {
        id: 'wallet',
        title: copy.wallet,
        subtitle: copy.walletHint,
        icon: <Wallet size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'route', route: 'earnings' },
      },
      {
        id: 'general',
        title: copy.general,
        subtitle: copy.generalHint,
        icon: <User size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-common' },
      },
      {
        id: 'privacy',
        title: copy.privacy,
        subtitle: copy.privacyHint,
        icon: <LockKeyhole size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-privacy' },
      },
      {
        id: 'avatar',
        title: copy.avatar,
        subtitle: copy.avatarHint,
        icon: <ImageIcon size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-avatar' },
      },
      {
        id: 'password',
        title: copy.password,
        subtitle: copy.passwordHint,
        icon: <KeyRound size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-password' },
      },
      {
        id: 'two-factor',
        title: copy.twoFactor,
        subtitle: copy.twoFactorHint,
        icon: <ShieldCheck size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-two-factor' },
      },
      {
        id: 'notifications',
        title: copy.notifications,
        subtitle: copy.notificationsHint,
        icon: <Bell size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-notifications' },
      },
      {
        id: 'email',
        title: copy.email,
        subtitle: copy.emailHint,
        icon: <Mail size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-notifications' },
      },
      {
        id: 'social-links',
        title: copy.socialLinks,
        subtitle: copy.socialLinksHint,
        icon: <Link size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-social-links' },
      },
      {
        id: 'verification',
        title: copy.verification,
        subtitle: copy.verificationHint,
        icon: <BadgeCheck size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-verification' },
      },
      {
        id: 'sessions',
        title: copy.sessions,
        subtitle: copy.sessionsHint,
        icon: <Monitor size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-sessions' },
      },
      {
        id: 'blocked-users',
        title: copy.blockedUsers,
        subtitle: copy.blockedUsersHint,
        icon: <Ban size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-blocked-users' },
      },
      {
        id: 'my-data',
        title: copy.myData,
        subtitle: copy.myDataHint,
        icon: <Info size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-privacy' },
      },
      {
        id: 'addresses',
        title: copy.addresses,
        subtitle: copy.addressesHint,
        icon: <MapPin size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'panel', panel: 'general-address' },
      },
      {
        id: 'referral-rewards',
        title: copy.referralRewards,
        subtitle: copy.referralRewardsHint,
        icon: <Gift size={20} color={ICON_COLOR} />,
        iconBg: ICON_BG,
        iconColor: ICON_COLOR,
        action: { type: 'route', route: 'affiliates' },
      },
      {
        id: 'delete-account',
        title: copy.deleteAccount,
        subtitle: copy.deleteHint,
        icon: <Trash2 size={20} color="#ef4444" />,
        iconBg: '#fee2e2',
        iconColor: '#ef4444',
        action: { type: 'alert', alert: 'deleteAccount' },
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
        navigation.navigate(ROUTES.AFFILIATES);
        return;
      }

      Alert.alert(copy.deleteTitle, copy.deleteMessage, [{ text: copy.ok }]);
    },
    [copy, navigation, openSettingsPanel],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Top app bar — mirrors the reference style: plain white row
          with back chevron + centered title. No fill, no gradient. */}
      <View className="flex-row items-center justify-between bg-white px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="back"
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronRight
            size={22}
            color="#0f172a"
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </TouchableOpacity>
        <Text className="text-[17px] font-semibold text-slate-900">
          {copy.title}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card — flat, matches the rest of the list. No
            gradient hero, no API-ready pill, no shadow. */}
        <View className="mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white px-3.5 py-3">
          <Image
            source={{ uri: profile?.avatarUrl || FALLBACK_AVATAR }}
            className="h-10 w-10 rounded-full"
          />
          <View className="ml-3 flex-1">
            <Text
              className="text-[15px] font-semibold text-slate-900"
              numberOfLines={1}
            >
              {profile?.name || 'VNSEEA'}
            </Text>
            <Text
              className="mt-0.5 text-[12px] text-slate-500"
              numberOfLines={1}
            >
              {copy.subtitle}
            </Text>
          </View>
        </View>

        {items.map((item, index) => (
          <DashboardRow
            key={item.id}
            item={item}
            index={index}
            onPress={handlePress}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default UserDashboardScreen;