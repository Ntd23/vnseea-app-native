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

function LiveKitVideoSurface({ isHost }: { isHost: boolean }) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant, cameraTrack: localCameraTrack } = useLocalParticipant();

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
  }, [isHost, localCameraTrack, localParticipant, tracks]);

  if (cameraTrack) {
    return (
      <VideoTrack
        trackRef={cameraTrack}
        objectFit="cover"
        mirror={isHost && cameraTrack.participant.isLocal}
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
}: {
  session: LiveSession;
  isHost: boolean;
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
        <LiveKitVideoSurface isHost={isHost} />
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
