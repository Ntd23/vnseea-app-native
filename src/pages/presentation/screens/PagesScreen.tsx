// Description: Shows WoWonder pages list with search, tabs, creation, verified badges, and animations.
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Flag,
  MapPin,
  Plus,
  RotateCw,
  Search,
  ThumbsUp,
  BadgeCheck,
  MoreHorizontal,
  ChevronRight,
  Tag,
  FileText,
} from 'lucide-react-native';
import { ScrollView as RNScrollView } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMyPagesViewModel } from '../../application/view-models/useMyPagesViewModel';
import type { PagesFilter, PagesItem } from '../../domain/types/pages.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';

type PagesNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#3435F7';
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
    likesSuffix: string;
    likedText: string;
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
  }
> = {
  vi: {
    headerTitle: 'Trang',
    myPagesLabel: 'Trang của tôi',
    suggestedLabel: 'Các trang được đề xuất',
    likedLabel: 'Các trang được yêu thích',
    myPagesTitle: 'Trang của bạn',
    myPagesSubtitle: 'Quản lý các trang bạn đã tạo hoặc đang là quản trị viên.',
    suggestedTitle: 'Trang được đề xuất',
    suggestedSubtitle: 'Khám phá các trang phù hợp để theo dõi thêm.',
    likedTitle: 'Trang đã yêu thích',
    likedSubtitle: 'Những trang bạn đã thích sẽ hiển thị ở đây.',
    viewPage: 'Xem trang',
    likesSuffix: 'lượt thích',
    likedText: 'Đã thích',
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
  },
  en: {
    headerTitle: 'Pages',
    myPagesLabel: 'My Pages',
    suggestedLabel: 'Các trang được đề xuất',
    likedLabel: 'Các trang được yêu thích',
    myPagesTitle: 'Your Pages',
    myPagesSubtitle: 'Manage pages you created or where you are an admin.',
    suggestedTitle: 'Suggested Pages',
    suggestedSubtitle: 'Discover new pages to follow.',
    likedTitle: 'Liked Pages',
    likedSubtitle: 'Pages you have liked will be shown here.',
    viewPage: 'View Page',
    likesSuffix: 'likes',
    likedText: 'Liked',
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
  },
};

