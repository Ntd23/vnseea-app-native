// Description: Renders the Messages LiveKit group call room from the app-level group call session.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  isTrackReference,
  RoomContext,
  useTracks,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import {
  ArrowLeft,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  UserPlus,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import type { GroupLiveKitParticipant } from '../../domain/types/groupCall.types';

type GroupCallRoomScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.GROUP_CALL_ROOM
>;

function formatCallDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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

function ParticipantTile({
  item,
  cameraTrack,
  localCameraFacingMode,
}: {
  item: GroupLiveKitParticipant;
  cameraTrack?: TrackReferenceOrPlaceholder;
  localCameraFacingMode: 'user' | 'environment';
}) {
  const renderableTrack = isTrackReference(cameraTrack)
    ? cameraTrack
    : undefined;
  const showVideo = Boolean(
    renderableTrack &&
      !item.isCameraMuted &&
      !renderableTrack.publication.isMuted,
  );

  return (
    <View className="m-1 h-64 flex-1 overflow-hidden rounded-2xl bg-slate-900">
      {showVideo ? (
        <VideoTrack
          trackRef={renderableTrack}
          style={styles.participantVideo}
          objectFit="cover"
          mirror={Boolean(
            item.isLocal && localCameraFacingMode === 'user',
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-900 px-3">
          {item.avatar ? (
            <Image
              source={{ uri: item.avatar }}
              className="h-20 w-20 rounded-full bg-slate-800"
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-600">
              <Text className="text-2xl font-bold text-white">
                {(item.name || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="absolute bottom-2 left-2 max-w-[68%] rounded-full bg-slate-950/75 px-3 py-1.5">
        <Text className="text-xs font-bold text-white" numberOfLines={1}>
          {item.isLocal ? 'Bạn' : item.name || 'Người dùng'}
        </Text>
      </View>

      <View className="absolute bottom-2 right-2 flex-row gap-1">
        {item.isMicrophoneMuted ? (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-red-600">
            <MicOff size={16} color="#ffffff" />
          </View>
        ) : null}
        {item.isCameraMuted ? (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-950/85">
            <CameraOff size={16} color="#ffffff" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function resolveTrackParticipantId(
  trackRef: TrackReferenceOrPlaceholder,
): string {
  const { participant } = trackRef;
  try {
    const metadata = JSON.parse(participant.metadata || '{}') as Record<
      string,
      unknown
    >;
    return String(metadata.user_id ?? participant.identity ?? '');
  } catch {
    return String(participant.identity ?? '');
  }
}

function GroupCallGallery({
  participants,
  localCameraFacingMode,
}: {
  participants: GroupLiveKitParticipant[];
  localCameraFacingMode: 'user' | 'environment';
}) {
  const cameraTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const numColumns = participants.length <= 2 ? 1 : 2;
  const trackByParticipantId = useMemo(() => {
    const next = new Map<string, TrackReferenceOrPlaceholder>();
    cameraTracks.forEach(trackRef => {
      const participantId = resolveTrackParticipantId(trackRef);
      if (participantId) next.set(participantId, trackRef);
      if (trackRef.participant.identity) {
        next.set(String(trackRef.participant.identity), trackRef);
      }
      if (trackRef.participant.sid) {
        next.set(String(trackRef.participant.sid), trackRef);
      }
      if (trackRef.participant.isLocal) next.set('__local__', trackRef);
    });
    return next;
  }, [cameraTracks]);

  useEffect(() => {
    console.log(
      '[VNSEEA_CALL_DEBUG]',
      JSON.stringify({
        event: 'group_video_render_state',
        participants: participants.length,
        cameraTracks: cameraTracks.length,
        subscribedCameraTracks: cameraTracks.filter(isTrackReference).length,
      }),
    );
  }, [cameraTracks, participants.length]);

  return (
    <FlatList
      key={`group-call-grid-${numColumns}`}
      className="flex-1 px-2"
      data={participants}
      keyExtractor={item => item.id}
      numColumns={numColumns}
      extraData={`${participants.length}-${localCameraFacingMode}-${cameraTracks.length}`}
      renderItem={({ item }) => (
        <ParticipantTile
          item={item}
          cameraTrack={trackByParticipantId.get(
            item.isLocal ? '__local__' : item.id,
          )}
          localCameraFacingMode={localCameraFacingMode}
        />
      )}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-center text-slate-300">
            Đang chờ thành viên tham gia...
          </Text>
        </View>
      }
    />
  );
}

function InviteMembersModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { getCandidates, addMembers } = useGroupLiveKitCallSession();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<GroupLiveKitParticipant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;

    setIsLoading(true);
    setSelectedIds(new Set());
    getCandidates()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [getCandidates, visible]);

  const toggleSelected = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submit = () => {
    const selected = Array.from(selectedIds);
    if (selected.length === 0) {
      onClose();
      return;
    }

    setIsLoading(true);
    addMembers(selected)
      .then(() => onClose())
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[70%] rounded-t-[28px] bg-white px-5 pb-6 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-slate-950">
              Mời thành viên
            </Text>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
            >
              <Text className="text-xl text-slate-700">×</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#0000ff" />
            </View>
          ) : items.length === 0 ? (
            <Text className="py-8 text-center text-slate-500">
              Không còn thành viên phù hợp để mời.
            </Text>
          ) : (
            <FlatList
              className="mt-3"
              data={items}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <TouchableOpacity
                    className="flex-row items-center border-b border-slate-100 py-3"
                    activeOpacity={0.8}
                    onPress={() => toggleSelected(item.id)}
                  >
                    {item.avatar ? (
                      <Image
                        source={{ uri: item.avatar }}
                        className="h-11 w-11 rounded-full bg-slate-100"
                      />
                    ) : (
                      <View className="h-11 w-11 rounded-full bg-blue-100" />
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-slate-950">
                        {item.name}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        @{item.username || item.id}
                      </Text>
                    </View>
                    <View
                      className={`h-6 w-6 rounded-full border ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            className="mt-4 min-h-[48px] items-center justify-center rounded-2xl bg-blue-600"
            activeOpacity={0.85}
            onPress={submit}
          >
            <Text className="text-base font-bold text-white">Mời đã chọn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function GroupCallControls() {
  const {
    session,
    leaveCall,
    toggleSpeaker,
    toggleMic,
    toggleCamera,
    switchCamera,
  } = useGroupLiveKitCallSession();
  const [isInviteOpen, setInviteOpen] = useState(false);

  return (
    <View className="items-center pb-8">
      <View className="flex-row items-center justify-center gap-3 rounded-[28px] bg-slate-950/95 px-4 py-3">
        <ControlButton onPress={() => toggleSpeaker().catch(() => undefined)}>
          {session?.isSpeakerEnabled ? (
            <Volume2 size={23} color="#ffffff" />
          ) : (
            <VolumeX size={23} color="#ffffff" />
          )}
        </ControlButton>

        <ControlButton onPress={() => toggleMic().catch(() => undefined)}>
          {session?.isLocalMicrophoneEnabled ? (
            <Mic size={23} color="#ffffff" />
          ) : (
            <MicOff size={23} color="#ffffff" />
          )}
        </ControlButton>

        <ControlButton onPress={() => toggleCamera().catch(() => undefined)}>
          {session?.isLocalCameraEnabled ? (
            <Video size={23} color="#ffffff" />
          ) : (
            <CameraOff size={23} color="#ffffff" />
          )}
        </ControlButton>
        <ControlButton onPress={() => switchCamera().catch(() => undefined)}>
          <RefreshCw size={22} color="#ffffff" />
        </ControlButton>

        <ControlButton onPress={() => setInviteOpen(true)}>
          <UserPlus size={23} color="#ffffff" />
        </ControlButton>

        <ControlButton isDanger onPress={() => leaveCall().catch(() => undefined)}>
          <PhoneOff size={26} color="#ffffff" />
        </ControlButton>
      </View>
      <InviteMembersModal
        visible={isInviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </View>
  );
}

function GroupCallRoomScreen({ route }: GroupCallRoomScreenProps) {
  const {
    session,
    activeRoom,
    statusText,
    ensureSessionFromRoute,
    minimizeCall,
  } = useGroupLiveKitCallSession();
  const groupName =
    session?.group.name || route.params.groupName || 'Cuộc gọi nhóm';

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

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={ROOT_SAFE_AREA_EDGES}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-900"
          activeOpacity={0.8}
          onPress={minimizeCall}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <View className="mx-3 flex-1 items-center">
          <Text className="text-lg font-bold text-white" numberOfLines={1}>
            {groupName}
          </Text>
          {session?.phase === 'connected' || statusText ? (
            <Text className="mt-1 text-sm text-slate-300">
              {session?.phase === 'connected'
                ? formatCallDuration(session.elapsedSeconds)
                : statusText}
            </Text>
          ) : null}
        </View>
        <View className="h-11 w-11" />
      </View>

      {!session?.payload || session.hasMediaPermissions !== true ? (
        <View className="flex-1 items-center justify-center px-8">
          {session?.group.avatar ? (
            <Image
              source={{ uri: session.group.avatar }}
              className="h-28 w-28 rounded-full bg-slate-800"
            />
          ) : null}
          <Text className="mt-6 text-center text-2xl font-bold text-white">
            {groupName}
          </Text>
          {statusText ? (
            <Text className="mt-3 text-center text-base text-slate-300">
              {statusText}
            </Text>
          ) : null}
          {session?.phase !== 'error' && session?.phase !== 'ended' ? (
            <ActivityIndicator className="mt-8" color="#0000ff" size="large" />
          ) : null}
        </View>
      ) : activeRoom ? (
        <RoomContext.Provider value={activeRoom}>
          <GroupCallGallery
            participants={session.participants}
            localCameraFacingMode={session.localCameraFacingMode}
          />
        </RoomContext.Provider>
      ) : (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0000ff" size="large" />
        </View>
      )}

      {session?.mediaErrorText ? (
        <Text className="px-6 pb-3 text-center text-sm text-red-300">
          {session.mediaErrorText}
        </Text>
      ) : null}
      <GroupCallControls />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  participantVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#020617',
  },
});

export default GroupCallRoomScreen;
