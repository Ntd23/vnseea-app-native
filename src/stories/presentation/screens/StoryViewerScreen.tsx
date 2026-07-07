// Description: Full-screen Instagram/Facebook-style story viewer.
//
// Layout:
//
//   ┌─────────────────────────────────────┐
//   │ ▓▓▓▓▓▓░░░░  ░░░░░░  ░░░░░░          │ ← progress bars (one per segment)
//   │ 👤 Quyền Quý · 2 giờ          🗑 X  │ ← header (delete only if owner)
//   │                                     │
//   │      [ image OR video full ]        │ ← media area
//   │                                     │
//   │                                     │
//   │   Tiêu đề / mô tả (nếu có)          │ ← bottom overlay
//   │   👍 ❤️ 😂 😮 😢 😡                  │ ← reaction picker
//   └─────────────────────────────────────┘
//
// Interactions:
//   • Tap left third  → previous segment (or previous user)
//   • Tap right third → next segment (or next user)
//   • Long-press anywhere → pause progress + video
//   • Release         → resume
//   • Tap emoji       → toggle reaction (swap to that one)
//   • Tap 🗑 (owner)  → confirm + delete story + close
//   • Tap X           → close
//
// Progress driving:
//   • Image segments → fixed 5s timer animates the bar.
//   • Video segments → wait for `onLoad` to learn duration, then animate
//     the bar across exactly that span. Video's own `paused` prop is
//     bound to `isPaused` so long-press freezes both bar AND playback.
//   • On animation finish → advance to next segment / user / close.
//
// Swipe-down-to-dismiss:
//   • Drag down from anywhere on the media area → the whole story sheet
//     follows the finger, fading out as it travels. Mirrors the cover /
//     photo viewer pattern.
//   • Release before the threshold (35% of screen height OR vy > 800)
//     → spring back to center, progress timer resumes.
//   • Release after the threshold → animate off-screen and call
//     `navigation.goBack()`.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown, MoreHorizontal, ThumbsUp } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { createStoriesRepository } from '../../infrastructure/repositories/ApiStoriesRepository';
import { storyDeletedEvents } from '../../application/events/storyDeletedEvents';
import { storyReactedEvents } from '../../application/events/storyReactedEvents';
import type { StoryItem } from '../../domain/types/stories.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

// Segment timings. Image is fixed; video uses its actual duration (set
// via VideoPlayer's `onLoad` callback) with a fallback if duration is
// missing from the metadata.
const IMAGE_SEGMENT_MS = 5000;
const VIDEO_FALLBACK_MS = 15000;

const repository = createStoriesRepository();

const STORY_REACTION_EMOJI: Record<ReactionType, string> = {
  like: '\uD83D\uDC4D',
  love: '\u2764\uFE0F',
  haha: '\uD83D\uDE06',
  wow: '\uD83D\uDE2E',
  sad: '\uD83D\uDE22',
  angry: '\uD83D\uDE21',
};

type ReactionBurstItem = {
  id: string;
  emoji: string;
  left: number;
  size: number;
  driftX: number;
  translateY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
};

