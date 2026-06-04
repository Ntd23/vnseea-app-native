// Description: Coordinates CallKeep system call UI events for Messages LiveKit calls.
import { Platform } from 'react-native';
import MD5 from 'crypto-js/md5';
import { OneSignal } from 'react-native-onesignal';
import RNCallKeep, {
  AudioSessionCategoryOption,
  AudioSessionMode,
  CONSTANTS as CALLKEEP_CONSTANTS,
} from 'react-native-callkeep';
import RNVoipPushNotification from 'react-native-voip-push-notification';
import type {
  IncomingLiveKitCall,
  LiveKitCallPeer,
  LiveKitCallType,
} from '../../domain/types/call.types';

type NativeCallListeners = {
  onAnswer?: (callUuid: string) => void;
  onEnd?: (callUuid: string) => void;
  onMute?: (muted: boolean) => void;
};

type ActiveNativeCall = {
  callId?: string;
  callType: LiveKitCallType;
  peer?: LiveKitCallPeer;
  usesNativeCallUi: boolean;
};

const activeCalls = new Map<string, ActiveNativeCall>();

let isConfigured = false;
let listeners: NativeCallListeners = {};
const pendingAnswerUuids: string[] = [];
const pendingEndUuids: string[] = [];

function readPushString(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object') return '';
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function readPushLiveKitCall(payload: unknown): IncomingLiveKitCall | null {
  const provider = readPushString(payload, 'provider');
  const callId = readPushString(payload, 'call_id');
  if (provider !== 'livekit' || !callId) return null;

  const callType =
    readPushString(payload, 'call_type') === 'audio' ? 'audio' : 'video';
  return {
    callId,
    callType,
    provider: 'livekit',
    roomName: readPushString(payload, 'room_name'),
    peer: {
      id: readPushString(payload, 'from_id'),
      name: readPushString(payload, 'name') || 'Người dùng',
      avatar: readPushString(payload, 'avatar'),
    },
  };
}

function rememberNativeCallFromPayload(callUuid: string, payload: unknown) {
  const incomingCall = readPushLiveKitCall(payload);
  if (!incomingCall) return;

  activeCalls.set(callUuid, {
    callId: incomingCall.callId,
    callType: incomingCall.callType,
    peer: incomingCall.peer,
    usesNativeCallUi: true,
  });
}

function emitAnswer(callUuid: string) {
  if (!listeners.onAnswer) {
    pendingAnswerUuids.push(callUuid);
    return;
  }
  listeners.onAnswer(callUuid);
}

function emitEnd(callUuid: string) {
  if (!listeners.onEnd) {
    pendingEndUuids.push(callUuid);
    return;
  }
  listeners.onEnd(callUuid);
}

function flushPendingEvents() {
  while (pendingAnswerUuids.length > 0) {
    const callUuid = pendingAnswerUuids.shift();
    if (callUuid) listeners.onAnswer?.(callUuid);
  }
  while (pendingEndUuids.length > 0) {
    const callUuid = pendingEndUuids.shift();
    if (callUuid) listeners.onEnd?.(callUuid);
  }
}

export function createNativeCallUuid(
  callId?: string,
  callType: LiveKitCallType = 'video',
) {
  const seed = callId
    ? `vnseea-livekit|${callType}|${callId}`
    : `vnseea-livekit|${Date.now()}|${Math.random()}`;
  const hex = MD5(seed).toString();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function configureNativeCallService() {
  if (isConfigured) return;

  await RNCallKeep.setup({
    ios: {
      appName: 'VNSEEA',
      supportsVideo: true,
      maximumCallGroups: '1',
      maximumCallsPerCallGroup: '1',
      includesCallsInRecents: false,
      audioSession: {
        categoryOptions:
          AudioSessionCategoryOption.allowBluetooth |
          AudioSessionCategoryOption.allowBluetoothA2DP |
          AudioSessionCategoryOption.defaultToSpeaker,
        mode: AudioSessionMode.videoChat,
      },
    },
    android: {
      selfManaged: true,
      alertTitle: 'Cho phép cuộc gọi',
      alertDescription:
        'VNSEEA cần quyền tài khoản điện thoại để hiển thị cuộc gọi đến.',
      cancelButton: 'Hủy',
      okButton: 'Đồng ý',
      additionalPermissions: [],
      foregroundService: {
        channelId: 'vnseea-livekit-calls',
        channelName: 'VNSEEA Calls',
        notificationTitle: 'VNSEEA đang xử lý cuộc gọi',
      },
    },
  });

  RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
    emitAnswer(callUUID);
  });
  RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
    emitEnd(callUUID);
  });
  RNCallKeep.addEventListener('didPerformSetMutedCallAction', event => {
    listeners.onMute?.(Boolean(event.muted));
  });
  RNCallKeep.addEventListener('didDisplayIncomingCall', event => {
    rememberNativeCallFromPayload(event.callUUID, event.payload);
  });
  RNCallKeep.addEventListener('didLoadWithEvents', events => {
    for (const event of events) {
      if (event.name === 'RNCallKeepDidDisplayIncomingCall') {
        rememberNativeCallFromPayload(event.data.callUUID, event.data.payload);
      }
    }
    for (const event of events) {
      if (event.name === 'RNCallKeepPerformAnswerCallAction') {
        emitAnswer(event.data.callUUID);
      }
      if (event.name === 'RNCallKeepPerformEndCallAction') {
        emitEnd(event.data.callUUID);
      }
    }
  });

  if (Platform.OS === 'android') {
    RNCallKeep.registerAndroidEvents();
    RNCallKeep.setAvailable(true);
  }
  if (Platform.OS === 'ios') {
    RNVoipPushNotification.addEventListener('register', token => {
      console.log('[LiveKitCall] VoIP token registered:', token ? 'YES' : 'NO');
    });
    RNVoipPushNotification.addEventListener('notification', payload => {
      const incomingCall = readPushLiveKitCall(payload);
      if (!incomingCall) return;

      displayNativeIncomingCall(incomingCall)
        .then(callUuid =>
          RNVoipPushNotification.onVoipNotificationCompleted(callUuid),
        )
        .catch(() => undefined);
    });
    RNVoipPushNotification.addEventListener('didLoadWithEvents', events => {
      for (const event of events) {
        if (event.name !== 'RNVoipPushRemoteNotificationReceivedEvent') {
          continue;
        }
        const callUuid = readPushString(event.data, 'uuid');
        if (callUuid) {
          rememberNativeCallFromPayload(callUuid, event.data);
        }
      }
    });
    RNVoipPushNotification.registerVoipToken();
  }
  OneSignal.Notifications.addEventListener(
    'foregroundWillDisplay',
    (event: {
      getNotification(): { additionalData?: object };
      preventDefault(): void;
    }) => {
      const incomingCall = readPushLiveKitCall(
        event.getNotification().additionalData,
      );
      if (!incomingCall) return;

      event.preventDefault();
      if (Platform.OS !== 'android') {
        displayNativeIncomingCall(incomingCall).catch(() => undefined);
      }
    },
  );
  OneSignal.Notifications.addEventListener(
    'click',
    (event: { notification: { additionalData?: object } }) => {
      const incomingCall = readPushLiveKitCall(
        event.notification.additionalData,
      );
      if (!incomingCall) return;

      displayNativeIncomingCall(incomingCall).catch(() => undefined);
    },
  );

  isConfigured = true;
}

