import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useTracks,
  useLocalParticipant,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import type { LiveSession } from '../../domain/types/live.types';

type PermissionState = 'checking' | 'granted' | 'denied';

const absoluteFillStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
  top: 0,
  width: '100%' as const,
  height: '100%' as const,
};

async function requestAndroidHostPermissions() {
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  return (
    result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

function LiveKitVideoSurface({
  isHost,
  cameraFacing = 'front',
}: {
  isHost: boolean;
  cameraFacing?: 'front' | 'back';
}) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant, cameraTrack: localCameraTrack } = useLocalParticipant();

  // LiveKit defaults to front camera ('user') on connect.
  const currentFacingModeRef = React.useRef<'user' | 'environment'>('user');
  const desiredFacingMode = cameraFacing === 'front' ? 'user' : 'environment';
  const isSwitchingRef = React.useRef(false);
  // Bumping this key forces VideoTrack to remount and pick up the new track
  const [trackRenderKey, setTrackRenderKey] = useState(0);

  useEffect(() => {
    if (!isHost || !localParticipant) return;
    if (currentFacingModeRef.current === desiredFacingMode) return;
    if (isSwitchingRef.current) return;

    const publication = localParticipant.getTrackPublication(Track.Source.Camera);
    const trackObj = publication?.track as
      | {
          restartTrack?: (options?: {
            facingMode?: 'user' | 'environment';
          }) => Promise<void>;
          mediaStreamTrack?: { _switchCamera?: () => void };
        }
      | undefined;

    if (!trackObj) return;

    isSwitchingRef.current = true;
    console.log(`[LiveKitVideoSurface] Switching camera: ${currentFacingModeRef.current} -> ${desiredFacingMode}`);

    const performSwitch = async () => {
      try {
        let didSwitch = false;

        // Primary: restartTrack — replaces the physical camera track
        if (trackObj.restartTrack) {
          try {
            await trackObj.restartTrack({ facingMode: desiredFacingMode });
            didSwitch = true;
          } catch (e) {
            console.warn('[LiveKitVideoSurface] restartTrack failed, trying fallback:', e);
          }
        }

        // Fallback: native _switchCamera (toggle)
        if (!didSwitch && trackObj.mediaStreamTrack?._switchCamera) {
          try {
            trackObj.mediaStreamTrack._switchCamera();
            didSwitch = true;
          } catch (e) {
            console.error('[LiveKitVideoSurface] _switchCamera also failed:', e);
          }
        }

        if (didSwitch) {
          currentFacingModeRef.current = desiredFacingMode;
          // Force VideoTrack to remount so it binds to the new track
          setTrackRenderKey(k => k + 1);
          // Second bump after a short delay to handle async track readiness
          setTimeout(() => setTrackRenderKey(k => k + 1), 400);
        }
      } catch (e) {
        console.error('[LiveKitVideoSurface] camera switch error:', e);
      } finally {
        setTimeout(() => {
          isSwitchingRef.current = false;
        }, 800);
      }
    };

    performSwitch();
  }, [isHost, localParticipant, desiredFacingMode, localCameraTrack]);

  useEffect(() => {
    console.log('[LiveKitVideoSurface] tracks update:', tracks.map(t => ({
      participant: t.participant.identity,
      isLocal: t.participant.isLocal,
      source: t.source,
      publication: t.publication ? {
        trackSid: t.publication.trackSid,
        isSubscribed: t.publication.isSubscribed,
        isEnabled: t.publication.isEnabled,
      } : null,
    })));
  }, [tracks]);

  const cameraTrack = useMemo(() => {
    if (isHost) {
      if (localCameraTrack && localParticipant) {
        return {
          participant: localParticipant,
          source: Track.Source.Camera,
          publication: localCameraTrack,
        };
      }
    }
    const trackRefs = tracks.filter(isTrackReference);
    const localTrack = trackRefs.find(item => item.participant.isLocal);
    const remoteTrack = trackRefs.find(item => !item.participant.isLocal);
    return isHost ? localTrack ?? remoteTrack : remoteTrack ?? localTrack;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, localCameraTrack, localParticipant, tracks, trackRenderKey]);

  if (cameraTrack) {
    return (
      <VideoTrack
        key={`camera-${trackRenderKey}`}
        trackRef={cameraTrack}
        objectFit="cover"
        mirror={isHost && cameraTrack.participant.isLocal && cameraFacing === 'front'}
        style={absoluteFillStyle}
      />
    );
  }

  return (
    <View style={styles.placeholder}>
      <ActivityIndicator color="#ffffff" />
      <Text style={styles.placeholderText}>
        {isHost ? 'Đang bật camera live...' : 'Đang chờ tín hiệu video...'}
      </Text>
    </View>
  );
}

