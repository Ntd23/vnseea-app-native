// Description: Keeps active-call video presentation alive outside call routes and owns system PiP.
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import {
  RoomContext,
  useTracks,
} from '@livekit/react-native';
import {
  RTCPIPView,
  startIOSPIP,
  stopIOSPIP,
} from '@livekit/react-native-webrtc';
import { Track } from 'livekit-client';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';
import {
  getGroupCameraStreamUrl,
  getRenderableGroupCameraTrack,
} from '../../application/livekit/groupCallVideoState';
import { useCallPictureInPicture } from '../utils/useCallPictureInPicture';

const CALL_PIP_ASPECT_WIDTH = 3;
const CALL_PIP_ASPECT_HEIGHT = 2;
const IOS_CALL_PIP_CONTENT_WIDTH = 1080;
const IOS_CALL_PIP_CONTENT_HEIGHT = 720;

const IOS_CALL_PIP_OPTIONS = {
  enabled: true,
  startAutomatically: true,
  stopAutomatically: false,
  preferredSize: {
    width: IOS_CALL_PIP_CONTENT_WIDTH,
    height: IOS_CALL_PIP_CONTENT_HEIGHT,
  },
} as const;

function useCurrentRouteName() {
  const [routeName, setRouteName] = useState('');

  useEffect(() => {
    const update = () => {
      setRouteName(String(navigationRef.getCurrentRoute()?.name ?? ''));
    };
    update();

    let unsubscribe: (() => void) | undefined;
    let readyTimer: ReturnType<typeof setInterval> | undefined;
    const subscribeWhenReady = () => {
      if (unsubscribe || !navigationRef.isReady()) return;
      unsubscribe = navigationRef.addListener('state', update);
      update();
      if (readyTimer) {
        clearInterval(readyTimer);
        readyTimer = undefined;
      }
    };
    subscribeWhenReady();
    if (!unsubscribe) {
      readyTimer = setInterval(subscribeWhenReady, 250);
    }

    return () => {
      if (readyTimer) clearInterval(readyTimer);
      unsubscribe?.();
    };
  }, []);

  return routeName;
}

function dismissInactiveCallRoute(
  routeName: string,
  directEnded: boolean,
  groupEnded: boolean,
) {
  if (!navigationRef.isReady() || !navigationRef.canGoBack()) return;
  if (routeName === ROUTES.CALL_ROOM && directEnded) {
    navigationRef.goBack();
  } else if (routeName === ROUTES.GROUP_CALL_ROOM && groupEnded) {
    navigationRef.goBack();
  }
}

type VideoPairProps = {
  localCameraEnabled: boolean;
  localMirror: boolean;
  localStreamUrl: string;
  onRestore: () => void;
  onSystemPipStartFailed: () => void;
  remoteStreamUrl: string;
  systemPipRequestKey: string;
  shouldUseSystemPip: boolean;
};

