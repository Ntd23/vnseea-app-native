// Description: Coordinates CallKeep system call UI events for Messages LiveKit calls.
import { NativeModules, Platform } from 'react-native';
import MD5 from 'crypto-js/md5';
import { OneSignal } from 'react-native-onesignal';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type {
  IncomingLiveKitCall,
  LiveKitCallPeer,
  LiveKitCallType,
} from '../../domain/types/call.types';
import type {
  GroupLiveKitGroup,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';

type NativeCallListeners = {
  onAnswer?: (callUuid: string) => void;
  onEnd?: (callUuid: string) => void;
  onMute?: (muted: boolean) => void;
  onIncoming?: (call: IncomingLiveKitCall) => void;
  onIncomingGroup?: (call: IncomingGroupLiveKitCall) => void;
};

type ActiveNativeCall = {
  context: 'direct' | 'group';
  callId?: string;
  groupId?: string;
  callType: LiveKitCallType;
  peer?: LiveKitCallPeer;
  group?: GroupLiveKitGroup;
  usesNativeCallUi: boolean;
};

const activeCalls = new Map<string, ActiveNativeCall>();

let isConfigured = false;
let listeners: NativeCallListeners = {};
let cachedCallKeep: Record<string, any> | null | undefined;
let cachedVoipPush: Record<string, any> | null | undefined;
let cachedInitialNativeAction:
  | Promise<Record<string, string> | null>
  | null
  | undefined;
const pendingAnswerUuids: string[] = [];
const pendingEndUuids: string[] = [];

function loadCallKeep() {
  if (Platform.OS === 'android') return null;
  if (cachedCallKeep !== undefined) return cachedCallKeep;

  try {
    cachedCallKeep = require('react-native-callkeep') as Record<string, any>;
  } catch (error) {
    console.warn('[LiveKitCall] CallKeep unavailable', error);
    cachedCallKeep = null;
  }
  return cachedCallKeep;
}

function loadVoipPushNotification() {
  if (Platform.OS !== 'ios') return null;
  if (cachedVoipPush !== undefined) return cachedVoipPush;

  try {
    cachedVoipPush = require('react-native-voip-push-notification') as Record<
      string,
      any
    >;
  } catch (error) {
    console.warn('[LiveKitCall] VoIP push unavailable', error);
    cachedVoipPush = null;
  }
  return cachedVoipPush;
}

function asPushRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parsePushRecord(value: unknown): Record<string, unknown> | null {
  const record = asPushRecord(value);
  if (record) return record;
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    return asPushRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function getPushRecordCandidates(payload: unknown) {
  const candidates: Record<string, unknown>[] = [];
  const root = parsePushRecord(payload);
  if (!root) return candidates;

  candidates.push(root);
  for (const key of [
    'notification_data',
    'additionalData',
    'additional_data',
    'data',
    'custom',
    'a',
  ]) {
    const nested = parsePushRecord(root[key]);
    if (nested) {
      candidates.push(nested);
    }
  }

  return candidates;
}

function readPushString(payload: unknown, key: string) {
  for (const record of getPushRecordCandidates(payload)) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }
  return '';
}

function findActiveNativeCallUuid(context: 'direct' | 'group', callId: string) {
  for (const [callUuid, activeCall] of activeCalls.entries()) {
    if (activeCall.context === context && activeCall.callId === callId) {
      return callUuid;
    }
  }

  return '';
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
    actionToken: readPushString(payload, 'action_token') || undefined,
    expiresAt: Number(readPushString(payload, 'expires_at')) || undefined,
    apiUrl: readPushString(payload, 'api_url') || undefined,
    peer: {
      id: readPushString(payload, 'from_id'),
      name: readPushString(payload, 'name') || 'Người dùng',
      avatar: readPushString(payload, 'avatar'),
    },
  };
}

function syncVoipToken(token: string) {
  if (!token) return;
  apiBridge
    .post(apiRoutes.messages.livekit, {
      type: 'register_voip_token',
      token,
    })
    .catch(error => {
      console.warn('[LiveKitCall] Could not sync VoIP token', error);
    });
}

