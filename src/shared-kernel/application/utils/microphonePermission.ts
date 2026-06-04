// Description: Requests Android runtime microphone and camera permissions for media features.
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestMicrophonePermission() {
  if (Platform.OS !== 'android') return true;

  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  const existing = await PermissionsAndroid.check(permission);
  if (existing) return true;

  const result = await PermissionsAndroid.request(permission, {
    title: 'Quyền truy cập mic',
    message: 'VNSEEA cần dùng mic để ghi âm.',
    buttonPositive: 'Cho phép',
    buttonNegative: 'Từ chối',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestCallMediaPermissions(callType: 'audio' | 'video') {
  if (Platform.OS !== 'android') return true;

  const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (callType === 'video') {
    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    permission => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}
