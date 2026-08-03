// Description: Facebook-style profile action/settings menu for own and other profiles.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Archive,
  ArrowLeft,
  Copy,
  Edit3,
  Flag,
  HeartHandshake,
  Lock,
  Megaphone,
  MessageCircle,
  Phone,
  Search,
  Share2,
  UserPlus,
  UserRoundX,
  Users,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToSettingsPanel } from '../../../navigation/settingsNavigation';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { resolveProfileOwnership } from '../../application/utils/profileOwnership';

type ProfileMoreNavigation = NativeStackNavigationProp<RootStackParamList>;
type ProfileMoreRoute = RouteProp<RootStackParamList, typeof ROUTES.PROFILE_MORE>;
type ProfileMoreIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type ProfileMoreAction = {
  id: string;
  label: string;
  Icon: ProfileMoreIcon;
  onPress: () => void;
  danger?: boolean;
};

const COPY = {
  vi: {
    ownTitle: 'Cài đặt trang cá nhân',
    otherTitleFallback: 'Trang cá nhân',
    edit: 'Chỉnh sửa',
    advertising: 'Quảng cáo',
    archive: 'Kho lưu trữ',
    privacy: 'Trung tâm quyền riêng tư',
    search: 'Tìm kiếm',
    shareProfile: 'Chia sẻ trang cá nhân',
    inviteFriends: 'Mời mọi người kết nối',
    call: 'Gọi thoại',
    message: 'Nhắn tin',
    relationship: 'Xem quan hệ bạn bè',
    report: 'Báo cáo trang cá nhân',
    poke: (name: string) => `Chọc ${name}`,
    block: 'Chặn',
    unblock: 'Bỏ chặn',
    linkTitleOwn: 'Liên kết đến trang cá nhân của bạn',
    linkTitleOther: (name: string) => `Liên kết đến trang cá nhân của ${name}`,
    linkSubtitleOwn: 'Liên kết riêng của bạn trên VNSEEA.',
    linkSubtitleOther: (name: string) => `Liên kết riêng của ${name} trên VNSEEA.`,
    copyLink: 'Sao chép liên kết',
    copiedTitle: 'Đã sao chép',
    copiedMessage: 'Liên kết trang cá nhân đã được sao chép.',
    reportTitle: 'Báo cáo trang cá nhân',
    reportConfirm: 'Bạn muốn gửi báo cáo trang cá nhân này?',
    reportSuccess: 'Báo cáo đã được gửi.',
    pokeTitle: 'Chọc',
    pokeSuccess: (name: string) => `Bạn đã chọc ${name}.`,
    blockTitle: 'Chặn người dùng',
    blockConfirm: (name: string) => `Bạn có chắc muốn chặn ${name}?`,
    blockSuccess: 'Đã cập nhật trạng thái chặn.',
    cancel: 'Hủy',
    ok: 'OK',
    errorTitle: 'Lỗi',
    genericError: 'Không thể thực hiện thao tác này. Vui lòng thử lại.',
  },
  en: {
    ownTitle: 'Profile settings',
    otherTitleFallback: 'Profile',
    edit: 'Edit',
    advertising: 'Advertising',
    archive: 'Archive',
    privacy: 'Privacy center',
    search: 'Search',
    shareProfile: 'Share profile',
    inviteFriends: 'Invite people to connect',
    call: 'Call',
    message: 'Message',
    relationship: 'See friendship',
    report: 'Report profile',
    poke: (name: string) => `Poke ${name}`,
    block: 'Block',
    unblock: 'Unblock',
    linkTitleOwn: 'Link to your profile',
    linkTitleOther: (name: string) => `Link to ${name}'s profile`,
    linkSubtitleOwn: 'Your private VNSEEA profile link.',
    linkSubtitleOther: (name: string) => `${name}'s private VNSEEA profile link.`,
    copyLink: 'Copy link',
    copiedTitle: 'Copied',
    copiedMessage: 'Profile link copied.',
    reportTitle: 'Report profile',
    reportConfirm: 'Do you want to report this profile?',
    reportSuccess: 'Report sent.',
    pokeTitle: 'Poke',
    pokeSuccess: (name: string) => `You poked ${name}.`,
    blockTitle: 'Block user',
    blockConfirm: (name: string) => `Are you sure you want to block ${name}?`,
    blockSuccess: 'Block status updated.',
    cancel: 'Cancel',
    ok: 'OK',
    errorTitle: 'Error',
    genericError: 'Could not complete this action. Please try again.',
  },
} as const;