function readPushLiveKitGroupCall(
  payload: unknown,
): IncomingGroupLiveKitCall | null {
  const provider = readPushString(payload, 'provider');
  const context = readPushString(payload, 'call_context');
  const callId = readPushString(payload, 'call_id');
  const groupId = readPushString(payload, 'group_id');
  if (provider !== 'livekit_group' && context !== 'group') return null;
  if (!callId || !groupId) return null;

  const callType =
    readPushString(payload, 'call_type') === 'audio' ? 'audio' : 'video';
  return {
    callId,
    groupId,
    callType,
    provider: 'livekit',
    roomName: readPushString(payload, 'room_name'),
    group: {
      id: groupId,
      name: readPushString(payload, 'group_name') || 'Nhóm',
      avatar: readPushString(payload, 'group_avatar'),
    },
    caller: {
      id:
        readPushString(payload, 'caller_id') ||
        readPushString(payload, 'from_id'),
      name:
        readPushString(payload, 'caller_name') ||
        readPushString(payload, 'name') ||
        'Người dùng',
      avatar:
        readPushString(payload, 'caller_avatar') ||
        readPushString(payload, 'avatar'),
    },
    participantCount: 0,
    actionToken: readPushString(payload, 'action_token') || undefined,
    expiresAt: Number(readPushString(payload, 'expires_at')) || undefined,
    apiUrl: readPushString(payload, 'api_url') || undefined,
    ringMode:
      readPushString(payload, 'ring_mode') === 'fullscreen'
        ? 'fullscreen'
        : readPushString(payload, 'ring_mode') === 'passive'
          ? 'passive'
          : undefined,
  };
}

