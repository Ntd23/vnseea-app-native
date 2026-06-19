// Description: Renders a modern, animated right-side profile and settings drawer.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
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
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: DRAWER_W,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, backdropOpacity, translateX]);

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
    (action: { type: string; panel?: SettingsPanelRouteParam; route?: string }) => {
      handleClose();
      if (action.type === 'panel' && action.panel) {
        openSettingsPanel(action.panel);
        return;
      }
      if (action.type === 'editProfile') {
        navigation.navigate(ROUTES.EDIT_PROFILE);
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
              transform: [{ translateX }],
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* User Profile Card */}
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

            {/* Account Settings Section */}
            <Text style={styles.sectionHeader}>{copy.groupAccount}</Text>
            
            <MenuRow
              title={copy.general}
              icon={<User size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-common' })}
            />
            <MenuRow
              title={copy.profile}
              icon={<IdCard size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'editProfile' })}
            />
            <MenuRow
              title={copy.avatar}
              icon={<LucideImage size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-avatar' })}
            />
            <MenuRow
              title={copy.addresses}
              icon={<MapPin size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-address' })}
            />
            <MenuRow
              title={copy.myData}
              icon={<Info size={18} color="#0052ff" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-privacy' })}
            />

            {/* Security Section */}
            <Text style={styles.sectionHeader}>{copy.groupSecurity}</Text>
            
            <MenuRow
              title={copy.privacy}
              icon={<LockKeyhole size={18} color="#10b981" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-privacy' })}
            />
            <MenuRow
              title={copy.password}
              icon={<KeyRound size={18} color="#10b981" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-password' })}
            />
            <MenuRow
              title={copy.twoFactor}
              icon={<ShieldCheck size={18} color="#10b981" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-two-factor' })}
            />
            <MenuRow
              title={copy.verification}
              icon={<BadgeCheck size={18} color="#10b981" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-verification' })}
            />
            <MenuRow
              title={copy.sessions}
              icon={<Monitor size={18} color="#10b981" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-sessions' })}
            />
            <MenuRow
              title={copy.blockedUsers}
              icon={<Ban size={18} color="#ef4444" />}
              onPress={() => handleItemPress({ type: 'panel', panel: 'general-blocked-users' })}
            />

            {/* Finance & Monetization */}
            <Text style={styles.sectionHeader}>{copy.groupFinance}</Text>
            
            <MenuRow
              title={copy.myPoints}
              icon={<Star size={18} color="#eab308" />}
              onPress={() => handleItemPress({ type: 'route', route: 'myPoints' })}
            />
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
            <Text style={styles.sectionHeader}>Cài đặt phụ</Text>
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
      </View>
    </Modal>
  );
}

// Sub-component for individual settings rows
function MenuRow({ title, icon, onPress }: { title: string; icon: React.ReactNode; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.row}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIconBg}>{icon}</View>
          <Text style={styles.rowTitle}>{title}</Text>
        </View>
        <ChevronRight size={16} color="#94a3b8" strokeWidth={2.5} />
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
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
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
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 4,
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
});
