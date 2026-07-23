// Description: Renders the default home feed intro stories and composer.
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { ComposerCard } from './ComposerCard';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import {
  HOME_INTRO_FALLBACK_AVATAR,
  type HomeFeedIntroProps,
  useHomeStoriesRail,
} from './HomeFeedIntro.shared';

const DEFAULT_STORY_CARD_WIDTH = 116;
const DEFAULT_STORY_CARD_HEIGHT = 188;
const DEFAULT_CREATE_STORY_COVER_HEIGHT = 116;

function StoryCardCover({ story }: { story: StoryItem }) {
  const coverUri = useStoryCoverImageUri({
    story,
    fallbackUri: story.publisher.avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR,
  });

  return (
    <Image
      source={{ uri: coverUri || HOME_INTRO_FALLBACK_AVATAR }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      fadeDuration={0}
    />
  );
}

function DefaultStoriesRow({
  avatarUrl,
  copy,
}: Pick<HomeFeedIntroProps, 'avatarUrl' | 'copy'>) {
  const {
    stories,
    goToCreateStory,
    goToViewerForGroup,
  } = useHomeStoriesRail();

  return (
    <View className="mb-4 bg-white pb-1 pt-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={defaultStyles.storiesContent}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goToCreateStory}
          style={defaultStyles.storyCard}
          className="overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-white shadow-sm"
        >
          <Image
            source={{ uri: avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR }}
            style={defaultStyles.createStoryCover}
            resizeMode="cover"
            fadeDuration={0}
          />
          <View className="flex-1 items-center justify-center bg-white px-2 pb-1.5">
            <View className="absolute -top-[18px] h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-brand">
              <Plus size={20} color="#FFFFFF" />
            </View>
            <Text className="mt-4 text-center text-[14px] font-extrabold text-[#050505]">
              {copy.createStory}
            </Text>
            <Text
              className="mt-0.5 text-center text-[10px] font-semibold leading-4 text-[#667085]"
              numberOfLines={1}
            >
              {copy.createStorySubtitle}
            </Text>
          </View>
        </TouchableOpacity>

        {stories.map((story, index) => {
          const hasUnseen = story.hasUnseen && !story.isViewed;

          return (
            <TouchableOpacity
              key={story.publisher.userId || story.id}
              activeOpacity={0.85}
              onPress={() => goToViewerForGroup(index)}
              style={defaultStyles.storyCard}
              className={`overflow-hidden rounded-[20px] shadow-sm ${
                hasUnseen ? '' : 'opacity-80'
              }`}
            >
              <StoryCardCover story={story} />
              <View className="absolute inset-0 bg-black/25" />
              <View className="absolute bottom-0 left-0 right-0 h-20 bg-black/35" />
              <View
                className={`absolute left-2 top-2 h-8 w-8 overflow-hidden rounded-full border-2 ${
                  hasUnseen ? 'border-white' : 'border-slate-200'
                } bg-white p-0.5`}
              >
                <Image
                  source={{
                    uri: story.publisher.avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR,
                  }}
                  className="h-full w-full rounded-full"
                  resizeMode="cover"
                  fadeDuration={0}
                />
                {story.media.length > 1 ? (
                  <View className="absolute -bottom-2 -right-2 flex h-4 items-center justify-center rounded-full bg-brand px-1">
                    <Text className="text-[9px] font-bold text-white">
                      {story.media.length}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="absolute bottom-3 left-2 right-2 text-[12px] font-extrabold text-white"
                numberOfLines={1}
              >
                {story.publisher.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function HomeFeedIntro({
  onCreatePostPress,
  onCreatePostPressAction,
  onPressAvatar,
  avatarUrl,
  userName,
  copy,
}: HomeFeedIntroProps) {
  return (
    <View>
      <DefaultStoriesRow avatarUrl={avatarUrl} copy={copy} />
      <ComposerCard
        onPress={onCreatePostPress}
        onPressAction={onCreatePostPressAction}
        onPressAvatar={onPressAvatar}
        avatarUrl={avatarUrl}
        displayName={userName}
        copy={copy}
      />
    </View>
  );
}

export default HomeFeedIntro;

const defaultStyles = StyleSheet.create({
  storiesContent: {
    paddingHorizontal: 16,
    columnGap: 12,
    alignItems: 'stretch',
  },
  storyCard: {
    width: DEFAULT_STORY_CARD_WIDTH,
    height: DEFAULT_STORY_CARD_HEIGHT,
  },
  createStoryCover: {
    width: '100%',
    height: DEFAULT_CREATE_STORY_COVER_HEIGHT,
  },
});