function rememberNativeCallFromPayload(callUuid: string, payload: unknown) {
  const incomingGroupCall = readPushLiveKitGroupCall(payload);
  if (incomingGroupCall) {
    activeCalls.set(callUuid, {
      context: 'group',
      callId: incomingGroupCall.callId,
      groupId: incomingGroupCall.groupId,
      callType: incomingGroupCall.callType,
      peer: incomingGroupCall.caller,
      group: incomingGroupCall.group,
      usesNativeCallUi: true,
    });
    return;
  }

  const incomingCall = readPushLiveKitCall(payload);
  if (!incomingCall) return;

  activeCalls.set(callUuid, {
    context: 'direct',
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

function registerOneSignalCallListeners() {
  OneSignal.Notifications.addEventListener(
    'foregroundWillDisplay',
    (event: {
      getNotification(): { additionalData?: object };
      preventDefault(): void;
    }) => {
      const incomingCall = readPushLiveKitCall(
        event.getNotification().additionalData,
      );
      const incomingGroupCall = readPushLiveKitGroupCall(
        event.getNotification().additionalData,
      );
      if (incomingGroupCall) {
        event.preventDefault();
        listeners.onIncomingGroup?.(incomingGroupCall);
        return;
      }
      if (!incomingCall) return;

      event.preventDefault();
      listeners.onIncoming?.(incomingCall);
    },
  );
  OneSignal.Notifications.addEventListener(
    'click',
    (event: { notification: { additionalData?: object } }) => {
      const incomingCall = readPushLiveKitCall(
        event.notification.additionalData,
      );
      const incomingGroupCall = readPushLiveKitGroupCall(
        event.notification.additionalData,
      );
      if (incomingGroupCall) {
        displayNativeIncomingGroupCall(incomingGroupCall).catch(
          () => undefined,
        );
        return;
      }
      if (!incomingCall) return;

      displayNativeIncomingCall(incomingCall).catch(() => undefined);
    },
  );
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

export function createNativeGroupCallUuid(
  callId?: string,
  callType: LiveKitCallType = 'video',
) {
  const seed = callId
    ? `vnseea-livekit-group|${callType}|${callId}`
    : `vnseea-livekit-group|${Date.now()}|${Math.random()}`;
  const hex = MD5(seed).toString();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function configureNativeCallService() {
  if (isConfigured) return;
  const RNCallKeep = loadCallKeep();
  if (RNCallKeep?.default) {
    const AudioSessionCategoryOption =
      RNCallKeep.AudioSessionCategoryOption ?? {};
    const AudioSessionMode = RNCallKeep.AudioSessionMode ?? {};
    await RNCallKeep.default.setup({
      ios: {
        appName: 'VNSEEA',
        supportsVideo: true,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
        includesCallsInRecents: false,
        audioSession: {
          categoryOptions:
            (AudioSessionCategoryOption.allowBluetooth ?? 0) |
            (AudioSessionCategoryOption.allowBluetoothA2DP ?? 0) |
            (AudioSessionCategoryOption.defaultToSpeaker ?? 0),
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

    RNCallKeep.default.addEventListener('answerCall', ({ callUUID }: any) => {
      emitAnswer(callUUID);
    });
    RNCallKeep.default.addEventListener('endCall', ({ callUUID }: any) => {
      emitEnd(callUUID);
    });
    RNCallKeep.default.addEventListener(
      'didPerformSetMutedCallAction',
      (event: any) => {
        listeners.onMute?.(Boolean(event.muted));
      },
    );
    RNCallKeep.default.addEventListener(
      'didDisplayIncomingCall',
      (event: any) => {
        rememberNativeCallFromPayload(event.callUUID, event.payload);
      },
    );
    RNCallKeep.default.addEventListener(
      'didLoadWithEvents',
      (events: any[]) => {
        for (const event of events) {
          if (event.name === 'RNCallKeepDidDisplayIncomingCall') {
            rememberNativeCallFromPayload(
              event.data.callUUID,
              event.data.payload,
            );
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
      },
    );
  }
  if (Platform.OS === 'ios') {
    const RNVoipPushNotification = loadVoipPushNotification();
    RNVoipPushNotification?.default?.addEventListener(
      'register',
      (token: string) => {
        console.log(
          '[LiveKitCall] VoIP token registered:',
          token ? 'YES' : 'NO',
        );
        syncVoipToken(token);
      },
    );
    RNVoipPushNotification?.default?.addEventListener(
      'notification',
      (payload: unknown) => {
        const incomingGroupCall = readPushLiveKitGroupCall(payload);
        if (incomingGroupCall) {
          displayNativeIncomingGroupCall(incomingGroupCall)
            .then(callUuid =>
              RNVoipPushNotification.default.onVoipNotificationCompleted(
                callUuid,
              ),
            )
            .catch(() => undefined);
          return;
        }

        const incomingCall = readPushLiveKitCall(payload);
        if (!incomingCall) return;

        displayNativeIncomingCall(incomingCall)
          .then(callUuid =>
            RNVoipPushNotification.default.onVoipNotificationCompleted(
              callUuid,
            ),
          )
          .catch(() => undefined);
      },
    );
    RNVoipPushNotification?.default?.addEventListener(
      'didLoadWithEvents',
      (events: Array<{ name: string; data: unknown }>) => {
        for (const event of events) {
          if (event.name !== 'RNVoipPushRemoteNotificationReceivedEvent') {
            continue;
          }
          const callUuid = readPushString(event.data, 'uuid');
          if (callUuid) {
            rememberNativeCallFromPayload(callUuid, event.data);
          }
        }
      },
    );
    RNVoipPushNotification?.default?.registerVoipToken();
  }
  registerOneSignalCallListeners();

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

async function getInitialNativeActionPayload(): Promise<Record<string, string> | null> {
  if (Platform.OS !== 'android') return null;
  if (cachedInitialNativeAction !== undefined) {
    return cachedInitialNativeAction;
  }
  const module = NativeModules.VnseeaCallIntent as
    | { getInitialCallAction?: () => Promise<Record<string, string> | null> }
    | undefined;
  cachedInitialNativeAction = module?.getInitialCallAction?.() ?? null;
  return cachedInitialNativeAction;
}

export async function getInitialNativeCallAction(): Promise<IncomingLiveKitCall | null> {
  const payload = await getInitialNativeActionPayload();
  if (!payload) return null;
  if (
    payload.event_type === 'livekit_group_call' ||
    payload.call_context === 'group'
  ) {
    return null;
  }
  return readPushLiveKitCall({
    provider: 'livekit',
    event_type: 'livekit_call',
    ...payload,
  });
}

export async function getInitialNativeGroupCallAction(): Promise<IncomingGroupLiveKitCall | null> {
  const payload = await getInitialNativeActionPayload();
  if (!payload) return null;
  return readPushLiveKitGroupCall({
    provider: 'livekit_group',
    event_type: 'livekit_group_call',
    call_context: 'group',
    ...payload,
  });
}

export async function startNativeOutgoingCall(params: {
  callUuid: string;
  callType: LiveKitCallType;
  peer?: LiveKitCallPeer;
}) {
  await configureNativeCallService();
  activeCalls.set(params.callUuid, {
    context: 'direct',
    callType: params.callType,
    peer: params.peer,
    usesNativeCallUi: Platform.OS === 'ios',
  });
  if (Platform.OS === 'android') {
    return;
  }
  const RNCallKeep = loadCallKeep();
  if (!RNCallKeep?.default) return;
  RNCallKeep.default.startCall(
    params.callUuid,
    params.peer?.id ?? 'unknown',
    params.peer?.name ?? 'Người dùng',
    'generic',
    params.callType === 'video',
  );
}

export async function displayNativeIncomingCall(call: IncomingLiveKitCall) {
  await configureNativeCallService();
  const existingCallUuid = findActiveNativeCallUuid('direct', call.callId);
  if (existingCallUuid) return existingCallUuid;

  const callUuid = createNativeCallUuid(call.callId, call.callType);
  activeCalls.set(callUuid, {
    context: 'direct',
    callId: call.callId,
    callType: call.callType,
    peer: call.peer,
    usesNativeCallUi: Boolean(loadCallKeep()?.default),
  });
  const RNCallKeep = loadCallKeep();
  if (!RNCallKeep?.default) return callUuid;
  RNCallKeep.default.displayIncomingCall(
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

export async function displayNativeIncomingGroupCall(
  call: IncomingGroupLiveKitCall,
) {
  await configureNativeCallService();
  const existingCallUuid = findActiveNativeCallUuid('group', call.callId);
  if (existingCallUuid) return existingCallUuid;

  const callUuid = createNativeGroupCallUuid(call.callId, call.callType);
  activeCalls.set(callUuid, {
    context: 'group',
    callId: call.callId,
    groupId: call.groupId,
    callType: call.callType,
    peer: call.caller,
    group: call.group,
    usesNativeCallUi: Boolean(loadCallKeep()?.default),
  });
  const RNCallKeep = loadCallKeep();
  if (!RNCallKeep?.default) return callUuid;
  RNCallKeep.default.displayIncomingCall(
    callUuid,
    call.groupId,
    call.group.name,
    'generic',
    call.callType === 'video',
    {
      callId: call.callId,
      groupId: call.groupId,
      callType: call.callType,
      provider: 'livekit_group',
      call_context: 'group',
      group_name: call.group.name,
      group_avatar: call.group.avatar,
      caller_id: call.caller.id,
      caller_name: call.caller.name,
      caller_avatar: call.caller.avatar,
      uuid: callUuid,
    },
  );
  return callUuid;
}

export function markNativeCallConnected(callUuid: string) {
  const nativeCall = activeCalls.get(callUuid);
  if (!nativeCall?.usesNativeCallUi) return;

  if (Platform.OS === 'ios') {
    loadCallKeep()?.default?.reportConnectedOutgoingCallWithUUID(callUuid);
  }
}

export function endNativeCall(callUuid?: string, reason?: number) {
  if (!callUuid) return;
  const nativeCall = activeCalls.get(callUuid);
  activeCalls.delete(callUuid);
  if (!nativeCall?.usesNativeCallUi) return;

  const RNCallKeep = loadCallKeep();
  if (!RNCallKeep?.default) return;
  const endReasons = RNCallKeep.CONSTANTS?.END_CALL_REASONS ?? {};
  RNCallKeep.default.reportEndCallWithUUID(
    callUuid,
    reason ?? endReasons.REMOTE_ENDED ?? 2,
  );
  RNCallKeep.default.endCall(callUuid);
}
