// Description: Renders the Messages LiveKit call room from the app-level call session.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RTCView } from '@livekit/react-native-webrtc';
import {
  ArrowLeft,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  RefreshCw,
  Video,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';
import { CallAudioOutputSelector } from '../components/CallAudioOutputSelector';

type CallRoomScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CALL_ROOM
>;

function formatCallDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function RemoteStatusBadges({
  isCameraMuted,
  isMicrophoneMuted,
}: {
  isCameraMuted: boolean;
  isMicrophoneMuted: boolean;
}) {
  if (!isCameraMuted && !isMicrophoneMuted) return null;

  return (
    <View className="flex-row items-center gap-2 rounded-2xl bg-slate-950/85 px-3 py-2">
      {isMicrophoneMuted ? <MicOff size={18} color="#ffffff" /> : null}
      {isCameraMuted ? <CameraOff size={18} color="#ffffff" /> : null}
    </View>
  );
}

function ControlButton({
  children,
  label,
  isDanger = false,
  isSelected = false,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  isDanger?: boolean;
  isSelected?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="items-center">
      <TouchableOpacity
        className={`h-[58px] w-[58px] items-center justify-center rounded-full border ${
          isDanger
            ? 'border-red-400/40 bg-red-600'
            : isSelected
            ? 'border-amber-300/30 bg-amber-500/20'
            : 'border-white/10 bg-slate-800'
        }`}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
      <Text
        className={`mt-2 text-xs font-semibold ${
          isDanger ? 'text-red-200' : 'text-slate-200'
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function FloatingBackButton() {
  const { minimizeCall } = useLiveKitCallSession();
  return (
    <TouchableOpacity
      className="absolute left-4 top-12 z-30 h-11 w-11 items-center justify-center rounded-full bg-slate-950/80"
      activeOpacity={0.82}
      onPress={minimizeCall}
    >
      <ArrowLeft size={22} color="#ffffff" />
    </TouchableOpacity>
  );
}

function CallControls({ callType }: { callType: 'audio' | 'video' }) {
  const {
    session,
    endCall,
    setAudioOutputMode,
    toggleMic,
    toggleCamera,
    switchCamera,
  } = useLiveKitCallSession();

  const handleEnd = () => {
    endCall(session?.phase === 'connected' ? 'ended' : 'cancelled').catch(
      () => undefined,
    );
  };

  return (
    <View className="pb-2">
      <View
        className={`flex-row items-start rounded-[30px] border border-white/10 bg-slate-900/95 px-4 py-4 ${
          callType === 'video' ? 'justify-between' : 'justify-around'
        }`}
      >
        <CallAudioOutputSelector
          mode={
            session?.audioOutputMode ??
            (callType === 'video' ? 'speaker' : 'earpiece')
          }
          fallbackMode={callType === 'video' ? 'speaker' : 'earpiece'}
          onChange={mode => setAudioOutputMode(mode)}
        />
        <ControlButton
          label={session?.isLocalMicrophoneEnabled ? 'Tắt mic' : 'Bật mic'}
          isSelected={!session?.isLocalMicrophoneEnabled}
          onPress={() => {
            toggleMic().catch(() => undefined);
          }}
        >
          {session?.isLocalMicrophoneEnabled ? (
            <Mic size={23} color="#ffffff" />
          ) : (
            <MicOff size={23} color="#ffffff" />
          )}
        </ControlButton>

        {callType === 'video' ? (
          <>
            <ControlButton
              label={
                session?.isLocalCameraEnabled ? 'Tắt camera' : 'Bật camera'
              }
              isSelected={!session?.isLocalCameraEnabled}
              onPress={() => {
                toggleCamera().catch(() => undefined);
              }}
            >
              {session?.isLocalCameraEnabled ? (
                <Video size={23} color="#ffffff" />
              ) : (
                <CameraOff size={23} color="#ffffff" />
              )}
            </ControlButton>

            <ControlButton
              label="Đổi camera"
              onPress={() => {
                switchCamera().catch(() => undefined);
              }}
            >
              <RefreshCw size={22} color="#ffffff" />
            </ControlButton>
          </>
        ) : null}

        <ControlButton label="Kết thúc" isDanger onPress={handleEnd}>
          <PhoneOff size={26} color="#ffffff" />
        </ControlButton>
      </View>
    </View>
  );
}

function WaitingRoom({
  peerName,
  peerAvatar,
  statusText,
  canShowSpinner,
}: {
  peerName: string;
  peerAvatar: string;
  statusText: string;
  canShowSpinner: boolean;
}) {
  const { session, endCall } = useLiveKitCallSession();
  const publicStatusText =
    session?.phase === 'connecting' || statusText.includes('LiveKit')
      ? ''
      : statusText;

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={ROOT_SAFE_AREA_EDGES}>
      <FloatingBackButton />
      <View className="flex-1 items-center justify-center px-8">
        {peerAvatar ? (
          <Image
            source={{ uri: peerAvatar }}
            className="h-28 w-28 rounded-full bg-slate-800"
          />
        ) : null}
        <Text className="mt-6 text-center text-2xl font-bold text-white">
          {peerName}
        </Text>
        {publicStatusText ? (
          <Text className="mt-3 text-center text-base text-slate-300">
            {publicStatusText}
          </Text>
        ) : null}
        {session?.deliveryWarningText ? (
          <Text className="mt-4 text-center text-sm text-amber-200">
            {session.deliveryWarningText}
          </Text>
        ) : null}
        {canShowSpinner ? (
          <ActivityIndicator className="mt-8" color={APP_BRAND_COLOR} size="large" />
        ) : null}
      </View>
      <View className="items-center pb-8">
        <TouchableOpacity
          className="h-16 w-16 items-center justify-center rounded-full bg-red-600"
          activeOpacity={0.85}
          onPress={() => {
            endCall(
              session?.phase === 'connected' ? 'ended' : 'cancelled',
            ).catch(() => undefined);
          }}
        >
          <PhoneOff size={27} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function AudioRoom({
  peerName,
  peerAvatar,
}: {
  peerName: string;
  peerAvatar: string;
}) {
  const { session, minimizeCall } = useLiveKitCallSession();
  const avatarInitial = peerName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" backgroundColor="#07101f" />
      {peerAvatar ? (
        <Image
          source={{ uri: peerAvatar }}
          blurRadius={38}
          resizeMode="cover"
          style={styles.audioBackdrop}
        />
      ) : null}
      <View style={styles.audioBackdropOverlay} />

      <SafeAreaView className="flex-1 px-5" edges={ROOT_SAFE_AREA_EDGES}>
        <View className="flex-row items-center justify-between pt-2">
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/70"
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Thu nhỏ cuộc gọi"
            onPress={minimizeCall}
          >
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-row items-center rounded-full border border-white/10 bg-slate-900/65 px-3 py-2">
            <PhoneCall size={15} color="#93c5fd" />
            <Text className="ml-2 text-xs font-bold text-info-muted">
              CUỘC GỌI THOẠI
            </Text>
          </View>
          <View className="h-11 w-11" />
        </View>

        <View className="flex-1 items-center justify-center pb-10">
          <View className="items-center justify-center rounded-full border border-white/15 bg-white/5 p-2">
            {peerAvatar ? (
              <Image
                source={{ uri: peerAvatar }}
                className="h-36 w-36 rounded-full bg-slate-800"
              />
            ) : (
              <View className="h-36 w-36 items-center justify-center rounded-full bg-brand">
                <Text className="text-5xl font-bold text-white">
                  {avatarInitial}
                </Text>
              </View>
            )}
          </View>
          <Text
            className="mt-7 max-w-[300px] text-center text-3xl font-bold text-white"
            numberOfLines={2}
          >
            {peerName}
          </Text>
          <View className="mt-3 flex-row items-center rounded-full bg-emerald-400/10 px-3 py-2">
            <View className="h-2 w-2 rounded-full bg-emerald-400" />
            <Text className="ml-2 text-sm font-semibold text-emerald-100">
              Đang trong cuộc gọi
            </Text>
          </View>
          <Text style={styles.callDuration} className="mt-4 text-white">
            {formatCallDuration(session?.elapsedSeconds ?? 0)}
          </Text>
          {session?.deliveryWarningText ? (
            <Text className="mt-4 max-w-[320px] text-center text-sm text-amber-200">
              {session.deliveryWarningText}
            </Text>
          ) : null}
          {session?.isRemoteMicrophoneMuted ? (
            <View className="mt-4 flex-row items-center rounded-full bg-slate-950/60 px-3 py-2">
              <MicOff size={16} color="#cbd5e1" />
              <Text className="ml-2 text-xs font-semibold text-slate-300">
                Đối phương đang tắt mic
              </Text>
            </View>
          ) : null}
        </View>

        <CallControls callType="audio" />
      </SafeAreaView>
    </View>
  );
}

function VideoRoom({ peerName }: { peerName: string }) {
  const { session } = useLiveKitCallSession();
  const remoteVideoStreamUrl = session?.remoteVideoStreamUrl ?? '';
  const localVideoStreamUrl = session?.localVideoStreamUrl ?? '';

  return (
    <View className="flex-1 bg-black">
      <FloatingBackButton />
      <View className="absolute right-4 top-12 z-20">
        <RemoteStatusBadges
          isCameraMuted={Boolean(session?.isRemoteCameraMuted)}
          isMicrophoneMuted={Boolean(session?.isRemoteMicrophoneMuted)}
        />
      </View>
      {remoteVideoStreamUrl ? (
        <RTCView
          streamURL={remoteVideoStreamUrl}
          style={styles.remoteVideo}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-950 px-8">
          <Video size={42} color="#ffffff" />
          <Text className="mt-4 text-center text-lg font-semibold text-white">
            Đang chờ video từ {peerName}
          </Text>
          {session?.mediaErrorText ? (
            <Text className="mt-2 text-center text-sm text-red-300">
              {session.mediaErrorText}
            </Text>
          ) : null}
          {session?.deliveryWarningText ? (
            <Text className="mt-3 text-center text-sm text-amber-200">
              {session.deliveryWarningText}
            </Text>
          ) : null}
        </View>
      )}
      <View style={styles.localVideoWrap}>
        {localVideoStreamUrl && session?.isLocalCameraEnabled ? (
          <RTCView
            key={`${localVideoStreamUrl}-${session.localVideoRenderKey}`}
            streamURL={localVideoStreamUrl}
            style={styles.localVideo}
            objectFit="cover"
            mirror={session?.localCameraFacingMode === 'user'}
            zOrder={1}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-slate-900">
            <CameraOff size={24} color="#ffffff" />
          </View>
        )}
      </View>
      <View className="absolute bottom-0 left-0 right-0">
        <CallControls callType="video" />
      </View>
    </View>
  );
}

function CallRoomScreen({ route }: CallRoomScreenProps) {
  const { session, statusText, ensureSessionFromRoute, minimizeCall } =
    useLiveKitCallSession();
  const peerName =
    session?.payload?.peer.name ??
    session?.peer?.name ??
    route.params.peer?.name ??
    'Người dùng';
  const peerAvatar =
    session?.payload?.peer.avatar ??
    session?.peer?.avatar ??
    route.params.peer?.avatar ??
    '';
  const callType = session?.callType ?? route.params.callType;

  useEffect(() => {
    ensureSessionFromRoute(route.params);
  }, [ensureSessionFromRoute, route.params]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          minimizeCall();
          return true;
        },
      );

      return () => subscription.remove();
    }, [minimizeCall]),
  );

  if (!session?.payload || session.hasMediaPermissions !== true) {
    return (
      <WaitingRoom
        peerName={peerName}
        peerAvatar={peerAvatar}
        statusText={statusText}
        canShowSpinner={
          session?.phase !== 'ended' &&
          session?.phase !== 'error' &&
          session?.hasMediaPermissions !== false
        }
      />
    );
  }

  return callType === 'audio' ? (
    <AudioRoom peerName={peerName} peerAvatar={peerAvatar} />
  ) : (
    <VideoRoom peerName={peerName} />
  );
}

const styles = StyleSheet.create({
  audioBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    opacity: 0.3,
    transform: [{ scale: 1.15 }],
  },
  audioBackdropOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.84)',
  },
  callDuration: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000000',
  },
  localVideoWrap: {
    position: 'absolute',
    right: 16,
    top: 56,
    zIndex: 10,
    elevation: 10,
    width: 112,
    height: 156,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
});

export default CallRoomScreen;
