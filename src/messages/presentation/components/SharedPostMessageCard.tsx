import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FileText, Play } from 'lucide-react-native';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import {
  createSharedPostPreviewLoader,
  type SharedPostPreviewModel,
} from '../../application/shared-posts/sharedPostMessage';
import type { SharedPostMessageReference } from '../../domain/types/messages.types';

const sharedPostPreviewLoader = createSharedPostPreviewLoader(
  createFeedRepository(),
);

type SharedPostMessageCardProps = {
  reference: SharedPostMessageReference;
  onOpenPost: (postId: string) => void;
  onLongPress?: () => void;
  loadPreview?: (postId: string) => Promise<SharedPostPreviewModel>;
};

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: SharedPostPreviewModel }
  | { status: 'error' };

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

export function SharedPostMessageCard({
  reference,
  onOpenPost,
  onLongPress,
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

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Mở bài viết"
        activeOpacity={0.86}
        delayLongPress={350}
        onPress={() => onOpenPost(reference.postId)}
        onLongPress={onLongPress}
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        {state.status === 'loading' ? (
          <View
            className="h-[152px] items-center justify-center"
            style={{ backgroundColor: colors.fallback }}
          >
            <ActivityIndicator color="#2563EB" />
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
                ) : (
                  <FileText size={28} color={colors.secondary} />
                )}
              </View>
            )}

            <View className="px-3.5 py-3">
              <View className="mb-2 flex-row items-center">
                {state.preview.publisherAvatar ? (
                  <Image
                    source={{ uri: state.preview.publisherAvatar }}
                    className="mr-2 h-7 w-7 rounded-full bg-slate-200"
                  />
                ) : (
                  <View
                    className="mr-2 h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.fallback }}
                  >
                    <FileText size={14} color={colors.secondary} />
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[13px] font-bold"
                    style={{ color: colors.primary }}
                    numberOfLines={1}
                  >
                    {state.preview.publisherName}
                  </Text>
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: colors.secondary }}
                  >
                    {KIND_COPY[language][state.preview.kind]}
                  </Text>
                </View>
              </View>
              <Text
                className="text-[14px] font-bold leading-5"
                style={{ color: colors.primary }}
                numberOfLines={2}
              >
                {state.preview.title}
              </Text>
              {state.preview.description ? (
                <Text
                  className="mt-1 text-[12px] leading-4"
                  style={{ color: colors.secondary }}
                  numberOfLines={2}
                >
                  {state.preview.description}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 272,
    maxWidth: '100%',
  },
});
