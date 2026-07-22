// Description: Google-Maps-style draggable place sheet with three snap levels.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Clock3,
  Eye,
  ExternalLink,
  Heart,
  MapPin,
  Navigation as NavigationIcon,
  Phone,
  Share2,
  Users,
  X,
} from 'lucide-react-native';
import type { MapPlaceReview } from '../../domain/types/user.types';

const BRAND = '#0000FF';
const ACTION_TEAL = '#008C95';
const ACTION_PALE = '#CFF7FB';

export type MapPlaceDetailSheetSnap = 'peek' | 'half' | 'expanded';

const SHEET_SNAPS: MapPlaceDetailSheetSnap[] = ['peek', 'half', 'expanded'];
const SHEET_SPRING = {
  damping: 30,
  stiffness: 280,
  mass: 0.9,
  overshootClamping: true,
} as const;
const SHEET_FLING_VELOCITY = 650;

export type MapPlaceDetailSheetPlace = {
  id: string;
  source: 'page' | 'google' | 'self';
  title: string;
  subtitle?: string;
  address?: string;
  distanceText?: string;
  durationText?: string;
  rating?: number;
  ratingsTotal?: number;
  openNow?: boolean;
  photoUrls?: string[];
  reviews?: MapPlaceReview[];
  editorialSummary?: string;
  phoneNumber?: string;
  website?: string;
  weekdayText?: string[];
  businessStatus?: string;
  priceLevel?: number;
  pageFollowersCount?: number;
  pageLikes?: number;
  pagePostCount?: number;
  pageCategory?: string;
  pageDescription?: string;
  isOwnedPage?: boolean;
};

export type MapPlaceDetailSheetSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
  distanceText?: string;
  rating?: number;
  source: 'page' | 'google';
};

export function getMapPlaceDetailSheetHeights(
  viewportHeight: number,
  topInset: number,
  bottomInset: number,
) {
  const expandedTopClearance = Math.max(
    topInset + 10,
    Platform.OS === 'android' ? 62 : 72,
  );
  const expanded = Math.max(430, viewportHeight - expandedTopClearance);
  const peek = Math.min(
    Math.max(184 + bottomInset, viewportHeight * 0.24),
    expanded - 190,
  );
  const half = Math.min(
    Math.max(viewportHeight * 0.53, peek + 140),
    expanded - 82,
  );

  return { peek, half, expanded };
}

type MapPlaceDetailSheetProps = {
  place: MapPlaceDetailSheetPlace;
  isDirectionsLoading?: boolean;
  directionsDisabled?: boolean;
  onClose: () => void;
  onShare: () => void;
  onDirections: () => void;
  onStart: () => void;
  onOpenPage?: () => void;
  suggestions?: MapPlaceDetailSheetSuggestion[];
  onSuggestionPress?: (suggestionId: string) => void;
  onSnapChange?: (snap: MapPlaceDetailSheetSnap) => void;
};

