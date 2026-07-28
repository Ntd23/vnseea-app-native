// Description: Ad Details Screen - Shows detailed information about an ad campaign.
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  Hash,
  MapPin,
  Megaphone,
  MousePointerClick,
  Play,
  Target,
  Users,
} from 'lucide-react-native';

import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import type { AdDailyStats, AdItem } from '../../domain/types/ads.types';
import { createAdsRepository } from '../../infrastructure/repositories/ApiAdsRepository';
import { getAdvertisingCopy } from '../../application/i18n/advertisingCopy';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';

type AdDetailsNav = NativeStackNavigationProp<RootStackParamList>;
type AdDetailsRoute = RouteProp<RootStackParamList, typeof ROUTES.AD_DETAILS>;

const adsRepository = createAdsRepository();
const SCREEN_BACKGROUND = '#F6F8FC';
const AD_STATS_REFRESH_INTERVAL_MS = 5_000;

function formatNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('vi-VN');
}

function formatCurrency(value: number | string | undefined) {
  return `${formatNumber(value)} ₫`;
}

function formatChartDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}` : value;
}

function formatUpdatedTime(value: number, language: string) {
  return new Date(value).toLocaleTimeString(
    language === 'vi' ? 'vi-VN' : 'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  );
}

function getStatus(status: string, copy: Record<string, string>) {
  if (status === '1') {
    return {
      label: copy.statusRunning || 'Đang chạy',
      color: '#15803D',
      bg: '#DCFCE7',
      dot: '#22C55E',
    };
  }
  if (status === '2') {
    return {
      label: copy.statusPaused || 'Tạm dừng',
      color: '#A16207',
      bg: '#FEF3C7',
      dot: '#F59E0B',
    };
  }
  return {
    label: copy.statusPending || 'Đang chờ',
    color: '#475569',
    bg: '#E2E8F0',
    dot: '#94A3B8',
  };
}

function getAppearsLabel(value: string, copy: Record<string, string>) {
  switch (value) {
    case 'entire':
      return copy.positionLabelEntire || 'Toàn trang';
    case 'post':
      return copy.positionPost || 'Bài đăng';
    case 'sidebar':
      return copy.positionSidebar || 'Thanh bên';
    case 'video':
      return copy.positionVideo || 'Video';
    case 'story':
      return copy.positionStory || 'Story';
    case 'timeline':
      return copy.positionTimeline || 'Timeline';
    case 'groups':
      return copy.positionGroups || 'Nhóm';
    case 'pages':
      return copy.positionPages || 'Trang';
    case 'messages':
      return copy.positionMessages || 'Tin nhắn';
    default:
      return value || copy.advertisingTitle || 'Quảng cáo';
  }
}

function getBiddingLabel(value: string, copy: Record<string, string>) {
  return value === 'views'
    ? copy.biddingViews || 'Theo lượt xem'
    : copy.biddingClicks || 'Theo lượt nhấp';
}

function getGenderLabel(value: string, copy: Record<string, string>) {
  switch (value) {
    case 'male':
      return copy.genderMale || 'Nam';
    case 'female':
      return copy.genderFemale || 'Nữ';
    case 'all':
      return copy.genderAll || 'Tất cả';
    default:
      return value;
  }
}

function isVideoMedia(url?: string) {
  return /\.(mp4|mov|m4v|avi|webm)(\?|$)/i.test(url ?? '');
}

function MetricTile({
  icon,
  label,
  value,
  iconBackground,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  iconBackground: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: iconBackground }]}>
        {icon}
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.58}
        numberOfLines={1}
        style={styles.metricValue}
      >
        {value}
      </Text>
      <Text numberOfLines={1} style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

function DailyStatsChart({
  dailyStats,
  copy,
  isLoading,
}: {
  dailyStats: AdDailyStats[];
  copy: Record<string, string>;
  isLoading: boolean;
}) {
  const maxViews = Math.max(...dailyStats.map(day => day.views), 1);
  const maxClicks = Math.max(...dailyStats.map(day => day.clicks), 1);

  return (
    <View style={styles.card}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionIcon, styles.chartSectionIcon]}>
          <BarChart3 size={20} color={APP_BRAND_COLOR} strokeWidth={2.4} />
        </View>
        <View style={styles.sectionTitleCopy}>
          <Text style={styles.sectionTitle}>{copy.monthlyViewsClicks}</Text>
          <Text style={styles.sectionSubtitle}>{copy.last30Days}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.chartState}>
          <ActivityIndicator color={APP_BRAND_COLOR} />
          <Text style={styles.chartStateText}>
            {copy.loadingAds || 'Đang tải dữ liệu...'}
          </Text>
        </View>
      ) : dailyStats.length === 0 ? (
        <View style={styles.chartState}>
          <View style={styles.emptyChartIcon}>
            <BarChart3 size={30} color="#94A3B8" strokeWidth={2} />
          </View>
          <Text style={styles.chartStateTitle}>{copy.noChartData}</Text>
          <Text style={styles.chartStateText}>{copy.last30Days}</Text>
        </View>
      ) : (
        <>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: APP_BRAND_COLOR }]}
              />
              <Text style={styles.legendText}>{copy.viewsLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.clicksLegendDot]} />
              <Text style={styles.legendText}>{copy.clicksLabel}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            contentContainerStyle={styles.chartContent}
            showsHorizontalScrollIndicator={false}
          >
            {dailyStats.map(day => {
              const viewsHeight = Math.max(
                6,
                Math.round((day.views / maxViews) * 94),
              );
              const clicksHeight = Math.max(
                6,
                Math.round((day.clicks / maxClicks) * 94),
              );

              return (
                <View key={day.date} style={styles.chartColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: viewsHeight,
                          backgroundColor: APP_BRAND_COLOR,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        styles.clicksBar,
                        { height: clicksHeight },
                      ]}
                    />
                  </View>
                  <Text numberOfLines={1} style={styles.chartDate}>
                    {formatChartDate(day.date)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
  isLast = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const content = (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text numberOfLines={2} selectable style={styles.detailValue}>
          {value}
        </Text>
      </View>
      {onPress ? <ExternalLink size={17} color={APP_BRAND_COLOR} /> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.rowPressed}
    >
      {content}
    </Pressable>
  );
}

function AdDetailsScreen() {
  const navigation = useNavigation<AdDetailsNav>();
  const route = useRoute<AdDetailsRoute>();
  const routeAd = route.params?.ad;
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = getAdvertisingCopy(language);
  const [ad, setAd] = useState<AdItem | undefined>(routeAd);
  const [dailyStats, setDailyStats] = useState<AdDailyStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(Boolean(routeAd?.id));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingStats, setIsSyncingStats] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [hasSyncError, setHasSyncError] = useState(false);
  const isScreenActiveRef = useRef(false);
  const hasSnapshotRef = useRef(false);
  const refreshRequestRef = useRef<Promise<void> | null>(null);

  const refreshStats = useCallback(
    (mode: 'initial' | 'background' | 'manual' = 'background') => {
      if (!routeAd?.id) {
        return Promise.resolve();
      }
      if (refreshRequestRef.current) {
        return refreshRequestRef.current;
      }

      if (isScreenActiveRef.current) {
        setIsSyncingStats(true);
        if (mode === 'manual') {
          setIsRefreshing(true);
        }
        if (mode === 'initial' && !hasSnapshotRef.current) {
          setIsLoadingStats(true);
        }
      }

      const request = adsRepository
        .getAdStatsSnapshot(routeAd.id)
        .then(snapshot => {
          if (!isScreenActiveRef.current) return;
          hasSnapshotRef.current = true;
          setAd(snapshot.ad);
          setDailyStats(snapshot.dailyStats);
          setLastUpdatedAt(snapshot.fetchedAt);
          setHasSyncError(false);
        })
        .catch(() => {
          if (!isScreenActiveRef.current) return;
          setAd(current => current || routeAd);
          setHasSyncError(true);
        })
        .finally(() => {
          refreshRequestRef.current = null;
          if (!isScreenActiveRef.current) return;
          setIsLoadingStats(false);
          setIsRefreshing(false);
          setIsSyncingStats(false);
        });

      refreshRequestRef.current = request;
      return request;
    },
    [routeAd],
  );

  useFocusEffect(
    useCallback(() => {
      if (!routeAd?.id) {
        return undefined;
      }

      isScreenActiveRef.current = true;
      let appState = AppState.currentState;
      let refreshTimer: ReturnType<typeof setInterval> | null = null;

      const stopTimer = () => {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = null;
      };
      const startTimer = () => {
        if (appState !== 'active' || refreshTimer) return;
        refreshTimer = setInterval(() => {
          refreshStats('background').catch(() => undefined);
        }, AD_STATS_REFRESH_INTERVAL_MS);
      };

      refreshStats('initial').catch(() => undefined);
      startTimer();

      const appStateSubscription = AppState.addEventListener(
        'change',
        nextState => {
          appState = nextState;
          if (nextState === 'active') {
            refreshStats('background').catch(() => undefined);
            startTimer();
          } else {
            stopTimer();
          }
        },
      );

      return () => {
        isScreenActiveRef.current = false;
        stopTimer();
        appStateSubscription.remove();
      };
    }, [refreshStats, routeAd?.id]),
  );

  const headerBackgroundColor =
    Platform.OS === 'android' ? APP_BRAND_COLOR : APP_COLORS.neutral.surface;
  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      { paddingBottom: Math.max(36, insets.bottom + 24) },
    ],
    [insets.bottom],
  );

  if (!ad) {
    return (
      <View style={styles.screen}>
        <FocusAwareStatusBar
          barStyle={
            Platform.OS === 'android' ? 'light-content' : 'dark-content'
          }
          backgroundColor={headerBackgroundColor}
          translucent={false}
        />
        <SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />
        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <Megaphone size={30} color={APP_BRAND_COLOR} />
          </View>
          <Text style={styles.notFoundTitle}>{copy.notFound}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{copy.goBack}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const status = getStatus(ad.status, copy);
  const hasImage = Boolean(ad.ad_media && !isVideoMedia(ad.ad_media));
  const website = ad.url?.trim();
  const schedule =
    ad.start || ad.end
      ? `${ad.start || '...'} – ${ad.end || '...'}`
      : copy.unlimited;

  const handleOpenWebsite = website
    ? () => {
        const target = /^https?:\/\//i.test(website)
          ? website
          : `https://${website}`;
        Linking.openURL(target).catch(() => undefined);
      }
    : undefined;

  const handleEdit = () => navigation.navigate(ROUTES.CREATE_AD, { ad });
  const realtimeLabel = isSyncingStats
    ? language === 'vi'
      ? 'Đang đồng bộ dữ liệu...'
      : 'Syncing data...'
    : hasSyncError
    ? language === 'vi'
      ? 'Kết nối chậm • đang thử lại'
      : 'Connection delayed • retrying'
    : lastUpdatedAt
    ? language === 'vi'
      ? `Theo thời gian thực • ${formatUpdatedTime(lastUpdatedAt, language)}`
      : `Live updates • ${formatUpdatedTime(lastUpdatedAt, language)}`
    : language === 'vi'
    ? 'Theo thời gian thực'
    : 'Live updates';

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={headerBackgroundColor}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />

      <View style={styles.screenToolbar}>
        <Pressable
          accessibilityLabel={copy.goBack}
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.toolbarBackButton,
            pressed && styles.toolbarActionPressed,
          ]}
        >
          <ArrowLeft size={21} color="#0F172A" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.toolbarTitleWrap}>
          <Text numberOfLines={1} style={styles.toolbarTitle}>
            {copy.adDetailsTitle}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={copy.edit}
          accessibilityRole="button"
          hitSlop={6}
          onPress={handleEdit}
          style={({ pressed }) => [
            styles.toolbarEditButton,
            pressed && styles.toolbarActionPressed,
          ]}
        >
          <Edit3 size={17} color={APP_BRAND_COLOR} strokeWidth={2.4} />
          <Text style={styles.toolbarEditText}>{copy.edit}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl
            colors={[APP_BRAND_COLOR]}
            onRefresh={() => refreshStats('manual').catch(() => undefined)}
            refreshing={isRefreshing}
            tintColor={APP_BRAND_COLOR}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {hasImage ? (
            <Image
              source={{ uri: ad.ad_media }}
              resizeMode="cover"
              style={styles.heroMedia}
            />
          ) : ad.ad_media ? (
            <View style={[styles.heroMedia, styles.videoHero]}>
              <View style={styles.videoIcon}>
                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text style={styles.videoLabel}>{copy.adVideo}</Text>
            </View>
          ) : (
            <View style={[styles.heroMedia, styles.emptyHero]}>
              <Megaphone size={38} color={APP_BRAND_COLOR} strokeWidth={1.9} />
              <Text style={styles.emptyHeroText}>{copy.adDetailsTitle}</Text>
            </View>
          )}

          <View style={styles.heroShade} pointerEvents="none" />
        </View>

        <View style={styles.content}>
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.eyebrowRow}>
              <Text numberOfLines={1} style={styles.eyebrow}>
                {ad.name || copy.adDetailsTitle}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                <View
                  style={[styles.statusDot, { backgroundColor: status.dot }]}
                />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>
              {ad.headline || ad.name || copy.advertisingTitle}
            </Text>

            {ad.description ? (
              <Text style={styles.description}>{ad.description}</Text>
            ) : null}

            <View style={styles.chipRow}>
              <View style={[styles.chip, styles.brandChip]}>
                <Text style={[styles.chipText, styles.brandChipText]}>
                  {getAppearsLabel(ad.appears, copy)}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {getBiddingLabel(ad.bidding, copy)}
                </Text>
              </View>
              <View style={[styles.chip, styles.infoChip]}>
                <Text style={[styles.chipText, styles.infoChipText]}>
                  {getGenderLabel(ad.gender, copy)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, styles.performanceSectionIcon]}>
                <BarChart3
                  size={20}
                  color={APP_BRAND_COLOR}
                  strokeWidth={2.4}
                />
              </View>
              <View style={styles.sectionTitleCopy}>
                <Text style={styles.sectionTitle}>{copy.performance}</Text>
                <View style={styles.realtimeRow}>
                  {isSyncingStats ? (
                    <ActivityIndicator color={APP_BRAND_COLOR} size={12} />
                  ) : (
                    <View
                      style={[
                        styles.realtimeDot,
                        hasSyncError && styles.realtimeDotWarning,
                      ]}
                    />
                  )}
                  <Text
                    accessibilityLiveRegion="polite"
                    numberOfLines={1}
                    style={[
                      styles.realtimeText,
                      hasSyncError && styles.realtimeTextWarning,
                    ]}
                  >
                    {realtimeLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <MetricTile
                icon={
                  <Eye size={21} color={APP_BRAND_COLOR} strokeWidth={2.3} />
                }
                iconBackground="rgba(185, 28, 28, 0.10)"
                label={copy.views}
                value={formatNumber(ad.views)}
              />
              <MetricTile
                icon={
                  <MousePointerClick
                    size={21}
                    color="#2563EB"
                    strokeWidth={2.3}
                  />
                }
                iconBackground="#EFF6FF"
                label={copy.clicks}
                value={formatNumber(ad.clicks)}
              />
              <MetricTile
                icon={
                  <DollarSign size={21} color="#D97706" strokeWidth={2.3} />
                }
                iconBackground="#FFF7ED"
                label={copy.spent}
                value={formatCurrency(ad.spent)}
              />
              <MetricTile
                icon={<Megaphone size={21} color="#15803D" strokeWidth={2.3} />}
                iconBackground="#F0FDF4"
                label={copy.postedLabel}
                value={formatNumber(ad.posted)}
              />
            </View>
          </View>

          <DailyStatsChart
            copy={copy}
            dailyStats={dailyStats}
            isLoading={isLoadingStats}
          />

          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, styles.detailsSectionIcon]}>
                <Target size={20} color={APP_BRAND_COLOR} strokeWidth={2.4} />
              </View>
              <View style={styles.sectionTitleCopy}>
                <Text style={styles.sectionTitle}>{copy.details}</Text>
                <Text style={styles.sectionSubtitle}>
                  {copy.adDetailsTitle}
                </Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              <DetailRow
                icon={<Globe size={20} color="#64748B" />}
                label={copy.websiteLabel}
                onPress={handleOpenWebsite}
                value={website || 'N/A'}
              />
              <DetailRow
                icon={<Target size={20} color="#64748B" />}
                label={copy.countryLabel}
                value={ad.audience || 'N/A'}
              />
              <DetailRow
                icon={<MapPin size={20} color="#64748B" />}
                label={copy.locationLabel}
                value={ad.location || 'N/A'}
              />
              <DetailRow
                icon={<Users size={20} color="#64748B" />}
                label={copy.gender}
                value={getGenderLabel(ad.gender, copy)}
              />
              <DetailRow
                icon={<DollarSign size={20} color="#64748B" />}
                label={copy.budgetLabelDetails}
                value={
                  ad.budget && Number(ad.budget) > 0
                    ? formatCurrency(ad.budget)
                    : copy.unlimited
                }
              />
              <DetailRow
                icon={<CalendarDays size={20} color="#64748B" />}
                label={copy.timeLabel}
                value={schedule}
              />
              <DetailRow
                icon={<Hash size={20} color="#64748B" />}
                isLast
                label={copy.id || 'ID'}
                value={String(ad.id)}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleEdit}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.editButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Edit3 size={19} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.primaryButtonText}>{copy.edit}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  screenToolbar: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    zIndex: 20,
    elevation: 6,
  },
  toolbarBackButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  toolbarTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  toolbarTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  toolbarEditButton: {
    minWidth: 82,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(185, 28, 28, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.14)',
  },
  toolbarEditText: {
    color: APP_BRAND_COLOR,
    fontSize: 14,
    fontWeight: '800',
  },
  toolbarActionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  hero: {
    height: 220,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  heroMedia: {
    width: '100%',
    height: '100%',
  },
  heroShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  videoHero: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172033',
  },
  videoIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  videoLabel: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyHero: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
  },
  emptyHeroText: {
    marginTop: 10,
    color: '#7F1D1D',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 16,
    elevation: 1,
  },
  summaryCard: {
    marginTop: -26,
    borderRadius: 24,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eyebrow: {
    flex: 1,
    minWidth: 0,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    marginTop: 14,
    color: '#0F172A',
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  description: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  chipRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  brandChip: {
    backgroundColor: 'rgba(185, 28, 28, 0.09)',
  },
  infoChip: {
    backgroundColor: '#ECFEFF',
  },
  chipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  brandChipText: {
    color: APP_BRAND_COLOR,
  },
  infoChipText: {
    color: '#0E7490',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceSectionIcon: {
    backgroundColor: 'rgba(185, 28, 28, 0.09)',
  },
  chartSectionIcon: {
    backgroundColor: '#FDECEC',
  },
  detailsSectionIcon: {
    backgroundColor: '#FFF1F2',
  },
  sectionTitleCopy: {
    flex: 1,
    marginLeft: 12,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  realtimeRow: {
    marginTop: 4,
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  realtimeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  realtimeDotWarning: {
    backgroundColor: '#F59E0B',
  },
  realtimeText: {
    flex: 1,
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  realtimeTextWarning: {
    color: '#A16207',
  },
  metricGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    minWidth: 130,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 132,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  metricLabel: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  chartState: {
    minHeight: 164,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  chartStateTitle: {
    marginTop: 12,
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  chartStateText: {
    marginTop: 7,
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  legendRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clicksLegendDot: {
    backgroundColor: '#16A34A',
  },
  legendText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  chartContent: {
    minWidth: '100%',
    paddingTop: 14,
    paddingBottom: 2,
    gap: 8,
  },
  chartColumn: {
    width: 40,
    alignItems: 'center',
  },
  barTrack: {
    height: 104,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    width: 9,
    minHeight: 6,
    borderRadius: 5,
  },
  clicksBar: {
    backgroundColor: '#16A34A',
  },
  chartDate: {
    marginTop: 7,
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  detailsList: {
    marginTop: 14,
  },
  detailRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  detailValue: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  rowPressed: {
    opacity: 0.65,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: APP_BRAND_COLOR,
    shadowColor: APP_BRAND_COLOR,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  editButton: {
    marginTop: 2,
  },
  notFound: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(185, 28, 28, 0.09)',
  },
  notFoundTitle: {
    marginTop: 16,
    marginBottom: 22,
    color: '#334155',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default AdDetailsScreen;
