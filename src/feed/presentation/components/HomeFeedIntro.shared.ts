import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createMMKV } from 'react-native-mmkv';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import {
  storyCreatedEvents,
  storyDeletedEvents,
  useStoriesViewModel,
} from '../../../stories';
import type { FeedCopy } from './PostCards';

export const HOME_INTRO_FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw';

export const HOME_GREETING_DISMISS_MS = 60 * 60 * 1000;
const HOME_GREETING_DISMISS_KEY_PREFIX = 'homeIntro.greetingHiddenUntil';
const homeIntroStorage = createMMKV({ id: 'vnseea-home-intro' });

export type HomeFeedIntroProps = {
  onCreatePostPress: () => void;
  userId?: string;
  avatarUrl?: string;
  userName?: string;
  copy: FeedCopy;
};

type FeedIntroNav = NativeStackNavigationProp<RootStackParamList>;

export function useHomeStoriesRail() {
  const navigation = useNavigation<FeedIntroNav>();
  const vm = useStoriesViewModel();
  const prependStory = vm.prependStory;
  const removeStoryLocal = vm.removeStoryLocal;

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

  const goToCreateStory = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_STORY);
  }, [navigation]);

  const goToViewerForGroup = useCallback(
    (index: number) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: vm.stories,
        initialUserIndex: index,
      });
    },
    [navigation, vm.stories],
  );

  const goToStoriesList = useCallback(() => {
    navigation.navigate(ROUTES.STORIES_LIST, {
      stories: vm.stories,
    });
  }, [navigation, vm.stories]);

  return {
    stories: vm.stories,
    goToCreateStory,
    goToViewerForGroup,
    goToStoriesList,
  };
}

export function getHomeGreetingModel({
  userName,
  copy,
}: {
  userName?: string;
  copy: FeedCopy;
}) {
  const displayName = userName?.trim() || copy.userFallback;
  const isVi = copy.publicLabel === 'Công khai';
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      title: isVi
        ? `Chào buổi sáng, ${displayName}`
        : `Good morning, ${displayName}`,
      body: isVi
        ? 'Chào ngày mới! Chúc bạn có một ngày tràn đầy năng lượng và làm việc hiệu quả.'
        : 'Good morning! Wishing you a day full of energy and great productivity.',
      emoji: '\u2600\uFE0F',
      chipLabel: isVi ? 'Hôm nay' : 'Today',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      title: isVi
        ? `Chào buổi chiều, ${displayName}`
        : `Good afternoon, ${displayName}`,
      body: isVi
        ? 'Chúc bạn có một buổi chiều suôn sẻ, tràn ngập niềm vui và năng lượng.'
        : 'Hope your afternoon is going productive, smooth, and full of joy!',
      emoji: '\uD83C\uDF24\uFE0F',
      chipLabel: isVi ? 'Hôm nay' : 'Today',
    };
  }

  return {
    title: isVi
      ? `Chào buổi tối, ${displayName}`
      : `Good evening, ${displayName}`,
    body: isVi
      ? 'Buổi tối ấm áp! Hãy thư giãn và tận hưởng những phút giây bình yên của ngày.'
      : 'Evening is life saying you are getting closer to your dreams.',
    emoji: '\uD83C\uDF07',
    chipLabel: isVi ? 'Hôm nay' : 'Today',
  };
}

export function getHomeGreetingDismissKey(userId?: string) {
  return `${HOME_GREETING_DISMISS_KEY_PREFIX}.${userId || 'anonymous'}`;
}

export function isHomeGreetingVisible(
  hiddenUntil?: number | null,
  now = Date.now(),
) {
  return !hiddenUntil || hiddenUntil <= now;
}

export function useHomeGreetingDismissal(userId?: string) {
  const storageKey = useMemo(() => getHomeGreetingDismissKey(userId), [userId]);

  const readVisibility = useCallback(() => {
    const hiddenUntil = homeIntroStorage.getNumber(storageKey) ?? null;
    const visible = isHomeGreetingVisible(hiddenUntil);
    if (visible && hiddenUntil) {
      homeIntroStorage.remove(storageKey);
    }
    return visible;
  }, [storageKey]);

  const [isGreetingVisible, setIsGreetingVisible] = useState(readVisibility);

  const refreshGreetingVisibility = useCallback(() => {
    setIsGreetingVisible(readVisibility());
  }, [readVisibility]);

  useEffect(() => {
    refreshGreetingVisibility();
  }, [refreshGreetingVisibility]);

  useFocusEffect(
    useCallback(() => {
      refreshGreetingVisibility();
    }, [refreshGreetingVisibility]),
  );

  const onDismissGreeting = useCallback(() => {
    homeIntroStorage.set(storageKey, Date.now() + HOME_GREETING_DISMISS_MS);
    setIsGreetingVisible(false);
  }, [storageKey]);

  return {
    isGreetingVisible,
    onDismissGreeting,
  };
}
