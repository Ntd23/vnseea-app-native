// Description: Shows WoWonder pages list with search, tabs, creation, verified badges, and animations.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Edit3,
  ExternalLink,
  Flag,
  Plus,
  RotateCw,
  ThumbsUp,
  BadgeCheck,
  ChevronRight,
  Tag,
  Heart,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMyPagesViewModel } from '../../application/view-models/useMyPagesViewModel';
import type { PagesFilter, PagesItem } from '../../domain/types/pages.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';

type PagesNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F4';
const GREEN_STATUS = '#22C55E';

const COPY: Record<
  AppLanguage,
  {
    headerTitle: string;
    myPagesLabel: string;
    suggestedLabel: string;
    likedLabel: string;
    myPagesTitle: string;
    myPagesSubtitle: string;
    suggestedTitle: string;
    suggestedSubtitle: string;
    likedTitle: string;
    likedSubtitle: string;
    viewPage: string;
    editPage: string;
    likesSuffix: string;
    likedText: string;
    likeText: string;
    followText: string;
    followingText: string;
    likesCardLabel: string;
    addressCardLabel: string;
    noSuggestedTitle: string;
    noSuggestedSubtitle: string;
    noLikedTitle: string;
    noLikedSubtitle: string;
    noMineTitle: string;
    noMineSubtitle: string;
    createNewPage: string;
    tryAgain: string;
    loadFailed: string;
    viewAllSuggested: string;
  }
> = {
  vi: {
    headerTitle: 'Trang',
    myPagesLabel: 'Của tôi',
    suggestedLabel: 'Đề xuất',
    likedLabel: 'Đã thích',
    myPagesTitle: 'Trang của bạn',
    myPagesSubtitle: 'Quản lý các trang bạn đã tạo hoặc đang là quản trị viên.',
    suggestedTitle: 'Trang được đề xuất',
    suggestedSubtitle: 'Khám phá các trang phù hợp để theo dõi thêm.',
    likedTitle: 'Trang đã yêu thích',
    likedSubtitle: 'Những trang bạn đã thích sẽ hiển thị ở đây.',
    viewPage: 'Xem trang',
    editPage: 'Sửa trang',
    likesSuffix: 'lượt thích',
    likedText: 'Đã thích',
    likeText: 'Thích',
    followText: 'Theo dõi',
    followingText: 'Đang theo dõi',
    likesCardLabel: 'Lượt thích',
    addressCardLabel: 'Địa chỉ',
    noSuggestedTitle: 'Chưa có trang đề xuất',
    noSuggestedSubtitle: 'Hiện chưa có trang phù hợp để đề xuất cho bạn.',
    noLikedTitle: 'Chưa có trang đã yêu thích',
    noLikedSubtitle: 'Các trang bạn đã thích sẽ xuất hiện trong mục này.',
    noMineTitle: 'Bạn chưa có trang nào',
    noMineSubtitle: 'Những trang bạn tạo hoặc quản lý sẽ hiển thị ở đây.',
    createNewPage: 'Tạo trang mới',
    tryAgain: 'Thử lại',
    loadFailed: 'Không tải được trang',
    viewAllSuggested: 'Xem tất cả trang đề xuất',
  },
  en: {
    headerTitle: 'Pages',
    myPagesLabel: 'My Pages',
    suggestedLabel: 'Suggested',
    likedLabel: 'Liked',
    myPagesTitle: 'Your Pages',
    myPagesSubtitle: 'Manage pages you created or where you are an admin.',
    suggestedTitle: 'Suggested Pages',
    suggestedSubtitle: 'Discover new pages to follow.',
    likedTitle: 'Liked Pages',
    likedSubtitle: 'Pages you have liked will be shown here.',
    viewPage: 'View Page',
    editPage: 'Edit page',
    likesSuffix: 'likes',
    likedText: 'Liked',
    likeText: 'Like',
    followText: 'Follow',
    followingText: 'Following',
    likesCardLabel: 'Likes',
    addressCardLabel: 'Address',
    noSuggestedTitle: 'No suggested pages',
    noSuggestedSubtitle: 'Currently, there are no pages to suggest to you.',
    noLikedTitle: 'No liked pages',
    noLikedSubtitle: 'Pages you like will appear in this section.',
    noMineTitle: "You don't have any pages",
    noMineSubtitle: 'Pages you create or manage will be shown here.',
    createNewPage: 'Create Page',
    tryAgain: 'Try Again',
    loadFailed: 'Failed to load pages',
    viewAllSuggested: 'View all suggested pages',
  },
};

