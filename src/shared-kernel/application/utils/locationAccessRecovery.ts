// Description: Maps typed location failures to actionable, non-blocking recovery UI.
import { Alert, Linking, Platform } from 'react-native';
import {
  normalizeLocationAccessError,
  type LocationAccessErrorCode,
} from './currentLocation';

export { LocationAccessError } from './currentLocation';

type LocationRecoveryAction =
  | 'open_app_settings'
  | 'open_location_settings'
  | 'retry';

export interface LocationAccessRecovery {
  kind: LocationAccessErrorCode;
  title: string;
  message: string;
  primaryLabel: string;
  primaryAction: LocationRecoveryAction;
}

export function getLocationAccessRecovery(
  error: unknown,
): LocationAccessRecovery {
  const normalized = normalizeLocationAccessError(error);
  if (normalized.code === 'permission_denied') {
    return {
      kind: normalized.code,
      title: 'Cần quyền vị trí',
      message:
        'Bạn có thể cấp quyền vị trí trong Cài đặt hoặc tiếp tục tìm kiếm và nhập địa chỉ thủ công.',
      primaryLabel: 'Mở cài đặt',
      primaryAction: 'open_app_settings',
    };
  }
  if (normalized.code === 'services_disabled') {
    return {
      kind: normalized.code,
      title: 'Vị trí đang tắt',
      message:
        'Hãy bật dịch vụ vị trí trên thiết bị rồi thử lại. Bạn vẫn có thể tìm kiếm hoặc nhập địa chỉ thủ công.',
      primaryLabel: 'Bật vị trí',
      primaryAction: 'open_location_settings',
    };
  }
  if (normalized.code === 'timeout') {
    return {
      kind: normalized.code,
      title: 'Chưa xác định được vị trí',
      message: 'Tín hiệu vị trí phản hồi chậm. Vui lòng thử lại.',
      primaryLabel: 'Thử lại',
      primaryAction: 'retry',
    };
  }
  return {
    kind: normalized.code,
    title: 'Không lấy được vị trí',
    message: normalized.message || 'Vui lòng thử lại sau.',
    primaryLabel: 'Thử lại',
    primaryAction: 'retry',
  };
}

async function runLocationRecoveryAction(action: LocationRecoveryAction) {
  if (action === 'open_location_settings' && Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    } catch {
      await Linking.openSettings();
      return;
    }
  }
  if (action !== 'retry') {
    await Linking.openSettings();
  }
}

export function presentLocationAccessRecovery(
  error: unknown,
  retry?: () => void,
) {
  const recovery = getLocationAccessRecovery(error);
  Alert.alert(recovery.title, recovery.message, [
    { text: 'Để sau', style: 'cancel' },
    {
      text: recovery.primaryLabel,
      onPress: () => {
        if (recovery.primaryAction === 'retry') {
          retry?.();
          return;
        }
        void runLocationRecoveryAction(recovery.primaryAction);
      },
    },
  ]);
  return recovery;
}
