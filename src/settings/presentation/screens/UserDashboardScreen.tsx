// Description: Shows a modern user dashboard that links to available account features.
import React, { useEffect, useMemo, useRef } from 'react';
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
  CircleDollarSign,
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
  Star,
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
  | { type: 'route'; route: 'myPoints' | 'earnings' | 'affiliates' }
  | { type: 'alert'; alert: 'deleteAccount' };

type DashboardItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: IconNode;
  action: DashboardAction;
  featured?: boolean;
  destructive?: boolean;
};

const BRAND = '#0000ff';
const FALLBACK_AVATAR =
  'https://ui-avatars.com/api/?background=eef2ff&color=0000ff&name=VNSEEA';

const DASHBOARD_COPY = {
  vi: {
    title: 'Bảng điều khiển',
    subtitle: 'Quản lý tài khoản, bảo mật và dữ liệu cá nhân',
    apiReady: 'Đã nối API',
    open: 'Mở',
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
    myPoints: 'Điểm của tôi',
    sessions: 'Phiên đăng nhập',
    blockedUsers: 'Người đã chặn',
    myData: 'Dữ liệu của tôi',
    addresses: 'Địa chỉ',
    monetization: 'Kiếm tiền',
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
    myPointsHint: 'Xem điểm và đổi sang ví',
    sessionsHint: 'Quản lý các phiên đăng nhập',
    blockedUsersHint: 'Xem và bỏ chặn người dùng',
    myDataHint: 'Quyền chia sẻ dữ liệu cá nhân',
    addressesHint: 'Địa chỉ giao hàng và liên hệ',
    monetizationHint: 'Thu nhập và rút tiền',
    referralRewardsHint: 'Link mời và phần thưởng giới thiệu',
    deleteHint: 'Chức năng nguy hiểm, cần API xóa an toàn',
    deleteTitle: 'Xóa tài khoản',
    deleteMessage:
      'Mình chưa thấy endpoint xóa tài khoản an toàn trong app hiện tại, nên chưa bật thao tác này để tránh mất dữ liệu ngoài ý muốn.',
    ok: 'Đã hiểu',
  },
  en: {
    title: 'Dashboard',
    subtitle: 'Manage account, security, and personal data',
    apiReady: 'API connected',
    open: 'Open',
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
    myPoints: 'My points',
    sessions: 'Sessions',
    blockedUsers: 'Blocked users',
    myData: 'My data',
    addresses: 'Addresses',
    monetization: 'Monetization',
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
    myPointsHint: 'View points and exchange to wallet',
    sessionsHint: 'Manage login sessions',
    blockedUsersHint: 'View and unblock users',
    myDataHint: 'Personal data sharing preferences',
    addressesHint: 'Shipping and contact addresses',
    monetizationHint: 'Earnings and withdrawal',
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
  const translateY = useRef(new Animated.Value(14)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: index * 22,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 22,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => onPress(item)}
        className={`mb-3 flex-row items-center rounded-3xl border px-4 py-4 ${
          item.featured
            ? 'border-blue-100 bg-blue-50'
            : 'border-slate-100 bg-white'
        }`}
        style={{
          shadowColor: item.featured ? BRAND : '#0f172a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: item.featured ? 0.1 : 0.035,
          shadowRadius: 18,
          elevation: item.featured ? 4 : 1,
        }}
      >
        <View
          className={`h-12 w-12 items-center justify-center rounded-2xl ${
            item.destructive ? 'bg-red-50' : item.featured ? 'bg-blue-600' : 'bg-slate-100'
          }`}
        >
          {item.icon}
        </View>

        <View className="ml-4 flex-1">
          <Text
            className={`text-[16px] font-extrabold ${
              item.destructive
                ? 'text-red-500'
                : item.featured
                  ? 'text-blue-700'
                  : 'text-slate-800'
            }`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text className="mt-1 text-[12px] font-semibold text-slate-500" numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>

        <ChevronRight
          size={22}
          color={item.destructive ? '#ef4444' : item.featured ? BRAND : '#94a3b8'}
        />
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
        id: 'general',
        title: copy.general,
        subtitle: copy.generalHint,
        icon: <User size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-common' },
      },
      {
        id: 'profile',
        title: copy.profile,
        subtitle: copy.profileHint,
        icon: <IdCard size={22} color="#ffffff" />,
        action: { type: 'editProfile' },
        featured: true,
      },
      {
        id: 'privacy',
        title: copy.privacy,
        subtitle: copy.privacyHint,
        icon: <LockKeyhole size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-privacy' },
      },
      {
        id: 'avatar',
        title: copy.avatar,
        subtitle: copy.avatarHint,
        icon: <ImageIcon size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-avatar' },
      },
      {
        id: 'password',
        title: copy.password,
        subtitle: copy.passwordHint,
        icon: <KeyRound size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-password' },
      },
      {
        id: 'two-factor',
        title: copy.twoFactor,
        subtitle: copy.twoFactorHint,
        icon: <ShieldCheck size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-two-factor' },
      },
      {
        id: 'notifications',
        title: copy.notifications,
        subtitle: copy.notificationsHint,
        icon: <Bell size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-notifications' },
      },
      {
        id: 'email',
        title: copy.email,
        subtitle: copy.emailHint,
        icon: <Mail size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-notifications' },
      },
      {
        id: 'social-links',
        title: copy.socialLinks,
        subtitle: copy.socialLinksHint,
        icon: <Link size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-social-links' },
      },
      {
        id: 'verification',
        title: copy.verification,
        subtitle: copy.verificationHint,
        icon: <BadgeCheck size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-verification' },
      },
      {
        id: 'my-points',
        title: copy.myPoints,
        subtitle: copy.myPointsHint,
        icon: <Star size={22} color={BRAND} />,
        action: { type: 'route', route: 'myPoints' },
      },
      {
        id: 'sessions',
        title: copy.sessions,
        subtitle: copy.sessionsHint,
        icon: <Monitor size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-sessions' },
      },
      {
        id: 'blocked-users',
        title: copy.blockedUsers,
        subtitle: copy.blockedUsersHint,
        icon: <Ban size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-blocked-users' },
      },
      {
        id: 'my-data',
        title: copy.myData,
        subtitle: copy.myDataHint,
        icon: <Info size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-privacy' },
      },
      {
        id: 'addresses',
        title: copy.addresses,
        subtitle: copy.addressesHint,
        icon: <MapPin size={22} color={BRAND} />,
        action: { type: 'panel', panel: 'general-address' },
      },
      {
        id: 'monetization',
        title: copy.monetization,
        subtitle: copy.monetizationHint,
        icon: <CircleDollarSign size={22} color={BRAND} />,
        action: { type: 'route', route: 'earnings' },
      },
      {
        id: 'referral-rewards',
        title: copy.referralRewards,
        subtitle: copy.referralRewardsHint,
        icon: <Gift size={22} color={BRAND} />,
        action: { type: 'route', route: 'affiliates' },
      },
      {
        id: 'delete-account',
        title: copy.deleteAccount,
        subtitle: copy.deleteHint,
        icon: <Trash2 size={22} color="#ef4444" />,
        action: { type: 'alert', alert: 'deleteAccount' },
        destructive: true,
      },
    ],
    [copy],
  );

  const openSettingsPanel = (panel: SettingsPanelRouteParam) => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.SETTINGS,
      params: { initialPanel: panel, fromDashboard: true },
    });
  };

  const handlePress = (item: DashboardItem) => {
    if (item.action.type === 'panel') {
      openSettingsPanel(item.action.panel);
      return;
    }

    if (item.action.type === 'editProfile') {
      navigation.navigate(ROUTES.EDIT_PROFILE);
      return;
    }

    if (item.action.type === 'route') {
      if (item.action.route === 'myPoints') {
        navigation.navigate(ROUTES.MY_POINTS);
        return;
      }
      if (item.action.route === 'earnings') {
        navigation.navigate(ROUTES.EARNINGS);
        return;
      }
      navigation.navigate(ROUTES.AFFILIATES);
      return;
    }

    Alert.alert(copy.deleteTitle, copy.deleteMessage, [{ text: copy.ok }]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View className="flex-row items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ChevronRight
            size={24}
            color="#0f172a"
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </TouchableOpacity>
        <Text className="text-[21px] font-extrabold text-slate-950">
          {copy.title}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="mb-5 overflow-hidden rounded-[30px] bg-blue-600 p-5"
          style={{
            shadowColor: BRAND,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 5,
          }}
        >
          <View className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/15" />
          <View className="absolute -bottom-16 left-12 h-36 w-36 rounded-full bg-white/10" />
          <View className="flex-row items-center">
            <Image
              source={{ uri: profile?.avatarUrl || FALLBACK_AVATAR }}
              className="h-16 w-16 rounded-2xl border-2 border-white/70"
            />
            <View className="ml-4 flex-1">
              <Text className="text-[19px] font-extrabold text-white" numberOfLines={1}>
                {profile?.name || 'VNSEEA'}
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-white/75" numberOfLines={1}>
                @{profile?.username || 'user'}
              </Text>
            </View>
            <View className="rounded-full bg-white/15 px-3 py-2">
              <Text className="text-[12px] font-extrabold text-white">
                {copy.apiReady}
              </Text>
            </View>
          </View>
          <Text className="mt-5 text-[14px] font-semibold leading-5 text-white/82">
            {copy.subtitle}
          </Text>
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
