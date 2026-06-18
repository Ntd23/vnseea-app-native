import React from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  ChevronRight,
  Image as ImageIcon,
  Plus,
  Smile,
  Tag,
  X,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';
import {
  getHomeGreetingModel,
  HOME_INTRO_FALLBACK_AVATAR,
  type HomeFeedIntroProps,
  useHomeGreetingDismissal,
  useHomeStoriesRail,
} from './HomeFeedIntro.shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GREETING_DISMISS_DISTANCE = 90;
const GREETING_DISMISS_VELOCITY = 650;

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

function HomeGreetingCard({
  userName,
  avatarUrl,
  copy,
  onDismiss,
}: Pick<HomeFeedIntroProps, 'userName' | 'avatarUrl' | 'copy'> & {
  onDismiss: () => void;
}) {
  const greeting = getHomeGreetingModel({ userName, copy });
  const dragX = useSharedValue(0);

  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onUpdate(event => {
          'worklet';
          dragX.value = event.translationX;
        })
        .onEnd(event => {
          'worklet';
          const shouldDismiss =
            Math.abs(event.translationX) > GREETING_DISMISS_DISTANCE ||
            Math.abs(event.velocityX) > GREETING_DISMISS_VELOCITY;

          if (shouldDismiss) {
            const direction =
              event.translationX === 0
                ? event.velocityX >= 0
                  ? 1
                  : -1
                : event.translationX > 0
                  ? 1
                  : -1;

            dragX.value = withTiming(
              direction * (SCREEN_WIDTH + 40),
              { duration: 180 },
              finished => {
                if (finished) runOnJS(onDismiss)();
              },
            );
          } else {
            dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [dragX, onDismiss],
  );

  const greetingAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(dragX.value),
      [0, 140],
      [1, 0.48],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateX: dragX.value }],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={greetingAnimatedStyle}>
        <View style={[styles.surface, styles.greetingSurface]}>
          <HomeAvatar uri={avatarUrl} />
          <View style={styles.greetingTextWrap}>
            <Text style={styles.greetingTitle} numberOfLines={2}>
              {greeting.title}
            </Text>
            <Text style={styles.greetingBody} numberOfLines={2}>
              {greeting.body}
            </Text>
            <GlassSurface
              style={styles.todayChip}
              fallbackColor="rgba(255, 255, 255, 0.78)"
              blurAmount={18}
            >
              <Text style={styles.todayChipText}>☀︎ {greeting.chipLabel}</Text>
            </GlassSurface>
          </View>
          <View style={styles.greetingSide}>
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={onDismiss}
              style={styles.greetingCloseTouchable}
              accessibilityRole="button"
              accessibilityLabel="Close greeting"
            >
              <GlassSurface
                style={styles.greetingCloseButton}
                fallbackColor="rgba(255, 255, 255, 0.76)"
                blurAmount={18}
              >
                <X size={17} color="#0f172a" strokeWidth={2.6} />
              </GlassSurface>
            </TouchableOpacity>
            <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function HomeComposerCard({
  onCreatePostPress,
  avatarUrl,
  copy,
}: Pick<HomeFeedIntroProps, 'onCreatePostPress' | 'avatarUrl' | 'copy'>) {
  return (
    <View style={[styles.surface, styles.composerSurface]}>
      <View style={styles.composerTopRow}>
        <HomeAvatar uri={avatarUrl} />
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onCreatePostPress}
          style={styles.composerInputTouchable}
        >
          <GlassSurface
            style={styles.composerInputGlass}
            fallbackColor="rgba(255, 255, 255, 0.72)"
            blurAmount={24}
          >
            <Text style={styles.composerPlaceholder} numberOfLines={1}>
              {copy.composerPlaceholder}
            </Text>
            <ImageIcon size={20} color="#0872ff" strokeWidth={2.4} />
          </GlassSurface>
        </TouchableOpacity>
      </View>

      <GlassSurface
        style={styles.composerDock}
        fallbackColor="rgba(255, 255, 255, 0.7)"
        blurAmount={24}
      >
        <TouchableOpacity
          activeOpacity={0.76}
          onPress={onCreatePostPress}
          style={styles.composerAction}
        >
          <ImageIcon size={18} color="#22c55e" strokeWidth={2.4} />
          <Text style={styles.composerActionText}>{copy.library}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.76}
          onPress={onCreatePostPress}
          style={styles.composerAction}
        >
          <Tag size={18} color="#0872ff" strokeWidth={2.4} />
          <Text style={styles.composerActionText}>{copy.tag}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.76}
          onPress={onCreatePostPress}
          style={styles.composerAction}
        >
          <Smile size={18} color="#f59e0b" strokeWidth={2.4} />
          <Text style={styles.composerActionText}>{copy.feeling}</Text>
        </TouchableOpacity>
      </GlassSurface>
    </View>
  );
}

