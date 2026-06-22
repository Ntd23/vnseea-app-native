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
import { Menu, MessageCircle, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
} from '../../../navigation/types';
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { useUnreadBadgeCounts } from '../../../shared-kernel/application/stores/unreadBadgeStore';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';
import { HeaderProfileDrawer } from './HeaderProfileDrawer';

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
  const [menuVisible, setMenuVisible] = useState(false);

  const handleOpenFutureDrawer = useCallback(() => {
    setMenuVisible(true);
  }, []);

  return (
    <>
      <View style={styles.headerRoot} pointerEvents="box-none">
        <AdaptiveGlassSurface
          effect="regular"
          interactive={false}
          blurAmount={26}
          fallbackColor="rgba(255, 255, 255, 0.72)"
          style={styles.headerGlassDock}
        >
          <View style={styles.brandRow}>
            <HeaderGlassActionButton
              accessibilityLabel="Profile Menu"
              onPress={handleOpenFutureDrawer}
            >
              <Menu size={19} color="#002fff" strokeWidth={2.55} />
            </HeaderGlassActionButton>
            <TouchableOpacity
              activeOpacity={0.82}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: 10,
              }}
            >
              {logoUrl && imageErrorCount === 0 ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.logoImage}
                  resizeMode="contain"
                  onError={notifyImageError}
                />
              ) : (
                <Text style={styles.brandText}>VNSEEA</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <HeaderGlassActionButton
              accessibilityLabel="Search"
              onPress={() => navigation.navigate(ROUTES.SEARCH)}
            >
              <Search size={19} color="#002fff" strokeWidth={2.55} />
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
      <HeaderProfileDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerRoot: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 7,
  },
  headerGlassDock: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.84)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: '#002fff',
    borderRadius: 15,
    paddingHorizontal: 10,
    height: 32,
    minWidth: 110,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#002fff',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  logoImage: {
    width: 90,
    height: 22,
  },
  brandText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#002fff',
    letterSpacing: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionTouchable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerGlassAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#002fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default FeedHeader;
