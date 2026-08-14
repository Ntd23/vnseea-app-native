// Description: Renders the default home feed intro stories and composer.
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import { Plus, Radio } from 'lucide-react-native';
import { ComposerCard } from './ComposerCard';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import {
  HOME_INTRO_FALLBACK_AVATAR,
  type HomeFeedIntroProps,
  useHomeStoriesRail,
} from './HomeFeedIntro.shared';
import { FeedMediaImage } from './FeedMediaImage';

const DEFAULT_STORY_CARD_WIDTH = 116;
const DEFAULT_STORY_CARD_HEIGHT = 188;
const DEFAULT_CREATE_STORY_COVER_HEIGHT = 116;
const DEFAULT_STORY_CARD_GAP = 12;
const DEFAULT_STORY_RAIL_ITEM_SPAN =
  DEFAULT_STORY_CARD_WIDTH + DEFAULT_STORY_CARD_GAP;

type DefaultStoryRailItem =
  | { id: 'create-story'; type: 'create' }
  | { id: string; type: 'live'; item: LiveStreamItem }
  | { id: string; type: 'story'; story: StoryItem; storyIndex: number };

const CREATE_STORY_RAIL_ITEM: DefaultStoryRailItem = {
  id: 'create-story',
  type: 'create',
};

function getDefaultStoryRailItemKey(item: DefaultStoryRailItem) {
  return item.id;
}

function getDefaultStoryRailItemLayout(
  _data: ArrayLike<DefaultStoryRailItem> | null | undefined,
  index: number,
) {
  return {
    index,
    length: DEFAULT_STORY_RAIL_ITEM_SPAN,
    offset: DEFAULT_STORY_RAIL_ITEM_SPAN * index,
  };
}

function DefaultStoryRailSeparator() {
  return <View style={defaultStyles.storySeparator} />;
}

function StoryCardCover({ story }: { story: StoryItem }) {
  const coverUri = useStoryCoverImageUri({
    story,
    fallbackUri: story.publisher.avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR,
  });

  return (
    <FeedMediaImage
      uri={coverUri || HOME_INTRO_FALLBACK_AVATAR}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
}

function LiveStoryCard({
  item,
  onPress,
}: {
  item: LiveStreamItem;
  onPress: (item: LiveStreamItem) => void;
}) {
  const coverUri =
    item.thumbnailUrl || item.publisher.avatarUrl || HOME_INTRO_FALLBACK_AVATAR;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={defaultStyles.storyCard}
      className="overflow-hidden rounded-[20px] border-2 border-red-500 shadow-sm"
    >
      <FeedMediaImage
        uri={coverUri}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View className="absolute inset-0 bg-black/25" />
      <View className="absolute bottom-0 left-0 right-0 h-20 bg-black/40" />
      <View className="absolute left-2 top-2 h-9 w-9 overflow-hidden rounded-full border-2 border-red-500 bg-white p-0.5">
        <FeedMediaImage
          uri={item.publisher.avatarUrl || HOME_INTRO_FALLBACK_AVATAR}
          className="h-full w-full rounded-full"
          resizeMode="cover"
        />
      </View>
      <View className="absolute right-2 top-2 flex-row items-center rounded-full bg-red-500 px-2 py-1">
        <Radio size={10} color="#ffffff" />
        <Text className="ml-1 text-[9px] font-black text-white">LIVE</Text>
      </View>
      <Text
        className="absolute bottom-3 left-2 right-2 text-[12px] font-extrabold text-white"
        numberOfLines={1}
      >
        {item.publisher.name}
      </Text>
    </TouchableOpacity>
  );
}

function CreateStoryCard({
  avatarUrl,
  copy,
  onPress,
}: {
  avatarUrl?: string;
  copy: HomeFeedIntroProps['copy'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={defaultStyles.storyCard}
      className="overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-white shadow-sm"
    >
      <FeedMediaImage
        uri={avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR}
        style={defaultStyles.createStoryCover}
        resizeMode="cover"
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
  );
}

function DefaultStoryCard({
  story,
  storyIndex,
  onPress,
}: {
  story: StoryItem;
  storyIndex: number;
  onPress: (index: number) => void;
}) {
  const hasUnseen = story.hasUnseen && !story.isViewed;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(storyIndex)}
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
        <FeedMediaImage
          uri={story.publisher.avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR}
          className="h-full w-full rounded-full"
          resizeMode="cover"
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
}

function DefaultStoriesRow({
  avatarUrl,
  copy,
  liveStreams: sharedLiveStreams,
  onLivePress,
}: Pick<
  HomeFeedIntroProps,
  'avatarUrl' | 'copy' | 'liveStreams' | 'onLivePress'
>) {
  const {
    stories,
    liveStreams,
    goToCreateStory,
    goToViewerForGroup,
    goToLive,
  } = useHomeStoriesRail({
    liveStreams: sharedLiveStreams,
    onLivePress,
  });

  const railItems = React.useMemo<DefaultStoryRailItem[]>(
    () => [
      CREATE_STORY_RAIL_ITEM,
      ...liveStreams.map(item => ({
        id: `live-${item.postId}`,
        type: 'live' as const,
        item,
      })),
      ...stories.map((story, storyIndex) => ({
        id: `story-${story.publisher.userId || story.id}`,
        type: 'story' as const,
        story,
        storyIndex,
      })),
    ],
    [liveStreams, stories],
  );

  const renderStoryRailItem = React.useCallback<
    ListRenderItem<DefaultStoryRailItem>
  >(
    ({ item }) => {
      if (item.type === 'create') {
        return (
          <CreateStoryCard
            avatarUrl={avatarUrl}
            copy={copy}
            onPress={goToCreateStory}
          />
        );
      }

      if (item.type === 'live') {
        return <LiveStoryCard item={item.item} onPress={goToLive} />;
      }

      return (
        <DefaultStoryCard
          story={item.story}
          storyIndex={item.storyIndex}
          onPress={goToViewerForGroup}
        />
      );
    },
    [avatarUrl, copy, goToCreateStory, goToLive, goToViewerForGroup],
  );

  return (
    <View className="mb-4 bg-white pb-1 pt-1">
      <FlatList
        data={railItems}
        horizontal
        renderItem={renderStoryRailItem}
        keyExtractor={getDefaultStoryRailItemKey}
        getItemLayout={getDefaultStoryRailItemLayout}
        ItemSeparatorComponent={DefaultStoryRailSeparator}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={defaultStyles.storiesContent}
        initialNumToRender={4}
        maxToRenderPerBatch={3}
        windowSize={3}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />
    </View>
  );
}

export function HomeFeedIntro({
  onCreatePostPress,
  onCreatePostPressAction,
  onPressAvatar,
  avatarUrl,
  userName,
  liveStreams,
  onLivePress,
  copy,
}: HomeFeedIntroProps) {
  return (
    <View>
      <DefaultStoriesRow
        avatarUrl={avatarUrl}
        copy={copy}
        liveStreams={liveStreams}
        onLivePress={onLivePress}
      />
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
    alignItems: 'stretch',
  },
  storySeparator: {
    width: DEFAULT_STORY_CARD_GAP,
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
