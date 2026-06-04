// Description: Renders the Messages LiveKit 1-1 audio and video call room.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  Video,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useLiveKitCallRoom } from '../../application/view-models/useLiveKitCallRoom';

type CallRoomScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CALL_ROOM
>;

function CallControls({
  callType,
  onEnd,
}: {
  callType: 'audio' | 'video';
  onEnd: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  return (
    <View className="flex-row items-center justify-center gap-5 pb-8">
      <TouchableOpacity
        className="h-14 w-14 items-center justify-center rounded-full bg-white/15"
        activeOpacity={0.8}
        onPress={() => {
          localParticipant
            .setMicrophoneEnabled(!isMicrophoneEnabled)
            .catch(() => undefined);
        }}
      >
        {isMicrophoneEnabled ? (
          <Mic size={23} color="#ffffff" />
        ) : (
          <MicOff size={23} color="#ffffff" />
        )}
      </TouchableOpacity>
      {callType === 'video' ? (
        <TouchableOpacity
          className="h-14 w-14 items-center justify-center rounded-full bg-white/15"
          activeOpacity={0.8}
          onPress={() => {
            localParticipant
              .setCameraEnabled(!isCameraEnabled)
              .catch(() => undefined);
          }}
        >
          {isCameraEnabled ? (
            <Camera size={23} color="#ffffff" />
          ) : (
            <CameraOff size={23} color="#ffffff" />
          )}
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        className="h-16 w-16 items-center justify-center rounded-full bg-red-600"
        activeOpacity={0.85}
        onPress={onEnd}
      >
        <PhoneOff size={27} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

function ConnectedRoom({
  callType,
  peerName,
  peerAvatar,
  onEnd,
}: {
  callType: 'audio' | 'video';
  peerName: string;
  peerAvatar: string;
  onEnd: () => void;
}) {
  const tracks = useTracks([Track.Source.Camera]);
  const cameraTracks = useMemo(() => tracks.filter(isTrackReference), [tracks]);
  const remoteTrack = cameraTracks.find(
    trackRef =>
      !(
        trackRef as TrackReferenceOrPlaceholder & {
          participant?: { isLocal?: boolean };
        }
      ).participant?.isLocal,
  );
  const localTrack = cameraTracks.find(
    trackRef =>
      (
        trackRef as TrackReferenceOrPlaceholder & {
          participant?: { isLocal?: boolean };
        }
      ).participant?.isLocal,
  );

  if (callType === 'audio') {
    return (
      <View className="flex-1 items-center justify-between bg-slate-950 px-6 pt-24">
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
        </View>
        <CallControls callType={callType} onEnd={onEnd} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {remoteTrack ? (
        <VideoTrack trackRef={remoteTrack} style={styles.remoteVideo} />
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-950 px-8">
          <Video size={42} color="#ffffff" />
          <Text className="mt-4 text-center text-lg font-semibold text-white">
            Đang chờ video từ {peerName}
          </Text>
        </View>
      )}
      {localTrack ? (
        <View style={styles.localVideoWrap}>
          <VideoTrack trackRef={localTrack} style={styles.localVideo} />
        </View>
      ) : null}
      <View className="absolute bottom-0 left-0 right-0">
        <CallControls callType={callType} onEnd={onEnd} />
      </View>
    </View>
  );
}

function CallRoomScreen({ navigation, route }: CallRoomScreenProps) {
  const { phase, payload, statusText, closeCall } = useLiveKitCallRoom(
    route.params,
  );
  const [hasStartedAudioSession, setHasStartedAudioSession] = useState(false);
  const peerName =
    payload?.peer.name ?? route.params.peer?.name ?? 'Người dùng';
  const peerAvatar = payload?.peer.avatar ?? route.params.peer?.avatar ?? '';

  useEffect(() => {
    if (!payload || hasStartedAudioSession) return;
    AudioSession.startAudioSession()
      .then(() => setHasStartedAudioSession(true))
      .catch(() => undefined);
  }, [hasStartedAudioSession, payload]);

  useEffect(() => {
    return () => {
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  const handleEnd = () => {
    closeCall(phase === 'connected' ? 'ended' : 'cancelled')
      .catch(() => undefined)
      .finally(() => navigation.goBack());
  };

  if (!payload) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
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
          {phase !== 'ended' && phase !== 'error' ? (
            <ActivityIndicator className="mt-8" color="#0000ff" size="large" />
          ) : null}
        </View>
        <View className="items-center pb-8">
          <TouchableOpacity
            className="h-16 w-16 items-center justify-center rounded-full bg-red-600"
            activeOpacity={0.85}
            onPress={handleEnd}
          >
            <PhoneOff size={27} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={payload.wsUrl}
      token={payload.token}
      connect
      audio
      video={route.params.callType === 'video'}
      options={{ adaptiveStream: { pixelDensity: 'screen' } }}
      onDisconnected={() => {
        closeCall('ended')
          .catch(() => undefined)
          .finally(() => navigation.goBack());
      }}
      onError={() => {
        closeCall('ended')
          .catch(() => undefined)
          .finally(() => navigation.goBack());
      }}
    >
      <ConnectedRoom
        callType={route.params.callType}
        peerName={peerName}
        peerAvatar={peerAvatar}
        onEnd={handleEnd}
      />
    </LiveKitRoom>
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
    width: 112,
    height: 156,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#111827',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
});

export default CallRoomScreen;
