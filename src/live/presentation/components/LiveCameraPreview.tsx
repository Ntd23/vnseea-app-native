import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  requireNativeComponent,
} from 'react-native';
import type { ViewProps } from 'react-native';

type CameraFacing = 'front' | 'back';

type NativeLiveCameraPreviewProps = ViewProps & {
  cameraFacing?: CameraFacing;
  enabled?: boolean;
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
    ? requireNativeComponent<NativeLiveCameraPreviewProps>('VnseeaLiveCameraPreview')
    : null;

async function requestAndroidLivePermissions() {
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  return (
    result[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export function LiveCameraPreview({
  cameraFacing = 'front',
  enabled = true,
}: {
  cameraFacing?: CameraFacing;
  enabled?: boolean;
}) {
  const [permissionState, setPermissionState] = useState<
    'checking' | 'granted' | 'denied'
  >(Platform.OS === 'android' ? 'checking' : 'denied');

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setPermissionState('denied');
      return;
    }

    setPermissionState('checking');
    const granted = await requestAndroidLivePermissions();
    setPermissionState(granted ? 'granted' : 'denied');
  }, []);

  useEffect(() => {
    requestPermissions().catch(error => {
      console.error('[LiveCameraPreview] permission error:', error);
      setPermissionState('denied');
    });
  }, [requestPermissions]);

  if (Platform.OS !== 'android' || !NativeLiveCameraPreview) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Camera live tạm thời chỉ hỗ trợ Android.</Text>
      </View>
    );
  }

  if (permissionState === 'checking') {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.placeholderText}>Đang mở camera...</Text>
      </View>
    );
  }

  if (permissionState === 'denied') {
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

  return (
    <NativeLiveCameraPreview
      cameraFacing={cameraFacing}
      enabled={enabled}
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
