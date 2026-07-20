// Description: Renders the Messages LiveKit group call room from the app-level group call session.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { CallAudioOutputSelector } from '../components/CallAudioOutputSelector';
import {
  getGroupCameraRenderStateKey,
  getGroupCameraTrackRenderKey,
  getRenderableGroupCameraTrack,
} from '../../application/livekit/groupCallVideoState';
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
  size,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  onPress: () => void;
  size: number;
}) {
  return (
    <TouchableOpacity
      className={`items-center justify-center ${
        isDanger ? 'bg-red-600' : 'bg-slate-800'
      }`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.min(18, size * 0.36),
      }}
      activeOpacity={0.82}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
  );
}

function GridRowSeparator() {
  return <View style={styles.gridRowSeparator} />;
}

function ParticipantTile({
  item,
  cameraTrack,
  localCameraFacingMode,
  tileWidth,
  tileHeight,
}: {
  item: GroupLiveKitParticipant;
  cameraTrack?: TrackReferenceOrPlaceholder;
  localCameraFacingMode: 'user' | 'environment';
  tileWidth: number;
  tileHeight: number;
}) {
  const renderableTrack = getRenderableGroupCameraTrack(cameraTrack);
  const renderKey = getGroupCameraTrackRenderKey(cameraTrack);
  const showVideo = Boolean(renderableTrack && !item.isCameraMuted);

  return (
    <View
      className="overflow-hidden rounded-2xl bg-slate-900"
      style={{ width: tileWidth, height: tileHeight }}
    >
      {showVideo ? (
        <VideoTrack
          key={renderKey}
          trackRef={renderableTrack}
          style={styles.participantVideo}
          objectFit="cover"
          mirror={Boolean(item.isLocal && localCameraFacingMode === 'user')}
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
  const cameraRenderStateKey = getGroupCameraRenderStateKey(cameraTracks);
  const lastVideoRenderStateRef = useRef('');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [gallerySize, setGallerySize] = useState({ width: 0, height: 0 });
  const measuredWidth = gallerySize.width || windowWidth;
  const measuredHeight =
    gallerySize.height || Math.max(320, windowHeight - 180);
  const numColumns =
    participants.length <= 2
      ? 1
      : measuredWidth >= 700 && participants.length >= 6
      ? 3
      : 2;
  const gridPadding = 8;
  const gridGap = 8;
  const rowCount = Math.max(1, Math.ceil(participants.length / numColumns));
  const tileWidth = Math.max(
    1,
    (measuredWidth - gridPadding * 2 - gridGap * (numColumns - 1)) / numColumns,
  );
  const fullRowTileWidth = Math.max(1, measuredWidth - gridPadding * 2);
  const availableGridHeight = Math.max(
    1,
    measuredHeight - gridPadding * 2 - gridGap * (rowCount - 1),
  );
  const tileHeight =
    participants.length <= 4
      ? Math.max(128, availableGridHeight / rowCount)
      : Math.max(150, Math.min(250, tileWidth * 0.82));
  const gridContentContainerStyle = useMemo(
    () => ({
      flexGrow: participants.length === 0 ? 1 : undefined,
      padding: gridPadding,
    }),
    [participants.length],
  );
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
    const localCameraTracks = cameraTracks.filter(
      trackRef =>
        trackRef.participant.isLocal &&
        Boolean(getRenderableGroupCameraTrack(trackRef)),
    ).length;
    const remoteCameraPublications = cameraTracks.filter(
      trackRef => !trackRef.participant.isLocal && isTrackReference(trackRef),
    ).length;
    const remoteSubscribedCameraTracks = cameraTracks.filter(
      trackRef =>
        !trackRef.participant.isLocal &&
        isTrackReference(trackRef) &&
        trackRef.publication.isSubscribed &&
        Boolean(trackRef.publication.track),
    ).length;
    const remoteRenderableCameraTracks = cameraTracks.filter(
      trackRef =>
        !trackRef.participant.isLocal &&
        isTrackReference(trackRef) &&
        trackRef.publication.isSubscribed &&
        Boolean(getRenderableGroupCameraTrack(trackRef)),
    ).length;

    const renderSignature = [
      participants.length,
      cameraRenderStateKey,
      localCameraTracks,
      remoteCameraPublications,
      remoteSubscribedCameraTracks,
      remoteRenderableCameraTracks,
    ].join(':');
    if (lastVideoRenderStateRef.current === renderSignature) return;
    lastVideoRenderStateRef.current = renderSignature;

    console.log(
      '[VNSEEA_CALL_DEBUG]',
      JSON.stringify({
        event: 'group_video_render_state',
        participants: participants.length,
        cameraTracks: cameraTracks.length,
        localCameraTracks,
        remoteCameraPublications,
        remoteSubscribedCameraTracks,
        remoteRenderableCameraTracks,
        cameraRenderStateKey,
      }),
    );
  }, [cameraRenderStateKey, cameraTracks, participants.length]);

  return (
    <View
      className="flex-1"
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setGallerySize(current =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }}
    >
      <FlatList
        key={`group-call-grid-${numColumns}`}
        className="flex-1"
        contentContainerStyle={gridContentContainerStyle}
        columnWrapperStyle={numColumns > 1 ? { gap: gridGap } : undefined}
        ItemSeparatorComponent={GridRowSeparator}
        data={participants}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        extraData={`${participants.length}-${localCameraFacingMode}-${cameraRenderStateKey}-${tileWidth}-${fullRowTileWidth}-${tileHeight}`}
        renderItem={({ item, index }) => {
          const spansFullRow =
            numColumns === 2 &&
            participants.length % 2 === 1 &&
            index === participants.length - 1;

          return (
            <ParticipantTile
              item={item}
              cameraTrack={trackByParticipantId.get(
                item.isLocal ? '__local__' : item.id,
              )}
              localCameraFacingMode={localCameraFacingMode}
              tileWidth={spansFullRow ? fullRowTileWidth : tileWidth}
              tileHeight={tileHeight}
            />
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-center text-slate-300">
              Đang chờ thành viên tham gia...
            </Text>
          </View>
        }
      />
    </View>
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
    setAudioOutputMode,
    toggleMic,
    toggleCamera,
    switchCamera,
  } = useGroupLiveKitCallSession();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const toolbarWidth = Math.max(
    0,
    Math.min(
      screenWidth - safeAreaInsets.left - safeAreaInsets.right - 24,
      430,
    ),
  );
  const controlSize = Math.max(36, Math.min(48, (toolbarWidth - 44) / 6));
  const controlIconSize = Math.max(
    20,
    Math.min(23, Math.round(controlSize * 0.48)),
  );

  return (
    <View className="items-center px-3 pb-3 pt-2">
      <View
        className="flex-row items-center justify-between rounded-[28px] border border-white/10 bg-slate-950/95 px-3 py-3"
        style={{ width: toolbarWidth }}
      >
        <CallAudioOutputSelector
          compact
          triggerSize={controlSize}
          mode={session?.audioOutputMode ?? 'speaker'}
          fallbackMode="speaker"
          onChange={mode => setAudioOutputMode(mode)}
        />

        <ControlButton
          size={controlSize}
          onPress={() => toggleMic().catch(() => undefined)}
        >
          {session?.isLocalMicrophoneEnabled ? (
            <Mic size={controlIconSize} color="#ffffff" />
          ) : (
            <MicOff size={controlIconSize} color="#ffffff" />
          )}
        </ControlButton>

        <ControlButton
          size={controlSize}
          onPress={() => toggleCamera().catch(() => undefined)}
        >
          {session?.isLocalCameraEnabled ? (
            <Video size={controlIconSize} color="#ffffff" />
          ) : (
            <CameraOff size={controlIconSize} color="#ffffff" />
          )}
        </ControlButton>
        <ControlButton
          size={controlSize}
          onPress={() => switchCamera().catch(() => undefined)}
        >
          <RefreshCw size={controlIconSize} color="#ffffff" />
        </ControlButton>

        <ControlButton size={controlSize} onPress={() => setInviteOpen(true)}>
          <UserPlus size={controlIconSize} color="#ffffff" />
        </ControlButton>

        <ControlButton
          size={controlSize}
          isDanger
          onPress={() => leaveCall().catch(() => undefined)}
        >
          <PhoneOff size={controlIconSize + 2} color="#ffffff" />
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
  const [isChromeVisible, setChromeVisible] = useState(true);
  const isChromeVisibleRef = useRef(true);
  const chromeProgress = useRef(new Animated.Value(1)).current;
  const [headerHeight, setHeaderHeight] = useState(72);
  const [controlsHeight, setControlsHeight] = useState(92);
  const callContentStyle = useMemo(
    () => ({
      paddingTop: isChromeVisible ? headerHeight : 0,
      paddingBottom: isChromeVisible ? controlsHeight : 0,
    }),
    [controlsHeight, headerHeight, isChromeVisible],
  );
  const mediaErrorStyle = useMemo(
    () => ({
      bottom: isChromeVisible ? controlsHeight + 8 : 12,
    }),
    [controlsHeight, isChromeVisible],
  );

  const toggleChrome = useCallback(() => {
    const nextVisible = !isChromeVisibleRef.current;
    isChromeVisibleRef.current = nextVisible;
    setChromeVisible(nextVisible);
    chromeProgress.stopAnimation();
    Animated.timing(chromeProgress, {
      toValue: nextVisible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [chromeProgress]);

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
    <SafeAreaView
      className="flex-1 bg-slate-950"
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View className="flex-1">
        <Pressable
          className="flex-1"
          onPress={toggleChrome}
          style={callContentStyle}
        >
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
                <ActivityIndicator
                  className="mt-8"
                  color="#0000ff"
                  size="large"
                />
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
        </Pressable>

        <Animated.View
          pointerEvents={isChromeVisible ? 'auto' : 'none'}
          className="absolute left-0 right-0 top-0 z-20 px-3 pt-2"
          onLayout={event => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setHeaderHeight(current =>
              current === nextHeight ? current : nextHeight,
            );
          }}
          style={{
            opacity: chromeProgress,
            transform: [
              {
                translateY: chromeProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, 0],
                }),
              },
            ],
          }}
        >
          <View className="flex-row items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/90 p-2">
            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-full bg-slate-800"
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
                <Text className="mt-0.5 text-sm text-slate-300">
                  {session?.phase === 'connected'
                    ? formatCallDuration(session.elapsedSeconds)
                    : statusText}
                </Text>
              ) : null}
            </View>
            <View className="h-11 min-w-[44px] items-center justify-center rounded-full bg-slate-800 px-2">
              <Text className="text-sm font-bold text-white">
                {session?.participants.length ?? 0}
              </Text>
            </View>
          </View>
        </Animated.View>

        {session?.mediaErrorText ? (
          <Text
            className="absolute left-0 right-0 z-20 px-6 text-center text-sm text-red-300"
            style={mediaErrorStyle}
          >
            {session.mediaErrorText}
          </Text>
        ) : null}

        <Animated.View
          pointerEvents={isChromeVisible ? 'auto' : 'none'}
          className="absolute bottom-0 left-0 right-0 z-20"
          onLayout={event => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setControlsHeight(current =>
              current === nextHeight ? current : nextHeight,
            );
          }}
          style={{
            opacity: chromeProgress,
            transform: [
              {
                translateY: chromeProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <GroupCallControls />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gridRowSeparator: {
    height: 8,
  },
  participantVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#020617',
  },
});

export default GroupCallRoomScreen;
