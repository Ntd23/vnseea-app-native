// Description: Live stream viewer room - shows live metadata, comments, and actions.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Eye,
  EyeOff,
  LogOut,
  MoreHorizontal,
  Send,
  Share as ShareIcon,
  Smile,
  Sparkles,
  SwitchCamera,
  VideoOff,
  X,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLiveRoomViewModel } from '../../application/view-models/useLiveViewModel';
import { LiveCameraPreview } from '../components/LiveCameraPreview';
import { LiveKitStreamView } from '../components/LiveKitStreamView';
import type {
  LiveSession,
  LiveStreamComment,
} from '../../domain/types/live.types';
import { publishLiveMediaActive } from '../../../shared-kernel/application/state/liveMediaPlaybackIsolation';
import { ROUTES } from '../../../navigation/constants/routes';
import {
  reduceLiveViewerLifecycle,
  type LiveViewerLifecycleEvent,
} from '../../application/view-models/liveViewerLifecycle';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import {
  FEED_REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from '../../../feed/presentation/components/FeedReactionAssets';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';
import { CommentMentionText } from '../../../reels/presentation/components/CommentMentionText';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import { audienceFromWire } from '../../../shared-kernel/domain/types/contentAudience';
import { formatLiveElapsedTime } from './liveRoomPresentation';

type LiveRouteParams = {
  postId: number;
  isHost?: boolean;
  liveSession?: LiveSession;
  initialCameraFacing?: 'front' | 'back';
};

const commentsContentStyle = { paddingBottom: 10 };
const LIVE_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
const LIVE_OVERLAY_ANIMATION_MS = 150;
const LIVE_OVERLAY_SWIPE_DISTANCE = 72;
const LIVE_OVERLAY_SWIPE_VELOCITY = 0.55;
const LIVE_REACTION_PARTICLE_DURATION_MS = 2200;
const LIVE_DOUBLE_TAP_DELAY_MS = 320;
const LIVE_REACTION_TICKER_DURATION_MS = 4200;
const DEFAULT_LIVE_REACTION: ReactionType = 'love';

const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
};

type FloatingReaction = {
  id: string;
  reaction: ReactionType;
  progress: Animated.Value;
  driftX: number;
  rise: number;
  rotation: number;
  size: number;
};

type ReactionToast = {
  id: string;
  name: string;
  avatarUrl?: string;
  reaction: ReactionType;
  progress: Animated.Value;
};

type LiveMediaConnectionState = 'connected' | 'disconnected' | 'error';

function getInitials(name: string) {
  const normalized = name.trim();
  if (!normalized) return 'VN';
  if (normalized.toLocaleLowerCase('vi').includes('quản trị')) return 'VN';
  return normalized.slice(0, 1).toUpperCase();
}

function getAvatarFallbackColor(name: string) {
  const palette = ['#4F6BFF', '#FF5368', '#8B5CF6', '#F97316', '#0EA5E9'];
  const index = Array.from(name).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return palette[index % palette.length];
}

