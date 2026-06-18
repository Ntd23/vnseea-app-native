import React from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { ComposerCard } from './ComposerCard';
import {
  getHomeGreetingModel,
  HOME_INTRO_FALLBACK_AVATAR,
  type HomeFeedIntroProps,
  useHomeStoriesRail,
} from './HomeFeedIntro.shared';

function DefaultStoriesRow({
  avatarUrl,
  copy,
}: Pick<HomeFeedIntroProps, 'avatarUrl' | 'copy'>) {
  const { stories, goToCreateStory, goToViewerForGroup } = useHomeStoriesRail();

  return (
    <View className="mb-4 bg-white pb-1.5 pt-0.5">
      <View className="mb-2.5 flex-row items-center justify-between px-4">
        <Text className="text-[18px] font-extrabold text-[#050505]">
          {copy.storiesTitle}
        </Text>
        <TouchableOpacity activeOpacity={0.8}>
          <View className="flex-row items-center">
            <Text className="text-[14px] font-extrabold text-[#0866ff]">
              {copy.seeAll}
            </Text>
            <ChevronRight size={18} color="#0866ff" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-4"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goToCreateStory}
          className="h-44 w-28 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
        >
          <Image
            source={{ uri: avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR }}
            className="h-24 w-full"
            resizeMode="cover"
            fadeDuration={0}
          />
          <View className="flex-1 items-center justify-center bg-white px-2 pb-1.5">
            <View className="absolute -top-[18px] h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#0866ff]">
              <Plus size={20} color="#FFFFFF" />
            </View>
            <Text className="mt-4 text-center text-[13px] font-extrabold text-[#050505]">
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
              className={`h-44 w-28 overflow-hidden rounded-2xl ${
                hasUnseen ? '' : 'opacity-80'
              }`}
            >
              <Image
                source={{
                  uri:
                    story.thumbnailUrl ??
                    story.publisher.avatarUrl ??
                    HOME_INTRO_FALLBACK_AVATAR,
                }}
                className="h-full w-full"
                resizeMode="cover"
                fadeDuration={0}
              />
              <View className="absolute inset-0 bg-black/25" />
              <View className="absolute bottom-0 left-0 right-0 h-24 bg-black/35" />
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
                  <View className="absolute -bottom-2 -right-2 flex h-4 items-center justify-center rounded-full bg-blue-600 px-1">
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

function DefaultGreetingCard({
  userName,
  copy,
}: Pick<HomeFeedIntroProps, 'userName' | 'copy'>) {
  const greeting = getHomeGreetingModel({ userName, copy });

  return (
    <View className="mx-4 mb-4 flex-row items-center justify-between overflow-hidden rounded-2xl border border-[#dfe7ff] bg-[#eef4ff] px-4 py-3.5">
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white">
        <Text className="text-2xl">{'\uD83D\uDC4B'}</Text>
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[17px] font-extrabold text-[#050505]">
          {greeting.title}
        </Text>
        <Text className="mt-1.5 text-[13px] font-semibold leading-5 text-[#667085]">
          {greeting.body}
        </Text>
      </View>
      <Text className="text-3xl">{greeting.emoji}</Text>
    </View>
  );
}

export function HomeFeedIntro({
  onCreatePostPress,
  avatarUrl,
  userName,
  copy,
}: HomeFeedIntroProps) {
  return (
    <View>
      <ComposerCard
        onPress={onCreatePostPress}
        avatarUrl={avatarUrl}
        copy={copy}
      />
      <DefaultStoriesRow avatarUrl={avatarUrl} copy={copy} />
      <DefaultGreetingCard userName={userName} copy={copy} />
    </View>
  );
}

export default HomeFeedIntro;
