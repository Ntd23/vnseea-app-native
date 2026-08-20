import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Flag, RotateCw } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { useMyPagesViewModel } from '../../application/view-models/useMyPagesViewModel';
import type { PagesItem } from '../../domain/types/pages.types';
import { PageCard } from './PagesScreen';

type SuggestedPagesNav = NativeStackNavigationProp<RootStackParamList>;

const COPY = {
  vi: {
    title: 'Trang được đề xuất',
    subtitle: 'Khám phá thêm các trang mới trên VNSEEA.',
    emptyTitle: 'Chưa có trang đề xuất',
    emptySubtitle: 'Hiện chưa có thêm trang phù hợp để đề xuất cho bạn.',
    back: 'Quay lại',
    retry: 'Thử lại',
    viewPage: 'Xem trang',
    editPage: 'Sửa trang',
    like: 'Thích',
    liked: 'Đã thích',
    follow: 'Theo dõi',
    following: 'Đang theo dõi',
    likesSuffix: 'lượt thích',
  },
  en: {
    title: 'Suggested Pages',
    subtitle: 'Discover more pages on VNSEEA.',
    emptyTitle: 'No suggested pages',
    emptySubtitle: 'There are no more relevant pages to suggest right now.',
    back: 'Back',
    retry: 'Try Again',
    viewPage: 'View Page',
    editPage: 'Edit page',
    like: 'Like',
    liked: 'Liked',
    follow: 'Follow',
    following: 'Following',
    likesSuffix: 'likes',
  },
} as const;

export default function SuggestedPagesScreen() {
  const navigation = useNavigation<SuggestedPagesNav>();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;
  const {
    pages,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isActionLoading,
    error,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
    toggleLikePage,
    toggleFollowPage,
  } = useMyPagesViewModel('suggested');

  useEffect(() => {
    loadFirstPage(false).catch(() => undefined);
  }, [loadFirstPage]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.PAGES);
  }, [navigation]);

  const openPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.PAGE_DETAIL, { page });
    },
    [navigation],
  );

  const renderPage = useCallback(
    ({ item, index }: ListRenderItemInfo<PagesItem>) => (
      <PageCard
        page={item}
        index={index}
        onOpen={() => openPage(item)}
        onPressLike={() => toggleLikePage(item.pageId || item.id)}
        onPressFollow={() => toggleFollowPage(item.pageId || item.id)}
        isActionLoading={isActionLoading}
        likeLabel={copy.like}
        likedLabel={copy.liked}
        followLabel={copy.follow}
        followingLabel={copy.following}
        likesSuffix={copy.likesSuffix}
        viewPageLabel={copy.viewPage}
        editPageLabel={copy.editPage}
      />
    ),
    [
      copy,
      isActionLoading,
      openPage,
      toggleFollowPage,
      toggleLikePage,
    ],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor={APP_BRAND_COLOR}
        translucent={false}
      />

      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={copy.back}
          accessibilityRole="button"
          activeOpacity={0.82}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {copy.title}
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {copy.subtitle}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={pages}
        keyExtractor={item => String(item.pageId || item.id)}
        renderItem={renderPage}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={APP_BRAND_COLOR}
            colors={[APP_BRAND_COLOR]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={APP_BRAND_COLOR} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              {error ? (
                <RotateCw size={34} color={APP_BRAND_COLOR} />
              ) : (
                <Flag size={34} color={APP_BRAND_COLOR} />
              )}
              <Text style={styles.emptyTitle}>
                {error || copy.emptyTitle}
              </Text>
              <Text style={styles.emptySubtitle}>{copy.emptySubtitle}</Text>
              {error ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={retry}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>{copy.retry}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator color={APP_BRAND_COLOR} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_BRAND_COLOR,
    paddingHorizontal: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.brand.borderOnPrimary,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: APP_COLORS.brand.onPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
    color: APP_COLORS.brand.onPrimaryMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F4',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    marginTop: 14,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: APP_BRAND_COLOR,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  loaderFooter: {
    alignItems: 'center',
    paddingVertical: 18,
  },
});