export function setNativeCallListeners(nextListeners: NativeCallListeners) {
  listeners = nextListeners;
  flushPendingEvents();
  return () => {
    listeners = {};
  };
}

export function getNativeCall(callUuid: string) {
  return activeCalls.get(callUuid);
}

export async function startNativeOutgoingCall(params: {
  callUuid: string;
  callType: LiveKitCallType;
  peer?: LiveKitCallPeer;
}) {
  await configureNativeCallService();
  activeCalls.set(params.callUuid, {
    callType: params.callType,
    peer: params.peer,
    usesNativeCallUi: Platform.OS === 'ios',
  });
  if (Platform.OS === 'android') {
    return;
  }
  RNCallKeep.startCall(
    params.callUuid,
    params.peer?.id ?? 'unknown',
    params.peer?.name ?? 'Người dùng',
    'generic',
    params.callType === 'video',
  );
}

export async function displayNativeIncomingCall(call: IncomingLiveKitCall) {
  await configureNativeCallService();
  const callUuid = createNativeCallUuid(call.callId, call.callType);
  activeCalls.set(callUuid, {
    callId: call.callId,
    callType: call.callType,
    peer: call.peer,
    usesNativeCallUi: true,
  });
  RNCallKeep.displayIncomingCall(
    callUuid,
    call.peer.id,
    call.peer.name,
    'generic',
    call.callType === 'video',
    {
      callId: call.callId,
      callType: call.callType,
      provider: 'livekit',
      from_id: call.peer.id,
      name: call.peer.name,
      avatar: call.peer.avatar,
      uuid: callUuid,
    },
  );
  return callUuid;
}

export function markNativeCallConnected(callUuid: string) {
  const nativeCall = activeCalls.get(callUuid);
  if (!nativeCall?.usesNativeCallUi) return;

  if (Platform.OS === 'ios') {
    RNCallKeep.reportConnectedOutgoingCallWithUUID(callUuid);
    return;
  }
  RNCallKeep.setCurrentCallActive(callUuid);
}

export function endNativeCall(callUuid?: string, reason?: number) {
  if (!callUuid) return;
  const nativeCall = activeCalls.get(callUuid);
  activeCalls.delete(callUuid);
  if (!nativeCall?.usesNativeCallUi) return;

  RNCallKeep.reportEndCallWithUUID(
    callUuid,
    reason ?? CALLKEEP_CONSTANTS.END_CALL_REASONS.REMOTE_ENDED,
  );
  RNCallKeep.endCall(callUuid);
}