/** Format a unix-seconds timestamp as a Vietnamese relative phrase. */
function formatRelativeTime(timestamp?: number) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function StoryViewerScreen({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const storySafeAreaInsets = useSafeAreaInsets();
  const storyHeaderSafeTop = Math.max(storySafeAreaInsets.top, 8);

  // Support BOTH: new API (stories array passed directly) AND old API
  // (stories list + initialUserIndex). This keeps backwards compat while
  // migrating to the cleaner "pass filtered stories" pattern.
  const passedStories = Array.isArray(route.params?.stories)
    ? route.params.stories
    : undefined;

  const [stories, setStories] = useState<StoryItem[]>(passedStories ?? []);

  const userIndexRef = useRef<number>(0);

  // If we got an explicit index from the caller, use it (but clamp to bounds).
  if (route.params?.initialUserIndex !== undefined) {
    const clamped = Math.max(
      0,
      Math.min(
        route.params.initialUserIndex,
        stories.length - 1
      )
    );
    userIndexRef.current = clamped;
  } else if (passedStories && passedStories.length > 0) {
    userIndexRef.current = 0;
  }

  const [userIndex, setUserIndex] = useState(userIndexRef.current);

  // Debug log for testing
  useEffect(() => {
    if (passedStories && passedStories.length > 0) {
      console.log(
        '[StoryViewer] Raw passed:',
        passedStories.length,
        'stories:',
        stories.length
      );
      console.log(
        '[StoryViewer] Story segments:',
        stories.map(s => `${s.publisher.name} (${s.media.length} segments)`)
      );
    }
  }, [stories, passedStories]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<ReactionBurstItem[]>([]);
  const reactionBurstId = useRef(0);
  // Set by VideoPlayer's onLoad — null while waiting for metadata so we
  // know NOT to start the progress timer yet for video segments.
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);

  const currentStory = stories[userIndex] ?? null;
  const segments = currentStory?.media ?? [];
  const currentSegment = segments[segmentIndex] ?? null;

  // Effective duration for the current segment. For video we wait on
  // `onLoad` (videoDurationMs becomes a number), then animate over that.
  const segmentMs = useMemo(() => {
    if (!currentSegment) return IMAGE_SEGMENT_MS;
    if (currentSegment.type === 'image') return IMAGE_SEGMENT_MS;
    return videoDurationMs ?? VIDEO_FALLBACK_MS;
  }, [currentSegment, videoDurationMs]);

  // ── Progress animation ──────────────────────────────────────────────
  // One Animated.Value drives the FILL on the active segment bar. Inactive
  // bars are rendered as either fully empty (future) or fully filled (past).
  const progress = useRef(new Animated.Value(0)).current;

  // Reset video duration when segment changes so we re-wait on onLoad
  // for the next video.
  useEffect(() => {
    setVideoDurationMs(null);
  }, [userIndex, segmentIndex]);

  // ── Advance / go-back ──────────────────────────────────────────────
  // Wrapped in refs so the progress effect doesn't recreate the
  // Animated.timing every render (which would re-trigger animation).
  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const advance = useCallback(() => {
    if (segmentIndex < segments.length - 1) {
      setSegmentIndex(i => i + 1);
    } else if (userIndex < stories.length - 1) {
      setUserIndex(i => i + 1);
      setSegmentIndex(0);
    } else {
      // Last segment of last user — exit the viewer.
      close();
    }
  }, [segmentIndex, segments.length, userIndex, stories.length, close]);

  const goBack = useCallback(() => {
    if (segmentIndex > 0) {
      setSegmentIndex(i => i - 1);
    } else if (userIndex > 0) {
      const prevUserIndex = userIndex - 1;
      setUserIndex(prevUserIndex);
      // Jump to LAST segment of the previous user, matching IG/FB behaviour.
      const prevUserSegmentCount = stories[prevUserIndex]?.media.length ?? 1;
      setSegmentIndex(Math.max(0, prevUserSegmentCount - 1));
    }
    // else: at very first segment — stay put.
  }, [segmentIndex, userIndex, stories]);

  // ── Start / restart the timer on segment changes ───────────────────
  useEffect(() => {
    if (!currentSegment) return;
    // For video, wait until `onLoad` gives us the real duration so the
    // progress bar matches actual playback length.
    if (currentSegment.type === 'video' && videoDurationMs === null) return;
    if (isPaused) return;

    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: segmentMs,
      // We animate a width value — must use the JS driver since width
      // isn't supported by the native driver in RN.
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      // `finished` is false when we abort via .stop() (effect cleanup).
      if (finished) advance();
    });
    return () => {
      anim.stop();
    };
  }, [
    currentSegment,
    segmentMs,
    isPaused,
    videoDurationMs,
    advance,
    progress,
  ]);

  // ── Reaction handling ───────────────────────────────────────────────
  //
  // The backend's react_story endpoint is a TOGGLE — calling it with
  // the same reaction twice removes it. So a SWAP (e.g. like → love)
  // is two API calls: clear-old then add-new. We mirror the same logic
  // useStoriesViewModel uses in the rail.

  // Bounce animation for the reaction buttons
  const reactionScale = useRef(new Animated.Value(1)).current;
  const bounceReaction = useCallback(() => {
    reactionScale.setValue(1.4);
    Animated.spring(reactionScale, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [reactionScale]);

  const launchReactionBurst = useCallback(
    (reaction: ReactionType) => {
      const emoji = STORY_REACTION_EMOJI[reaction];
      const centerX = viewportWidth / 2;
      const maxLeft = Math.max(24, viewportWidth - 48);
      const offsets = [-104, -68, -32, 0, 36, 72, 108];
      const nextItems: ReactionBurstItem[] = offsets.map((offset, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const left = Math.min(maxLeft, Math.max(24, centerX + offset - 18));

        return {
          id: `${Date.now()}-${reactionBurstId.current++}`,
          emoji,
          left,
          size: 28 + (index % 3) * 3,
          driftX: direction * (22 + index * 3),
          translateY: new Animated.Value(0),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.72),
          rotate: new Animated.Value(0),
        };
      });

      setReactionBurst(items => [...items, ...nextItems]);

      nextItems.forEach((item, index) => {
        const delay = index * 55;
        Animated.parallel([
          Animated.timing(item.translateY, {
            toValue: -250 - (index % 3) * 34,
            duration: 1500 + index * 35,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(item.opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.delay(930 + index * 30),
            Animated.timing(item.opacity, {
              toValue: 0,
              duration: 360,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.spring(item.scale, {
              toValue: 1,
              friction: 4,
              tension: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(item.rotate, {
            toValue: 1,
            duration: 1450 + index * 35,
            delay,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setReactionBurst(items =>
            items.filter(existing => existing.id !== item.id),
          );
        });
      });
    },
    [viewportWidth],
  );

  const showToast = useCallback((msg: string) => {
    if (!/^kh/i.test(msg)) {
      return;
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    }
    // On iOS, we rely on the visual state change (button highlight)
  }, []);

  const onReact = useCallback(
    async (reaction: ReactionType) => {
      if (!currentStory || !currentSegment) {
        console.warn('[StoryViewer] onReact: no currentStory or currentSegment');
        return;
      }
      const activeStoryId = currentStory.id;
      // CRITICAL FIX: The storyId might be undefined - use currentStory.id as fallback
      const targetStoryId = currentStory.id; // Always use currentStory.id directly
      const prev = currentStory.myReaction;
      const willClear = prev === reaction;
      const targetReaction = willClear ? null : reaction;
      const snapshot = currentStory;

      console.log(
        '[StoryViewer] onReact:',
        { targetStoryId, reaction, prev, willClear, targetReaction },
      );

      // Bounce animation for visual feedback
      bounceReaction();
      if (!willClear) {
        launchReactionBurst(reaction);
      }

      // Optimistic update — mutate local stories array
      setStories(arr =>
        arr.map(s => {
          if (s.id !== activeStoryId) return s;
          const wasReacted = s.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const delta = Number(willBeReacted) - Number(wasReacted);
          return {
            ...s,
            myReaction: targetReaction,
            reactionCount: Math.max(0, s.reactionCount + delta),
          };
        }),
      );

      // Notify other parts of the app (like home rail FeedScreen)
      storyReactedEvents.emit(targetStoryId, targetReaction);

      try {
        if (prev && prev !== reaction) {
          // Swap: clear old, then add new.
          await repository.reactStory(targetStoryId, prev);
          await repository.reactStory(targetStoryId, reaction);
        } else {
          await repository.reactStory(targetStoryId, reaction);
        }
        // Show success feedback
        const emojiMap: Record<string, string> = {
          like: '👍', love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡',
        };
        const emoji = emojiMap[reaction] ?? reaction;
        if (willClear) {
          showToast('Đã bỏ cảm xúc');
        } else {
          showToast(`Đã thả ${emoji}`);
        }
        console.log('[StoryViewer] reactStory API success');
      } catch (err) {
        console.error('[StoryViewer] reactStory API error:', err);
        // Rollback on failure.
        setStories(arr => arr.map(s => (s.id === activeStoryId ? snapshot : s)));
        storyReactedEvents.emit(targetStoryId, prev);
        // Notify user about the failure
        showToast('Không thể thả cảm xúc. Vui lòng thử lại.');
      }
    },
    [
      currentStory,
      currentSegment,
      bounceReaction,
      launchReactionBurst,
      showToast,
    ],
  );

  // ── Delete (owner only) ────────────────────────────────────────────
  const onDelete = useCallback(() => {
    if (!currentStory || !currentStory.isOwner || !currentSegment) return;
    Alert.alert(
      'Xoá tin?',
      'Tin sẽ bị xoá vĩnh viễn.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            const storyId = currentSegment.storyId || currentStory.id;
            try {
              await repository.deleteStory(storyId);
              // Tell the rail to drop its copy so it doesn't reappear
              // when the user goes back without a pull-to-refresh.
              storyDeletedEvents.emit(storyId);
              close();
            } catch (caught) {
              Alert.alert(
                'Không xoá được',
                caught instanceof Error
                  ? caught.message
                  : 'Vui lòng thử lại.',
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [currentStory, currentSegment, close]);

  const handleMorePress = useCallback(() => {
    setIsPaused(true);
    const options = currentStory.isOwner
      ? [
          { text: 'Huỷ', style: 'cancel', onPress: () => setIsPaused(false) },
          { text: 'Xoá tin này', style: 'destructive', onPress: onDelete },
        ]
      : [
          { text: 'Huỷ', style: 'cancel', onPress: () => setIsPaused(false) },
          {
            text: 'Báo cáo tin',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Đã báo cáo', 'Cảm ơn bạn đã báo cáo bài viết.');
              setIsPaused(false);
            },
          },
        ];

    Alert.alert(
      'Tuỳ chọn tin',
      undefined,
      options as any,
      { cancelable: true, onDismiss: () => setIsPaused(false) }
    );
  }, [currentStory, onDelete]);

  // ── Long-press pause / release resume ───────────────────────────────
  // Wrapped in stable callbacks so the Pressable refs don't churn.
  const handleLongPressStart = useCallback(() => setIsPaused(true), []);
  const handlePressOut = useCallback(() => setIsPaused(false), []);

  // ── Swipe-down-to-dismiss gesture ──────────────────────────────────
  // All gesture-related hooks (useSharedValue, useAnimatedStyle,
  // useMemo) MUST live ABOVE the early-return below to satisfy the
  // Rules of Hooks. The early-return is only allowed to live BELOW
  // the last hook call in the render body.
  //
  // We mirror the photo viewer feel: dragging down translates the whole
  // sheet and fades the background, releasing past the threshold (or
  // with enough downward velocity) dismisses the viewer. Otherwise it
  // springs back to centre. Horizontal swipes are intentionally ignored
  // so they don't fight the tap-to-advance zones.
  const dismissThreshold = Math.max(140, viewportHeight * 0.35);
  const dismissVelocity = 800;

  const swipeTranslateY = useSharedValue(0);
  const swipeProgress = useSharedValue(0); // 0..1 of how far the drag is

  // Guard against double-dismiss. Both withTiming callbacks could
  // theoretically race (especially when the gesture is interrupted),
  // and React Navigation throws a development warning if `goBack()`
  // fires when there is no route under us. This ref is checked on the
  // JS thread inside `handleDismiss` so only the first call wins.
  const dismissedRef = useRef(false);

  // Reset the guard when we navigate to a fresh viewer (new story
  // array / new user index) so a second swipe-down in the same mount
  // still works. The check uses both the first story id and the
  // current user index so we don't reset mid-dismiss-animation.
  useEffect(() => {
    dismissedRef.current = false;
  }, [passedStories, userIndex]);

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }
    dismissedRef.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fall back to the safe route when there is nothing to pop to
      // (e.g. StoryViewer was opened as the very first screen, or the
      // parent stack has been reset while we were animating).
      navigation.navigate(ROUTES.MAIN_TABS as never);
    }
  }, [navigation]);

  const swipeSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeTranslateY.value }],
    // Fade fully to 0 at the end of the gesture so the navigator's
    // pop transition never sees a translucent frame underneath it —
    // that was the source of the white-gap flash.
    opacity: 1 - swipeProgress.value,
  }));

  // Build the pan gesture once. We re-create it when the dismissal
  // primitives change (e.g. `setIsPaused` reference, dismiss threshold)
  // so the worklet captures stay current.
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-20, 20])
        .onBegin(() => {
          // Pause the auto-advancing progress while the user is dragging,
          // so the timer doesn't fire mid-swipe and pop them to the next
          // segment unexpectedly.
          runOnJS(setIsPaused)(true);
        })
        .onUpdate(event => {
          // Only honour downward drags; allow a tiny upward rubber-band
          // so the gesture feels natural.
          const translation = Math.max(-40, event.translationY);
          swipeTranslateY.value = translation;
          // Map distance to a 0..1 progress, clamped at 1 so the
          // background can fade fully out.
          swipeProgress.value = Math.min(
            1,
            Math.max(0, translation / dismissThreshold),
          );
        })
        .onEnd(event => {
          const passedThreshold =
            swipeTranslateY.value > dismissThreshold ||
            event.velocityY > dismissVelocity;

          if (passedThreshold) {
            // Animate the rest of the way off-screen, then go back. The
            // timing here is intentionally matched to the native-stack
            // `fade` animation configured for this route in
            // AppNavigator.tsx (220ms) so the two transitions play in
            // lock-step — no white gap, no double fade, no leftover frame.
            //
            // We pop the route slightly BEFORE the sheet translation
            // finishes (when opacity has already reached 0) so the
            // native-stack fade is in motion by the time the sheet would
            // otherwise stall at its final frame.
            //
            // Only the SHORTER `swipeProgress` timer (160ms) is wired
            // to call `handleDismiss` — the longer translateY timer
            // would otherwise race and trigger a second `goBack()` call,
            // which React Navigation rejects with a dev warning.
            const dismissMs = 220;
            const popAtMs = 160; // opacity is already ~0.27 by here
            swipeTranslateY.value = withTiming(
              viewportHeight,
              {
                duration: dismissMs,
                easing: Easing.out(Easing.cubic),
              },
            );
            swipeProgress.value = withTiming(
              1,
              { duration: popAtMs, easing: Easing.out(Easing.cubic) },
              finished => {
                if (finished) {
                  runOnJS(handleDismiss)();
                }
              },
            );
          } else {
            // Spring back to centre and resume the progress timer.
            swipeTranslateY.value = withSpring(0, {
              damping: 18,
              stiffness: 220,
              mass: 0.6,
            });
            swipeProgress.value = withSpring(0, {
              damping: 18,
              stiffness: 220,
              mass: 0.6,
            });
            runOnJS(setIsPaused)(false);
          }
        })
        .onFinalize(() => {
          // Safety net: if the gesture is cancelled (e.g. ScrollView parent
          // wins the race) make sure we don't leave isPaused stuck on.
          runOnJS(setIsPaused)(false);
        }),
    // The gesture closes over stable refs/setters only; we deliberately
    // exclude the changing values below so the worklet isn't rebuilt on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Early-out when no stories ───────────────────────────────────────
  // Safe to early-return now — every hook above is unconditional.
  if (!currentStory || !currentSegment) {
    return (
      <SafeAreaView style={styles.container} edges={ROOT_SAFE_AREA_EDGES}>
        <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Không có tin để xem.</Text>
          <TouchableOpacity onPress={close} style={styles.closeBtnEmpty}>
            <Text style={styles.closeBtnEmptyText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <GestureDetector gesture={swipeGesture}>
      <ReanimatedAnimated.View style={[styles.container, swipeSheetStyle]}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000" />

          {/* ── Media (renders BEHIND the controls) ────────────────────── */}
          <View style={styles.mediaWrap}>
            {currentSegment.type === 'image' ? (
              <Image
                key={`img-${currentStory.id}-${segmentIndex}`}
                source={{ uri: currentSegment.url }}
                style={styles.media}
                resizeMode="contain"
              />
            ) : (
              <VideoPlayer
                // `key` ensures the player remounts when we move to a new
                // video segment — otherwise the old VideoPlayer instance
                // would keep playing the previous URL until React reconciles.
                key={`vid-${currentStory.id}-${segmentIndex}`}
                source={{ uri: currentSegment.url }}
                style={styles.media}
                paused={isPaused}
                resizeMode="contain"
                onLoad={data => {
                  // Some Android codecs report 0 for `duration` on first
                  // load — clamp so the timer doesn't fire instantly.
                  const ms = Math.max(1000, (data.duration ?? 0) * 1000);
                  setVideoDurationMs(ms);
                }}
                onError={() => {
                  // If the video fails to load, fall back to the default
                  // duration and proceed. The user sees a black frame for
                  // ~15s — worse than ideal but better than getting stuck.
                  setVideoDurationMs(VIDEO_FALLBACK_MS);
                }}
              />
            )}
          </View>

          {/* ── Tap zones (transparent overlays over the media) ────────── */}
          <View style={styles.tapZones} pointerEvents="box-none">
            <Pressable
              style={styles.tapZoneLeft}
              onPress={goBack}
              onLongPress={handleLongPressStart}
              onPressOut={handlePressOut}
              delayLongPress={250}
            />
            <Pressable
              style={styles.tapZoneRight}
              onPress={advance}
              onLongPress={handleLongPressStart}
              onPressOut={handlePressOut}
              delayLongPress={250}
            />
          </View>

          {/* ── Floating Text Overlay (Facebook Style) ── */}
          {currentStory.title ? (
            <View style={styles.floatingCaptionWrap} pointerEvents="none">
              <Text style={styles.floatingCaptionText}>
                {currentStory.title}
              </Text>
            </View>
          ) : null}

          {/* ── Top overlay: progress bars + header + tags ──────────────────── */}
          <View
            style={[styles.topOverlay, { top: storyHeaderSafeTop }]}
            pointerEvents="box-none"
          >
            {/* Progress bars — one per segment (Facebook style: each segment has its own bar) */}
            <View style={styles.progressRow}>
              {segments.map((_, idx) => {
                const isPast = idx < segmentIndex;
                const isActive = idx === segmentIndex;
                return (
                  <View key={`${segmentIndex}-${idx}`} style={styles.progressTrack}>
                    {isPast ? (
                      // Past segments — fully filled
                      <View style={[styles.progressFill, { width: '100%' }]} />
                    ) : isActive ? (
                      // Active — animated width interpolated from 0..1
                      <Animated.View
                        style={[
                          styles.progressFill,
                          {
                            width: progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Header row: avatar with online dot + name & time on same line + close + options */}
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                {currentStory.publisher.avatarUrl ? (
                  <Image
                    source={{ uri: currentStory.publisher.avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {currentStory.publisher.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {currentStory.publisher.isOnline ? (
                  <View style={styles.onlineDot} />
                ) : null}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {currentStory.publisher.name}{' '}
                  <Text style={styles.headerTime}>
                    {formatRelativeTime(currentSegment.postedAt ?? currentStory.postedAt)}
                  </Text>
                </Text>
              </View>

              {/* Close (ChevronDown) */}
              <TouchableOpacity
                onPress={close}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.headerIconBtn}
              >
                <ChevronDown size={24} color="#fff" />
              </TouchableOpacity>

              {/* More actions (Options) */}
              <TouchableOpacity
                onPress={handleMorePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.headerIconBtn}
              >
                <MoreHorizontal size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Bottom overlay: reactions picker ─────────────── */}
          <View style={styles.reactionBurstLayer} pointerEvents="none">
            {reactionBurst.map(item => (
              <Animated.Text
                key={item.id}
                style={[
                  styles.floatingReactionEmoji,
                  {
                    left: item.left,
                    fontSize: item.size,
                    opacity: item.opacity,
                    transform: [
                      { translateY: item.translateY },
                      {
                        translateX: item.translateY.interpolate({
                          inputRange: [-340, 0],
                          outputRange: [item.driftX, 0],
                        }),
                      },
                      { scale: item.scale },
                      {
                        rotate: item.rotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-10deg', '12deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {item.emoji}
              </Animated.Text>
            ))}
          </View>

          <View style={styles.bottomOverlay} pointerEvents="box-none">
            {/* Solid black bottom bar */}
            <View style={styles.bottomBarContainer}>
              <View style={styles.inputRow}>
                {/* Quick Reactions */}
                <Animated.View style={[styles.quickReactions, { transform: [{ scale: reactionScale }] }]}>
                  {[
                    (['like', '👍'] as const),
                    (['love', '❤️'] as const),
                    (['haha', '😆'] as const),
                    (['wow', '😮'] as const),
                    (['sad', '😢'] as const),
                    (['angry', '😡'] as const),
                  ].map(([type, emoji]) => {
                    const isActive = currentStory.myReaction === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => {
                          console.log('[StoryViewer] Reaction button pressed:', type);
                          onReact(type);
                        }}
                        activeOpacity={0.5}
                        style={[
                          styles.quickReactionBtn,
                          isActive ? styles.reactionBtnActive : null,
                        ]}
                      >
                        {type === 'like' ? (
                          <View style={[
                            styles.fbLikeCircle,
                            {
                              backgroundColor: isActive ? '#1877F2' : '#2A2B2C',
                              opacity: isActive ? 1 : 0.6
                            }
                          ]}>
                            <ThumbsUp
                              size={16}
                              color={isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)'}
                              fill={isActive ? '#fff' : 'none'}
                            />
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.quickReactionEmoji,
                              { opacity: isActive ? 1 : 0.6 }
                            ]}
                          >
                            {emoji}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ReanimatedAnimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Media ────────────────────────────────────────────────────────
  mediaWrap: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },

  // ── Tap zones (cover the media for navigation) ───────────────────
  tapZones: {
    ...(StyleSheet.absoluteFill as object),
    flexDirection: 'row',
    // Leave room for the bottom overlay so reaction taps reach it
    bottom: 180,
    top: 100,
  },
  tapZoneLeft: { flex: 1 },
  tapZoneRight: { flex: 2 },

  // ── Top overlay ─────────────────────────────────────────────────
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#31A24C',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: 'normal',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // ── Overlay Tags ───────────────────────────────────────────────
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  musicIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  musicText: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '600',
  },
  musicAction: {
    color: '#0866FF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 6,
  },
  mentionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    marginLeft: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mentionIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  mentionIconText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 11,
  },
  mentionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Floating Caption ───────────────────────────────────────────
  floatingCaptionWrap: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  floatingCaptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // ── Bottom overlay ─────────────────────────────────────────────
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  reactionBurstLayer: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 30,
    elevation: 30,
  },
  floatingReactionEmoji: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 88,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  quickReplyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  quickReplyPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  quickReplyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBarContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  quickReactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickReactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReactionEmoji: {
    fontSize: 28,
  },
  fbLikeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbLikeThumbsUp: {
    fontSize: 18,
    color: '#ffffff',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ scale: 1.15 }],
  },

  // ── Empty state ─────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  closeBtnEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  closeBtnEmptyText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default StoryViewerScreen;