function uniquePhotoUrls(urls?: string[]) {
  return Array.from(
    new Set(
      (urls ?? [])
        .map(url => String(url || '').trim())
        .filter(url => /^https?:\/\//i.test(url)),
    ),
  ).slice(0, 6);
}

function actionAccessibilityLabel(label: string, disabled: boolean) {
  return disabled ? `${label}, không khả dụng` : label;
}

function formatCompactCount(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return '--';
  if (value < 1000) return `${Math.max(0, Math.round(value))}`;
  if (value < 1000000) {
    return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}K`;
  }
  return `${(value / 1000000).toFixed(value < 10000000 ? 1 : 0)}M`;
}

function businessStatusLabel(status?: string) {
  if (status === 'OPERATIONAL') return 'Đang hoạt động';
  if (status === 'CLOSED_TEMPORARILY') return 'Tạm thời đóng cửa';
  if (status === 'CLOSED_PERMANENTLY') return 'Đã đóng cửa';
  return '';
}

function websiteLabel(website?: string) {
  return String(website || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

function openExternalUrl(url: string) {
  Linking.canOpenURL(url)
    .then(canOpen => (canOpen ? Linking.openURL(url) : undefined))
    .catch(() => undefined);
}

function openWebsite(website?: string) {
  const trimmed = String(website || '').trim();
  if (!trimmed) return;
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  openExternalUrl(url);
}

function callPhone(phoneNumber?: string) {
  const normalized = String(phoneNumber || '').replace(/[^+\d]/g, '');
  if (!normalized) return;
  openExternalUrl(`tel:${normalized}`);
}

export function MapPlaceDetailSheet({
  place,
  isDirectionsLoading = false,
  directionsDisabled = false,
  onClose,
  onShare,
  onDirections,
  onStart,
  onOpenPage,
  suggestions = [],
  onSuggestionPress,
  onSnapChange,
}: MapPlaceDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [snap, setSnap] = useState<MapPlaceDetailSheetSnap>('peek');
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const isScrollAtTopRef = useRef(true);
  const translateY = useSharedValue(viewportHeight);
  const dragStartTranslateY = useSharedValue(0);

  const heights = useMemo(
    () =>
      getMapPlaceDetailSheetHeights(viewportHeight, insets.top, insets.bottom),
    [insets.bottom, insets.top, viewportHeight],
  );

  const allPhotoUrls = useMemo(
    () => uniquePhotoUrls(place.photoUrls),
    [place.photoUrls],
  );
  const visiblePhotoUrls = useMemo(
    () => allPhotoUrls.filter(url => !failedPhotoUrls.has(url)),
    [allPhotoUrls, failedPhotoUrls],
  );
  const hasSecondaryDetails = Boolean(
    place.rating !== undefined ||
      place.ratingsTotal !== undefined ||
      place.openNow !== undefined ||
      place.distanceText ||
      place.durationText,
  );
  const reviews = useMemo(
    () =>
      (place.reviews ?? []).filter(
        review => Boolean(review.text?.trim()) || review.rating !== undefined,
      ),
    [place.reviews],
  );
  const googleBusinessStatus = businessStatusLabel(place.businessStatus);
  const googlePriceText =
    place.priceLevel !== undefined && Number.isFinite(place.priceLevel)
      ? '₫'.repeat(Math.max(1, Math.min(4, Math.round(place.priceLevel))))
      : '';
  const hasGoogleFallbackInfo = Boolean(
    place.editorialSummary ||
      place.phoneNumber ||
      place.website ||
      place.weekdayText?.length ||
      googleBusinessStatus ||
      googlePriceText,
  );

  const commitSnap = useCallback(
    (nextSnap: MapPlaceDetailSheetSnap) => {
      if (nextSnap !== 'expanded' && scrollOffsetRef.current > 0) {
        scrollOffsetRef.current = 0;
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
      setSnap(nextSnap);
      onSnapChange?.(nextSnap);
    },
    [onSnapChange],
  );

  const animateTo = useCallback(
    (nextSnap: MapPlaceDetailSheetSnap) => {
      commitSnap(nextSnap);
      translateY.value = withSpring(
        heights.expanded - heights[nextSnap],
        SHEET_SPRING,
      );
    },
    [commitSnap, heights, translateY],
  );

  useEffect(() => {
    setFailedPhotoUrls(new Set());
    scrollOffsetRef.current = 0;
    isScrollAtTopRef.current = true;
    setIsScrollAtTop(true);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    cancelAnimation(translateY);
    translateY.value = heights.expanded - heights.peek;
    setSnap('peek');
    onSnapChange?.('peek');

    return () => {
      cancelAnimation(translateY);
    };
  }, [heights.expanded, heights.peek, onSnapChange, place.id, translateY]);

  const gestures = useMemo(() => {
    const snapOffsets = [
      heights.expanded - heights.peek,
      heights.expanded - heights.half,
      0,
    ];
    const currentIndex = SHEET_SNAPS.indexOf(snap);

    const createGesture = (enabled: boolean, downwardOnly = false) => {
      const gesture = Gesture.Pan().enabled(enabled);
      if (downwardOnly) {
        gesture.activeOffsetY(6).failOffsetY(-6);
      } else {
        gesture.activeOffsetY([-6, 6]);
      }

      return gesture
        .failOffsetX([-24, 24])
        .onBegin(() => {
          'worklet';
          cancelAnimation(translateY);
          dragStartTranslateY.value = translateY.value;
        })
        .onUpdate(event => {
          'worklet';
          translateY.value = Math.max(
            0,
            Math.min(
              snapOffsets[0],
              dragStartTranslateY.value + event.translationY,
            ),
          );
        })
        .onEnd(event => {
          'worklet';
          const releasedTranslateY = translateY.value;
          let targetIndex = snapOffsets.reduce(
            (nearestIndex, offset, index) =>
              Math.abs(offset - releasedTranslateY) <
              Math.abs(snapOffsets[nearestIndex] - releasedTranslateY)
                ? index
                : nearestIndex,
            0,
          );

          if (event.velocityY < -SHEET_FLING_VELOCITY) {
            targetIndex = Math.max(
              targetIndex,
              Math.min(currentIndex + 1, SHEET_SNAPS.length - 1),
            );
          } else if (event.velocityY > SHEET_FLING_VELOCITY) {
            targetIndex = Math.min(targetIndex, Math.max(currentIndex - 1, 0));
          }

          const targetSnap = SHEET_SNAPS[targetIndex];
          translateY.value = withSpring(snapOffsets[targetIndex], SHEET_SPRING);
          runOnJS(commitSnap)(targetSnap);
        });
    };

    return {
      header: createGesture(true),
      body: createGesture(
        snap !== 'expanded' || isScrollAtTop,
        snap === 'expanded',
      ),
    };
  }, [
    commitSnap,
    dragStartTranslateY,
    heights,
    isScrollAtTop,
    snap,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const markPhotoFailed = useCallback((url: string) => {
    setFailedPhotoUrls(current => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }, []);

  const showDetails = useCallback(() => {
    animateTo('expanded');
  }, [animateTo]);

  const actionDisabled = directionsDisabled || isDirectionsLoading;

  return (
    <Reanimated.View
      style={[
        styles.sheet,
        {
          height: heights.expanded,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={gestures.header}>
        <View collapsable={false}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text
                style={styles.title}
                numberOfLines={snap === 'peek' ? 1 : 2}
              >
                {place.title}
              </Text>
              {snap !== 'peek' && place.subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {place.subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                accessibilityLabel="Mở rộng chi tiết địa điểm"
                activeOpacity={0.82}
                style={styles.roundButton}
                onPress={showDetails}
              >
                <Eye size={21} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Chia sẻ địa điểm"
                activeOpacity={0.82}
                style={styles.roundButton}
                onPress={onShare}
              >
                <Share2 size={21} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Đóng chi tiết địa điểm"
                activeOpacity={0.82}
                style={styles.roundButton}
                onPress={onClose}
              >
                <X size={23} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GestureDetector>

      <GestureDetector gesture={gestures.body}>
        <View style={styles.body} collapsable={false}>
          {snap !== 'peek' && hasSecondaryDetails ? (
            <View style={styles.metaRow}>
              {place.rating !== undefined ? (
                <Text style={styles.ratingText}>
                  {place.rating.toFixed(1)}{' '}
                  <Text style={styles.stars}>★★★★★</Text>
                  {place.ratingsTotal !== undefined
                    ? ` (${place.ratingsTotal})`
                    : ''}
                </Text>
              ) : null}
              {place.durationText ? (
                <Text style={styles.metaText}> · {place.durationText}</Text>
              ) : null}
              {place.distanceText ? (
                <Text style={styles.metaText}> · {place.distanceText}</Text>
              ) : null}
            </View>
          ) : null}

          {snap !== 'peek' && place.openNow !== undefined ? (
            <Text style={place.openNow ? styles.openText : styles.closedText}>
              {place.openNow ? 'Đang mở cửa' : 'Đang đóng cửa'}
            </Text>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={snap === 'expanded'}
            scrollEnabled={snap === 'expanded'}
            nestedScrollEnabled
            onScroll={event => {
              const nextOffset = event.nativeEvent.contentOffset.y;
              scrollOffsetRef.current = nextOffset;
              const nextIsAtTop = nextOffset <= 0.5;
              if (nextIsAtTop !== isScrollAtTopRef.current) {
                isScrollAtTopRef.current = nextIsAtTop;
                setIsScrollAtTop(nextIsAtTop);
              }
            }}
            scrollEventThrottle={16}
          >
            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityLabel={actionAccessibilityLabel(
                  'Đường đi',
                  actionDisabled,
                )}
                activeOpacity={0.86}
                style={[
                  styles.actionButton,
                  styles.primaryAction,
                  actionDisabled && styles.actionDisabled,
                ]}
                onPress={onDirections}
                disabled={actionDisabled}
              >
                {isDirectionsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <NavigationIcon size={19} color="#FFFFFF" />
                )}
                <Text style={styles.primaryActionText}>Đường đi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={actionAccessibilityLabel(
                  'Bắt đầu dẫn đường',
                  actionDisabled,
                )}
                activeOpacity={0.86}
                style={[
                  styles.actionButton,
                  styles.secondaryAction,
                  actionDisabled && styles.actionDisabled,
                ]}
                onPress={onStart}
                disabled={actionDisabled}
              >
                <NavigationIcon size={18} color="#00666C" fill="#00666C" />
                <Text style={styles.secondaryActionText}>Bắt đầu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Mở rộng chi tiết địa điểm"
                activeOpacity={0.86}
                style={[styles.actionButton, styles.secondaryAction]}
                onPress={showDetails}
              >
                <Eye size={18} color="#00666C" />
                <Text style={styles.secondaryActionText}>Chi tiết</Text>
              </TouchableOpacity>
            </View>

            {snap !== 'peek' && visiblePhotoUrls.length > 0 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoList}
              >
                {visiblePhotoUrls.map((url, index) => (
                  <Image
                    key={`${place.id}:photo:${url}`}
                    source={{ uri: url }}
                    style={[
                      styles.photo,
                      snap === 'expanded' && styles.photoExpanded,
                      index === 0 && styles.firstPhoto,
                    ]}
                    resizeMode="cover"
                    onError={() => markPhotoFailed(url)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {snap === 'expanded' ? (
              <View style={styles.overview}>
                <Text style={styles.sectionTitle}>Tổng quan</Text>
                <View style={styles.infoCard}>
                  <MapPin size={21} color={BRAND} />
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoLabel}>Địa chỉ</Text>
                    <Text style={styles.infoValue}>
                      {place.address || place.subtitle || 'Chưa có địa chỉ'}
                    </Text>
                  </View>
                </View>

                {place.source === 'page' ? (
                  <View style={styles.pageSection}>
                    <View style={styles.sectionHeadingRow}>
                      <Text style={styles.sectionTitle}>Thông tin Page</Text>
                      {place.isOwnedPage ? (
                        <View style={styles.ownedPageBadge}>
                          <Text style={styles.ownedPageBadgeText}>
                            Page của bạn
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {place.pageCategory ? (
                      <Text style={styles.pageCategory}>
                        {place.pageCategory}
                      </Text>
                    ) : null}

                    <View style={styles.pageStatsCard}>
                      <View style={styles.pageStatItem}>
                        <Users size={21} color="#0000FF" />
                        <Text style={styles.pageStatValue}>
                          {formatCompactCount(place.pageFollowersCount)}
                        </Text>
                        <Text style={styles.pageStatLabel}>Người theo dõi</Text>
                      </View>
                      <View style={styles.pageStatDivider} />
                      <View style={styles.pageStatItem}>
                        <Heart size={21} color="#EF4444" fill="#EF4444" />
                        <Text style={styles.pageStatValue}>
                          {formatCompactCount(place.pageLikes)}
                        </Text>
                        <Text style={styles.pageStatLabel}>Lượt thích</Text>
                      </View>
                      <View style={styles.pageStatDivider} />
                      <View style={styles.pageStatItem}>
                        <Eye size={21} color="#64748B" />
                        <Text style={styles.pageStatValue}>
                          {formatCompactCount(place.pagePostCount)}
                        </Text>
                        <Text style={styles.pageStatLabel}>Bài viết</Text>
                      </View>
                    </View>

                    {place.pageDescription ? (
                      <Text style={styles.pageDescription} numberOfLines={5}>
                        {place.pageDescription}
                      </Text>
                    ) : null}

                    {onOpenPage ? (
                      <TouchableOpacity
                        accessibilityLabel="Truy cập Page"
                        activeOpacity={0.86}
                        style={styles.openPageButton}
                        onPress={onOpenPage}
                      >
                        <ExternalLink size={19} color="#FFFFFF" />
                        <Text style={styles.openPageButtonText}>
                          Truy cập Page
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {place.source === 'google' && reviews.length > 0 ? (
                  <View style={styles.reviewSection}>
                    <Text style={styles.sectionTitle}>Đánh giá từ Google</Text>
                    {reviews.map((review, index) => (
                      <View
                        key={`${place.id}:review:${
                          review.time || 'none'
                        }:${index}`}
                        style={styles.reviewCard}
                      >
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewAvatar}>
                            <Text style={styles.reviewAvatarText}>
                              {(review.authorName || 'G')
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.reviewHeaderCopy}>
                            <Text style={styles.reviewAuthor} numberOfLines={1}>
                              {review.authorName || 'Người dùng Google'}
                            </Text>
                            <View style={styles.reviewMetaRow}>
                              {review.rating !== undefined ? (
                                <Text style={styles.reviewRating}>
                                  {review.rating.toFixed(1)} ★
                                </Text>
                              ) : null}
                              {review.relativeTimeDescription ? (
                                <Text style={styles.reviewTime}>
                                  {review.relativeTimeDescription}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                        <Text style={styles.reviewText}>
                          {review.text ||
                            `Người dùng đã chấm ${
                              review.rating?.toFixed(1) || ''
                            } sao.`}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {place.source === 'google' && reviews.length === 0 ? (
                  <View style={styles.googleFallbackSection}>
                    <Text style={styles.sectionTitle}>Thông tin thêm</Text>

                    {place.editorialSummary ? (
                      <View style={styles.editorialCard}>
                        <Text style={styles.editorialText}>
                          {place.editorialSummary}
                        </Text>
                      </View>
                    ) : null}

                    {googleBusinessStatus || googlePriceText ? (
                      <View style={styles.googleMetaPills}>
                        {googleBusinessStatus ? (
                          <View style={styles.googleMetaPill}>
                            <Text style={styles.googleMetaPillText}>
                              {googleBusinessStatus}
                            </Text>
                          </View>
                        ) : null}
                        {googlePriceText ? (
                          <View style={styles.googleMetaPill}>
                            <Text style={styles.googleMetaPillText}>
                              Mức giá {googlePriceText}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {place.phoneNumber ? (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={styles.googleInfoRow}
                        onPress={() => callPhone(place.phoneNumber)}
                      >
                        <Phone size={20} color="#006B64" />
                        <View style={styles.googleInfoCopy}>
                          <Text style={styles.googleInfoLabel}>Điện thoại</Text>
                          <Text style={styles.googleInfoValue}>
                            {place.phoneNumber}
                          </Text>
                        </View>
                        <ChevronRight size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}

                    {place.website ? (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={styles.googleInfoRow}
                        onPress={() => openWebsite(place.website)}
                      >
                        <ExternalLink size={20} color="#006B64" />
                        <View style={styles.googleInfoCopy}>
                          <Text style={styles.googleInfoLabel}>Website</Text>
                          <Text
                            style={styles.googleInfoValue}
                            numberOfLines={1}
                          >
                            {websiteLabel(place.website)}
                          </Text>
                        </View>
                        <ChevronRight size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}

                    {place.weekdayText?.length ? (
                      <View style={styles.openingHoursCard}>
                        <View style={styles.openingHoursHeader}>
                          <Clock3 size={20} color="#006B64" />
                          <Text style={styles.openingHoursTitle}>
                            Giờ mở cửa
                          </Text>
                        </View>
                        {place.weekdayText.map((line, index) => (
                          <Text
                            key={`${place.id}:opening:${index}`}
                            style={styles.openingHoursLine}
                          >
                            {line}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {!hasGoogleFallbackInfo && suggestions.length === 0 ? (
                      <Text style={styles.noExtraInfoText}>
                        Google chưa cung cấp thêm đánh giá hoặc thông tin cho
                        địa điểm này.
                      </Text>
                    ) : null}

                    {suggestions.length > 0 ? (
                      <View style={styles.suggestionsSection}>
                        <Text style={styles.sectionTitle}>
                          Địa điểm gợi ý khác
                        </Text>
                        {suggestions.map(suggestion => (
                          <TouchableOpacity
                            key={suggestion.id}
                            activeOpacity={0.84}
                            style={styles.suggestionRow}
                            onPress={() => onSuggestionPress?.(suggestion.id)}
                          >
                            <View style={styles.suggestionIcon}>
                              <MapPin size={19} color="#006B64" />
                            </View>
                            <View style={styles.suggestionCopy}>
                              <Text
                                style={styles.suggestionTitle}
                                numberOfLines={1}
                              >
                                {suggestion.title}
                              </Text>
                              {suggestion.subtitle ? (
                                <Text
                                  style={styles.suggestionSubtitle}
                                  numberOfLines={2}
                                >
                                  {suggestion.subtitle}
                                </Text>
                              ) : null}
                              <Text style={styles.suggestionMeta}>
                                {[
                                  suggestion.source === 'page'
                                    ? 'Page VNSEEA'
                                    : 'Google',
                                  suggestion.rating !== undefined
                                    ? `${suggestion.rating.toFixed(1)} ★`
                                    : '',
                                  suggestion.distanceText,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </View>
                            <ChevronRight size={21} color="#94A3B8" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {place.source === 'google' ? (
                  <Text style={styles.googleAttribution}>
                    Thông tin địa điểm do Google cung cấp.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </GestureDetector>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 35,
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#C4C7C9',
  },
  header: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: '#111827',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 3,
    color: '#5F6368',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundButton: {
    width: 46,
    height: 46,
    marginLeft: 8,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
  },
  body: {
    flex: 1,
  },
  metaRow: {
    minHeight: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  ratingText: {
    color: '#5F6368',
    fontSize: 15,
    fontWeight: '700',
  },
  stars: {
    color: '#F7B500',
    letterSpacing: -1,
  },
  metaText: {
    color: '#5F6368',
    fontSize: 14,
    fontWeight: '600',
  },
  openText: {
    marginTop: 4,
    paddingHorizontal: 18,
    color: '#188038',
    fontSize: 14,
    fontWeight: '800',
  },
  closedText: {
    marginTop: 4,
    paddingHorizontal: 18,
    color: '#B3261E',
    fontSize: 14,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  actionButton: {
    minHeight: 50,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 25,
    paddingHorizontal: 12,
  },
  primaryAction: {
    flex: 1.14,
    backgroundColor: ACTION_TEAL,
  },
  secondaryAction: {
    backgroundColor: ACTION_PALE,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  primaryActionText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryActionText: {
    marginLeft: 6,
    color: '#00666C',
    fontSize: 13,
    fontWeight: '900',
  },
  photoList: {
    paddingTop: 14,
    paddingRight: 18,
    paddingBottom: 6,
  },
  photo: {
    width: 220,
    height: 168,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  photoExpanded: {
    width: 260,
    height: 228,
  },
  firstPhoto: {
    marginLeft: 18,
  },
  overview: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#F7F8FF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 4,
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageSection: {
    marginTop: 24,
  },
  ownedPageBadge: {
    marginLeft: 12,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ownedPageBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
  },
  pageCategory: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  pageStatsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  pageStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  pageStatDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  pageStatValue: {
    marginTop: 6,
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  pageStatLabel: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  pageDescription: {
    marginTop: 14,
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  openPageButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 26,
    backgroundColor: '#0000FF',
  },
  openPageButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  reviewSection: {
    marginTop: 24,
  },
  reviewCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E0F2FE',
  },
  reviewAvatarText: {
    color: '#0369A1',
    fontSize: 17,
    fontWeight: '900',
  },
  reviewHeaderCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 11,
  },
  reviewAuthor: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  reviewRating: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
  },
  reviewTime: {
    marginLeft: 8,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewText: {
    marginTop: 11,
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  googleFallbackSection: {
    marginTop: 24,
  },
  editorialCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  editorialText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  googleMetaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  googleMetaPill: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  googleMetaPillText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
  },
  googleInfoRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  googleInfoCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
  },
  googleInfoLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  googleInfoValue: {
    marginTop: 3,
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  openingHoursCard: {
    marginTop: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    padding: 15,
  },
  openingHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  openingHoursTitle: {
    marginLeft: 9,
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  openingHoursLine: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  noExtraInfoText: {
    marginTop: 13,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  suggestionsSection: {
    marginTop: 24,
  },
  suggestionRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  suggestionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E6FFFA',
  },
  suggestionCopy: {
    minWidth: 0,
    flex: 1,
    marginHorizontal: 12,
  },
  suggestionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  suggestionSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  suggestionMeta: {
    marginTop: 4,
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
  },
  googleAttribution: {
    marginTop: 14,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default MapPlaceDetailSheet;
