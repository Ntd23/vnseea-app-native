import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  BadgeCheck,
  ExternalLink,
  Flag,
  Link2,
  Newspaper,
  Users,
} from 'lucide-react-native';
import type { MessageLinkReference } from '../../domain/types/messages.types';
import { DoubleTapTouchable } from './DoubleTapTouchable';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { createPagesRepository, type PagesItem } from '../../../pages';

type MessageLinkPreviewCardProps = {
  reference: MessageLinkReference;
  caption?: string;
  isSentByMe: boolean;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onOpenPage?: (page: PagesItem) => void;
};

const CARD_WIDTH = Math.min(Dimensions.get('window').width - 88, 306);
const PAGE_PREVIEW_CACHE_LIMIT = 100;
const pageRepository = createPagesRepository();
const pagePreviewCache = new Map<string, Promise<PagesItem | null>>();

function titleFromPageName(pageName: string) {
  const title = pageName
    .split(/[-_]+/)
    .map(word => word.trim())
    .filter(Boolean)
    .join(' ');
  return title
    ? title.charAt(0).toLocaleUpperCase('vi-VN') + title.slice(1)
    : 'Trang VNSEEA';
}

function createFallbackPage(reference: MessageLinkReference): PagesItem {
  const pageName = reference.page?.pageName ?? '';
  return {
    id: pageName,
    pageId: '',
    pageName,
    pageTitle: reference.page?.pageTitle || titleFromPageName(pageName),
    url: reference.page?.publicUrl || reference.url,
  };
}

function loadPagePreview(pageName: string) {
  const normalizedPageName = pageName.trim().toLocaleLowerCase('vi-VN');
  const cached = pagePreviewCache.get(normalizedPageName);
  if (cached) return cached;

  while (pagePreviewCache.size >= PAGE_PREVIEW_CACHE_LIMIT) {
    const oldestKey = pagePreviewCache.keys().next().value;
    if (oldestKey === undefined) break;
    pagePreviewCache.delete(oldestKey);
  }

  const request = pageRepository.getPageDetail({ pageName }).catch(() => null);
  pagePreviewCache.set(normalizedPageName, request);
  return request;
}

function formatCount(value?: number) {
  if (!value || value <= 0) return undefined;
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return value.toLocaleString('vi-VN');
}