export function LiveKitStreamView({
  session,
  isHost,
  cameraFacing = 'front',
}: {
  session: LiveSession;
  isHost: boolean;
  cameraFacing?: 'front' | 'back';
}) {
  const [permissionState, setPermissionState] = useState<PermissionState>(
    isHost && Platform.OS === 'android' ? 'checking' : 'granted',
  );
  const [connectionMessage, setConnectionMessage] = useState('Đang kết nối live...');

  const requestPermissions = useCallback(async () => {
    if (!isHost || Platform.OS !== 'android') {
      setPermissionState('granted');
      return;
    }

    setPermissionState('checking');
    const granted = await requestAndroidHostPermissions();
    setPermissionState(granted ? 'granted' : 'denied');
  }, [isHost]);

  useEffect(() => {
    requestPermissions().catch(error => {
      console.error('[LiveKit] permission error:', error);
      setPermissionState('denied');
    });
  }, [requestPermissions]);

  useEffect(() => {
    AudioSession.startAudioSession().catch(error => {
      console.error('[LiveKit] start audio session error:', error);
    });
    return () => {
      AudioSession.stopAudioSession().catch(error => {
        console.error('[LiveKit] stop audio session error:', error);
      });
    };
  }, []);

  if (!session.wsUrl || !session.token) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Chưa có phiên live</Text>
        <Text style={styles.placeholderText}>
          Backend chưa trả token LiveKit cho phòng này.
        </Text>
      </View>
    );
  }

  if (permissionState === 'checking') {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.placeholderText}>Đang xin quyền camera và mic...</Text>
      </View>
    );
  }

  if (permissionState === 'denied') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Chưa có quyền camera</Text>
        <Text style={styles.placeholderText}>
          Vui lòng cấp quyền Camera và Microphone để phát live.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={requestPermissions}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={session.wsUrl}
      token={session.token}
      connect
      audio={isHost}
      video={isHost}
      options={{ adaptiveStream: true, dynacast: true }}
      connectOptions={{ autoSubscribe: true }}
      onConnected={() => {
        console.log('[LiveKit] room connected successfully');
        setConnectionMessage('');
      }}
      onDisconnected={() => {
        console.log('[LiveKit] room disconnected');
        setConnectionMessage('Đã ngắt kết nối live');
      }}
      onError={error => {
        console.error('[LiveKit] room error:', error);
        setConnectionMessage('Không kết nối được live');
      }}
      onMediaDeviceFailure={failure => {
        console.error('[LiveKit] media device failure:', failure);
        setConnectionMessage('Không mở được camera hoặc mic');
      }}
    >
      <View style={styles.container}>
        <LiveKitVideoSurface isHost={isHost} cameraFacing={cameraFacing} />
        {connectionMessage ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{connectionMessage}</Text>
          </View>
        ) : null}
      </View>
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  container: {
    ...absoluteFillStyle,
    backgroundColor: '#020617',
  },
  permissionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permissionButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  placeholder: {
    ...absoluteFillStyle,
    alignItems: 'center',
    backgroundColor: '#020617',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    bottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