const FILTERS: PagesFilter[] = ['mine', 'suggested', 'liked'];

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function PressScale({
  children,
  onPress,
  disabled,
  style,
  activeOpacity = 0.92,
  contentStyle,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  activeOpacity?: number;
  contentStyle?: any;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={activeOpacity}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15, stiffness: 250 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 250 });
        }}
        style={contentStyle}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
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

  const [contentWidth, setContentWidth] = React.useState(0);
  const [width, setWidth] = React.useState(0);
  const scrollX = React.useRef(new RNAnimated.Value(0)).current;

  const showIndicator = contentWidth > width && width > 0;
  const thumbWidth = showIndicator ? Math.max(20, (width / contentWidth) * width) : 0;

  return (
    <View style={{ height: 56, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: '100%', justifyContent: 'center' }}>
          <RNScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={(w) => setContentWidth(w)}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onScroll={RNAnimated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
            style={{ flex: 1 }}
          >
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
                  activeOpacity={0.84}
                  onPress={() => onChange(filter)}
                  style={{
                    height: '100%',
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    borderBottomWidth: 3,
                    borderBottomColor: isActive ? BRAND : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#111827' : '#64748B',
                      fontSize: 13,
                      fontWeight: isActive ? '800' : '700',
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </RNScrollView>

          {/* Custom Scroll Indicator (Full-width, positioned above the active line) */}
          {showIndicator && (
            <View style={{ position: 'absolute', bottom: 4, left: 0, right: 0, height: 2, backgroundColor: '#F1F5F9', pointerEvents: 'none' }}>
              <RNAnimated.View
                style={{
                  width: thumbWidth,
                  height: '100%',
                  backgroundColor: '#94A3B8',
                  borderRadius: 1,
                  transform: [
                    {
                      translateX: scrollX.interpolate({
                        inputRange: [0, Math.max(1, contentWidth - width)],
                        outputRange: [0, width - thumbWidth],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={onCreate}
          style={{
            marginRight: 8,
            minHeight: 34,
            borderRadius: 6,
            backgroundColor: BRAND,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            shadowColor: BRAND,
            shadowOpacity: 0.22,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>Tạo ra</Text>
        </TouchableOpacity>
      </View>
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

function PageInfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.infoCell}>
      <View style={styles.infoCellIcon}>{icon}</View>
      <View style={styles.infoCellTextWrap}>
        <Text style={styles.infoCellLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.infoCellValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {onPress ? (
        <ChevronRight size={16} color={MUTED} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <PressScale onPress={onPress} contentStyle={styles.infoCellPressable}>
      {content}
    </PressScale>
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

function PageCard({
  page,
  onOpen,
  index,
}: {
  page: PagesItem;
  onEdit?: () => void;
  onOpen: () => void;
  onMore?: () => void;
  onPressLikes?: () => void;
  onPressAddress?: () => void;
  index: number;
}) {
  const categoryLabel = categoryMap[page.pageCategory || ''] || page.pageCategory || '';

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 60).duration(420)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Orange flag in beige circle, or page avatar */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#FFF0E5',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {page.avatar ? (
          <Image
            source={{ uri: page.avatar }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Flag size={36} color="#FF8A00" fill="#FF8A00" />
        )}
      </View>

      {/* Page Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '800',
            color: '#111827',
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {page.pageTitle || page.pageName || 'Trang'}
        </Text>
        {page.verified ? (
          <BadgeCheck size={18} color="#0084FF" fill="#0084FF" />
        ) : null}
      </View>

      {/* Like count: 👍 {count} những người như thế này */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <ThumbsUp size={14} color="#64748B" fill="#64748B" />
        <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
          {`${page.likes || 0} những người như thế này`}
        </Text>
      </View>

      {/* Category: 🏷️ {label} */}
      {categoryLabel ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Tag size={14} color="#64748B" />
          <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
            {categoryLabel}
          </Text>
        </View>
      ) : null}

      {/* Circular Blue Action Button */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onOpen}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#0084FF',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 18,
          shadowColor: '#0084FF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <FileText size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function PagesScreen() {
  const navigation = useNavigation<PagesNav>();
  const vm = useMyPagesViewModel();
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;

  const activeCopy = useMemo(() => {
    if (vm.activeFilter === 'suggested') {
      return {
        title: copy.suggestedTitle,
        subtitle: copy.suggestedSubtitle,
      };
    }
    if (vm.activeFilter === 'liked') {
      return {
        title: copy.likedTitle,
        subtitle: copy.likedSubtitle,
      };
    }
    return {
      title: copy.myPagesTitle,
      subtitle: copy.myPagesSubtitle,
    };
  }, [vm.activeFilter, copy]);

  useFocusEffect(
    useCallback(() => {
      void vm.loadFirstPage(false);
    }, [vm.loadFirstPage]),
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

  const handleMorePage = useCallback((_page: PagesItem) => {
    // TODO: wire to PageDetailMenuActionSheet / PageShareActionSheet
    // For now, no-op (button is hidden for non-'mine' filters in renderPage).
  }, []);

  const renderPage = useCallback(
    ({ item, index }: ListRenderItemInfo<PagesItem> & { index: number }) => (
      <PageCard
        page={item}
        index={index}
        onEdit={
          vm.activeFilter === 'mine' ? () => handleEditPage(item) : undefined
        }
        onOpen={() => handleOpenPage(item)}
        onMore={vm.activeFilter === 'mine' ? () => handleMorePage(item) : undefined}
        onPressLikes={undefined}
        onPressAddress={undefined}
      />
    ),
    [handleEditPage, handleOpenPage, handleMorePage, vm.activeFilter],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FeedHeader />

      <FilterTabs
        activeFilter={vm.activeFilter}
        onChange={vm.setActiveFilter}
        onCreate={handleCreate}
      />

      <FlatList
        style={styles.list}
        data={vm.pages}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => renderPage({ item, index, separators: {} as any })}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListEmptyComponent={
          vm.isLoading ? (
            <PagesSkeleton />
          ) : (
            <EmptyState
              filter={vm.activeFilter}
              error={vm.error}
              onCreate={handleCreate}
              onRetry={vm.retry}
            />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F8FAFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    backgroundColor: '#1E293B',
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
    backgroundColor: '#0000FF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    shadowColor: '#0000FF',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#EEF2FF',
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
});

export default PagesScreen;