function CallVideoPair({
  localCameraEnabled,
  localMirror,
  localStreamUrl,
  onRestore,
  onSystemPipStartFailed,
  remoteStreamUrl,
  systemPipRequestKey,
  shouldUseSystemPip,
}: VideoPairProps) {
  const pipViewRef = useRef<React.ElementRef<typeof RTCPIPView>>(null);
  const requestedSystemPipRef = useRef(false);
  const retrySystemPipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const shouldUseSystemPipRef = useRef(shouldUseSystemPip);
  shouldUseSystemPipRef.current = shouldUseSystemPip;
  const pipStartFailureCountRef = useRef(0);
  const didReportPipStartFailureRef = useRef(false);
  const onSystemPipStartFailedRef = useRef(onSystemPipStartFailed);
  onSystemPipStartFailedRef.current = onSystemPipStartFailed;
  const iosPip = useMemo(
    () => ({
      ...IOS_CALL_PIP_OPTIONS,
      active: shouldUseSystemPip,
      localStreamURL:
        localCameraEnabled && localStreamUrl ? localStreamUrl : '',
      localMirror,
    }),
    [
      localCameraEnabled,
      localMirror,
      localStreamUrl,
      shouldUseSystemPip,
    ],
  );

  useLayoutEffect(
    () => () => {
      if (retrySystemPipTimerRef.current) {
        clearTimeout(retrySystemPipTimerRef.current);
      }
      if (Platform.OS === 'ios' && pipViewRef.current) {
        stopIOSPIP(pipViewRef);
      }
    },
    [],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios' || !pipViewRef.current) return;
    if (shouldUseSystemPip) {
      if (requestedSystemPipRef.current) return;
      requestedSystemPipRef.current = true;
      startIOSPIP(pipViewRef);
      return;
    }
    if (retrySystemPipTimerRef.current) {
      clearTimeout(retrySystemPipTimerRef.current);
      retrySystemPipTimerRef.current = null;
    }
    requestedSystemPipRef.current = false;
    pipStartFailureCountRef.current = 0;
    didReportPipStartFailureRef.current = false;
    stopIOSPIP(pipViewRef);
  }, [remoteStreamUrl, shouldUseSystemPip, systemPipRequestKey]);

  return (
    <View pointerEvents="none" style={styles.pipAnchor}>
      <RTCPIPView
        ref={pipViewRef}
        streamURL={remoteStreamUrl || undefined}
        style={styles.video}
        objectFit="cover"
        iosPIP={iosPip}
        onPIPRestore={onRestore}
        onPIPStarted={() => {
          requestedSystemPipRef.current = true;
          pipStartFailureCountRef.current = 0;
          didReportPipStartFailureRef.current = false;
        }}
        onPIPStopped={() => {
          requestedSystemPipRef.current = false;
        }}
        onPIPStartFailed={() => {
          requestedSystemPipRef.current = false;
          if (!shouldUseSystemPipRef.current) {
            return;
          }
          pipStartFailureCountRef.current += 1;
          if (pipStartFailureCountRef.current > 1) {
            if (!didReportPipStartFailureRef.current) {
              didReportPipStartFailureRef.current = true;
              onSystemPipStartFailedRef.current();
            }
            return;
          }
          if (retrySystemPipTimerRef.current) return;
          retrySystemPipTimerRef.current = setTimeout(() => {
            retrySystemPipTimerRef.current = null;
            if (
              !shouldUseSystemPipRef.current ||
              !pipViewRef.current ||
              requestedSystemPipRef.current
            ) {
              return;
            }
            requestedSystemPipRef.current = true;
            startIOSPIP(pipViewRef);
          }, 500);
        }}
      />
    </View>
  );
}

function AndroidSystemCallPictureInPicture({
  enabled,
  localCameraEnabled,
  localMirror,
  localStreamUrl,
  onEntered,
  onRestore,
  remoteStreamUrl,
  shouldEnter,
}: {
  enabled: boolean;
  localCameraEnabled: boolean;
  localMirror: boolean;
  localStreamUrl: string;
  onEntered: () => void;
  onRestore: () => void;
  remoteStreamUrl: string;
  shouldEnter: boolean;
}) {
  useCallPictureInPicture({
    aspectHeight: CALL_PIP_ASPECT_HEIGHT,
    aspectWidth: CALL_PIP_ASPECT_WIDTH,
    enabled,
    localCameraEnabled,
    localMirror,
    localStreamUrl,
    onEntered,
    onRestore,
    remoteStreamUrl,
    shouldEnter,
  });
  return null;
}

function GroupVideoPair({
  onSystemPipStartFailed,
  systemPipRequestKey,
  shouldUseSystemPip,
}: {
  onSystemPipStartFailed: () => void;
  systemPipRequestKey: string;
  shouldUseSystemPip: boolean;
}) {
  const group = useGroupLiveKitCallSession();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);
  const localTrack = tracks.find(track => track.participant.isLocal);
  const remoteTrack = tracks.find(
    track =>
      !track.participant.isLocal &&
      Boolean(getRenderableGroupCameraTrack(track)),
  );
  const localCameraEnabled = Boolean(
    group.session?.isLocalCameraEnabled &&
      getRenderableGroupCameraTrack(localTrack),
  );
  const localStreamUrl = getGroupCameraStreamUrl(localTrack);
  const remoteStreamUrl = getGroupCameraStreamUrl(remoteTrack);

  if (Platform.OS === 'android') {
    return (
      <AndroidSystemCallPictureInPicture
        enabled
        localCameraEnabled={localCameraEnabled}
        localMirror={group.session?.localCameraFacingMode === 'user'}
        localStreamUrl={localStreamUrl}
        onEntered={group.minimizeCall}
        onRestore={group.restoreCallRoom}
        remoteStreamUrl={remoteStreamUrl}
        shouldEnter={Boolean(group.session?.isMinimized)}
      />
    );
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <CallVideoPair
        localCameraEnabled={localCameraEnabled}
        localMirror={group.session?.localCameraFacingMode === 'user'}
        localStreamUrl={localStreamUrl}
        onRestore={group.restoreCallRoom}
        onSystemPipStartFailed={onSystemPipStartFailed}
        remoteStreamUrl={remoteStreamUrl}
        systemPipRequestKey={systemPipRequestKey}
        shouldUseSystemPip={shouldUseSystemPip}
      />
    </View>
  );
}

