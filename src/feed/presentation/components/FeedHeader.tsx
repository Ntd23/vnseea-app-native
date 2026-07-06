// Description: Renders the feed app bar with navigation actions and profile access.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  Bell,
  CircleUser,
  MessageCircle,
  Plus,
  Search,
} from 'lucide-react-native';

import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
  RootStackRouteName,
} from '../../../navigation/types';
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { feedLogoEvents } from '../../application/events/feedLogoEvents';
import { useUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { useNotificationBadgeViewModel } from '../../../notifications';
import { HeaderProfileDrawer } from './HeaderProfileDrawer';

type FeedHeaderNav = NativeStackNavigationProp<RootStackParamList>;
const HEADER_BAR_HEIGHT = 68;

export const FeedHeader = React.memo(function FeedHeader() {
  const navigation = useNavigation<FeedHeaderNav>();
  const insets = useSafeAreaInsets();
  const rawTopInset = insets.top > 0
    ? insets.top
    : (initialWindowMetrics?.insets?.top || (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47));
  const topInset = Platform.OS === 'android' ? 0 : rawTopInset;
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
              <Search size={19} color="#0758ff" strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate(ROUTES.MAIN_TABS, {
                  screen: ROUTES.NOTIFICATIONS,
                })
              }
              style={[styles.headerIcon, styles.messageButton]}
            >
              <Bell size={19} color="#0758ff" strokeWidth={2.35} />
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
              onPress={() => navigation.navigate(ROUTES.MESSAGES)}
              style={[styles.headerIcon, styles.messageButton]}
            >
              <MessageCircle size={19} color="#0758ff" strokeWidth={2.35} />
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
                  <CircleUser size={19} color="#0758ff" strokeWidth={2.2} />
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
    borderBottomWidth: 1,
    borderBottomColor: '#e8ebf3',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: '#1200ff',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 6,
    height: 37,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0000ff',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: 108,
    height: '100%',
  },
  textLogoPill: {
    minWidth: 120,
    height: 37,
    borderRadius: 11,
    backgroundColor: '#1200ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0000ff',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  brandText: {
    fontSize: 22,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eef1f7',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  messageButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff3b4f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
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
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});

export default FeedHeader;
