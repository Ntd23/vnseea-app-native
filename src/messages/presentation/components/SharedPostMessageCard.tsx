import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Building2,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  FileText,
  MapPin,
  Play,
  ShoppingBag,
} from 'lucide-react-native';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import {
  createSharedPostPreviewLoader,
  type SharedPostOpenTarget,
  type SharedPostPreviewModel,
} from '../../application/shared-posts/sharedPostMessage';
import type { SharedPostMessageReference } from '../../domain/types/messages.types';
import { DoubleTapTouchable } from './DoubleTapTouchable';

const sharedPostPreviewLoader = createSharedPostPreviewLoader(
  createFeedRepository(),
);

type SharedPostMessageCardProps = {
  reference: SharedPostMessageReference;
  onOpenPost: (target: SharedPostOpenTarget) => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  loadPreview?: (postId: string) => Promise<SharedPostPreviewModel>;
};

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: SharedPostPreviewModel }
  | { status: 'error' };

type PreviewColors = {
  border: string;
  card: string;
  fallback: string;
  primary: string;
  secondary: string;
};

const KIND_COPY = {
  vi: {
    text: 'Bài viết',
    video: 'Video',
    poll: 'Thăm dò',
    product: 'Sản phẩm',
    event: 'Sự kiện',
    job: 'Việc làm',
    ad: 'Quảng cáo',
  },
  en: {
    text: 'Post',
    video: 'Video',
    poll: 'Poll',
    product: 'Product',
    event: 'Event',
    job: 'Job',
    ad: 'Ad',
  },
} as const;

const ERROR_COPY = {
  vi: 'Không thể tải xem trước bài viết',
  en: 'Could not load the post preview',
} as const;

const JOB_CARD_COPY = {
  vi: {
    label: 'TUYỂN DỤNG',
    salary: 'Mức lương',
    negotiable: 'Thỏa thuận',
    details: 'Xem chi tiết công việc',
  },
  en: {
    label: 'HIRING',
    salary: 'Salary',
    negotiable: 'Negotiable',
    details: 'View job details',
  },
} as const;

