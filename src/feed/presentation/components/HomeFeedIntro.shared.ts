import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

export type HomeFeedIntroProps = {
  onCreatePostPress: () => void;
  onCreatePostPressAction?: (action: 'photo' | 'video' | 'product' | 'poll') => void;
  onPressAvatar?: () => void;
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
