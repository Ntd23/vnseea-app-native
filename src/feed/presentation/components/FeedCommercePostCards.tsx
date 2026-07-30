// Description: Shared Home Feed cards for product and job posts.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo } from 'react';
import { Image, Text, View } from 'react-native';
import { Briefcase, Globe, MapPin } from 'lucide-react-native';
import { ProductPostCard } from '../../../product/presentation/components/ProductPostCard';
import {
  JOB_TYPE_VIETNAMESE,
  SALARY_DATE_OPTIONS,
  type JobsItem,
  type JobType,
} from '../../../jobs/domain/types/jobs.types';
import type {
  FeedJobPost,
  FeedPost,
  FeedProductPost,
} from '../../domain/types/feed.types';
import {
  formatPostTime,
  type FeedCopy,
  useFeedPostMediaVisible,
} from './PostCards';
import {
  FeedCardContent,
  FeedGlassActionBar,
  FeedMediaFrame,
  FeedTouchableCardSurface,
} from './FeedCardChrome';
import { FeedMediaImage } from './FeedMediaImage';

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const FeedCommerceAvatar = React.memo(function FeedCommerceAvatar({
  uri,
}: {
  uri?: string;
}) {
  const source = useMemo(() => ({ uri: uri || FALLBACK_AVATAR }), [uri]);
  return (
    <Image
      source={source}
      className="h-[42px] w-[42px] rounded-full bg-slate-200"
      resizeMode="cover"
      fadeDuration={0}
    />
  );
});

export const FeedProductPostCard = React.memo(function FeedProductPostCard({
  post,
  onPress,
  onProfilePress,
  onSharePost,
}: {
  post: FeedProductPost;
  onPress: (product: FeedProductPost['product']) => void;
  onProfilePress: (userId: string) => void;
  onSharePost: (post: FeedPost) => void;
}) {
  const mediaVisible = useFeedPostMediaVisible(post.id);
  const handleShare = useCallback(() => {
    onSharePost(post);
  }, [onSharePost, post]);

  return (
    <ProductPostCard
      product={post.product}
      onPress={onPress}
      onProfilePress={onProfilePress}
      onShare={handleShare}
      loadMedia={mediaVisible}
    />
  );
});

function formatSalary(job: JobsItem, copy: FeedCopy) {
  const minimum = Number(job.minimum) || 0;
  const maximum = Number(job.maximum) || 0;
  const currency = job.currency || '';
  const salaryDate = job.salary_date
    ? SALARY_DATE_OPTIONS[job.salary_date] || job.salary_date
    : '';

  if (!minimum && !maximum) return copy.negotiable;

  const formatNumber = (value: number) => value.toLocaleString('vi-VN');
  const range =
    minimum && maximum
      ? `${formatNumber(minimum)} - ${formatNumber(maximum)}`
      : formatNumber(minimum || maximum);

  return `${range}${currency ? ` ${currency}` : ''}${
    salaryDate ? ` / ${salaryDate}` : ''
  }`;
}

function getJobTypeLabel(jobType: string, copy: FeedCopy) {
  return (
    JOB_TYPE_VIETNAMESE[jobType as JobType] || jobType || copy.jobTypeFallback
  );
}

export const FeedJobPostCard = React.memo(function FeedJobPostCard({
  post,
  copy,
  onPress,
}: {
  post: FeedJobPost;
  copy: FeedCopy;
  onPress: (job: JobsItem) => void;
}) {
  const mediaVisible = useFeedPostMediaVisible(post.id);
  const job = post.job;
  const avatar = job.page?.avatar || post.publisher.avatarUrl;
  const cover = job.image || job.page?.cover;
  const pageName =
    job.page?.page_title || post.publisher.name || copy.employerFallback;

  const handlePress = useCallback(() => {
    onPress(job);
  }, [job, onPress]);

  return (
    <FeedTouchableCardSurface activeOpacity={0.9} onPress={handlePress}>
      <FeedCardContent>
        <View className="flex-row items-center">
          <FeedCommerceAvatar uri={avatar} />
          <View className="ml-3 flex-1">
            <Text
              className="text-title-primary text-[#111827]"
              numberOfLines={1}
            >
              {pageName}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-xs font-semibold text-[#64748b]">
                {formatPostTime(post.postedAt, copy)}
              </Text>
              <Text className="mx-1 text-xs text-[#94a3b8]">{'•'}</Text>
              <Globe size={12} color="#94a3b8" />
            </View>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-soft">
            <Briefcase size={18} color={APP_BRAND_COLOR} />
          </View>
        </View>

        <Text
          className="mt-4 text-[17px] font-extrabold text-[#111827]"
          numberOfLines={2}
        >
          {job.title || copy.jobFallback}
        </Text>
        {!!job.description && (
          <Text
            className="mt-2 text-sm leading-5 text-[#475569]"
            numberOfLines={3}
          >
            {job.description}
          </Text>
        )}

        <View className="mt-4 flex-row flex-wrap gap-2">
          {!!job.location && (
            <View className="flex-row items-center rounded-full bg-[#f1f5f9] px-3 py-2">
              <MapPin size={14} color="#64748b" />
              <Text
                className="ml-1 max-w-[210px] text-xs font-bold text-[#475569]"
                numberOfLines={1}
              >
                {job.location}
              </Text>
            </View>
          )}
          <View className="flex-row items-center rounded-full bg-brand-soft px-3 py-2">
            <Briefcase size={14} color={APP_BRAND_COLOR} />
            <Text className="ml-1 text-xs font-bold text-brand">
              {getJobTypeLabel(job.job_type, copy)}
            </Text>
          </View>
        </View>
      </FeedCardContent>

      {!!cover && (
        <FeedMediaFrame className="h-44 bg-slate-100">
          <FeedMediaImage
            uri={cover}
            className="h-full w-full"
            resizeMode="cover"
            enabled={mediaVisible}
          />
        </FeedMediaFrame>
      )}

      <FeedGlassActionBar className="border-t border-[#dddfe2] px-3 py-3 pt-3">
        <View className="mr-4 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.4px] text-[#64748b]">
            {copy.salary}
          </Text>
          <Text
            className="mt-0.5 text-sm font-bold text-[#111827]"
            numberOfLines={1}
          >
            {formatSalary(job, copy)}
          </Text>
        </View>

        <View className="rounded-lg bg-[#e7f0ff] px-4 py-2">
          <Text className="text-sm font-bold text-brand">{copy.viewJob}</Text>
        </View>
      </FeedGlassActionBar>
    </FeedTouchableCardSurface>
  );
});