function HomeStoriesRail({
  avatarUrl,
  copy,
}: Pick<HomeFeedIntroProps, 'avatarUrl' | 'copy'>) {
  const { stories, goToCreateStory, goToViewerForGroup } = useHomeStoriesRail();

  return (
    <View style={[styles.surface, styles.storiesSurface]}>
      <View style={styles.storiesHeader}>
        <Text style={styles.storiesTitle}>{copy.storiesTitle}</Text>
        <TouchableOpacity activeOpacity={0.78} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>{copy.seeAll}</Text>
          <ChevronRight size={17} color="#0872ff" strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

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
          const thumbnail =
            story.thumbnailUrl ??
            story.publisher.avatarUrl ??
            HOME_INTRO_FALLBACK_AVATAR;

          return (
            <TouchableOpacity
              key={story.publisher.userId || story.id}
              activeOpacity={0.86}
              onPress={() => goToViewerForGroup(index)}
              style={[
                styles.storyCard,
                hasUnseen ? styles.storyCardUnseen : styles.storyCardViewed,
              ]}
            >
              <Image
                source={{ uri: thumbnail }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                fadeDuration={0}
              />
              <View style={styles.storyImageOverlay} />
              <View style={styles.storyAvatarPosition}>
                <HomeAvatar uri={story.publisher.avatarUrl} size={32} />
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
  userId,
  avatarUrl,
  userName,
  copy,
}: HomeFeedIntroProps) {
  const { isGreetingVisible, onDismissGreeting } =
    useHomeGreetingDismissal(userId);

  return (
    <View style={styles.root}>
      {isGreetingVisible ? (
        <HomeGreetingCard
          avatarUrl={avatarUrl}
          userName={userName}
          copy={copy}
          onDismiss={onDismissGreeting}
        />
      ) : null}
      <HomeComposerCard
        onCreatePostPress={onCreatePostPress}
        avatarUrl={avatarUrl}
        copy={copy}
      />
      <HomeStoriesRail avatarUrl={avatarUrl} copy={copy} />
    </View>
  );
}

export default HomeFeedIntro;

const styles = StyleSheet.create({
  root: {
    paddingTop: 10,
  },
  surface: {
    marginHorizontal: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderRadius: 30,
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
  greetingSurface: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  greetingTextWrap: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  greetingTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  greetingBody: {
    marginTop: 5,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  greetingSide: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  todayChip: {
    minHeight: 31,
    alignSelf: 'flex-start',
    marginTop: 9,
    borderRadius: 999,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayChipText: {
    color: '#075ec9',
    fontSize: 12,
    fontWeight: '800',
  },
  greetingEmoji: {
    fontSize: 27,
    lineHeight: 31,
  },
  greetingCloseTouchable: {
    borderRadius: 18,
  },
  greetingCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSurface: {
    padding: 13,
  },
  composerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerInputTouchable: {
    flex: 1,
    marginLeft: 11,
    borderRadius: 23,
  },
  composerInputGlass: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingHorizontal: 15,
  },
  composerPlaceholder: {
    flex: 1,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },
  composerDock: {
    minHeight: 48,
    marginTop: 11,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  composerAction: {
    minHeight: 36,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  composerActionText: {
    marginLeft: 7,
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
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
  seeAllButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#0872ff',
    fontSize: 13,
    fontWeight: '800',
  },
  storiesContent: {
    paddingHorizontal: 14,
    columnGap: 10,
  },
  storyCard: {
    width: 106,
    height: 166,
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
    height: 94,
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
  storyCardUnseen: {
    borderWidth: 2,
    borderColor: '#0872ff',
  },
  storyCardViewed: {
    opacity: 0.72,
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
    left: 29,
    top: 30,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0872ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  storyAvatarPosition: {
    position: 'absolute',
    left: 9,
    top: 9,
  },
  storyCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  storyName: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 10,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
