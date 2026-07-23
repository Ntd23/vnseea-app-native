// Description: Shows a compact active-call bar that restores direct or group Messages call rooms.
import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Mic, Phone, Video } from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';

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

  const isGroup = Boolean(group.session && group.isActive);
  const session = isGroup ? group.session : direct.session;
  const isActive = isGroup ? group.isActive : direct.isActive;
  const restoreCallRoom = isGroup
    ? group.restoreCallRoom
    : direct.restoreCallRoom;

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
    <TouchableOpacity
      activeOpacity={0.88}
      className="absolute left-4 right-4 top-12 z-50 flex-row items-center rounded-2xl bg-slate-950 px-4 py-3 shadow-2xl"
      onPress={restoreCallRoom}
    >
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          className="h-10 w-10 rounded-full bg-slate-800"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-800">
          <Phone size={18} color="#ffffff" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-300" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand">
        {callType === 'video' ? (
          <Video size={18} color="#ffffff" />
        ) : (
          <Mic size={18} color="#ffffff" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default LiveKitMiniCallBar;
