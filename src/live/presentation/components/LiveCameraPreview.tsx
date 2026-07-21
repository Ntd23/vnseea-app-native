import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  requireNativeComponent,
} from 'react-native';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';

type CameraFacing = 'front' | 'back';

export type LiveCameraPreviewStatus =
  | 'checking'
  | 'ready'
  | 'denied'
  | 'error'
  | 'stopped';

type NativeLiveCameraPreviewProps = ViewProps & {
  cameraFacing?: CameraFacing;
  enabled?: boolean;
  onPreviewStatusChange?: (
    event: NativeSyntheticEvent<{ status: string; message?: string }>,
  ) => void;
};

const absoluteFillStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
  top: 0,
};

const NativeLiveCameraPreview =
  Platform.OS === 'android'
    ? requireNativeComponent<NativeLiveCameraPreviewProps>(
        'VnseeaLiveCameraPreview',
      )
    : null;

export function LiveCameraPreview({
  cameraFacing = 'front',
  enabled = true,
  onStatusChange,
}: {
  cameraFacing?: CameraFacing;
  enabled?: boolean;
  onStatusChange?: (status: LiveCameraPreviewStatus) => void;
}) {
  const [permissionState, setPermissionState] =
    useState<LiveCameraPreviewStatus>('checking');
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermissions = useCallback(async () => {
    if (!enabled) {
      setPermissionGranted(false);
      setPermissionState('stopped');
      return;
    }

    setPermissionGranted(false);
    setPermissionState('checking');
    const granted = await requestCallMediaPermissions('video');
    setPermissionGranted(granted);
    if (!granted) setPermissionState('denied');
  }, [enabled]);

  const handlePreviewReady = useCallback(() => {
    if (enabled && permissionGranted) setPermissionState('ready');
  }, [enabled, permissionGranted]);

  const handlePreviewError = useCallback(
    (event?: { nativeEvent?: { errorMessage?: string; message?: string } }) => {
      const message =
        event?.nativeEvent?.errorMessage || event?.nativeEvent?.message;
      console.error('[LiveCameraPreview] preview error:', message || 'unknown');
      setPermissionState('error');
    },
    [],
  );

  const handleNativePreviewStatus = useCallback(
    (event: NativeSyntheticEvent<{ status: string; message?: string }>) => {
      const status = event.nativeEvent.status;
      if (status === 'ready') {
        handlePreviewReady();
      } else if (status === 'error') {
        handlePreviewError({ nativeEvent: event.nativeEvent });
      } else if (status === 'stopped' && !enabled) {
        setPermissionState('stopped');
      }
    },
    [enabled, handlePreviewError, handlePreviewReady],
  );

  useEffect(() => {
    requestPermissions().catch(error => {
      console.error('[LiveCameraPreview] permission error:', error);
      setPermissionGranted(false);
      setPermissionState('error');
    });
  }, [requestPermissions]);

  useEffect(() => {
    onStatusChange?.(permissionState);
  }, [onStatusChange, permissionState]);

  useEffect(() => {
    if (!enabled || !permissionGranted || permissionState !== 'checking') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      console.error('[LiveCameraPreview] preview startup timed out');
      setPermissionState('error');
    }, 6000);
    return () => clearTimeout(timeout);
  }, [enabled, permissionGranted, permissionState]);

  if (!enabled || permissionState === 'stopped') return null;

  if (permissionState === 'checking' && !permissionGranted) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.placeholderText}>Đang mở camera...</Text>
      </View>
    );
  }

  if (permissionState === 'denied' || permissionState === 'error') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Chưa có quyền camera</Text>
        <Text style={styles.placeholderText}>
          Vui lòng cấp quyền Camera và Microphone để bật live.
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

  if (Platform.OS === 'ios') {
    return (
      <Camera
        cameraType={
          cameraFacing === 'front' ? CameraType.Front : CameraType.Back
        }
        onError={handlePreviewError}
        onZoom={handlePreviewReady}
        resizeMode="cover"
        style={absoluteFillStyle}
      />
    );
  }

  if (!NativeLiveCameraPreview) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Không thể mở camera</Text>
      </View>
    );
  }

  return (
    <NativeLiveCameraPreview
      cameraFacing={cameraFacing}
      enabled={enabled}
      onPreviewStatusChange={handleNativePreviewStatus}
      style={absoluteFillStyle}
    />
  );
}

const styles = StyleSheet.create({
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
});
