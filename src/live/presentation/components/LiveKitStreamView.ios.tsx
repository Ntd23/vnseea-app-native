import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  requireNativeComponent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type { LiveSession } from '../../domain/types/live.types';

type PermissionState = 'checking' | 'granted' | 'denied';
type NativeLiveRole = 'host' | 'viewer';
type NativeLiveKitEventPayload = Record<string, unknown> & {
  event?: string;
  message?: string;
};
type NativeLiveKitViewProps = {
  style?: StyleProp<ViewStyle>;
  serverUrl: string;
  token: string;
  roomName: string;
  streamName: string;
  liveRole: NativeLiveRole;
  cameraFacing: 'front' | 'back';
  audioEnabled: boolean;
  objectFit: 'contain' | 'cover';
  connect: boolean;
  onLiveNativeEvent?: (
    event: NativeSyntheticEvent<NativeLiveKitEventPayload>,
  ) => void;
};

const LIVE_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';

const NativeLiveKitView = requireNativeComponent<NativeLiveKitViewProps>('VNSEEALiveKitNativeView');

function logLiveDebug(event: string, data: Record<string, unknown> = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(LIVE_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(LIVE_DEBUG_PREFIX, event, data);
  }
}

export type LiveKitStreamViewProps = {
  session: LiveSession;
  isHost: boolean;
  cameraFacing?: 'front' | 'back';
  audioEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  objectFit?: 'contain' | 'cover';
  onVideoReady?: () => void;
  onConnectionStateChange?: (
    state: 'connected' | 'disconnected' | 'error',
  ) => void;
};

export function LiveKitStreamView({
  session,
  isHost,
  cameraFacing = 'front',
  audioEnabled = true,
  objectFit = 'contain',
  onVideoReady,
  onConnectionStateChange,
}: LiveKitStreamViewProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>(
    isHost ? 'checking' : 'granted',
  );
  const [connectionMessage, setConnectionMessage] = useState('Đang kết nối live...');
  const deviceTraceIdRef = useRef(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const liveRole: NativeLiveRole = isHost ? 'host' : 'viewer';
  const traceId = useMemo(
    () => `${session.roomName}|${liveRole}|${deviceTraceIdRef.current}`,
    [liveRole, session.roomName],
  );

  const requestPermissions = useCallback(async () => {
    if (!isHost) {
      setPermissionState('granted');
      return;
    }

    setPermissionState('checking');
    const granted = await requestCallMediaPermissions('video');
    setPermissionState(granted ? 'granted' : 'denied');
  }, [isHost]);

  useEffect(() => {
    requestPermissions().catch(error => {
      logLiveDebug('live_native_permission_error', {
        role: liveRole,
        roomName: session.roomName,
        streamName: session.streamName,
        traceId,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
      });
      setPermissionState('denied');
    });
  }, [liveRole, requestPermissions, session.roomName, session.streamName, traceId]);

  useEffect(() => {
    logLiveDebug('live_view_mount', {
      role: liveRole,
      roomName: session.roomName,
      streamName: session.streamName,
      traceId,
      nativeMedia: true,
    });
    return () => {
      logLiveDebug('live_view_unmount', {
        role: liveRole,
        roomName: session.roomName,
        streamName: session.streamName,
        traceId,
        nativeMedia: true,
      });
    };
  }, [liveRole, session.roomName, session.streamName, traceId]);

  const handleNativeEvent = useCallback(
    (event: NativeSyntheticEvent<NativeLiveKitEventPayload>) => {
      const { event: nativeEventName, ...nativePayload } = event.nativeEvent;
      const eventName =
        typeof nativeEventName === 'string'
          ? nativeEventName
          : 'live_native_event';

      logLiveDebug(eventName, {
        ...nativePayload,
        role: liveRole,
        roomName: session.roomName,
        streamName: session.streamName,
        traceId,
      });

      if (eventName === 'live_native_room_connected') {
        setConnectionMessage('');
        onConnectionStateChange?.('connected');
      }
      if (eventName === 'live_native_video_attached') {
        onVideoReady?.();
      }
      if (eventName === 'live_native_room_disconnected') {
        setConnectionMessage('Đã ngắt kết nối live');
        onConnectionStateChange?.('disconnected');
      }
      if (eventName === 'live_native_error') {
        setConnectionMessage('Không kết nối được live');
        onConnectionStateChange?.('error');
      }
    },
    [
      liveRole,
      onConnectionStateChange,
      onVideoReady,
      session.roomName,
      session.streamName,
      traceId,
    ],
  );

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
    <View style={styles.container}>
      <NativeLiveKitView
        style={styles.nativeView}
        serverUrl={session.wsUrl}
        token={session.token}
        roomName={session.roomName}
        streamName={session.streamName}
        liveRole={isHost ? 'host' : 'viewer'}
        cameraFacing={cameraFacing}
        audioEnabled={audioEnabled}
        objectFit={objectFit}
        connect={permissionState === 'granted'}
        onLiveNativeEvent={handleNativeEvent}
      />
      {connectionMessage ? (
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{connectionMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const absoluteFillStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
  top: 0,
};

const styles = StyleSheet.create({
  container: {
    ...absoluteFillStyle,
    backgroundColor: '#020617',
  },
  nativeView: {
    ...absoluteFillStyle,
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
    fontSize: 14,
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
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  placeholderTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 999,
    bottom: 96,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
