import React, { useCallback, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageCircle, Plus, Search } from 'lucide-react-native';

import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
  RootStackRouteName,
} from '../../../navigation/types';
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { useUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';

type FeedHeaderNav = NativeStackNavigationProp<RootStackParamList>;

type HeaderGlassActionButtonProps = {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  badge?: React.ReactNode;
};

function HeaderGlassActionButton({
  children,
  onPress,
  accessibilityLabel,
  style,
  badge,
}: HeaderGlassActionButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.headerActionTouchable, style]}
    >
      <AdaptiveGlassSurface
        effect="regular"
        interactive={false}
        blurAmount={18}
        fallbackColor="rgba(255, 255, 255, 0.62)"
        style={styles.headerGlassAction}
      >
        {children}
      </AdaptiveGlassSurface>
      {badge}
    </TouchableOpacity>
  );
}

export function FeedHeader() {
  const navigation = useNavigation<FeedHeaderNav>();
  const { messageCount } = useUnreadBadgeCounts();
  const { logoUrl, imageErrorCount, notifyImageError } = useAuthBranding();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [buttonRotation, setButtonRotation] = useState('0deg');

  const handleOpenSheet = useCallback(() => {
    setSheetVisible(true);
    setButtonRotation('45deg');
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setButtonRotation('0deg');
  }, []);

  const handleCreateNavigate = useCallback(
    (route: RootStackRouteName) => {
      if (route === ROUTES.CREATE_EVENT) navigation.navigate(ROUTES.CREATE_EVENT);
      if (route === ROUTES.CREATE_PRODUCT) navigation.navigate(ROUTES.CREATE_PRODUCT);
      if (route === ROUTES.CREATE_PAGE) navigation.navigate(ROUTES.CREATE_PAGE);
      if (route === ROUTES.CREATE_GROUP) navigation.navigate(ROUTES.CREATE_GROUP);
      if (route === ROUTES.CREATE_REEL) navigation.navigate(ROUTES.CREATE_REEL);
      if (route === ROUTES.CREATE_POST) navigation.navigate(ROUTES.CREATE_POST);
      if (route === ROUTES.CREATE_STORY) navigation.navigate(ROUTES.CREATE_STORY);
      if (route === ROUTES.CREATE_POLL) navigation.navigate(ROUTES.CREATE_POLL);
      if (route === ROUTES.CREATE_ALBUM) navigation.navigate(ROUTES.CREATE_ALBUM);
      if (route === ROUTES.CREATE_AD) navigation.navigate(ROUTES.CREATE_AD);
    },
    [navigation],
  );

  return (
    <>
      <View style={styles.headerRoot}>
        <AdaptiveGlassSurface
          effect="regular"
          interactive={false}
          blurAmount={24}
          fallbackColor="rgba(255, 255, 255, 0.72)"
          style={styles.headerGlassDock}
        >
          <View style={styles.brandRow}>
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
              <Text style={styles.brandText}>VNSEEA</Text>
            )}
          </View>

          <View style={styles.actions}>
            <HeaderGlassActionButton
              accessibilityLabel="Search"
              onPress={() => navigation.navigate(ROUTES.SEARCH)}
            >
              <Search size={19} color="#002fff" strokeWidth={2.55} />
            </HeaderGlassActionButton>
            <HeaderGlassActionButton
              accessibilityLabel="Create"
              onPress={handleOpenSheet}
              style={{ transform: [{ rotate: buttonRotation }] }}
            >
              <Plus size={21} color="#002fff" strokeWidth={2.65} />
            </HeaderGlassActionButton>
            <HeaderGlassActionButton
              accessibilityLabel="Messages"
              onPress={() => navigation.navigate(ROUTES.MESSAGES)}
              badge={
                messageCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {messageCount > 99 ? '99+' : messageCount}
                    </Text>
                  </View>
                ) : null
              }
            >
              <MessageCircle size={19} color="#002fff" strokeWidth={2.55} />
            </HeaderGlassActionButton>
          </View>
        </AdaptiveGlassSurface>
      </View>
      <CreateActionSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        onNavigate={handleCreateNavigate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerRoot: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 7,
  },
  headerGlassDock: {
    minHeight: 58,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.84)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: '#002fff',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 38,
    minWidth: 126,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#002fff',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  logoImage: {
    width: 105,
    height: 26,
  },
  brandText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#002fff',
    letterSpacing: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionTouchable: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerGlassAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#002fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default FeedHeader;