const BACK_GESTURE_EDGE_WIDTH = 28;
const BACK_GESTURE_START_X = Platform.OS === 'android' ? 18 : 0;
const BACK_GESTURE_WIDTH = Platform.OS === 'android' ? 82 : BACK_GESTURE_EDGE_WIDTH;
const BACK_GESTURE_ACTIVE_OFFSET_X = Platform.OS === 'android' ? 6 : 12;
const BACK_GESTURE_FAIL_OFFSET_Y = Platform.OS === 'android' ? 24 : 16;
const BACK_GESTURE_DISTANCE_RATIO = 0.28;
const BACK_GESTURE_VELOCITY = 650;
const SCREEN_OPEN_DURATION_MS = 220;
const SCREEN_CLOSE_DURATION_MS = 180;
const SCREEN_SPRING_CONFIG = {
  damping: 19,
  stiffness: 230,
};

function hasValue(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

function apiSucceeded(value: unknown) {
  return value === 200 || value === '200' || value === true || value === 'success';
}

function buildProfileUrl(userId?: string, username?: string) {
  const root = apiConfig.webBaseUrl.replace(/\/+$/, '');
  const cleanUsername = username?.trim().replace(/^@/, '');
  if (cleanUsername) return `${root}/${cleanUsername}`;
  if (userId) return `${root}/profile.php?id=${encodeURIComponent(userId)}`;
  return root;
}

function getDisplayName(params: ProfileMoreRoute['params'], fallback: string) {
  return (
    params.displayName?.trim() ||
    params.username?.trim().replace(/^@/, '') ||
    fallback
  );
}

export default function ProfileMoreScreen() {
  const language = useAppLanguage();
  const copy = COPY[language];
  const navigation = useNavigation<ProfileMoreNavigation>();
  const route = useRoute<ProfileMoreRoute>();
  const { width: screenWidth } = useWindowDimensions();
  const params = route.params;
  const isOwnProfile = resolveProfileOwnership({
    currentUserId: sessionStorage.getSession()?.userId,
    routeUserId: params.userId,
  });
  const displayName = getDisplayName(params, copy.otherTitleFallback);
  const profileUrl = useMemo(
    () => buildProfileUrl(params.userId, params.username),
    [params.userId, params.username],
  );
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const screenTranslateX = useSharedValue(screenWidth);
  const previousScreenDim = useSharedValue(0);
  const isClosing = useSharedValue(false);
  const pendingCloseActionRef = useRef<(() => void) | null>(null);

  const completeClose = useCallback(() => {
    const pendingAction = pendingCloseActionRef.current;
    pendingCloseActionRef.current = null;
    navigation.goBack();
    if (pendingAction) {
      requestAnimationFrame(() => requestAnimationFrame(pendingAction));
    }
  }, [navigation]);

  const closeScreen = useCallback(() => {
    if (isClosing.value) return;
    isClosing.value = true;
    previousScreenDim.value = withTiming(0, {
      duration: SCREEN_CLOSE_DURATION_MS,
    });
    screenTranslateX.value = withTiming(
      screenWidth,
      { duration: SCREEN_CLOSE_DURATION_MS },
      finished => {
        if (finished) {
          runOnJS(completeClose)();
        }
      },
    );
  }, [
    completeClose,
    isClosing,
    previousScreenDim,
    screenTranslateX,
    screenWidth,
  ]);

  const closeScreenThen = useCallback((action: () => void) => {
    if (isClosing.value) return;
    pendingCloseActionRef.current = action;
    closeScreen();
  }, [closeScreen, isClosing]);

  useEffect(() => {
    isClosing.value = false;
    screenTranslateX.value = screenWidth;
    previousScreenDim.value = 0;
    previousScreenDim.value = withTiming(0.12, {
      duration: SCREEN_OPEN_DURATION_MS,
    });
    screenTranslateX.value = withTiming(0, {
      duration: SCREEN_OPEN_DURATION_MS,
    });
  }, [isClosing, previousScreenDim, screenTranslateX, screenWidth]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeScreen();
      return true;
    });

    return () => subscription.remove();
  }, [closeScreen]);

  const openChat = useCallback(() => {
    if (!params.userId) return;
    const chat = {
      id: `user:${params.userId}`,
      chatType: 'user' as const,
      userId: String(params.userId),
      username: params.username ?? '',
      name: displayName,
      avatar: params.avatarUrl ?? '',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };
    closeScreenThen(() => {
      navigation.navigate(ROUTES.CHAT, { chat });
    });
  }, [
    closeScreenThen,
    displayName,
    navigation,
    params.avatarUrl,
    params.userId,
    params.username,
  ]);

  const openRelationship = useCallback(() => {
    if (!params.userId) return;
    navigation.navigate(ROUTES.PROFILE_FRIENDS, {
      userId: String(params.userId),
      title: language === 'vi' ? `Bạn bè của ${displayName}` : `${displayName}'s friends`,
      displayName,
      avatarUrl: params.avatarUrl,
      initialTab: 'friends',
    });
  }, [displayName, language, navigation, params.userId]);

  const shareProfile = useCallback(async () => {
    try {
      await Share.share({
        message: profileUrl,
        url: profileUrl,
        title: displayName,
      });
    } catch {
      Alert.alert(copy.errorTitle, copy.genericError);
    }
  }, [copy.errorTitle, copy.genericError, displayName, profileUrl]);

  const copyProfileLink = useCallback(async () => {
    try {
      const { Clipboard } = require('react-native');
      await Clipboard.setString(profileUrl);
      Alert.alert(copy.copiedTitle, copy.copiedMessage);
    } catch {
      Alert.alert(copy.errorTitle, copy.genericError);
    }
  }, [copy.copiedMessage, copy.copiedTitle, copy.errorTitle, copy.genericError, profileUrl]);

  const reportProfile = useCallback(() => {
    if (!params.userId) return;
    Alert.alert(copy.reportTitle, copy.reportConfirm, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.report,
        style: 'destructive',
        onPress: async () => {
          setLoadingActionId('report');
          try {
            const response = await apiBridge.post<{
              code?: string | number;
              api_status?: string | number;
              already_reported?: string | number;
            }>(apiRoutes.messages.reportUser, {
              user: params.userId,
              text: 'Reported from profile menu',
              ensure_reported: 1,
            });
            if (Number(response.code) !== 1 && !apiSucceeded(response.api_status)) {
              throw new Error(copy.genericError);
            }
            Alert.alert(copy.reportTitle, copy.reportSuccess);
          } catch (error) {
            Alert.alert(
              copy.errorTitle,
              error instanceof Error ? error.message : copy.genericError,
            );
          } finally {
            setLoadingActionId(null);
          }
        },
      },
    ]);
  }, [
    copy.cancel,
    copy.errorTitle,
    copy.genericError,
    copy.report,
    copy.reportConfirm,
    copy.reportSuccess,
    copy.reportTitle,
    params.userId,
  ]);

  const blockProfile = useCallback(() => {
    if (!params.userId) return;
    const shouldUnblock = Boolean(params.blocked);
    Alert.alert(copy.blockTitle, copy.blockConfirm(displayName), [
      { text: copy.cancel, style: 'cancel' },
      {
        text: shouldUnblock ? copy.unblock : copy.block,
        style: 'destructive',
        onPress: async () => {
          setLoadingActionId('block');
          try {
            const response = await apiBridge.post<{
              api_status?: string | number;
              block_status?: string;
              message?: string;
            }>(apiRoutes.social.block, {
              user_id: params.userId,
              block_action: shouldUnblock ? 'un-block' : 'block',
            });
            const expectedStatus = shouldUnblock ? 'un-blocked' : 'blocked';
            if (
              response.block_status !== expectedStatus &&
              !apiSucceeded(response.api_status)
            ) {
              throw new Error(response.message || copy.genericError);
            }
            Alert.alert(copy.blockTitle, copy.blockSuccess);
          } catch (error) {
            Alert.alert(
              copy.errorTitle,
              error instanceof Error ? error.message : copy.genericError,
            );
          } finally {
            setLoadingActionId(null);
          }
        },
      },
    ]);
  }, [
    copy,
    displayName,
    params.blocked,
    params.userId,
  ]);

  const pokeProfile = useCallback(async () => {
    if (!params.userId || loadingActionId === 'poke') return;
    setLoadingActionId('poke');
    try {
      const response = await apiBridge.post<{
        api_status?: string | number;
        message_data?: string;
        errors?: {
          error_text?: string;
        };
      }>(apiRoutes.social.poke, {
        type: 'create',
        user_id: params.userId,
      });

      if (!apiSucceeded(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message_data ||
            copy.genericError,
        );
      }

      Alert.alert(copy.pokeTitle, copy.pokeSuccess(displayName));
    } catch (error) {
      Alert.alert(
        copy.errorTitle,
        error instanceof Error ? error.message : copy.genericError,
      );
    } finally {
      setLoadingActionId(null);
    }
  }, [
    copy,
    displayName,
    loadingActionId,
    params.userId,
  ]);

  const ownActions = useMemo<ProfileMoreAction[]>(() => {
    if (!isOwnProfile) return [];
    return [
      {
        id: 'edit',
        label: copy.edit,
        Icon: Edit3,
        onPress: () => navigation.navigate(ROUTES.EDIT_PROFILE),
      },
      {
        id: 'ads',
        label: copy.advertising,
        Icon: Megaphone,
        onPress: () => navigation.navigate(ROUTES.ADVERTISING),
      },
      {
        id: 'archive',
        label: copy.archive,
        Icon: Archive,
        onPress: () =>
          navigation.navigate(ROUTES.ACTIVITY_CENTER, {
            initialTab: 'saved',
          }),
      },
      ...(params.privacy
        ? [
            {
              id: 'privacy',
              label: copy.privacy,
              Icon: Lock,
              onPress: () =>
                navigateToSettingsPanel(navigation, 'general-privacy', {
                  fromDashboard: false,
                  fromProfile: true,
                }),
            } satisfies ProfileMoreAction,
          ]
        : []),
      {
        id: 'search',
        label: copy.search,
        Icon: Search,
        onPress: () =>
          navigation.navigate(ROUTES.SEARCH, {
            q: params.username || displayName,
          }),
      },
      {
        id: 'share',
        label: copy.shareProfile,
        Icon: Share2,
        onPress: shareProfile,
      },
      {
        id: 'invite',
        label: copy.inviteFriends,
        Icon: UserPlus,
        onPress: () => navigation.navigate(ROUTES.INVITE_FRIENDS),
      },
    ];
  }, [
    copy.advertising,
    copy.archive,
    copy.edit,
    copy.inviteFriends,
    copy.privacy,
    copy.search,
    copy.shareProfile,
    displayName,
    navigation,
    isOwnProfile,
    params.privacy,
    params.username,
    shareProfile,
  ]);

  const otherActions = useMemo<ProfileMoreAction[]>(() => {
    if (isOwnProfile) return [];
    const relationshipAvailable =
      Boolean(params.userId) &&
      ((params.followersCount ?? 0) > 0 ||
        (params.followingCount ?? 0) > 0 ||
        Boolean(params.followedByCurrentUser) ||
        Boolean(params.followsCurrentUser));

    return [
      ...(hasValue(params.phoneNumber)
        ? [
            {
              id: 'call',
              label: copy.call,
              Icon: Phone,
              onPress: () => {
                Linking.openURL(`tel:${params.phoneNumber}`).catch(() => {
                  Alert.alert(copy.errorTitle, copy.genericError);
                });
              },
            } satisfies ProfileMoreAction,
          ]
        : []),
      ...(params.userId
        ? [
            {
              id: 'message',
              label: copy.message,
              Icon: MessageCircle,
              onPress: openChat,
            } satisfies ProfileMoreAction,
          ]
        : []),
      ...(relationshipAvailable
        ? [
            {
              id: 'relationship',
              label: copy.relationship,
              Icon: Users,
              onPress: openRelationship,
            } satisfies ProfileMoreAction,
          ]
        : []),
      ...(params.userId
        ? [
            {
              id: 'report',
              label: copy.report,
              Icon: Flag,
              onPress: reportProfile,
              danger: true,
            },
            {
              id: 'poke',
              label: copy.poke(displayName),
              Icon: HeartHandshake,
              onPress: pokeProfile,
            },
            {
              id: 'block',
              label: params.blocked ? copy.unblock : copy.block,
              Icon: UserRoundX,
              onPress: blockProfile,
              danger: true,
            },
          ]
        : []),
      {
        id: 'search',
        label: copy.search,
        Icon: Search,
        onPress: () =>
          navigation.navigate(ROUTES.SEARCH, {
            q: params.username || displayName,
          }),
      },
      {
        id: 'share',
        label: copy.shareProfile,
        Icon: Share2,
        onPress: shareProfile,
      },
    ];
  }, [
    blockProfile,
    copy,
    displayName,
    isOwnProfile,
    navigation,
    openChat,
    openRelationship,
    params,
    pokeProfile,
    reportProfile,
    shareProfile,
  ]);

  const actions = isOwnProfile ? ownActions : otherActions;

  const swipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ left: BACK_GESTURE_START_X, width: BACK_GESTURE_WIDTH })
        .activeOffsetX([BACK_GESTURE_ACTIVE_OFFSET_X, 999])
        .failOffsetY([-BACK_GESTURE_FAIL_OFFSET_Y, BACK_GESTURE_FAIL_OFFSET_Y])
        .onUpdate(event => {
          'worklet';
          if (isClosing.value) return;
          const nextX = Math.min(
            screenWidth,
            Math.max(0, event.translationX),
          );
          screenTranslateX.value = nextX;
          previousScreenDim.value = interpolate(
            nextX,
            [0, screenWidth],
            [0.12, 0],
            'clamp',
          );
        })
        .onEnd(event => {
          'worklet';
          if (isClosing.value) return;
          const shouldClose =
            event.translationX > screenWidth * BACK_GESTURE_DISTANCE_RATIO ||
            event.velocityX > BACK_GESTURE_VELOCITY;

          if (shouldClose) {
            isClosing.value = true;
            previousScreenDim.value = withTiming(0, {
              duration: SCREEN_CLOSE_DURATION_MS,
            });
            screenTranslateX.value = withTiming(
              screenWidth,
              { duration: SCREEN_CLOSE_DURATION_MS },
              finished => {
                if (finished) {
                  runOnJS(completeClose)();
                }
              },
            );
            return;
          }

          previousScreenDim.value = withSpring(0.12, SCREEN_SPRING_CONFIG);
          screenTranslateX.value = withSpring(0, SCREEN_SPRING_CONFIG);
        }),
    [
      completeClose,
      isClosing,
      previousScreenDim,
      screenTranslateX,
      screenWidth,
    ],
  );

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenTranslateX.value }],
  }));

  const previousScreenDimStyle = useAnimatedStyle(() => ({
    opacity: previousScreenDim.value,
  }));

  const swipeBackCueStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      screenTranslateX.value,
      [0, screenWidth * 0.12, screenWidth * BACK_GESTURE_DISTANCE_RATIO],
      [0, 0.78, 1],
      'clamp',
    ),
    transform: [
      {
        translateX: interpolate(
          screenTranslateX.value,
          [0, screenWidth * BACK_GESTURE_DISTANCE_RATIO],
          [-16, 8],
          'clamp',
        ),
      },
      {
        scale: interpolate(
          screenTranslateX.value,
          [0, screenWidth * BACK_GESTURE_DISTANCE_RATIO],
          [0.92, 1],
          'clamp',
        ),
      },
    ],
  }));

  const renderAction = (action: ProfileMoreAction, index: number) => {
    const Icon = action.Icon;
    const isLoading = loadingActionId === action.id;
    return (
      <TouchableOpacity
        key={action.id}
        activeOpacity={0.72}
        onPress={action.onPress}
        disabled={isLoading}
        style={[
          styles.actionRow,
          index === actions.length - 1 && styles.actionRowLast,
        ]}
      >
        <Icon
          size={24}
          color={action.danger ? APP_COLORS.status.destructive : '#050505'}
          strokeWidth={2.2}
        />
        <Text
          style={[
            styles.actionLabel,
            action.danger && styles.actionLabelDanger,
          ]}
        >
          {action.label}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={APP_BRAND_COLOR} style={styles.rowSpinner} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.previousScreenDim,
          previousScreenDimStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.swipeBackCue, swipeBackCueStyle]}
      >
        <ArrowLeft size={18} color={APP_BRAND_COLOR} strokeWidth={2.6} />
        <Text style={styles.swipeBackCueText}>
          {language === 'vi' ? 'Vuốt đúng rồi' : 'Keep swiping'}
        </Text>
      </Animated.View>
      <GestureDetector gesture={swipeBackGesture}>
        <Animated.View style={[styles.screen, screenAnimatedStyle]}>
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={closeScreen}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#050505" strokeWidth={2.3} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isOwnProfile ? copy.ownTitle : displayName}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>{actions.map(renderAction)}</View>

            <View style={styles.separator} />

            <View style={styles.linkSection}>
              <Text style={styles.linkTitle}>
                {isOwnProfile
                  ? copy.linkTitleOwn
                  : copy.linkTitleOther(displayName)}
              </Text>
              <Text style={styles.linkSubtitle}>
                {isOwnProfile
                  ? copy.linkSubtitleOwn
                  : copy.linkSubtitleOther(displayName)}
              </Text>
              <View style={styles.linkDivider} />
              <Text style={styles.linkText}>{profileUrl}</Text>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={copyProfileLink}
                style={styles.copyButton}
              >
                <Copy size={16} color="#050505" />
                <Text style={styles.copyButtonText}>{copy.copyLink}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  previousScreenDim: {
    backgroundColor: '#000000',
  },
  swipeBackCue: {
    position: 'absolute',
    left: Platform.OS === 'android' ? 30 : 14,
    top: '50%',
    marginTop: -22,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },
  swipeBackCueText: {
    marginLeft: 7,
    color: APP_BRAND_COLOR,
    fontSize: 12,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 16,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 56,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
  },
  headerSpacer: {
    width: 56,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 28,
  },
  section: {
    backgroundColor: '#FFFFFF',
  },
  actionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DADDE1',
    paddingHorizontal: 20,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionLabel: {
    marginLeft: 16,
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#050505',
  },
  actionLabelDanger: {
    color: APP_COLORS.status.destructive,
  },
  rowSpinner: {
    marginLeft: 8,
  },
  separator: {
    height: 8,
    backgroundColor: '#D1D5DB',
  },
  linkSection: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  linkTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#050505',
  },
  linkSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#737373',
  },
  linkDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DADDE1',
    marginTop: 16,
    marginBottom: 14,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#050505',
  },
  copyButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#E4E6EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#050505',
  },
});