function SharedPagePreviewCard({
  page,
  note,
  isSentByMe,
  isLoading,
  onOpen,
  onLongPress,
  onDoubleTap,
}: {
  page: PagesItem;
  note?: string;
  isSentByMe: boolean;
  isLoading: boolean;
  onOpen: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}) {
  const followerCount = formatCount(page.followersCount);
  const postCount = formatCount(page.postCount);
  const description =
    page.pageDescription?.trim() ||
    'Khám phá thông tin, bài viết và những cập nhật mới nhất từ Trang này.';

  return (
    <View style={[styles.wrapper, { width: CARD_WIDTH }]}>
      {note ? (
        <Text
          style={[styles.caption, isSentByMe && styles.captionSent]}
          selectable
        >
          {note}
        </Text>
      ) : null}

      <DoubleTapTouchable
        accessibilityRole="button"
        accessibilityLabel={`Xem Trang ${page.pageTitle}`}
        activeOpacity={0.92}
        onSingleTap={onOpen}
        onLongPress={onLongPress}
        onDoubleTap={onDoubleTap}
        style={styles.pageCard}
      >
        <View style={styles.coverWrap}>
          {page.cover ? (
            <Image
              source={{ uri: page.cover }}
              resizeMode="cover"
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.coverFallback}>
              <View style={styles.coverGlowLarge} />
              <View style={styles.coverGlowSmall} />
              <Flag size={42} color={APP_COLORS.brand.onPrimary} />
            </View>
          )}

          <View style={styles.pageBadge}>
            <Flag size={12} color={APP_COLORS.brand.onPrimary} />
            <Text style={styles.pageBadgeText}>TRANG VNSEEA</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingBadge}>
              <ActivityIndicator
                size="small"
                color={APP_COLORS.brand.onPrimary}
              />
            </View>
          ) : null}

          <View style={styles.avatarFrame}>
            {page.avatar ? (
              <Image
                source={{ uri: page.avatar }}
                resizeMode="cover"
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Flag size={24} color={APP_BRAND_COLOR} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.pageBody}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {page.pageTitle || titleFromPageName(page.pageName)}
            </Text>
            {page.verified ? (
              <BadgeCheck
                size={18}
                color={APP_BRAND_COLOR}
                fill={APP_COLORS.brand.soft}
              />
            ) : null}
          </View>

          {page.pageName ? (
            <Text style={styles.pageHandle} numberOfLines={1}>
              @{page.pageName}
            </Text>
          ) : null}

          <Text style={styles.pageDescription} numberOfLines={2}>
            {description}
          </Text>

          {followerCount || postCount ? (
            <View style={styles.statsRow}>
              {followerCount ? (
                <View style={styles.statPill}>
                  <Users size={12} color="#64748B" />
                  <Text style={styles.statText}>
                    {followerCount} người theo dõi
                  </Text>
                </View>
              ) : null}
              {postCount ? (
                <View style={styles.statPill}>
                  <Newspaper size={12} color="#64748B" />
                  <Text style={styles.statText}>{postCount} bài viết</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.pageFooter}>
            <View>
              <Text style={styles.footerEyebrow}>Khám phá ngay</Text>
              <Text style={styles.footerAction}>Xem Trang</Text>
            </View>
            <View style={styles.openButton}>
              <ArrowUpRight
                size={18}
                color={APP_COLORS.brand.onPrimary}
                strokeWidth={2.6}
              />
            </View>
          </View>
        </View>
      </DoubleTapTouchable>
    </View>
  );
}

export function MessageLinkPreviewCard({
  reference,
  caption,
  isSentByMe,
  onLongPress,
  onDoubleTap,
  onOpenPage,
}: MessageLinkPreviewCardProps) {
  const pageName = reference.page?.pageName;
  const [loadedPage, setLoadedPage] = useState<PagesItem | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    if (!pageName) {
      setLoadedPage(undefined);
      return () => {
        cancelled = true;
      };
    }

    setLoadedPage(undefined);
    loadPagePreview(pageName).then(page => {
      if (!cancelled) setLoadedPage(page);
    });
    return () => {
      cancelled = true;
    };
  }, [pageName]);

  const fallbackPage = useMemo(
    () => (reference.page ? createFallbackPage(reference) : undefined),
    [reference],
  );
  const page = loadedPage || fallbackPage;
  const shouldShowPageCard = Boolean(
    reference.page && page && (loadedPage !== null || reference.page.explicit),
  );

  const openLink = useCallback(() => {
    Linking.openURL(reference.page?.publicUrl || reference.url).catch(
      () => undefined,
    );
  }, [reference.page?.publicUrl, reference.url]);

  const openPage = useCallback(() => {
    if (page && onOpenPage) {
      onOpenPage(page);
      return;
    }
    openLink();
  }, [onOpenPage, openLink, page]);

  if (shouldShowPageCard && page) {
    return (
      <SharedPagePreviewCard
        page={page}
        note={reference.page?.note}
        isSentByMe={isSentByMe}
        isLoading={loadedPage === undefined}
        onOpen={openPage}
        onLongPress={onLongPress}
        onDoubleTap={onDoubleTap}
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      {caption ? (
        <Text
          style={[styles.caption, isSentByMe && styles.captionSent]}
          selectable
        >
          {caption}
        </Text>
      ) : null}
      <DoubleTapTouchable
        activeOpacity={0.88}
        onSingleTap={openLink}
        onLongPress={onLongPress}
        onDoubleTap={onDoubleTap}
        style={[styles.card, isSentByMe && styles.cardSent]}
      >
        <View style={styles.icon}>
          <Link2 size={19} color={APP_BRAND_COLOR} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.host} numberOfLines={1}>
            {reference.host}
          </Text>
          <Text style={styles.url} numberOfLines={1}>
            {reference.page?.publicUrl || reference.url}
          </Text>
        </View>
        <ExternalLink size={17} color="#64748B" />
      </DoubleTapTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: 306,
  },
  caption: {
    marginBottom: 6,
    borderRadius: 15,
    borderBottomLeftRadius: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 19,
  },
  captionSent: {
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 5,
    backgroundColor: APP_BRAND_COLOR,
    color: APP_COLORS.brand.onPrimary,
  },
  pageCard: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  coverWrap: {
    height: 132,
    position: 'relative',
    backgroundColor: APP_COLORS.brand.soft,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: APP_BRAND_COLOR,
  },
  coverGlowLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    top: -112,
    right: -46,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  coverGlowSmall: {
    position: 'absolute',
    width: 94,
    height: 94,
    bottom: -52,
    left: 20,
    borderRadius: 47,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pageBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pageBadgeText: {
    marginLeft: 5,
    color: APP_COLORS.brand.onPrimary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  loadingBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.66)',
  },
  avatarFrame: {
    position: 'absolute',
    left: 15,
    bottom: -27,
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: APP_COLORS.brand.soft,
  },
  pageBody: {
    paddingHorizontal: 15,
    paddingBottom: 14,
    paddingTop: 34,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pageTitle: {
    minWidth: 0,
    flex: 1,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  pageHandle: {
    marginTop: 2,
    color: APP_BRAND_COLOR,
    fontSize: 12.5,
    fontWeight: '700',
  },
  pageDescription: {
    marginTop: 9,
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
  },
  statsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statPill: {
    marginRight: 6,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statText: {
    marginLeft: 4,
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  pageFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 11,
  },
  footerEyebrow: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerAction: {
    marginTop: 1,
    color: APP_BRAND_COLOR,
    fontSize: 13.5,
    fontWeight: '900',
  },
  openButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: APP_BRAND_COLOR,
    shadowColor: APP_BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardSent: {
    borderColor: APP_COLORS.brand.border,
    backgroundColor: APP_COLORS.brand.soft,
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: APP_COLORS.brand.soft,
  },
  copy: {
    minWidth: 0,
    flex: 1,
    marginHorizontal: 10,
  },
  host: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  url: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 11.5,
  },
});
