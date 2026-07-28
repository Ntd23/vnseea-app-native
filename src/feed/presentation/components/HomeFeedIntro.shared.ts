import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import {
  storyCreatedEvents,
  storyDeletedEvents,
  useStoriesViewModel,
} from '../../../stories';
import { useLiveViewModel } from '../../../live/application/view-models/useLiveViewModel';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import type { FeedCopy } from './PostCards';

const HOME_RAIL_REALTIME_REFRESH_MS = 10_000;

export const HOME_INTRO_FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw';

export type HomeFeedIntroProps = {
  onCreatePostPress: () => void;
  onCreatePostPressAction?: (action: 'photo' | 'video' | 'product' | 'poll') => void;
  onLivePress?: (item: LiveStreamItem) => void;
  onPressAvatar?: () => void;
  avatarUrl?: string;
  userName?: string;
  liveStreams?: LiveStreamItem[];
  copy: FeedCopy;
};

type FeedIntroNav = NativeStackNavigationProp<RootStackParamList>;

export function useHomeStoriesRail(options: {
  liveStreams?: LiveStreamItem[];
  onLivePress?: (item: LiveStreamItem) => void;
} = {}) {
  const { liveStreams: sharedLiveStreams, onLivePress } = options;
  const navigation = useNavigation<FeedIntroNav>();
  const isFocused = useIsFocused();
  const usesSharedLiveStreams = sharedLiveStreams !== undefined;
  const vm = useStoriesViewModel();
  const liveVm = useLiveViewModel({
    autoLoad: !usesSharedLiveStreams,
    enabled: isFocused && !usesSharedLiveStreams,
    refreshIntervalMs: HOME_RAIL_REALTIME_REFRESH_MS,
  });
  const prependStory = vm.prependStory;
  const removeStoryLocal = vm.removeStoryLocal;
  const reloadStories = vm.reloadStories;

  useEffect(() => {
    const unsubCreated = storyCreatedEvents.subscribe(story => {
      prependStory(story);
    });
    const unsubDeleted = storyDeletedEvents.subscribe(storyId => {
      removeStoryLocal(storyId);
    });
    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [prependStory, removeStoryLocal]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const refreshStories = () => {
      if (AppState.currentState !== 'active') return;
      reloadStories().catch(error => {
        console.warn('[Stories] rail background refresh failed:', error);
      });
    };
    const focusRefresh = setTimeout(refreshStories, 250);
    const timer = setInterval(
      refreshStories,
      HOME_RAIL_REALTIME_REFRESH_MS,
    );
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') refreshStories();
    });

    return () => {
      clearTimeout(focusRefresh);
      clearInterval(timer);
      subscription.remove();
    };
  }, [isFocused, reloadStories]);

  const liveStreams = useMemo<LiveStreamItem[]>(() => {
    const byPostId = new Map<number, LiveStreamItem>();
    const source = sharedLiveStreams ?? [
      ...liveVm.friendsLive,
      ...liveVm.liveStreams,
    ];
    source.forEach(item => {
      if (item.state === 'offline') return;
      const existing = byPostId.get(item.postId);
      if (!existing || existing.state === 'stale') {
        byPostId.set(item.postId, item);
      }
    });

    return Array.from(byPostId.values()).sort(
      (left, right) =>
        new Date(right.startedAt).getTime() -
        new Date(left.startedAt).getTime(),
    );
  }, [liveVm.friendsLive, liveVm.liveStreams, sharedLiveStreams]);

  const stories = useMemo(() => {
    const livePublisherIds = new Set(
      liveStreams.map(item => String(item.publisher.id)),
    );
    return vm.stories.filter(
      story => !livePublisherIds.has(String(story.publisher.userId)),
    );
  }, [liveStreams, vm.stories]);

  const goToCreateStory = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_STORY);
  }, [navigation]);

  const goToViewerForGroup = useCallback(
    (index: number) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories,
        initialUserIndex: index,
      });
    },
    [navigation, stories],
  );

  const goToStoriesList = useCallback(() => {
    navigation.navigate(ROUTES.STORIES_LIST, {
      stories: vm.stories,
    });
  }, [navigation, vm.stories]);

  const goToLive = useCallback(
    (item: LiveStreamItem) => {
      if (onLivePress) {
        onLivePress(item);
        return;
      }
      navigation.navigate(ROUTES.LIVE_ROOM, { postId: item.postId });
    },
    [navigation, onLivePress],
  );

  return {
    stories,
    liveStreams,
    goToCreateStory,
    goToViewerForGroup,
    goToStoriesList,
    goToLive,
  };
}