function LiveKitCallPresentationHost() {
  const direct = useLiveKitCallSession();
  const group = useGroupLiveKitCallSession();
  const routeName = useCurrentRouteName();
  const [appState, setAppState] = useState(AppState.currentState);
  const directVideoActive = Boolean(
    direct.isActive &&
      direct.session?.callType === 'video' &&
      direct.session.phase === 'connected',
  );
  const groupVideoActive = Boolean(
    group.isActive &&
      group.session?.callType === 'video' &&
      group.session.phase === 'connected' &&
      group.activeRoom,
  );
  const activeKind = groupVideoActive
    ? 'group'
    : directVideoActive
    ? 'direct'
    : null;
  const isCallMinimized =
    activeKind === 'direct'
      ? Boolean(direct.session?.isMinimized)
      : activeKind === 'group'
      ? Boolean(group.session?.isMinimized)
      : false;
  const shouldUseIOSSystemPip =
    Platform.OS === 'ios' &&
    (isCallMinimized || appState === 'background' || appState === 'inactive');
  const directEnded = Boolean(direct.session && !direct.isActive);
  const groupEnded = Boolean(group.session && !group.isActive);

  useEffect(() => {
    dismissInactiveCallRoute(routeName, directEnded, groupEnded);
  }, [directEnded, groupEnded, routeName]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
      if (nextState !== 'active') return;
      dismissInactiveCallRoute(
        String(navigationRef.getCurrentRoute()?.name ?? routeName),
        directEnded,
        groupEnded,
      );
    });
    return () => subscription.remove();
  }, [directEnded, groupEnded, routeName]);

  if (activeKind === 'direct') {
    if (Platform.OS === 'android') {
      return (
        <AndroidSystemCallPictureInPicture
          enabled
          localCameraEnabled={Boolean(
            direct.session?.isLocalCameraEnabled,
          )}
          localMirror={direct.session?.localCameraFacingMode === 'user'}
          localStreamUrl={direct.session?.localVideoStreamUrl ?? ''}
          onEntered={direct.minimizeCall}
          onRestore={direct.restoreCallRoom}
          remoteStreamUrl={direct.session?.remoteVideoStreamUrl ?? ''}
          shouldEnter={Boolean(direct.session?.isMinimized)}
        />
      );
    }
    return (
      <CallVideoPair
        localCameraEnabled={Boolean(direct.session?.isLocalCameraEnabled)}
        localMirror={direct.session?.localCameraFacingMode === 'user'}
        localStreamUrl={direct.session?.localVideoStreamUrl ?? ''}
        onRestore={direct.restoreCallRoom}
        onSystemPipStartFailed={() => {
          if (isCallMinimized && appState === 'active') {
            direct.restoreCallRoom();
          }
        }}
        remoteStreamUrl={direct.session?.remoteVideoStreamUrl ?? ''}
        systemPipRequestKey={appState}
        shouldUseSystemPip={shouldUseIOSSystemPip}
      />
    );
  }

  if (activeKind === 'group' && group.activeRoom) {
    return (
      <RoomContext.Provider value={group.activeRoom}>
        <GroupVideoPair
          onSystemPipStartFailed={() => {
            if (isCallMinimized && appState === 'active') {
              group.restoreCallRoom();
            }
          }}
          systemPipRequestKey={appState}
          shouldUseSystemPip={shouldUseIOSSystemPip}
        />
      </RoomContext.Provider>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  pipAnchor: {
    height: 123,
    opacity: 0.02,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 184,
  },
  video: {
    height: '100%',
    width: '100%',
  },
});

export default LiveKitCallPresentationHost;
