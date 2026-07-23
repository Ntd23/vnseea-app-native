// Description: Renders the iOS home feed intro composer and stories rail.
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';
import {
  HOME_INTRO_FALLBACK_AVATAR,
  type HomeFeedIntroProps,
  useHomeStoriesRail,
} from './HomeFeedIntro.shared';
import { ComposerCard } from './ComposerCard';

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
      fadeDuration={0}
    />
  );
}

function HomeStoriesRail({
  avatarUrl,
  copy,
}: Pick<HomeFeedIntroProps, 'avatarUrl' | 'copy'>) {
  const { stories, goToCreateStory, goToViewerForGroup } = useHomeStoriesRail();

  return (
    <View style={[styles.surface, styles.storiesSurface]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
      >
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={goToCreateStory}
          style={[styles.storyCard, styles.createStoryCard]}
        >
          <View style={styles.createStoryCover}>
            <Image
              source={{ uri: avatarUrl ?? HOME_INTRO_FALLBACK_AVATAR }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              fadeDuration={0}
            />
            <View style={styles.createStoryPlusAnchor}>
              <View style={styles.createStoryPlusShell}>
                <GlassSurface
                  style={styles.createStoryPlus}
                  fallbackColor="rgba(8, 114, 255, 0.72)"
                  blurAmount={18}
                />
                <View
                  pointerEvents="none"
                  style={styles.createStoryPlusIconLayer}
                >
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

        {stories.map((story, index) => {
          const hasUnseen = story.hasUnseen && !story.isViewed;

          return (
            <TouchableOpacity
              key={story.publisher.userId || story.id}
              activeOpacity={0.86}
              onPress={() => goToViewerForGroup(index)}
              style={[
                styles.storyCard,
                hasUnseen ? null : styles.storyCardViewed,
              ]}
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
      <HomeStoriesRail avatarUrl={avatarUrl} copy={copy} />
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
    columnGap: 5,
    alignItems: 'stretch',
  },
  storyCard: {
    width: 116,
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
