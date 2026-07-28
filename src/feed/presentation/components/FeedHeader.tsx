// Description: Renders the feed app bar with navigation actions and profile access.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  InteractionManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  Bell,
  CircleUser,
  MessageCircle,
  Search,
} from 'lucide-react-native';

import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
} from '../../../navigation/types';
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { feedLogoEvents } from '../../application/events/feedLogoEvents';
import { useUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useNotificationBadgeViewModel } from '../../../notifications';
import { navigateToNotifications } from '../../../navigation/notificationNavigation';
import { HeaderProfileDrawer } from './HeaderProfileDrawer';
import { resolveFeedChromeTopInset } from './feedHeaderInsets';
import { preloadMessagesStartupChats } from '../../../messages/application/services/messagesStartupCache';

type FeedHeaderNav = NativeStackNavigationProp<RootStackParamList>;
type FeedHeaderProps = {
  includeTopSafeArea?: boolean;
};
const HEADER_BAR_HEIGHT = 68;

export const FeedHeader = React.memo(function FeedHeader({
  includeTopSafeArea = false,
}: FeedHeaderProps) {
  const navigation = useNavigation<FeedHeaderNav>();
  const insets = useSafeAreaInsets();
  const topInset = includeTopSafeArea
    ? resolveFeedChromeTopInset(
        insets.top,
        initialWindowMetrics?.insets?.top,
      )
    : 0;
  const { messageCount, notificationCount } = useUnreadBadgeCounts();
  const { logoUrl, imageErrorCount, notifyImageError } = useAuthBranding();
  const { user } = useCurrentUserViewModel();
  useNotificationBadgeViewModel();
  const [menuVisible, setMenuVisible] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);

  const avatarUrl = user?.avatar;
  const transitionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (avatarUrl) {
      const timer = setTimeout(() => {
        Animated.timing(transitionAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [avatarUrl, transitionAnim]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let started = false;
      const startPreload = () => {
        if (cancelled || started) return;
        started = true;
        preloadMessagesStartupChats().catch(() => undefined);
        navigation.getParent()?.preload(ROUTES.MESSAGES);
      };
      const task = InteractionManager.runAfterInteractions(startPreload);
      const fallbackTimer = setTimeout(startPreload, 700);

      return () => {
        cancelled = true;
        clearTimeout(fallbackTimer);
        task.cancel();
      };
    }, [navigation]),
  );

  const handlePressLogo = useCallback(() => {
    // Always navigate to the Feed tab first. If we're already on the
    // Feed tab, the navigation is a no-op for routing but the listener
    // on FeedScreen still picks up the event and scrolls the list back
    // to the top + reloads. We rely on the event bus rather than
    // poking at navigation state, which differs between stack / tab /
    // drawer nesting and is unreliable in the header (a child of the
    // tab screen, not the tab navigator itself).
    feedLogoEvents.emitScrollToTop();
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.FEED,
    });
  }, [navigation]);

  const handleOpenMenu = useCallback(() => {
    setHasOpenedMenu(true);
    setMenuVisible(true);
  }, []);

  const handleOpenMessages = useCallback(() => {
    preloadMessagesStartupChats().catch(() => undefined);
    navigation.navigate(ROUTES.MESSAGES);
  }, [navigation]);

  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  return (
    <>
      <View
        style={[
          styles.headerRoot,
          { height: topInset + HEADER_BAR_HEIGHT, paddingTop: topInset },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handlePressLogo}
            accessibilityRole="button"
            accessibilityLabel="home"
            style={styles.brandRow}
          >
            {logoUrl && imageErrorCount === 0 ? (
              <View style={styles.logoPill}>
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.logoImage}
                  resizeMode="contain"
                  onError={notifyImageError}
                />
              </View>
            ) : (
              <View style={styles.textLogoPill}>
                <Text style={styles.brandText}>VNSEEA</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate(ROUTES.SEARCH)}
              style={styles.headerIcon}
            >
              <Search
                size={24}
                color={APP_COLORS.brand.onPrimary}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigateToNotifications(navigation)}
              style={[styles.headerIcon, styles.messageButton]}
            >
              <Bell
                size={24}
                color={APP_COLORS.brand.onPrimary}
                strokeWidth={2.35}
              />
              {notificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleOpenMessages}
              style={[styles.headerIcon, styles.messageButton]}
            >
              <MessageCircle
                size={24}
                color={APP_COLORS.brand.onPrimary}
                strokeWidth={2.35}
              />
              {messageCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {messageCount > 99 ? '99+' : messageCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleOpenMenu}
              style={styles.headerIcon}
            >
              <View style={styles.profileIconContainer}>
                <Animated.View
                  style={[
                    styles.profileIconLayer,
                    {
                      opacity: transitionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                      transform: [
                        {
                          scale: transitionAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0.7],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <CircleUser
                    size={24}
                    color={APP_COLORS.brand.onPrimary}
                    strokeWidth={2.2}
                  />
                </Animated.View>
                {avatarUrl ? (
                  <Animated.View
                    style={[
                      styles.profileIconLayer,
                      {
                        opacity: transitionAnim,
                        transform: [
                          {
                            scale: transitionAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.7, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                    />
                  </Animated.View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {hasOpenedMenu ? (
        <HeaderProfileDrawer
          visible={menuVisible}
          onClose={handleCloseMenu}
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  headerRoot: {
    backgroundColor: APP_BRAND_COLOR,
  },
  topBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: 46,
    minWidth: 126,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 122,
    height: '100%',
  },
  textLogoPill: {
    minWidth: 126,
    height: 46,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: APP_COLORS.brand.borderOnPrimary,
  },
  messageButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff3b4f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileIconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileIconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});

export default FeedHeader;
