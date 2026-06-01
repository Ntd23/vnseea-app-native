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
