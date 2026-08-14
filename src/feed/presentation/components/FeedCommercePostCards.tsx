// Description: Shared Home Feed cards for product and job posts.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Briefcase, Globe, MapPin, Share2 } from 'lucide-react-native';
import { ProductPostCard } from '../../../product/presentation/components/ProductPostCard';
import {
  JOB_TYPE_VIETNAMESE,
  type JobsItem,
  type JobType,
} from '../../../jobs/domain/types/jobs.types';
import { formatJobSalaryRange } from '../../../jobs/application/formatters/jobSalary';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
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
  FeedGlassActionButton,
  FeedGlassActionBar,
  FeedMediaFrame,
  FeedTouchableCardSurface,
} from './FeedCardChrome';
import { FeedMediaImage } from './FeedMediaImage';
import { navigateToFeedPublisherPage } from '../navigation/feedPublisherNavigation';

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const styles = StyleSheet.create({
  jobShareButton: {
    flex: 0,
    height: 44,
    width: 44,
  },
});

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
      resizeMethod="resize"
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
  const navigation = useNavigation<any>();
  const mediaVisible = useFeedPostMediaVisible(post.id);
  const handleShare = useCallback(() => {
    onSharePost(post);
  }, [onSharePost, post]);
  const handleProfilePress = useCallback(
    (userId: string) => {
      if (!navigateToFeedPublisherPage(navigation, post.publisher)) {
        onProfilePress(userId);
      }
    },
    [navigation, onProfilePress, post.publisher],
  );

  return (
    <ProductPostCard
      product={post.product}
      onPress={onPress}
      onProfilePress={handleProfilePress}
      onShare={post.permissions?.canShare ? handleShare : undefined}
      loadMedia={mediaVisible}
    />
  );
});

function getJobTypeLabel(jobType: string, copy: FeedCopy) {
  return (
    JOB_TYPE_VIETNAMESE[jobType as JobType] || jobType || copy.jobTypeFallback
  );
}

export const FeedJobPostCard = React.memo(function FeedJobPostCard({
  post,
  copy,
  onPress,
  onSharePost,
}: {
  post: FeedJobPost;
  copy: FeedCopy;
  onPress: (job: JobsItem) => void;
  onSharePost: (post: FeedPost) => void;
}) {
  const language = useAppLanguage();
  const mediaVisible = useFeedPostMediaVisible(post.id);
  const job = post.job;
  const avatar = job.page?.avatar || post.publisher.avatarUrl;
  const cover = job.image || job.page?.cover;
  const pageName =
    job.page?.page_title || post.publisher.name || copy.employerFallback;

  const handlePress = useCallback(() => {
    onPress(job);
  }, [job, onPress]);
  const handleSharePress = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onSharePost(post);
    },
    [onSharePost, post],
  );
  const canShare = post.permissions?.canShare === true;

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

      <FeedGlassActionBar className="border-t border-[#dddfe2] px-4 py-3">
        <View className="mr-3 min-w-0 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.4px] text-[#64748b]">
            {copy.salary}
          </Text>
          <Text
            className="mt-0.5 text-sm font-bold text-[#111827]"
            numberOfLines={1}
          >
            {formatJobSalaryRange(job, language)}
          </Text>
        </View>

        <View className="flex-shrink-0 flex-row items-center">
          {canShare ? (
            <FeedGlassActionButton
              accessibilityRole="button"
              accessibilityLabel={copy.share}
              activeOpacity={0.8}
              className="mr-2 h-11 w-11 items-center justify-center rounded-lg border border-[#dbe3ef] bg-white"
              onPress={handleSharePress}
              style={styles.jobShareButton}
            >
              <Share2 size={18} color="#64748B" strokeWidth={2.2} />
            </FeedGlassActionButton>
          ) : null}

          <View className="rounded-lg bg-brand-soft px-3 py-2.5">
            <Text className="text-sm font-bold text-brand" numberOfLines={1}>
              {copy.viewJob}
            </Text>
          </View>
        </View>
      </FeedGlassActionBar>
    </FeedTouchableCardSurface>
  );
});
