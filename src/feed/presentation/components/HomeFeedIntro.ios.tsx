// Description: Renders the iOS home feed intro composer and stories rail.
import React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Plus, Radio } from 'lucide-react-native';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';
import {
  HOME_INTRO_FALLBACK_AVATAR,
  type HomeFeedIntroProps,
  useHomeStoriesRail,
} from './HomeFeedIntro.shared';
import { ComposerCard } from './ComposerCard';

const IOS_STORY_CARD_WIDTH = 116;
const IOS_STORY_CARD_GAP = 5;
const IOS_STORY_RAIL_ITEM_SPAN = IOS_STORY_CARD_WIDTH + IOS_STORY_CARD_GAP;

type IosStoryRailItem =
  | { id: 'create-story'; type: 'create' }
  | { id: string; type: 'live'; item: LiveStreamItem }
  | { id: string; type: 'story'; story: StoryItem; storyIndex: number };

const CREATE_STORY_RAIL_ITEM: IosStoryRailItem = {
  id: 'create-story',
  type: 'create',
};

function getIosStoryRailItemKey(item: IosStoryRailItem) {
  return item.id;
}

function getIosStoryRailItemLayout(
  _data: ArrayLike<IosStoryRailItem> | null | undefined,
  index: number,
) {
  return {
    index,
    length: IOS_STORY_RAIL_ITEM_SPAN,
    offset: IOS_STORY_RAIL_ITEM_SPAN * index,
  };
}

function IosStoryRailSeparator() {
  return <View style={styles.storySeparator} />;
}

function GlassSurface({
  children,
  style,
  fallbackColor = 'rgba(255, 255, 255, 0.68)',
  blurAmount = 22,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fallbackColor?: string;
  blurAmount?: number;
}) {
  return (
    <AdaptiveGlassSurface
      effect="regular"
      interactive={false}
      fallbackColor={fallbackColor}
      blurAmount={blurAmount}
      blurType="light"
      style={[styles.glassSurface, style]}
    >
      {children}
    </AdaptiveGlassSurface>
  );
}

function HomeAvatar({
  uri,
  size = 48,
}: {
  uri?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatarShell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Image
        source={{ uri: uri ?? HOME_INTRO_FALLBACK_AVATAR }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        resizeMethod="resize"
        fadeDuration={0}
      />
    </View>
  );
}

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
      resizeMethod="resize"
      fadeDuration={0}
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
      activeOpacity={0.86}
      onPress={() => onPress(item)}
      style={[styles.storyCard, styles.liveStoryCard]}
    >
      <Image
        source={{ uri: coverUri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        resizeMethod="resize"
        fadeDuration={0}
      />
      <View style={styles.storyImageOverlay} />
      <View pointerEvents="none" style={styles.liveStoryRing} />
      <View style={styles.storyAvatarPosition}>
        <View style={styles.liveAvatarRing}>
          <HomeAvatar uri={item.publisher.avatarUrl} size={34} />
        </View>
      </View>
      <View style={styles.liveBadge}>
        <Radio size={10} color="#ffffff" />
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>
      <Text style={styles.storyName} numberOfLines={1}>
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
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.storyCard, styles.createStoryCard]}
    >
      <View style={styles.createStoryCover}>
        <Image
          source={{ uri: avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          resizeMethod="resize"
          fadeDuration={0}
        />
        <View style={styles.createStoryPlusAnchor}>
          <View style={styles.createStoryPlusShell}>
            <GlassSurface
              style={styles.createStoryPlus}
              fallbackColor="rgba(8, 114, 255, 0.72)"
              blurAmount={18}
            />
            <View pointerEvents="none" style={styles.createStoryPlusIconLayer}>
              <Plus size={21} color="#ffffff" strokeWidth={3} />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.createStoryBody}>
        <Text style={styles.createStoryTitle}>{copy.createStory}</Text>
        <Text style={styles.createStorySubtitle} numberOfLines={1}>
          {copy.createStorySubtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function IosStoryCard({
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
      activeOpacity={0.86}
      onPress={() => onPress(storyIndex)}
      style={[styles.storyCard, hasUnseen ? null : styles.storyCardViewed]}
    >
      <StoryCardCover story={story} />
      <View style={styles.storyImageOverlay} />
      {hasUnseen ? (
        <View pointerEvents="none" style={styles.storyCardUnseenRing} />
      ) : null}
      <View style={styles.storyAvatarPosition}>
        <HomeAvatar uri={story.publisher.avatarUrl} size={34} />
      </View>
      {story.media.length > 1 ? (
        <View style={styles.storyCountBadge}>
          <Text style={styles.storyCountText}>{story.media.length}</Text>
        </View>
      ) : null}
      <Text style={styles.storyName} numberOfLines={1}>
        {story.publisher.name}
      </Text>
    </TouchableOpacity>
  );
}

function HomeStoriesRail({
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

  const railItems = React.useMemo<IosStoryRailItem[]>(
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
    ListRenderItem<IosStoryRailItem>
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
        <IosStoryCard
          story={item.story}
          storyIndex={item.storyIndex}
          onPress={goToViewerForGroup}
        />
      );
    },
    [avatarUrl, copy, goToCreateStory, goToLive, goToViewerForGroup],
  );

  return (
    <View style={[styles.surface, styles.storiesSurface]}>
      <FlatList
        data={railItems}
        horizontal
        renderItem={renderStoryRailItem}
        keyExtractor={getIosStoryRailItemKey}
        getItemLayout={getIosStoryRailItemLayout}
        ItemSeparatorComponent={IosStoryRailSeparator}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
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
      <HomeStoriesRail
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

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  glassSurface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
  },
  avatarShell: {
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  storiesSurface: {
    paddingTop: 13,
    paddingBottom: 15,
  },
  storiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 11,
  },
  storiesTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  storiesContent: {
    paddingHorizontal: 5,
    alignItems: 'stretch',
  },
  storySeparator: {
    width: IOS_STORY_CARD_GAP,
  },
  storyCard: {
    width: IOS_STORY_CARD_WIDTH,
    height: 190,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  createStoryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(226, 232, 240, 0.86)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  createStoryCover: {
    height: 116,
    overflow: 'visible',
  },
  createStoryPlusAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -18,
    alignItems: 'center',
  },
  createStoryPlusShell: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  createStoryPlus: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 21,
    backgroundColor: 'rgba(8, 114, 255, 0.72)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  createStoryPlusIconLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createStoryBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 9,
  },
  createStoryTitle: {
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
  },
  createStorySubtitle: {
    marginTop: 3,
    color: '#64748b',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  storyCardViewed: {
    opacity: 0.72,
  },
  liveStoryCard: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  liveStoryRing: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 24,
  },
  liveAvatarRing: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  liveBadge: {
    position: 'absolute',
    right: 8,
    top: 10,
    minHeight: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadgeText: {
    marginLeft: 4,
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  storyCardUnseenRing: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#0872ff',
    borderRadius: 24,
  },
  storyImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  storyCountBadge: {
    position: 'absolute',
    left: 33,
    top: 32,
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#0872ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  storyAvatarPosition: {
    position: 'absolute',
    left: 10,
    top: 10,
  },
  storyCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  storyName: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 12,
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
