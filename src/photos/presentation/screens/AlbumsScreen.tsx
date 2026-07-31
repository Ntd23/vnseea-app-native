// Description: Renders the current user's albums in a modern two-column gallery.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Globe2, Images, Lock, Plus, Users } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { ContentAudience } from '../../../shared-kernel/domain/types/contentAudience';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { useAlbumsViewModel } from '../../application/view-models/useAlbumsViewModel';
import type { AlbumItem } from '../../domain/types/photos.types';

type AlbumsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;
const HEADER_SAFE_AREA_COLOR =
  Platform.OS === 'android' ? BRAND : APP_COLORS.neutral.surface;

function getPrivacyLabel(privacy: ContentAudience, isVi: boolean): string {
  const labels = isVi
    ? {
        public: 'Công khai',
        friends: 'Bạn bè',
        followers: 'Người theo dõi',
        only_me: 'Chỉ mình tôi',
      }
    : {
        public: 'Public',
        friends: 'Friends',
        followers: 'Followers',
        only_me: 'Only me',
      };

  return labels[privacy];
}

function AlbumCard({
  album,
  isVi,
  onPress,
}: {
  album: AlbumItem;
  isVi: boolean;
  onPress: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const albumName =
    album.albumName.trim() || (isVi ? 'Album không tên' : 'Untitled album');
  const PrivacyIcon =
    album.privacy === 'public'
      ? Globe2
      : album.privacy === 'only_me'
      ? Lock
      : Users;

  useEffect(() => {
    setCoverFailed(false);
  }, [album.coverUrl]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={
        isVi ? `Mở album ${albumName}` : `Open album ${albumName}`
      }
      style={styles.albumCard}
      onPress={onPress}
    >
      <View style={styles.coverContainer}>
        {album.coverUrl && !coverFailed ? (
          <Image
            source={{ uri: album.coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <View style={styles.placeholderIcon}>
              <Images size={27} color={APP_COLORS.neutral.iconMuted} />
            </View>
            <Text style={styles.placeholderText}>
              {isVi ? 'Chưa có ảnh bìa' : 'No cover photo'}
            </Text>
          </View>
        )}

        <View style={styles.photoCountBadge}>
          <Images size={13} color="#FFFFFF" />
          <Text style={styles.photoCountText}>
            {album.photoCount} {isVi ? 'ảnh' : 'photos'}
          </Text>
        </View>
      </View>

      <View style={styles.albumInfo}>
        <Text numberOfLines={2} style={styles.albumName}>
          {albumName}
        </Text>
        <View style={styles.privacyRow}>
          <PrivacyIcon size={14} color={APP_COLORS.neutral.textMuted} />
          <Text numberOfLines={1} style={styles.privacyText}>
            {getPrivacyLabel(album.privacy, isVi)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AlbumGridSkeleton() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map(item => (
        <View key={item} style={[styles.albumCard, styles.skeletonCard]}>
          <View style={[styles.coverContainer, styles.skeletonCover]} />
          <View style={styles.albumInfo}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonMeta} />
          </View>
        </View>
      ))}
    </View>
  );
}

function AlbumsScreen() {
  const navigation = useNavigation<AlbumsNav>();
  const language = useAppLanguage();
  const isVi = language === 'vi';
  const {
    albums,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  } = useAlbumsViewModel();

  useFocusEffect(
    useCallback(() => {
      loadFirstPage().catch(() => undefined);
    }, [loadFirstPage]),
  );

  const handleCreateAlbum = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_ALBUM);
  }, [navigation]);

  const albumCountText = isLoading
    ? isVi
      ? 'Đang tải bộ sưu tập...'
      : 'Loading your collection...'
    : albums.length > 0
    ? isVi
      ? `${albums.length} album trong bộ sưu tập`
      : `${albums.length} ${
          albums.length === 1 ? 'album' : 'albums'
        } in your collection`
    : isVi
    ? 'Lưu giữ những khoảnh khắc đáng nhớ'
    : 'Keep your favorite moments together';

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={HEADER_SAFE_AREA_COLOR}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={HEADER_SAFE_AREA_COLOR} />

      <View style={styles.sectionHeader}>
        <View style={styles.headingCopy}>
          <Text style={styles.heading}>
            {isVi ? 'Album của tôi' : 'My albums'}
          </Text>
          <Text numberOfLines={1} style={styles.subheading}>
            {albumCountText}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={isVi ? 'Tạo album mới' : 'Create a new album'}
          style={styles.createButton}
          onPress={handleCreateAlbum}
        >
          <Plus size={18} strokeWidth={2.5} color="#FFFFFF" />
          <Text style={styles.createButtonText}>
            {isVi ? 'Tạo album' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && albums.length === 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <AlbumGridSkeleton />
        </ScrollView>
      ) : error ? (
        <View style={styles.stateContainer}>
          <View style={[styles.stateIcon, styles.errorIcon]}>
            <Images size={31} color={APP_COLORS.status.error} />
          </View>
          <Text style={styles.stateTitle}>
            {isVi ? 'Không thể tải album' : 'Could not load albums'}
          </Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.retryButton}
            onPress={retry}
          >
            <Text style={styles.retryButtonText}>
              {isVi ? 'Thử lại' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <Images size={33} color={BRAND} />
          </View>
          <Text style={styles.stateTitle}>
            {isVi ? 'Bộ sưu tập đang trống' : 'Your collection is empty'}
          </Text>
          <Text style={styles.stateDescription}>
            {isVi
              ? 'Tạo album đầu tiên để sắp xếp và chia sẻ những bức ảnh bạn yêu thích.'
              : 'Create your first album to organize and share the photos you love.'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.emptyCreateButton}
            onPress={handleCreateAlbum}
          >
            <Plus size={18} strokeWidth={2.5} color="#FFFFFF" />
            <Text style={styles.emptyCreateButtonText}>
              {isVi ? 'Tạo album đầu tiên' : 'Create your first album'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[BRAND]}
              tintColor={BRAND}
            />
          }
          onScroll={({ nativeEvent }) => {
            const remaining =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;
            if (remaining < 180) {
              loadMore().catch(() => undefined);
            }
          }}
          scrollEventThrottle={200}
        >
          <View style={styles.grid}>
            {albums.map(album => (
              <AlbumCard
                key={album.id}
                album={album}
                isVi={isVi}
                onPress={() => {
                  const postId = album.postId || album.id;
                  if (postId) {
                    navigation.navigate(ROUTES.POST_DETAIL, { postId });
                  }
                }}
              />
            ))}
          </View>

          {isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.loadingMoreText}>
                {isVi ? 'Đang tải thêm album...' : 'Loading more albums...'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.neutral.base,
  },
  sectionHeader: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: APP_COLORS.neutral.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.neutral.border,
  },
  headingCopy: {
    flex: 1,
  },
  heading: {
    color: APP_COLORS.neutral.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  subheading: {
    marginTop: 4,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 12.5,
    fontWeight: '500',
  },
  createButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: BRAND,
    shadowColor: APP_COLORS.brand.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 36,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  albumCard: {
    width: '48.35%',
    overflow: 'hidden',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    backgroundColor: APP_COLORS.neutral.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 1.08,
    overflow: 'hidden',
    backgroundColor: APP_COLORS.neutral.muted,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  placeholderText: {
    marginTop: 8,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  photoCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.76)',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  albumInfo: {
    minHeight: 82,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 12,
  },
  albumName: {
    minHeight: 38,
    color: APP_COLORS.neutral.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },
  privacyRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  privacyText: {
    flex: 1,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  skeletonCard: {
    shadowOpacity: 0,
    elevation: 0,
  },
  skeletonCover: {
    backgroundColor: '#E7ECF3',
  },
  skeletonTitle: {
    width: '82%',
    height: 15,
    borderRadius: 7,
    backgroundColor: '#E7ECF3',
  },
  skeletonMeta: {
    width: '55%',
    height: 11,
    marginTop: 13,
    borderRadius: 6,
    backgroundColor: '#EEF2F7',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingBottom: 72,
  },
  stateIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: APP_COLORS.brand.soft,
  },
  errorIcon: {
    backgroundColor: '#FEF2F2',
  },
  stateTitle: {
    marginTop: 18,
    color: APP_COLORS.neutral.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateDescription: {
    maxWidth: 330,
    marginTop: 8,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 130,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 12,
    backgroundColor: APP_COLORS.neutral.surface,
  },
  retryButtonText: {
    color: BRAND,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCreateButton: {
    minHeight: 44,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: BRAND,
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingMore: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: APP_COLORS.neutral.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AlbumsScreen;
