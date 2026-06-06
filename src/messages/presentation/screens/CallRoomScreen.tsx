// Description: Renders the Messages LiveKit call room from the app-level call session.
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
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
  RefreshCw,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';

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
  isDanger = false,
  onPress,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`h-12 w-12 items-center justify-center rounded-2xl ${
        isDanger ? 'bg-red-600' : 'bg-slate-800'
      }`}
      activeOpacity={0.82}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
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
    toggleSpeaker,
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
    <View className="items-center pb-8">
      <View className="flex-row items-center justify-center gap-3 rounded-[28px] bg-slate-950/95 px-4 py-3">
        <ControlButton
          onPress={() => {
            toggleSpeaker().catch(() => undefined);
          }}
        >
          {session?.isSpeakerEnabled ? (
            <Volume2 size={23} color="#ffffff" />
          ) : (
            <VolumeX size={23} color="#ffffff" />
          )}
        </ControlButton>

        <ControlButton
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
              onPress={() => {
                switchCamera().catch(() => undefined);
              }}
            >
              <RefreshCw size={22} color="#ffffff" />
            </ControlButton>
          </>
        ) : null}

        <ControlButton isDanger onPress={handleEnd}>
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

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
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
        <Text className="mt-3 text-center text-base text-slate-300">
          {statusText}
        </Text>
        {canShowSpinner ? (
          <ActivityIndicator className="mt-8" color="#0000ff" size="large" />
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
  const { session } = useLiveKitCallSession();

  return (
    <View className="flex-1 items-center justify-between bg-slate-950 px-6 pt-24">
      <FloatingBackButton />
      <View className="items-center">
        {peerAvatar ? (
          <Image
            source={{ uri: peerAvatar }}
            className="h-32 w-32 rounded-full bg-slate-800"
          />
        ) : null}
        <Text className="mt-6 text-center text-3xl font-bold text-white">
          {peerName}
        </Text>
        <Text className="mt-2 text-base text-slate-300">
          Đang trong cuộc gọi
        </Text>
        <Text className="mt-3 text-2xl font-bold text-white">
          {formatCallDuration(session?.elapsedSeconds ?? 0)}
        </Text>
        <View className="mt-4">
          <RemoteStatusBadges
            isCameraMuted={false}
            isMicrophoneMuted={Boolean(session?.isRemoteMicrophoneMuted)}
          />
        </View>
      </View>
      <CallControls callType="audio" />
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
        </View>
      )}
      <View style={styles.localVideoWrap}>
        {localVideoStreamUrl && session?.isLocalCameraEnabled ? (
          <RTCView
            key={`${localVideoStreamUrl}-${session.localVideoRenderKey}`}
            streamURL={localVideoStreamUrl}
            style={styles.localVideo}
            objectFit="cover"
            mirror
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
