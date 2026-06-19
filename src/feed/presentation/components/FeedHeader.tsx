import React, { useCallback, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';

type FeedHeaderNav = NativeStackNavigationProp<RootStackParamList>;

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
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
            style={styles.headerIcon}
          >
            <Search size={20} color="#002fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleOpenSheet}
            style={[styles.headerIcon, { transform: [{ rotate: buttonRotation }] }]}
          >
            <Plus size={22} color="#002fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate(ROUTES.MESSAGES)}
            style={[styles.headerIcon, styles.messageButton]}
          >
            <MessageCircle size={20} color="#002fff" strokeWidth={2.5} />
            {messageCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {messageCount > 99 ? '99+' : messageCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
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
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPill: {
    backgroundColor: '#002fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 105,
    height: '100%',
  },
  brandText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#002fff',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#002fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default FeedHeader;