const FILTERS: PagesFilter[] = ['mine', 'suggested', 'liked'];

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function PagesSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonCover} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
            <View style={styles.skeletonDesc} />
            <View style={styles.skeletonInfoRow}>
              <View style={styles.skeletonInfoCell} />
              <View style={styles.skeletonInfoCell} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  filter,
  error,
  onCreate,
  onRetry,
}: {
  filter: PagesFilter;
  error: string | null;
  onCreate: () => void;
  onRetry: () => void;
}) {
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;

  const getEmptyCopy = () => {
    if (filter === 'suggested') {
      return {
        title: copy.noSuggestedTitle,
        subtitle: copy.noSuggestedSubtitle,
        action: copy.tryAgain,
      };
    }
    if (filter === 'liked') {
      return {
        title: copy.noLikedTitle,
        subtitle: copy.noLikedSubtitle,
        action: copy.tryAgain,
      };
    }
    return {
      title: copy.noMineTitle,
      subtitle: copy.noMineSubtitle,
      action: copy.createNewPage,
    };
  };

  const emptyCopy = getEmptyCopy();
  const showCreateAction = !error && filter === 'mine';
  const actionLabel = error ? copy.tryAgain : emptyCopy.action;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        {error ? (
          <RotateCw size={36} color={BRAND} />
        ) : (
          <Flag size={36} color={BRAND} fill={BRAND + '15'} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {error ? copy.loadFailed : emptyCopy.title}
      </Text>
      <Text style={styles.emptySubtitle}>
        {error ?? emptyCopy.subtitle}
      </Text>

      <TouchableOpacity
        style={styles.emptyActionBtn}
        activeOpacity={0.85}
        onPress={showCreateAction ? onCreate : onRetry}
      >
        {showCreateAction ? (
          <Plus size={18} color="#FFFFFF" />
        ) : (
          <RotateCw size={18} color="#FFFFFF" />
        )}
        <Text style={styles.emptyActionBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function FilterTabs({
  activeFilter,
  onChange,
  onCreate,
}: {
  activeFilter: PagesFilter;
  onChange: (filter: PagesFilter) => void;
  onCreate: () => void;
}) {
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;

  return (
    <View style={styles.filterSection}>
      <View accessibilityRole="tablist" style={styles.filterTabs}>
        {FILTERS.map(filter => {
          const isActive = filter === activeFilter;
          const label =
            filter === 'mine'
              ? copy.myPagesLabel
              : filter === 'suggested'
              ? copy.suggestedLabel
              : copy.likedLabel;

          return (
            <TouchableOpacity
              key={filter}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.82}
              onPress={() => onChange(filter)}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                numberOfLines={1}
                style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.86}
        onPress={onCreate}
        style={styles.createPageButton}
      >
        <View style={styles.createPageIcon}>
          <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
        </View>
        <Text style={styles.createPageButtonText}>{copy.createNewPage}</Text>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function PageAvatar({ page }: { page: PagesItem }) {
  if (page.avatar) {
    return (
      <Image
        source={{ uri: page.avatar }}
        style={styles.avatarImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.avatarPlaceholder}>
      <Flag size={28} color={BRAND} />
    </View>
  );
}

function PageCover({ page }: { page: PagesItem }) {
  if (page.cover) {
    return (
      <Image
        source={{ uri: page.cover }}
        style={styles.coverImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.coverPlaceholder}>
      <Flag size={36} color={BRAND + '30'} strokeWidth={1.8} />
    </View>
  );
}

// TODO: extract to src/pages/presentation/components/PageCard.tsx if reused
const categoryMap: Record<string, string> = {
  '1': 'Xe cộ',
  '2': 'Hài hước',
  '3': 'Kinh tế',
  '4': 'Giáo dục',
  '5': 'Giải trí',
  '6': 'Phim ảnh',
  '7': 'Công nghệ',
  '8': 'Ẩm thực',
  '9': 'Du lịch',
  '10': 'Thời trang',
  '11': 'Thể thao',
};

export function PageCard({
  page,
  onEdit,
  onOpen,
  onPressLike,
  onPressFollow,
  isActionLoading,
  likeLabel,
  likedLabel,
  followLabel,
  followingLabel,
  likesSuffix,
  viewPageLabel,
  editPageLabel,
  index,
}: {
  page: PagesItem;
  onEdit?: () => void;
  onOpen: () => void;
  onPressLike?: () => void;
  onPressFollow?: () => void;
  isActionLoading?: boolean;
  likeLabel: string;
  likedLabel: string;
  followLabel: string;
  followingLabel: string;
  likesSuffix: string;
  viewPageLabel: string;
  editPageLabel: string;
  index: number;
}) {
  const categoryLabel =
    categoryMap[page.pageCategory || ''] || page.pageCategory || '';
  const title = page.pageTitle || page.pageName || 'Trang';
  const handle = page.pageName ? '@' + page.pageName : '';

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + Math.min(index, 4) * 60).duration(420)}
      style={styles.pageCard}
    >
      <View style={styles.pageCardCover}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onOpen}
          style={StyleSheet.absoluteFill}
        >
          <PageCover page={page} />
          <View style={styles.pageCoverShade} />
        </TouchableOpacity>

        {onEdit ? (
          <TouchableOpacity
            accessibilityLabel={editPageLabel}
            activeOpacity={0.82}
            onPress={onEdit}
            style={styles.pageEditButton}
          >
            <Edit3 size={18} color={TEXT} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.78}
        onPress={onOpen}
        style={styles.pageAvatarButton}
      >
        <PageAvatar page={page} />
        {page.isFollowing ? <View style={styles.activeBadge} /> : null}
      </TouchableOpacity>

      <View style={styles.pageCardBody}>
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={onOpen}
          style={styles.pageTitleArea}
        >
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle} numberOfLines={1}>
              {title}
            </Text>
            {page.verified ? (
              <BadgeCheck size={19} color={BRAND} fill={BRAND} />
            ) : null}
          </View>
          {handle ? (
            <Text style={styles.pageHandle} numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
        </TouchableOpacity>

        {page.pageDescription ? (
          <Text style={styles.pageDescription} numberOfLines={2}>
            {page.pageDescription}
          </Text>
        ) : null}

        <View style={styles.pageMetaRow}>
          <View style={styles.pageMetaChip}>
            <ThumbsUp size={14} color={BRAND} fill={BRAND} />
            <Text style={styles.pageMetaText} numberOfLines={1}>
              {formatCount(page.likes)} {likesSuffix}
            </Text>
          </View>
          {categoryLabel ? (
            <View style={styles.pageMetaChip}>
              <Tag size={14} color={MUTED} />
              <Text style={styles.pageMetaText} numberOfLines={1}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pageSocialActions}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onPressLike}
            disabled={!onPressLike || isActionLoading}
            style={[
              styles.pageSocialButton,
              page.isLiked && styles.pageSocialButtonActive,
            ]}
          >
            <Heart
              size={18}
              color={page.isLiked ? BRAND : MUTED}
              fill={page.isLiked ? BRAND : 'transparent'}
            />
            <Text
              style={[
                styles.pageSocialButtonText,
                page.isLiked && styles.pageSocialButtonTextActive,
              ]}
            >
              {page.isLiked ? likedLabel : likeLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onPressFollow}
            disabled={!onPressFollow || isActionLoading}
            style={[
              styles.pageSocialButton,
              page.isFollowing && styles.pageSocialButtonActive,
            ]}
          >
            <Bell
              size={18}
              color={page.isFollowing ? BRAND : MUTED}
              fill={page.isFollowing ? BRAND : 'transparent'}
            />
            <Text
              style={[
                styles.pageSocialButtonText,
                page.isFollowing && styles.pageSocialButtonTextActive,
              ]}
            >
              {page.isFollowing ? followingLabel : followLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pagePrimaryActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onOpen}
            style={styles.pageOpenButton}
          >
            <ExternalLink size={18} color="#FFFFFF" />
            <Text style={styles.pageOpenButtonText}>{viewPageLabel}</Text>
          </TouchableOpacity>
          {onEdit ? (
            <TouchableOpacity
              accessibilityLabel={editPageLabel}
              activeOpacity={0.82}
              onPress={onEdit}
              style={styles.pageEditAction}
            >
              <Edit3 size={20} color={BRAND} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function PagesScreen() {
  const navigation = useNavigation<PagesNav>();
  const {
    activeFilter,
    pages,
    isLoading,
    isRefreshing,
    isLoadingMore,
    isActionLoading,
    error,
    hasMore,
    loadFirstPage,
    setActiveFilter,
    refresh,
    loadMore,
    retry,
    toggleLikePage,
    toggleFollowPage,
  } = useMyPagesViewModel();
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;

  const activeCopy = useMemo(() => {
    if (activeFilter === 'suggested') {
      return {
        title: copy.suggestedTitle,
        subtitle: copy.suggestedSubtitle,
      };
    }
    if (activeFilter === 'liked') {
      return {
        title: copy.likedTitle,
        subtitle: copy.likedSubtitle,
      };
    }
    return {
      title: copy.myPagesTitle,
      subtitle: copy.myPagesSubtitle,
    };
  }, [activeFilter, copy]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(false).catch(() => undefined);
    }, [loadFirstPage]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_PAGE);
  }, [navigation]);

  const handleOpenPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.PAGE_DETAIL, { page });
    },
    [navigation],
  );

  const handleEditPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.EDIT_PAGE, { page });
    },
    [navigation],
  );

  const handleViewAllSuggested = useCallback(() => {
    navigation.navigate(ROUTES.SUGGESTED_PAGES);
  }, [navigation]);

  const renderPage = useCallback(
    ({ item, index }: ListRenderItemInfo<PagesItem> & { index: number }) => (
      <PageCard
        page={item}
        index={index}
        onEdit={
          activeFilter === 'mine' ? () => handleEditPage(item) : undefined
        }
        onOpen={() => handleOpenPage(item)}
        onPressLike={() => toggleLikePage(item.pageId || item.id)}
        onPressFollow={() => toggleFollowPage(item.pageId || item.id)}
        isActionLoading={isActionLoading}
        likeLabel={copy.likeText}
        likedLabel={copy.likedText}
        followLabel={copy.followText}
        followingLabel={copy.followingText}
        likesSuffix={copy.likesSuffix}
        viewPageLabel={copy.viewPage}
        editPageLabel={copy.editPage}
      />
    ),
    [
      copy.followText,
      copy.followingText,
      copy.editPage,
      copy.likeText,
      copy.likedText,
      copy.likesSuffix,
      copy.viewPage,
      handleEditPage,
      handleOpenPage,
      activeFilter,
      isActionLoading,
      toggleFollowPage,
      toggleLikePage,
    ],
  );

  const headerBackgroundColor =
    Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF';

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={headerBackgroundColor}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />

      <FilterTabs
        activeFilter={activeFilter}
        onChange={setActiveFilter}
        onCreate={handleCreate}
      />

      <FlatList
        style={styles.list}
        data={pages}
        keyExtractor={item => String(item.id)}
        renderItem={renderPage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={activeFilter === 'suggested' ? undefined : loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>{activeCopy.title}</Text>
              <Text style={styles.sectionSubtitle}>{activeCopy.subtitle}</Text>
            </View>
            <View style={styles.pageCountBadge}>
              <Text style={styles.pageCountText}>{pages.length}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <PagesSkeleton />
          ) : (
            <EmptyState
              filter={activeFilter}
              error={error}
              onCreate={handleCreate}
              onRetry={retry}
            />
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : activeFilter === 'suggested' && pages.length > 0 && hasMore ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.84}
              onPress={handleViewAllSuggested}
              style={styles.viewAllSuggestedButton}
            >
              <Text style={styles.viewAllSuggestedText}>
                {copy.viewAllSuggested}
              </Text>
              <ChevronRight size={19} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  filterSection: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterTabs: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  filterTab: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 6,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 2,
  },
  filterTabText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterTabTextActive: {
    color: BRAND,
    fontWeight: '900',
  },
  createPageButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  createPageIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  createPageButtonText: {
    flex: 1,
    marginHorizontal: 11,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: MUTED,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  pageCountBadge: {
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: APP_COLORS.brand.soft,
    paddingHorizontal: 10,
  },
  pageCountText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '900',
  },
  pageCard: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  pageCardCover: {
    height: 136,
    overflow: 'hidden',
    backgroundColor: APP_COLORS.brand.soft,
  },
  pageCoverShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  pageEditButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  pageAvatarButton: {
    position: 'absolute',
    left: 16,
    top: 98,
    zIndex: 2,
    width: 76,
    height: 76,
  },
  pageCardBody: {
    padding: 16,
    paddingTop: 14,
  },
  pageTitleArea: {
    minHeight: 48,
    justifyContent: 'center',
    marginLeft: 88,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageTitle: {
    flexShrink: 1,
    color: TEXT,
    fontSize: 19,
    fontWeight: '900',
  },
  pageHandle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  pageDescription: {
    marginTop: 13,
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  pageMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  pageMetaChip: {
    maxWidth: '100%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
  },
  pageMetaText: {
    flexShrink: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  pageSocialActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  pageSocialButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
  },
  pageSocialButtonActive: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  pageSocialButtonText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
  },
  pageSocialButtonTextActive: {
    color: BRAND,
  },
  pagePrimaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pageOpenButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: BRAND,
  },
  pageOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  pageEditAction: {
    width: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
    borderRadius: 16,
    backgroundColor: APP_COLORS.brand.soft,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCreateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  list: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  bannerCard: {
    height: 148,
    borderRadius: 24,
    backgroundColor: '#ECEFFE',
    padding: 20,
    flexDirection: 'row',
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 80,
  },
  bannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: TEXT,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },
  bannerIllustration: {
    width: 140,
    height: 140,
    position: 'absolute',
    right: -5,
    bottom: -8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    height: 48,
  },
  tabItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: BRAND,
    fontWeight: '900',
  },
  tabIndicator: {
    width: 32,
    height: 3,
    backgroundColor: BRAND,
    borderRadius: 1.5,
    marginTop: 5,
  },
  tabIndicatorPlaceholder: {
    height: 3,
    backgroundColor: 'transparent',
    marginTop: 5,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  coverWrapper: {
    height: 180,
    width: '100%',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.brand.soft,
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  coverOverlayText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    paddingHorizontal: 16,
  },
  coverActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverMoreBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  viewPageBtn: {
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_BRAND_COLOR,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    shadowColor: APP_BRAND_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  viewPageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  avatarWrap: {
    position: 'absolute',
    left: 16,
    top: 180 - 80,
    width: 80,
    height: 80,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: APP_COLORS.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN_STATUS,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  titleTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '900',
    color: TEXT,
    flexShrink: 1,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '700',
    color: MUTED,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 20,
    marginTop: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  infoCellPressable: {
    flex: 1,
  },
  infoCell: {
    flex: 1,
    minHeight: 60,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCellIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCellTextWrap: {
    flex: 1,
  },
  infoCellLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCellValue: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
    marginTop: 2,
  },
  skeletonContainer: {
    gap: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    height: 300,
  },
  skeletonCover: {
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  skeletonContent: {
    padding: 16,
    paddingTop: 12,
  },
  skeletonTitle: {
    width: '50%',
    height: 18,
    backgroundColor: '#E2E8F0',
    borderRadius: 9,
    marginTop: 16,
  },
  skeletonSubtitle: {
    width: '30%',
    height: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    marginTop: 6,
  },
  skeletonDesc: {
    width: '100%',
    height: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    marginTop: 10,
  },
  skeletonInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  skeletonInfoCell: {
    flex: 1,
    height: 60,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: TEXT,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  loaderFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewAllSuggestedButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: BRAND,
  },
  viewAllSuggestedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default PagesScreen;