function PreviewPublisher({
  preview,
  colors,
  kindLabel,
}: {
  preview: SharedPostPreviewModel;
  colors: PreviewColors;
  kindLabel?: string;
}) {
  return (
    <View className="flex-row items-center">
      {preview.publisherAvatar ? (
        <Image
          source={{ uri: preview.publisherAvatar }}
          className="mr-2 h-8 w-8 rounded-full bg-slate-200"
        />
      ) : (
        <View
          className="mr-2 h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.fallback }}
        >
          <FileText size={14} color={colors.secondary} />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px] font-extrabold"
          style={{ color: colors.primary }}
          numberOfLines={1}
        >
          {preview.publisherName}
        </Text>
        {kindLabel ? (
          <Text
            className="text-[11px] font-medium"
            style={{ color: colors.secondary }}
          >
            {kindLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PreviewDetails({
  preview,
  colors,
  kindLabel,
  language,
}: {
  preview: SharedPostPreviewModel;
  colors: PreviewColors;
  kindLabel: string;
  language: keyof typeof JOB_CARD_COPY;
}) {
  const isProduct = preview.kind === 'product';
  const isJob = preview.kind === 'job';

  if (isJob) {
    const copy = JOB_CARD_COPY[language];
    return (
      <View className="px-4 pb-4 pt-3.5">
        <View className="flex-row items-start">
          {preview.companyAvatar ? (
            <Image
              source={{ uri: preview.companyAvatar }}
              className="mr-3 h-11 w-11 rounded-xl bg-slate-100"
            />
          ) : (
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
              <Building2 size={22} color="#2563EB" />
            </View>
          )}
          <View className="min-w-0 flex-1">
            <View className="mb-1 flex-row items-center">
              <BriefcaseBusiness
                size={13}
                color="#2563EB"
                strokeWidth={2.5}
              />
              <Text className="ml-1.5 text-[10.5px] font-extrabold tracking-[0.6px] text-blue-600 dark:text-blue-400">
                {preview.eyebrow || copy.label}
              </Text>
            </View>
            <Text
              className="text-[17px] font-extrabold leading-[22px]"
              style={{ color: colors.primary }}
              numberOfLines={2}
            >
              {preview.title}
            </Text>
            <Text
              className="mt-1 text-[12px] font-semibold"
              style={{ color: colors.secondary }}
              numberOfLines={1}
            >
              {preview.companyName || preview.publisherName}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-950/40">
          <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-900">
            <CircleDollarSign size={17} color="#16A34A" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[0.5px] text-slate-500 dark:text-slate-400">
              {copy.salary}
            </Text>
            <Text
              className="mt-0.5 text-[14px] font-extrabold text-green-600 dark:text-green-400"
              numberOfLines={1}
            >
              {preview.price || copy.negotiable}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center">
          {preview.points ? (
            <View className="mb-1 mr-1.5 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
              <Text className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                {preview.points}
              </Text>
            </View>
          ) : null}
          {preview.category ? (
            <View className="mb-1 rounded-full bg-violet-50 px-2.5 py-1 dark:bg-violet-950/40">
              <Text className="text-[10.5px] font-bold text-violet-600 dark:text-violet-300">
                {preview.category}
              </Text>
            </View>
          ) : null}
        </View>

        {preview.location ? (
          <View className="mt-1.5 flex-row items-center">
            <MapPin size={14} color="#EF4444" />
            <Text
              className="ml-1.5 min-w-0 flex-1 text-[11.5px] font-semibold"
              style={{ color: colors.secondary }}
              numberOfLines={1}
            >
              {preview.location}
            </Text>
          </View>
        ) : null}

        {preview.description ? (
          <Text
            className="mt-2.5 text-[12px] leading-[17px]"
            style={{ color: colors.secondary }}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        ) : null}

        <View
          className="mt-3 flex-row items-center justify-between border-t pt-3"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-[11.5px] font-extrabold text-blue-600 dark:text-blue-400">
            {copy.details}
          </Text>
          <View className="h-7 w-7 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50">
            <ChevronRight size={16} color="#2563EB" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    );
  }

  if (isProduct) {
    return (
      <View className="px-4 py-3.5">
        <View className="mb-2 flex-row items-center">
          <ShoppingBag size={15} color={APP_BRAND_COLOR} strokeWidth={2.4} />
          <Text className="ml-2 text-[12px] font-extrabold uppercase text-brand">
            {preview.eyebrow || kindLabel}
          </Text>
        </View>
        <Text
          className="text-[18px] font-extrabold leading-6"
          style={{ color: colors.primary }}
          numberOfLines={2}
        >
          {preview.title}
        </Text>
        {preview.price ? (
          <Text
            className="mt-1.5 text-[17px] font-extrabold"
            style={{ color: APP_BRAND_COLOR }}
            numberOfLines={2}
          >
            {preview.price}
          </Text>
        ) : null}
        {preview.points ? (
          <Text className="mt-1 text-[14px] font-extrabold text-blue-500">
            {preview.points}
          </Text>
        ) : null}
        {preview.description ? (
          <Text
            className="mt-2 text-[12.5px] leading-[18px]"
            style={{ color: colors.secondary }}
            numberOfLines={3}
          >
            {preview.description}
          </Text>
        ) : null}
        {preview.location ? (
          <View className="mt-2 flex-row items-center">
            <MapPin size={13} color={colors.secondary} />
            <Text
              className="ml-1 min-w-0 flex-1 text-[11.5px] font-semibold"
              style={{ color: colors.secondary }}
              numberOfLines={1}
            >
              {preview.location}
            </Text>
          </View>
        ) : null}
        <View
          className="mt-3 border-t pt-3"
          style={{ borderColor: colors.border }}
        >
          <PreviewPublisher preview={preview} colors={colors} />
        </View>
      </View>
    );
  }

  return (
    <View className="px-3.5 py-3">
      <View className="mb-2">
        <PreviewPublisher
          preview={preview}
          colors={colors}
          kindLabel={kindLabel}
        />
      </View>
      <Text
        className="text-[14px] font-bold leading-5"
        style={{ color: colors.primary }}
        numberOfLines={2}
      >
        {preview.title}
      </Text>
      {preview.description ? (
        <Text
          className="mt-1 text-[12px] leading-4"
          style={{ color: colors.secondary }}
          numberOfLines={2}
        >
          {preview.description}
        </Text>
      ) : null}
    </View>
  );
}

export function SharedPostMessageCard({
  reference,
  onOpenPost,
  onLongPress,
  onDoubleTap,
  loadPreview = sharedPostPreviewLoader.load,
}: SharedPostMessageCardProps) {
  const language = useAppLanguage();
  const { isDark } = useAppTheme();
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadPreview(reference.postId).then(
      preview => {
        if (!cancelled) setState({ status: 'ready', preview });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loadPreview, reference.postId]);

  const colors = useMemo(
    () => ({
      border: isDark ? '#334155' : '#E2E8F0',
      card: isDark ? '#111827' : '#FFFFFF',
      fallback: isDark ? '#1E293B' : '#F1F5F9',
      primary: isDark ? '#F8FAFC' : '#0F172A',
      secondary: isDark ? '#94A3B8' : '#64748B',
    }),
    [isDark],
  );

  const openTarget: SharedPostOpenTarget =
    state.status === 'ready'
      ? {
          postId: state.preview.postId || reference.postId,
          kind: state.preview.kind,
          productId: state.preview.productId,
          jobId: state.preview.jobId,
          job: state.preview.job,
        }
      : { postId: reference.postId };

  return (
    <View style={styles.container}>
      {reference.note ? (
        <Text
          className="mb-1.5 px-1 text-[15px] leading-5"
          style={{ color: colors.primary }}
        >
          {reference.note}
        </Text>
      ) : null}

      <DoubleTapTouchable
        accessibilityRole="button"
        accessibilityLabel="Mở bài viết"
        activeOpacity={0.86}
        onSingleTap={() => onOpenPost(openTarget)}
        onDoubleTap={onDoubleTap}
        onLongPress={onLongPress}
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        {state.status === 'loading' ? (
          <View
            className="h-[152px] items-center justify-center"
            style={{ backgroundColor: colors.fallback }}
          >
            <ActivityIndicator color={APP_BRAND_COLOR} />
          </View>
        ) : state.status === 'error' ? (
          <View className="min-h-[132px] items-center justify-center px-5 py-6">
            <View
              className="mb-3 h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.fallback }}
            >
              <FileText size={21} color={colors.secondary} />
            </View>
            <Text
              className="text-center text-sm font-semibold leading-5"
              style={{ color: colors.secondary }}
            >
              {ERROR_COPY[language]}
            </Text>
          </View>
        ) : (
          <>
            {state.preview.imageUrl ? (
              <View className="relative h-[148px] bg-slate-100 dark:bg-slate-800">
                <Image
                  source={{ uri: state.preview.imageUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                {state.preview.isVideo ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/20">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-black/65">
                      <Play
                        size={22}
                        color="#FFFFFF"
                        fill="#FFFFFF"
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                className="h-[92px] items-center justify-center"
                style={{ backgroundColor: colors.fallback }}
              >
                {state.preview.isVideo ? (
                  <Play size={28} color={colors.secondary} />
                ) : state.preview.kind === 'job' ? (
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                    <BriefcaseBusiness size={29} color="#2563EB" />
                  </View>
                ) : state.preview.kind === 'product' ? (
                  <ShoppingBag size={28} color={APP_BRAND_COLOR} />
                ) : (
                  <FileText size={28} color={colors.secondary} />
                )}
              </View>
            )}

            <PreviewDetails
              preview={state.preview}
              colors={colors}
              kindLabel={KIND_COPY[language][state.preview.kind]}
              language={language}
            />
          </>
        )}
      </DoubleTapTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 272,
    maxWidth: '100%',
  },
});
