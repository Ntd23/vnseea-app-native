// Description: Shows a compact active-call bar that restores direct or group Messages call rooms.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Phone } from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';
import {
  getMiniCallBarVerticalBounds,
  MINI_CALL_BAR_EDGE_GAP,
  MINI_CALL_BAR_HEIGHT,
  MINI_CALL_BAR_WIDTH,
} from './miniCallBarLayout';

const AUTH_ROUTE_NAMES = new Set<string>([
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
]);

function formatCallDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function LiveKitMiniCallBar() {
  const direct = useLiveKitCallSession();
  const group = useGroupLiveKitCallSession();
  const [currentRouteName, setCurrentRouteName] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const isGroup = Boolean(group.session && group.isActive);
  const session = isGroup ? group.session : direct.session;
  const isActive = isGroup ? group.isActive : direct.isActive;
  const restoreCallRoom = isGroup
    ? group.restoreCallRoom
    : direct.restoreCallRoom;
  const activeCallKey =
    session && isActive
      ? `${isGroup ? 'group' : 'direct'}:${session.callId}`
      : '';
  const bounds = useMemo(
    () =>
      getMiniCallBarVerticalBounds({
        bottomInset: safeAreaInsets.bottom,
        screenHeight,
        topInset: safeAreaInsets.top,
      }),
    [safeAreaInsets.bottom, safeAreaInsets.top, screenHeight],
  );
  const translateY = useSharedValue(bounds.minY);
  const dragStartY = useSharedValue(bounds.minY);

  useEffect(() => {
    translateY.value = withTiming(bounds.minY, { duration: 180 });
  }, [activeCallKey, bounds.minY, translateY]);

  useEffect(() => {
    translateY.value = Math.max(
      bounds.minY,
      Math.min(bounds.maxY, translateY.value),
    );
  }, [bounds.maxY, bounds.minY, translateY]);

  const verticalDragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .failOffsetX([-24, 24])
        .onBegin(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate(event => {
          const nextY = dragStartY.value + event.translationY;
          translateY.value = Math.max(
            bounds.minY,
            Math.min(bounds.maxY, nextY),
          );
        }),
    [bounds.maxY, bounds.minY, dragStartY, translateY],
  );
  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    const updateCurrentRoute = () => {
      if (!navigationRef.isReady()) {
        setCurrentRouteName('');
        return;
      }

      setCurrentRouteName(String(navigationRef.getCurrentRoute()?.name ?? ''));
    };

    updateCurrentRoute();
    let stateUnsubscribe: (() => void) | undefined;
    const subscribeWhenReady = () => {
      if (stateUnsubscribe || !navigationRef.isReady()) return;
      stateUnsubscribe = navigationRef.addListener('state', updateCurrentRoute);
    };
    subscribeWhenReady();
    const readyInterval = setInterval(() => {
      subscribeWhenReady();
      updateCurrentRoute();
    }, 500);

    return () => {
      stateUnsubscribe?.();
      clearInterval(readyInterval);
    };
  }, []);

  if (AUTH_ROUTE_NAMES.has(currentRouteName)) return null;
  if (
    currentRouteName === ROUTES.CALL_ROOM ||
    currentRouteName === ROUTES.GROUP_CALL_ROOM
  ) {
    return null;
  }

  if (!session || !isActive) return null;

  const avatar = isGroup
    ? group.session?.group.avatar
    : direct.session?.payload?.peer.avatar ?? direct.session?.peer?.avatar;
  const title = isGroup
    ? group.session?.group.name || 'Cuộc gọi nhóm'
    : direct.session?.payload?.peer.name ??
      direct.session?.peer?.name ??
      'Cuộc gọi VNSEEA';
  const callType = isGroup ? group.session?.callType : direct.session?.callType;
  if (callType === 'video') return null;

  const phase = isGroup ? group.session?.phase : direct.session?.phase;
  const elapsedSeconds = isGroup
    ? group.session?.elapsedSeconds ?? 0
    : direct.session?.elapsedSeconds ?? 0;
  const subtitle =
    phase === 'connected'
      ? formatCallDuration(elapsedSeconds)
      : callType === 'audio'
      ? 'Đang gọi thoại...'
      : 'Đang gọi video...';

  return (
    <GestureDetector gesture={verticalDragGesture}>
      <Animated.View style={[styles.floatingBar, floatingStyle]}>
        <TouchableOpacity
          activeOpacity={0.88}
          className="h-full flex-row items-center rounded-2xl bg-slate-950 px-3 shadow-2xl"
          onPress={restoreCallRoom}
          accessibilityRole="button"
          accessibilityLabel="Quay lại cuộc gọi"
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              className="h-9 w-9 rounded-full bg-slate-800"
            />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-800">
              <Phone size={17} color="#ffffff" />
            </View>
          )}
          <View className="ml-2.5 min-w-0 flex-1">
            <Text className="text-sm font-bold text-white" numberOfLines={1}>
              {title}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-300" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-brand">
            <Mic size={16} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    elevation: 12,
    height: MINI_CALL_BAR_HEIGHT,
    position: 'absolute',
    right: MINI_CALL_BAR_EDGE_GAP,
    top: 0,
    width: MINI_CALL_BAR_WIDTH,
    zIndex: 50,
  },
});

export default LiveKitMiniCallBar;