function LiveAvatar({
  uri,
  name,
  size,
  textSize,
}: {
  uri?: string;
  name: string;
  size: number;
  textSize: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.liveAvatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getAvatarFallbackColor(name),
        },
      ]}
    >
      <Text style={[styles.liveAvatarFallbackText, { fontSize: textSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function logLiveLifecycle(event: string, data: Record<string, unknown> = {}) {
  const payload = { event, at: new Date().toISOString(), ...data };
  try {
    console.log(LIVE_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(LIVE_DEBUG_PREFIX, event, data);
  }
}

export default function LiveRoomScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: LiveRouteParams }, 'params'>>();
  const { width: screenWidth } = useWindowDimensions();
  const {
    postId,
    isHost: routeIsHost = false,
    liveSession: routeLiveSession,
    initialCameraFacing = 'front',
  } = route.params || {
    postId: 0,
    isHost: false,
    liveSession: undefined,
    initialCameraFacing: 'front',
  };

  const {
    streamInfo,
    liveSession,
    comments,
    viewerCount,
    reactionsCount,
    myReaction,
    isReacting,
    reactionEvents,
    state,
    isHost: streamIsHost,
    isLoading,
    hasLoadedComments,
    error,
    sendComment,
    react,
    sharePost,
    leave,
    refreshLiveState,
    currentUserProfile,
  } = useLiveRoomViewModel(postId, routeLiveSession);

  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isReactionPickerVisible, setIsReactionPickerVisible] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<ReactionType>(
    myReaction ?? DEFAULT_LIVE_REACTION,
  );
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [liveClockNow, setLiveClockNow] = useState(() => Date.now());
  const inputRef = React.useRef<TextInput>(null);
  const commentsListRef = useRef<FlatList<LiveStreamComment>>(null);
  const lastAutoScrolledCommentIdRef = useRef('');
  const commentAutoScrollUntilRef = useRef(0);
  const lastVideoTapAtRef = useRef(0);
  const reactionLongPressTriggeredRef = useRef(false);
  const [areLiveOverlaysVisible, setAreLiveOverlaysVisible] = useState(true);
  const [isCommentInputFocused, setIsCommentInputFocused] = useState(false);
  const liveOverlayProgress = useRef(new Animated.Value(1)).current;
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>(
    initialCameraFacing,
  );
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [isLeavingLive, setIsLeavingLive] = useState(false);
  const [viewerLifecycle, dispatchViewerLifecycle] = useReducer(
    reduceLiveViewerLifecycle,
    'watching',
  );
  const liveEndSourceRef = useRef('backend_poll');
  const hasLoggedEndScreenRef = useRef(false);
  const reactionDelayTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );
  const reactionToastTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );
  const lastLocalReactionRef = useRef<{
    reaction: ReactionType;
    at: number;
  } | null>(null);

  const insets = useSafeAreaInsets();
  const isHost = routeIsHost || streamIsHost;
  const hasLiveKitSession = Boolean(liveSession?.wsUrl && liveSession?.token);
  const viewerHasEnded =
    !isHost && (viewerLifecycle === 'ended' || state === 'offline');
  const liveMediaActive = !viewerHasEnded;

  const scrollCommentsToLatest = useCallback((animated = true) => {
    commentsListRef.current?.scrollToEnd({ animated });
  }, []);

  const hideLiveOverlays = useCallback(() => {
    if (!areLiveOverlaysVisible) return;
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsCommentInputFocused(false);
    setIsReactionPickerVisible(false);
    setAreLiveOverlaysVisible(false);
    liveOverlayProgress.stopAnimation();
    Animated.timing(liveOverlayProgress, {
      toValue: 0,
      duration: LIVE_OVERLAY_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [areLiveOverlaysVisible, liveOverlayProgress]);

  const showLiveOverlays = useCallback(() => {
    if (areLiveOverlaysVisible) return;
    setAreLiveOverlaysVisible(true);
    commentAutoScrollUntilRef.current = Date.now() + 700;
    liveOverlayProgress.stopAnimation();
    Animated.timing(liveOverlayProgress, {
      toValue: 1,
      duration: LIVE_OVERLAY_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    requestAnimationFrame(() => scrollCommentsToLatest(false));
  }, [areLiveOverlaysVisible, liveOverlayProgress, scrollCommentsToLatest]);

  const liveOverlayPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          if (isCommentInputFocused) return false;
          const horizontalIntent =
            Math.abs(gestureState.dx) > 24 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.35;
          if (!horizontalIntent) return false;
          return areLiveOverlaysVisible
            ? gestureState.dx < 0
            : gestureState.dx > 0;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (
            areLiveOverlaysVisible &&
            (gestureState.dx <= -LIVE_OVERLAY_SWIPE_DISTANCE ||
              gestureState.vx <= -LIVE_OVERLAY_SWIPE_VELOCITY)
          ) {
            hideLiveOverlays();
            return;
          }
          if (
            !areLiveOverlaysVisible &&
            (gestureState.dx >= LIVE_OVERLAY_SWIPE_DISTANCE ||
              gestureState.vx >= LIVE_OVERLAY_SWIPE_VELOCITY)
          ) {
            showLiveOverlays();
          }
        },
      }),
    [
      areLiveOverlaysVisible,
      hideLiveOverlays,
      isCommentInputFocused,
      showLiveOverlays,
    ],
  );

  const liveHeaderOverlayStyle = {
    opacity: liveOverlayProgress,
    transform: [
      {
        translateY: liveOverlayProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-16, 0],
        }),
      },
    ],
  };
  const liveBottomOverlayStyle = {
    opacity: liveOverlayProgress,
    transform: [
      {
        translateY: liveOverlayProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  };
  const liveRestoreOverlayStyle = {
    opacity: liveOverlayProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateY: liveOverlayProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
  };
  const latestCommentId = comments[comments.length - 1]?.id ?? '';

  useEffect(() => {
    lastAutoScrolledCommentIdRef.current = '';
    commentAutoScrollUntilRef.current = 0;
    setAreLiveOverlaysVisible(true);
    liveOverlayProgress.setValue(1);
  }, [liveOverlayProgress, postId]);

  useEffect(() => {
    if (!latestCommentId) return;
    if (lastAutoScrolledCommentIdRef.current === latestCommentId) return;

    const hasPreviousComment = Boolean(lastAutoScrolledCommentIdRef.current);
    lastAutoScrolledCommentIdRef.current = latestCommentId;
    commentAutoScrollUntilRef.current = Date.now() + 900;

    const frame = requestAnimationFrame(() =>
      scrollCommentsToLatest(hasPreviousComment),
    );
    const settleTimer = setTimeout(() => scrollCommentsToLatest(false), 100);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
    };
  }, [latestCommentId, scrollCommentsToLatest]);

  const handleCommentsContentSizeChange = useCallback(() => {
    if (Date.now() > commentAutoScrollUntilRef.current) return;
    requestAnimationFrame(() => scrollCommentsToLatest(false));
  }, [scrollCommentsToLatest]);

  const [floatingReactions, setFloatingReactions] = useState<
    FloatingReaction[]
  >([]);
  const [reactionToasts, setReactionToasts] = useState<ReactionToast[]>([]);

  useEffect(() => {
    setLiveClockNow(Date.now());
    const timer = setInterval(() => setLiveClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [postId, streamInfo?.startedAt]);

  useEffect(() => {
    reactionDelayTimersRef.current.forEach(clearTimeout);
    reactionDelayTimersRef.current.clear();
    reactionToastTimersRef.current.forEach(clearTimeout);
    reactionToastTimersRef.current.clear();
    setIsReactionPickerVisible(false);
    setFloatingReactions([]);
    setReactionToasts([]);
    setSelectedReaction(DEFAULT_LIVE_REACTION);
    setShowFullDescription(false);
    lastLocalReactionRef.current = null;
    lastVideoTapAtRef.current = 0;
    reactionLongPressTriggeredRef.current = false;
  }, [postId]);

  useEffect(() => {
    if (myReaction) {
      setSelectedReaction(myReaction);
    }
  }, [myReaction]);

  useEffect(() => {
    const reactionTimers = reactionDelayTimersRef.current;
    const toastTimers = reactionToastTimersRef.current;
    return () => {
      reactionTimers.forEach(clearTimeout);
      reactionTimers.clear();
      toastTimers.forEach(clearTimeout);
      toastTimers.clear();
    };
  }, []);

  useEffect(() => {
    publishLiveMediaActive(liveMediaActive);
    return () => {
      publishLiveMediaActive(false);
    };
  }, [liveMediaActive]);

  const sendViewerLifecycleEvent = useCallback(
    (event: LiveViewerLifecycleEvent) => {
      if (isHost) return;
      dispatchViewerLifecycle(event);
    },
    [isHost],
  );

  useEffect(() => {
    dispatchViewerLifecycle('room_changed');
    liveEndSourceRef.current = 'backend_poll';
    hasLoggedEndScreenRef.current = false;
  }, [postId]);

  useEffect(() => {
    if (isHost || state !== 'offline') return;
    if (viewerLifecycle === 'watching') {
      liveEndSourceRef.current = 'backend_poll';
    }
    sendViewerLifecycleEvent('backend_offline');
  }, [isHost, sendViewerLifecycleEvent, state, viewerLifecycle]);

  useEffect(() => {
    if (isHost || viewerLifecycle !== 'ended') return;
    if (hasLoggedEndScreenRef.current) return;
    hasLoggedEndScreenRef.current = true;
    logLiveLifecycle('live_viewer_host_end_detected', {
      postId,
      source: liveEndSourceRef.current,
    });
    logLiveLifecycle('live_end_screen_shown', { postId });
  }, [isHost, postId, viewerLifecycle]);

  const handleMediaConnectionStateChange = useCallback(
    (connectionState: LiveMediaConnectionState) => {
      logLiveLifecycle('live_media_connection_state_changed', {
        postId,
        role: isHost ? 'host' : 'viewer',
        connectionState,
      });
      if (isHost) return;

      if (connectionState === 'connected') {
        sendViewerLifecycleEvent('media_connected');
        return;
      }

      sendViewerLifecycleEvent(
        connectionState === 'error' ? 'media_error' : 'media_disconnected',
      );
      liveEndSourceRef.current = 'media_disconnect_check';
      refreshLiveState()
        .then(nextState => {
          if (nextState === 'offline') {
            sendViewerLifecycleEvent('backend_offline');
            return;
          }
          sendViewerLifecycleEvent('backend_live');
        })
        .catch(() => {
          // A transport error must not be interpreted as the host ending live.
        });
    },
    [isHost, postId, refreshLiveState, sendViewerLifecycleEvent],
  );

  const spawnReactionBurst = useCallback(
    (reaction: ReactionType, requestedCount = 6) => {
      const count = Math.min(12, Math.max(1, requestedCount));

      for (let index = 0; index < count; index += 1) {
        const timer = setTimeout(() => {
          reactionDelayTimersRef.current.delete(timer);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const particle: FloatingReaction = {
            id,
            reaction,
            progress: new Animated.Value(0),
            driftX: Math.round((Math.random() - 0.5) * 72),
            rise: Math.round(220 + Math.random() * 150),
            rotation: Math.round((Math.random() - 0.5) * 26),
            size: Math.round(14 + Math.random() * 7),
          };

          setFloatingReactions(previous => [...previous, particle]);
          Animated.timing(particle.progress, {
            toValue: 1,
            duration: LIVE_REACTION_PARTICLE_DURATION_MS + Math.random() * 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            setFloatingReactions(previous =>
              previous.filter(item => item.id !== id),
            );
          });
        }, index * 95);

        reactionDelayTimersRef.current.add(timer);
      }
    },
    [],
  );

  const triggerReactionToast = useCallback(
    (name: string, reaction: ReactionType, avatarUrl?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const progress = new Animated.Value(0);
      setReactionToasts(previous => [
        ...previous.slice(-1),
        { id, name, reaction, avatarUrl, progress },
      ]);
      requestAnimationFrame(() => {
        Animated.timing(progress, {
          toValue: 1,
          duration: LIVE_REACTION_TICKER_DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start();
      });
      const timer = setTimeout(() => {
        reactionToastTimersRef.current.delete(timer);
        setReactionToasts(previous => previous.filter(item => item.id !== id));
      }, LIVE_REACTION_TICKER_DURATION_MS);
      reactionToastTimersRef.current.add(timer);
    },
    [],
  );

  const lastReactionsCount = React.useRef(reactionsCount);
  const handledReactionEvents = React.useRef(new Set<string>());
  const lastDetailedReactionAt = React.useRef(0);
  const hasReactionCountBaseline = React.useRef(false);
  useEffect(() => {
    handledReactionEvents.current.clear();
    lastDetailedReactionAt.current = 0;
    lastReactionsCount.current = 0;
    hasReactionCountBaseline.current = false;
  }, [postId]);

  useEffect(() => {
    if (reactionEvents.length === 0) return;

    reactionEvents.forEach(event => {
      if (handledReactionEvents.current.has(event.id)) return;
      handledReactionEvents.current.add(event.id);
      lastDetailedReactionAt.current = Date.now();
      const localReaction = lastLocalReactionRef.current;
      const isCurrentViewer = Boolean(
        (event.username &&
          currentUserProfile?.username &&
          event.username === currentUserProfile.username) ||
          (event.name &&
            currentUserProfile?.name &&
            event.name === currentUserProfile.name),
      );
      const isRecentLocalEcho = Boolean(
        isCurrentViewer &&
          localReaction?.reaction === event.reaction &&
          Date.now() - localReaction.at < 8000,
      );
      if (isRecentLocalEcho) return;

      spawnReactionBurst(event.reaction, 7);
      triggerReactionToast(event.name, event.reaction, event.avatarUrl);
    });
  }, [
    currentUserProfile?.name,
    currentUserProfile?.username,
    reactionEvents,
    spawnReactionBurst,
    triggerReactionToast,
  ]);

  useEffect(() => {
    // Only host receives remote reaction animations and toasts
    if (!isHost) {
      lastReactionsCount.current = reactionsCount;
      hasReactionCountBaseline.current = false;
      return;
    }

    if (!hasLoadedComments) {
      return;
    }

    if (!hasReactionCountBaseline.current) {
      lastReactionsCount.current = reactionsCount;
      hasReactionCountBaseline.current = true;
      return;
    }

    const diff = reactionsCount - lastReactionsCount.current;
    const detailedEventJustHandled =
      Date.now() - lastDetailedReactionAt.current < 1200;
    if (diff > 0 && !detailedEventJustHandled) {
      const randomReaction =
        FEED_REACTION_TYPES[
          Math.floor(Math.random() * FEED_REACTION_TYPES.length)
        ];
      const count = Math.min(Math.max(diff * 3, 4), 12);

      spawnReactionBurst(randomReaction, count);
      triggerReactionToast('Người xem', randomReaction);
    }
    lastReactionsCount.current = reactionsCount;
  }, [
    reactionsCount,
    isHost,
    hasLoadedComments,
    reactionEvents.length,
    spawnReactionBurst,
    triggerReactionToast,
  ]);

  const handleSendComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed || isSendingComment) return;

    setIsSendingComment(true);
    try {
      await sendComment(trimmed);
      setCommentText('');
    } catch (err) {
      console.error('[LiveRoom] send comment error:', err);
      Alert.alert('Lỗi', 'Không gửi được bình luận.');
    } finally {
      setIsSendingComment(false);
    }
  }, [commentText, isSendingComment, sendComment]);

  const handleCommentPress = useCallback((item: LiveStreamComment) => {
    if (item.username) {
      setCommentText(`@${item.username} `);
      inputRef.current?.focus();
    }
  }, []);

  const handleLeave = useCallback(() => {
    setLeaveModalVisible(true);
  }, []);

  const exitLiveRoom = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.FEED });
  }, [navigation]);

  const handleConfirmLeave = useCallback(async () => {
    if (isLeavingLive) return;
    setIsLeavingLive(true);
    try {
      await leave();
      setLeaveModalVisible(false);
      setIsLeavingLive(false);
      exitLiveRoom();
    } catch (err) {
      setIsLeavingLive(false);
      Alert.alert(
        'Không thể kết thúc live',
        err instanceof Error
          ? err.message
          : 'Vui lòng kiểm tra kết nối và thử lại.',
      );
    }
  }, [exitLiveRoom, isLeavingLive, leave]);

  const handleExitEndedLive = useCallback(() => {
    logLiveLifecycle('live_end_screen_exit', { postId });
    exitLiveRoom();
  }, [exitLiveRoom, postId]);

  const presentLocalReaction = useCallback(
    (reaction: ReactionType) => {
      const userName =
        currentUserProfile?.name || currentUserProfile?.username || 'Bạn';
      lastLocalReactionRef.current = { reaction, at: Date.now() };
      spawnReactionBurst(reaction, 7);
      triggerReactionToast(
        userName,
        reaction,
        currentUserProfile?.avatarUrl,
      );
    },
    [
      currentUserProfile?.avatarUrl,
      currentUserProfile?.name,
      currentUserProfile?.username,
      spawnReactionBurst,
      triggerReactionToast,
    ],
  );

  const handleReaction = useCallback(
    async (reaction: ReactionType) => {
      const previousSelectedReaction = selectedReaction;
      setIsReactionPickerVisible(false);
      setSelectedReaction(reaction);
      presentLocalReaction(reaction);

      // Repeated taps create new live bursts without removing the reaction
      // selected for this post.
      if (myReaction === reaction || isReacting) return;

      try {
        await react(reaction);
      } catch (err) {
        setSelectedReaction(myReaction ?? previousSelectedReaction);
        Alert.alert(
          'Không thể thả cảm xúc',
          err instanceof Error
            ? err.message
            : 'Vui lòng kiểm tra kết nối và thử lại.',
        );
      }
    },
    [isReacting, myReaction, presentLocalReaction, react, selectedReaction],
  );

  const handlePrimaryReactionPress = useCallback(() => {
    if (reactionLongPressTriggeredRef.current) {
      reactionLongPressTriggeredRef.current = false;
      return;
    }
    handleReaction(selectedReaction);
  }, [handleReaction, selectedReaction]);

  const handlePrimaryReactionLongPress = useCallback(() => {
    reactionLongPressTriggeredRef.current = true;
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsCommentInputFocused(false);
    setIsReactionPickerVisible(true);
  }, []);

  const handleLiveSurfacePress = useCallback(() => {
    const wasCommentFocused = isCommentInputFocused;
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsCommentInputFocused(false);
    setIsReactionPickerVisible(false);

    if (wasCommentFocused) {
      lastVideoTapAtRef.current = 0;
      return;
    }

    const now = Date.now();
    if (now - lastVideoTapAtRef.current <= LIVE_DOUBLE_TAP_DELAY_MS) {
      lastVideoTapAtRef.current = 0;
      handleReaction(selectedReaction);
      return;
    }
    lastVideoTapAtRef.current = now;
  }, [handleReaction, isCommentInputFocused, selectedReaction]);

  const handleToggleCamera = useCallback(() => {
    setCameraFacing(current => (current === 'front' ? 'back' : 'front'));
  }, []);

  const descriptionText = useMemo(() => {
    return (
      streamInfo?.description?.trim() ||
      'Chào mừng mọi người đến với buổi live!'
    );
  }, [streamInfo?.description]);

  const elapsedText = useMemo(
    () => formatLiveElapsedTime(streamInfo?.startedAt, liveClockNow),
    [liveClockNow, streamInfo?.startedAt],
  );

  const shareSheetPost = useMemo<FeedPost | undefined>(() => {
    if (postId <= 0 || !streamInfo) return undefined;
    const privacy = audienceFromWire(streamInfo.privacy, {
      fallback: 'public',
    }).audience;
    const parsedStartedAt = Date.parse(streamInfo.startedAt);

    return {
      kind: 'text',
      id: String(postId),
      caption: streamInfo.title?.trim() || descriptionText,
      photos: streamInfo.thumbnailUrl ? [streamInfo.thumbnailUrl] : [],
      postedAt: Number.isFinite(parsedStartedAt)
        ? Math.floor(parsedStartedAt / 1000)
        : undefined,
      likeCount: reactionsCount,
      commentCount: comments.length,
      isLiked: Boolean(myReaction),
      myReaction,
      topReactions: myReaction ? [myReaction] : [],
      privacy,
      publisher: {
        id: streamInfo.publisher.id,
        name: streamInfo.publisher.name,
        username: streamInfo.publisher.username,
        avatarUrl: streamInfo.publisher.avatarUrl,
      },
      permissions: {
        canDelete: false,
        canEdit: false,
        canShare: privacy !== 'only_me',
        canShareKnown: true,
      },
      liveContext: {
        state,
        streamName: streamInfo.streamName,
        title: streamInfo.title,
        description: streamInfo.description,
        thumbnailUrl: streamInfo.thumbnailUrl || undefined,
        viewerCount,
        startedAt: Number.isFinite(parsedStartedAt)
          ? Math.floor(parsedStartedAt / 1000)
          : undefined,
      },
    };
  }, [
    comments.length,
    descriptionText,
    myReaction,
    postId,
    reactionsCount,
    streamInfo,
    state,
    viewerCount,
  ]);

  const handleShare = useCallback(() => {
    if (!shareSheetPost) return;
    inputRef.current?.blur();
    Keyboard.dismiss();
    setIsCommentInputFocused(false);
    setIsReactionPickerVisible(false);
    setShareModalVisible(true);
  }, [shareSheetPost]);

  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
  }, []);

  const handleMoreOptions = useCallback(() => {
    Alert.alert('Tùy chọn live', undefined, [
      {
        text: isHost ? 'Kết thúc live' : 'Rời live',
        style: 'destructive',
        onPress: handleLeave,
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }, [handleLeave, isHost]);

  const liveStatusBar = (
    <FocusAwareStatusBar
      hidden
      barStyle="light-content"
      translucent
      backgroundColor="transparent"
    />
  );

  if (isLoading && !streamInfo) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        {liveStatusBar}
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="mt-3 text-white/70">Đang tải live...</Text>
      </View>
    );
  }

  if (viewerHasEnded) {
    const publisherName = streamInfo?.publisher.name || 'Người phát live';
    const publisherAvatar = streamInfo?.publisher.avatarUrl;

    return (
      <View
        className="flex-1 items-center justify-center bg-slate-950 px-8"
        style={{
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {liveStatusBar}
        {publisherAvatar ? (
          <Image
            source={{ uri: publisherAvatar }}
            className="h-24 w-24 rounded-full border-2 border-white/15 bg-slate-800"
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-800">
            <Text className="text-3xl font-bold text-white">
              {publisherName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="mt-4 text-base font-semibold text-white/75">
          {publisherName}
        </Text>
        <View className="mt-8 h-14 w-14 items-center justify-center rounded-full bg-white/10">
          <VideoOff size={26} color="#ffffff" />
        </View>
        <Text className="mt-5 text-center text-2xl font-bold text-white">
          Phiên live đã kết thúc
        </Text>
        <Text className="mt-2 text-center text-sm text-white/60">
          Cảm ơn bạn đã theo dõi
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleExitEndedLive}
          className="mt-8 min-h-12 min-w-40 items-center justify-center rounded-full bg-white px-7"
        >
          <Text className="text-sm font-bold text-slate-950">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!streamInfo) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        {liveStatusBar}
        <Text className="text-center text-[16px] font-semibold text-white">
          {error || 'Live này không còn hoạt động.'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          className="mt-5 rounded-full bg-white px-5 py-3"
        >
          <Text className="font-semibold text-[#111827]">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      {liveStatusBar}
      <View
        className="flex-1 relative bg-slate-950"
        {...liveOverlayPanResponder.panHandlers}
      >
        {/* Full Screen Live Stream / Camera Preview */}
        <View className="absolute inset-0 bg-slate-900">
          {isHost && !hasLiveKitSession && (
            <LiveCameraPreview cameraFacing={cameraFacing} enabled />
          )}
          {hasLiveKitSession && liveSession ? (
            <LiveKitStreamView
              session={liveSession}
              isHost={isHost}
              cameraFacing={cameraFacing}
              onConnectionStateChange={handleMediaConnectionStateChange}
            />
          ) : null}
        </View>

        <Pressable
          accessible={false}
          onPress={handleLiveSurfacePress}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="none" style={styles.topScrim}>
          <Svg width="100%" height="100%" pointerEvents="none">
            <Defs>
              <LinearGradient id="liveTopGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.46" />
                <Stop offset="0.28" stopColor="#000000" stopOpacity="0.10" />
                <Stop offset="0.52" stopColor="#000000" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="62%"
              fill="url(#liveTopGradient)"
            />
          </Svg>
        </View>

        {!isHost && viewerLifecycle === 'reconnecting' ? (
          <View
            pointerEvents="none"
            className="absolute inset-0 z-20 items-center justify-center bg-black/30"
          >
            <View className="flex-row items-center rounded-full bg-black/75 px-4 py-2.5">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="ml-2 text-sm font-semibold text-white">
                Đang kiểm tra kết nối...
              </Text>
            </View>
          </View>
        ) : null}

        {/* Top Header Overlay */}
        <Animated.View
          pointerEvents={areLiveOverlaysVisible ? 'box-none' : 'none'}
          style={[
            styles.topHeader,
            { top: Math.max(insets.top, 14) },
            liveHeaderOverlayStyle,
          ]}
        >
          <View style={styles.hostPill}>
            <View style={styles.hostAvatarRing}>
              <LiveAvatar
                uri={streamInfo.publisher.avatarUrl}
                name={streamInfo.publisher.name}
                size={26}
                textSize={12}
              />
            </View>
            <View style={styles.hostCopy}>
              <Text numberOfLines={1} style={styles.hostName}>
                {streamInfo.publisher.name}
              </Text>
              <View style={styles.liveMetaRow}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <View style={styles.liveDot} />
                <Text style={styles.liveElapsed}>{elapsedText}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.headerActionRow}>
              <View style={styles.viewerPill}>
                <Eye size={12} color="#FFFFFF" />
                <Text style={styles.viewerCount}>{viewerCount}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleLeave}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Rời khỏi live"
                style={styles.circleButton}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerActionRowSecondary}>
              {isHost ? (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleToggleCamera}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Đổi camera"
                  style={styles.circleButtonSmall}
                >
                  <SwitchCamera size={14} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={hideLiveOverlays}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Ẩn toàn bộ giao diện live"
                style={[styles.circleButtonSmall, styles.hideInterfaceButton]}
              >
                <EyeOff size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleMoreOptions}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tùy chọn live"
                style={styles.circleButtonSmall}
              >
                <MoreHorizontal size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {!areLiveOverlaysVisible ? (
          <>
            <Animated.View
              style={[
                styles.restoreInterfaceControl,
                { top: Math.max(insets.top, 14) + 48 },
                liveRestoreOverlayStyle,
              ]}
            >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={showLiveOverlays}
              accessibilityRole="button"
              accessibilityLabel="Hiện lại bình luận và biểu tượng live"
              style={styles.restoreInterfaceButton}
            >
              <Eye size={20} color="#ffffff" />
            </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={[
                styles.hiddenExitControl,
                { top: Math.max(insets.top, 14) },
                liveRestoreOverlayStyle,
              ]}
            >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLeave}
              accessibilityRole="button"
              accessibilityLabel="Rời khỏi live"
              style={styles.hiddenExitButton}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
            </Animated.View>
          </>
        ) : null}

        {areLiveOverlaysVisible ? (
          <View
            pointerEvents="none"
            style={[
              styles.reactionActivity,
              { top: Math.max(insets.top, 14) + 76 },
            ]}
          >
            {reactionToasts.map(toast => (
              <Animated.View
                key={toast.id}
                style={[
                  styles.reactionToast,
                  {
                    opacity: toast.progress.interpolate({
                      inputRange: [0, 0.06, 0.9, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        translateX: toast.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-210, screenWidth + 24],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LiveAvatar
                  uri={toast.avatarUrl}
                  name={toast.name}
                  size={22}
                  textSize={9}
                />
                <Text numberOfLines={1} style={styles.reactionToastName}>
                  {toast.name}
                </Text>
                <Text style={styles.reactionToastCopy}>đã thả</Text>
                <Image
                  source={FEED_REACTION_IMAGES[toast.reaction]}
                  style={styles.reactionToastImage}
                  resizeMode="contain"
                />
              </Animated.View>
            ))}
          </View>
        ) : null}

        {/* Bottom Live Overlay */}
        <Animated.View
          pointerEvents={areLiveOverlaysVisible ? 'box-none' : 'none'}
          style={[styles.overlayLayer, liveBottomOverlayStyle]}
        >
          <View pointerEvents="none" style={styles.bottomScrim}>
            <Svg width="100%" height="100%" pointerEvents="none">
              <Defs>
                <LinearGradient
                  id="liveBottomGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="0.52" stopColor="#000000" stopOpacity="0.08" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="0.9" />
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#liveBottomGradient)"
              />
            </Svg>
          </View>

          <View
            style={[
              styles.commentsLayer,
              { bottom: Math.max(insets.bottom, 10) + 154 },
            ]}
          >
            <FlatList
              ref={commentsListRef}
              data={comments}
              keyExtractor={item => item.id}
              style={styles.commentsList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={handleCommentsContentSizeChange}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => handleCommentPress(item)}
                  style={styles.commentBubble}
                >
                  <LiveAvatar
                    uri={item.avatarUrl}
                    name={item.author}
                    size={18}
                    textSize={8}
                  />
                  <View style={styles.commentCopy}>
                    <View style={styles.commentHeading}>
                      <Text numberOfLines={1} style={styles.commentAuthor}>
                        {item.author}
                      </Text>
                      {item.isHost ? (
                        <View style={styles.hostCommentBadge}>
                          <Text style={styles.hostCommentBadgeText}>HOST</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.commentMessage}>
                      <CommentMentionText text={item.message} />
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyCommentBubble}>
                  <Text style={styles.emptyCommentText}>
                    Chưa có bình luận. Hãy là người đầu tiên!
                  </Text>
                </View>
              }
              contentContainerStyle={commentsContentStyle}
            />
          </View>

          <View
            style={[
              styles.liveInfoCard,
              { bottom: Math.max(insets.bottom, 10) + 78 },
            ]}
          >
            <View style={styles.sparkleIcon}>
              <Sparkles size={14} color="#FFFFFF" />
            </View>
            <View style={styles.liveInfoCopy}>
              <Text style={styles.liveInfoTitle}>Trực tiếp</Text>
              <Text
                numberOfLines={showFullDescription ? undefined : 1}
                style={styles.liveInfoDescription}
              >
                {descriptionText}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setShowFullDescription(value => !value)}
              accessibilityRole="button"
              accessibilityLabel={
                showFullDescription ? 'Thu gọn mô tả live' : 'Xem mô tả live'
              }
              style={styles.infoChevronButton}
            >
              <ChevronDown
                size={18}
                color="#FFFFFF"
                style={{
                  transform: [
                    { rotate: showFullDescription ? '180deg' : '0deg' },
                  ],
                }}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.composerRow,
              { bottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <View style={styles.composerInput}>
              <TextInput
                ref={inputRef}
                style={styles.composerTextInput}
                placeholder="Viết bình luận..."
                placeholderTextColor="rgba(255,255,255,0.62)"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={handleSendComment}
                returnKeyType="send"
                onFocus={() => {
                  setIsReactionPickerVisible(false);
                  setIsCommentInputFocused(true);
                }}
                onBlur={() => setIsCommentInputFocused(false)}
              />
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => inputRef.current?.focus()}
                accessibilityRole="button"
                accessibilityLabel="Mở bàn phím biểu tượng cảm xúc"
                style={styles.smileButton}
              >
                <Smile size={17} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={
                commentText.trim().length > 0 ? handleSendComment : handleShare
              }
              disabled={isSendingComment}
              accessibilityRole="button"
              accessibilityLabel={
                commentText.trim().length > 0
                  ? 'Gửi bình luận'
                  : 'Chia sẻ buổi live'
              }
              style={[
                styles.composerAction,
                isSendingComment && styles.disabledAction,
              ]}
            >
              {isSendingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : commentText.trim().length > 0 ? (
                <Send size={17} color="#FFFFFF" />
              ) : (
                <ShareIcon size={17} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.reactionRail,
              { bottom: Math.max(insets.bottom, 10) + 186 },
            ]}
          >
            {isReactionPickerVisible ? (
              <View style={styles.reactionPicker}>
                <View
                  pointerEvents="none"
                  style={styles.reactionPickerPointer}
                />
                {FEED_REACTION_TYPES.map(reaction => (
                  <TouchableOpacity
                    key={reaction}
                    activeOpacity={0.82}
                    onPress={() => handleReaction(reaction)}
                    disabled={isReacting}
                    accessibilityRole="button"
                    accessibilityLabel={REACTION_LABELS[reaction]}
                    style={[
                      styles.reactionOption,
                      selectedReaction === reaction &&
                        styles.reactionOptionSelected,
                    ]}
                  >
                    <Image
                      source={FEED_REACTION_IMAGES[reaction]}
                      style={styles.reactionOptionImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.82}
              onPressIn={() => {
                reactionLongPressTriggeredRef.current = false;
              }}
              onPress={handlePrimaryReactionPress}
              onLongPress={handlePrimaryReactionLongPress}
              delayLongPress={350}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Thả ${REACTION_LABELS[selectedReaction]}. Nhấn giữ để chọn cảm xúc khác`}
              style={[
                styles.primaryReactionButton,
                styles.primaryReactionButtonSelected,
              ]}
            >
              <Image
                source={FEED_REACTION_IMAGES[selectedReaction]}
                style={styles.primaryReactionImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {areLiveOverlaysVisible && (
          <>
            {/* Reactions rise from the selected reaction button. */}
            <View pointerEvents="none" style={styles.floatingReactionLayer}>
              {floatingReactions.map(item => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.floatingReaction,
                    {
                      right: 34 + item.driftX / 3,
                      bottom: Math.max(insets.bottom, 10) + 245,
                      opacity: item.progress.interpolate({
                        inputRange: [0, 0.12, 0.78, 1],
                        outputRange: [0, 1, 0.86, 0],
                      }),
                      transform: [
                        {
                          translateY: item.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -item.rise],
                          }),
                        },
                        {
                          translateX: item.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, item.driftX],
                          }),
                        },
                        {
                          scale: item.progress.interpolate({
                            inputRange: [0, 0.2, 1],
                            outputRange: [0.72, 1.08, 0.84],
                          }),
                        },
                        { rotate: `${item.rotation}deg` },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={FEED_REACTION_IMAGES[item.reaction]}
                    style={{ width: item.size, height: item.size }}
                    resizeMode="contain"
                  />
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </View>

      <FeedShareBottomSheet
        visible={shareModalVisible}
        post={shareSheetPost}
        onClose={handleCloseShareModal}
        onInternalShare={sharePost}
      />

      {/* Custom Leave Confirmation Modal */}
      <Modal
        visible={leaveModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={leaveModalStyles.backdrop}>
          <View style={leaveModalStyles.card}>
            {/* Icon */}
            <View style={leaveModalStyles.iconCircle}>
              <LogOut size={24} color="#ef4444" />
            </View>

            {/* Text */}
            <Text style={leaveModalStyles.title}>Rời khỏi live?</Text>
            <Text style={leaveModalStyles.subtitle}>
              {isHost
                ? 'Bạn sẽ kết thúc buổi live cho tất cả mọi người.'
                : 'Bạn có chắc muốn rời khỏi buổi live này không?'}
            </Text>

            {/* Buttons */}
            <View style={leaveModalStyles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setLeaveModalVisible(false)}
                style={leaveModalStyles.stayButton}
              >
                <Text style={leaveModalStyles.stayButtonText}>Ở lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmLeave}
                disabled={isLeavingLive}
                style={[
                  leaveModalStyles.leaveButton,
                  isLeavingLive && leaveModalStyles.disabledButton,
                ]}
              >
                {isLeavingLive ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={leaveModalStyles.leaveButtonText}>
                    {isHost ? 'Kết thúc live' : 'Rời đi'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardSafeView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  liveAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveAvatarFallbackText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  topHeader: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  hostPill: {
    minWidth: 130,
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 20, 21, 0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
  },
  hostAvatarRing: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.90)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hostCopy: {
    minWidth: 0,
    marginLeft: 4,
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  liveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liveBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: '#F04455',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 5,
    height: 5,
    marginLeft: 4,
    marginRight: 4,
    borderRadius: 3,
    backgroundColor: '#FF6070',
    shadowColor: '#FF6070',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  liveElapsed: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '700',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionRowSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  viewerPill: {
    height: 32,
    minWidth: 48,
    paddingHorizontal: 9,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  viewerCount: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  circleButton: {
    width: 32,
    height: 32,
    marginLeft: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  circleButtonSmall: {
    width: 32,
    height: 32,
    marginLeft: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hideInterfaceButton: {
    backgroundColor: 'rgba(18,20,21,0.82)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  restoreInterfaceControl: {
    position: 'absolute',
    right: 14,
    zIndex: 30,
  },
  restoreInterfaceButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  hiddenExitControl: {
    position: 'absolute',
    right: 14,
    zIndex: 30,
  },
  hiddenExitButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  overlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '62%',
    zIndex: 1,
  },
  bottomScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  commentsLayer: {
    position: 'absolute',
    left: 14,
    right: 72,
    maxHeight: 175,
  },
  commentsList: {
    maxHeight: 175,
  },
  commentBubble: {
    alignSelf: 'flex-start',
    maxWidth: '94%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(12,14,15,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  commentCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 5,
  },
  commentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAuthor: {
    maxWidth: '85%',
    color: '#FFD0D5',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  hostCommentBadge: {
    marginLeft: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#F04455',
  },
  hostCommentBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },
  commentMessage: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.90)',
    fontSize: 12,
    lineHeight: 15,
  },
  emptyCommentBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(12,14,15,0.58)',
  },
  emptyCommentText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
  },
  liveInfoCard: {
    position: 'absolute',
    left: 14,
    right: 60,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(18,20,21,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  sparkleIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6A54',
  },
  liveInfoCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 7,
  },
  liveInfoTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  liveInfoDescription: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    lineHeight: 14,
  },
  infoChevronButton: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerInput: {
    minWidth: 0,
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 19,
    backgroundColor: 'rgba(18,20,21,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  composerTextInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: '#FFFFFF',
    fontSize: 14,
  },
  smileButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAction: {
    width: 34,
    height: 34,
    marginLeft: 6,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  reactionRail: {
    position: 'absolute',
    right: 14,
    zIndex: 30,
    width: 46,
    alignItems: 'center',
  },
  reactionPicker: {
    position: 'absolute',
    right: -2,
    bottom: 58,
    width: 132,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    borderRadius: 19,
    backgroundColor: 'rgba(18,20,21,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  reactionPickerPointer: {
    position: 'absolute',
    right: 17,
    bottom: -6,
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    backgroundColor: 'rgba(18,20,21,0.84)',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  reactionOption: {
    width: 34,
    height: 34,
    marginBottom: 5,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reactionOptionSelected: {
    backgroundColor: 'rgba(255,70,99,0.24)',
    borderColor: 'rgba(255,91,115,0.74)',
    borderWidth: 1.5,
  },
  reactionOptionImage: {
    width: 26,
    height: 26,
  },
  primaryReactionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,20,21,0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#FF4164',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryReactionButtonSelected: {
    backgroundColor: 'rgba(255,65,100,0.22)',
    borderColor: 'rgba(255,92,119,0.88)',
  },
  primaryReactionImage: {
    width: 32,
    height: 32,
  },
  floatingReactionLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  floatingReaction: {
    position: 'absolute',
  },
  reactionActivity: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 42,
    zIndex: 25,
    overflow: 'hidden',
  },
  reactionToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxWidth: 210,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 17,
    backgroundColor: 'rgba(18,20,21,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  reactionToastName: {
    maxWidth: 92,
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reactionToastCopy: {
    marginLeft: 4,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  reactionToastImage: {
    width: 22,
    height: 22,
    marginLeft: 6,
  },
  disabledAction: {
    opacity: 0.55,
  },
});

const leaveModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(22, 28, 45, 0.96)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  stayButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  leaveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  leaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
