import React, { useMemo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { ArrowUpRight, Flag } from 'lucide-react-native';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import type {
  FeedPublisher,
  PostLinkPreview,
} from '../../domain/types/feed.types';

type Props = {
  preview: PostLinkPreview;
  publisher?: FeedPublisher;
  caption?: string;
  onPress: () => void;
};

function normalizeHandle(value?: string) {
  return (value ?? '').trim().replace(/^@/, '').toLowerCase();
}

export function parseVnseeaPageSlug(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (!/(^|\.)vnseea\.vn$/i.test(parsed.hostname)) return null;

    const decodedUrl = decodeURIComponent(rawUrl);
    if (!/(?:^|[/?=&])timeline(?:[/?=&]|$)/i.test(decodedUrl)) return null;

    const slug =
      parsed.searchParams.get('u') ??
      decodedUrl.match(/[?&]u=([^&#/]+)/i)?.[1] ??
      null;
    return slug ? slug.trim().replace(/^@/, '') : null;
  } catch {
    return null;
  }
}

export function isVnseeaPageLink(rawUrl: string) {
  return Boolean(parseVnseeaPageSlug(rawUrl));
}

function isGenericLoginCopy(value?: string) {
  const normalized = (value ?? '').trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('đăng nhập') ||
    normalized.includes('dang nhap') ||
    normalized.includes('login') ||
    normalized.includes('truy cập bảng tin')
  );
}

function titleFromSlug(slug: string) {
  const words = slug
    .split(/[-_]+/)
    .map(word => word.trim())
    .filter(Boolean);
  const title = words.join(' ');
  return title
    ? title.charAt(0).toUpperCase() + title.slice(1)
    : 'Trang VNSEEA';
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractVnseeaPageTitleFromCaption(
  caption: string | undefined,
  url: string,
) {
  const slug = parseVnseeaPageSlug(url);
  if (!caption || !slug) return undefined;

  const lines = caption
    .split(url)
    .join('')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const candidate = lines.at(-1);
  return candidate && slugify(candidate) === slugify(slug)
    ? candidate
    : undefined;
}

export function cleanVnseeaPageShareCaption(
  caption: string | undefined,
  url: string,
) {
  if (!caption || !isVnseeaPageLink(url)) return caption;

  const pageTitle = extractVnseeaPageTitleFromCaption(caption, url);
  const lines = caption
    .split(url)
    .join('')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (pageTitle && lines.at(-1) === pageTitle) lines.pop();
  return lines.join('\n').trim() || undefined;
}

export function VnseeaPageLinkPreviewCard({
  preview,
  publisher,
  caption,
  onPress,
}: Props) {
  const slug = parseVnseeaPageSlug(preview.url) ?? '';
  const publisherMatchesPage =
    Boolean(slug) &&
    normalizeHandle(publisher?.username) === normalizeHandle(slug);
  const captionPageTitle = extractVnseeaPageTitleFromCaption(
    caption,
    preview.url,
  );
  const title = isGenericLoginCopy(preview.title)
    ? captionPageTitle
      ? captionPageTitle
      : publisherMatchesPage && publisher?.name
      ? publisher.name
      : titleFromSlug(slug)
    : preview.title!;
  const description = isGenericLoginCopy(preview.description)
    ? 'Theo dõi Trang để xem bài viết, hình ảnh và những cập nhật mới nhất.'
    : preview.description;
  const fallbackAvatar = publisherMatchesPage
    ? publisher?.avatarUrl
    : undefined;
  const imageSource = useMemo(
    () => (preview.image ? { uri: preview.image } : undefined),
    [preview.image],
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Xem Trang ${title}`}
      activeOpacity={0.88}
      onPress={onPress}
      className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <View className="relative aspect-[16/9] w-full items-center justify-center overflow-hidden bg-brand-subtle">
        {imageSource ? (
          <Image
            source={imageSource}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : fallbackAvatar ? (
          <Image
            source={{ uri: fallbackAvatar }}
            className="h-24 w-24 rounded-full border-4 border-white bg-white"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
            <Flag size={36} color={APP_BRAND_COLOR} />
          </View>
        )}

        <View className="absolute left-3 top-3 flex-row items-center rounded-full bg-black/65 px-3 py-1.5">
          <Flag size={13} color={APP_COLORS.brand.onPrimary} />
          <Text className="ml-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
            Trang VNSEEA
          </Text>
        </View>
      </View>

      <View className="px-4 pb-4 pt-3">
        <Text
          className="text-lg font-extrabold text-slate-950"
          numberOfLines={2}
        >
          {title}
        </Text>
        {slug ? (
          <Text
            className="mt-0.5 text-sm font-semibold text-slate-500"
            numberOfLines={1}
          >
            @{slug}
          </Text>
        ) : null}
        {description ? (
          <Text
            className="mt-2 text-sm leading-5 text-slate-600"
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Text className="text-sm font-extrabold text-brand">Xem Trang</Text>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-subtle">
            <ArrowUpRight size={17} color={APP_BRAND_COLOR} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default VnseeaPageLinkPreviewCard;
