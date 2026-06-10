// Description: Handles foreground LiveKit call ringing from push and socket signals for Messages.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import type { IncomingLiveKitCall } from '../../domain/types/call.types';
import type { IncomingGroupLiveKitCall } from '../../domain/types/groupCall.types';
import { useGroupLiveKitCallSession } from './useGroupLiveKitCallSession';
import { useLiveKitCallSession } from './useLiveKitCallSession';
import {
  connectLiveKitCallRealtime,
  emitLiveKitCallDeclined,
  onLiveKitCallClosed,
  onLiveKitCallDeclined,
  onLiveKitCallIncoming,
  onLiveKitGroupCallClosed,
  onLiveKitGroupCallIncoming,
} from '../../infrastructure/realtime/liveKitCallRealtime';
import { createGroupLiveKitCallRepository } from '../../infrastructure/repositories/ApiGroupLiveKitCallRepository';
import { createLiveKitCallRepository } from '../../infrastructure/repositories/ApiLiveKitCallRepository';

const AUTH_ROUTE_NAMES = new Set<string>([
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
]);
const LIVEKIT_REALTIME_CONNECT_INTERVAL_MS = 1_500;

function isActiveCallPhase(phase?: string) {
  return Boolean(phase && phase !== 'ended' && phase !== 'error');
}

function isAppForeground() {
  return (
    AppState.currentState !== 'background' &&
    AppState.currentState !== 'inactive'
  );
}

type NativeCallServiceModule = typeof import('../../infrastructure/calls/nativeCallService');

function loadNativeCallService(): NativeCallServiceModule | null {
  try {
    return (require('../../infrastructure/calls/nativeCallService') as
      | NativeCallServiceModule
      | undefined) ?? null;
  } catch (error) {
    console.warn('[LiveKitIncoming] Native call service unavailable', error);
    return null;
  }
}

export function useIncomingLiveKitCalls() {
  const repository = useMemo(() => createLiveKitCallRepository(), []);
  const groupRepository = useMemo(() => createGroupLiveKitCallRepository(), []);
  const { session, answerIncomingCall, endCall } = useLiveKitCallSession();
  const {
    session: groupSession,
    answerIncomingGroupCall,
    leaveCall,
    declineIncomingGroupCall,
  } = useGroupLiveKitCallSession();
  const activeCallIdRef = useRef('');
  const activeGroupCallIdRef = useRef('');
  const sessionRef = useRef(session);
  const groupSessionRef = useRef(groupSession);
  const incomingCallRef = useRef<IncomingLiveKitCall | null>(null);
  const incomingGroupCallRef = useRef<IncomingGroupLiveKitCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingLiveKitCall | null>(
    null,
  );
  const [incomingGroupCall, setIncomingGroupCall] =
    useState<IncomingGroupLiveKitCall | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    groupSessionRef.current = groupSession;
  }, [groupSession]);

  const setActiveIncomingCall = useCallback(
    (nextCall: IncomingLiveKitCall | null) => {
      incomingCallRef.current = nextCall;
      activeCallIdRef.current = nextCall?.callId ?? '';
      setIncomingCall(nextCall);
    },
    [],
  );

  const setActiveIncomingGroupCall = useCallback(
    (nextCall: IncomingGroupLiveKitCall | null) => {
      incomingGroupCallRef.current = nextCall;
      activeGroupCallIdRef.current = nextCall?.callId ?? '';
      setIncomingGroupCall(nextCall);
    },
    [],
  );

  const openIncomingCallRoom = useCallback(
    (call: IncomingLiveKitCall) => {
      const open = () => {
        if (!navigationRef.isReady()) return;
        answerIncomingCall(call);
        navigationRef.navigate(ROUTES.CALL_ROOM, {
          callId: call.callId,
          callType: call.callType,
          direction: 'incoming',
          peer: call.peer,
        });
      };
      if (navigationRef.isReady()) {
        open();
        return;
      }
      setTimeout(open, 250);
    },
    [answerIncomingCall],
  );

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;

    setActiveIncomingCall(null);
    openIncomingCallRoom(call);
  }, [openIncomingCallRoom, setActiveIncomingCall]);

  const declineIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    setActiveIncomingCall(null);
    if (!call) return;

    emitLiveKitCallDeclined({
      callId: call.callId,
      callType: call.callType,
      recipientId: call.peer.id,
      duration: 0,
    });
    repository
      .closeCall({
        callId: call.callId,
        callType: call.callType,
        status: 'declined',
        duration: 0,
      })
      .catch(() => undefined);
  }, [repository, setActiveIncomingCall]);

  const acceptIncomingGroupCall = useCallback(() => {
    const call = incomingGroupCallRef.current;
    if (!call || !navigationRef.isReady()) return;

    setActiveIncomingGroupCall(null);
    answerIncomingGroupCall(call);
    navigationRef.navigate(ROUTES.GROUP_CALL_ROOM, {
      groupId: call.groupId,
      callId: call.callId,
      callType: call.callType,
      direction: 'incoming',
      groupName: call.group.name,
      groupAvatar: call.group.avatar,
    });
  }, [answerIncomingGroupCall, setActiveIncomingGroupCall]);

  const declineIncomingGroup = useCallback(() => {
    const call = incomingGroupCallRef.current;
    setActiveIncomingGroupCall(null);
    if (!call) return;
    declineIncomingGroupCall(call).catch(() => undefined);
  }, [declineIncomingGroupCall, setActiveIncomingGroupCall]);

  const shouldIgnoreIncomingSignal = useCallback(() => {
    if (!navigationRef.isReady()) return true;
    const currentRouteName = navigationRef.getCurrentRoute()?.name;
    if (currentRouteName && AUTH_ROUTE_NAMES.has(String(currentRouteName))) {
      return true;
    }
    return (
      isActiveCallPhase(sessionRef.current?.phase) ||
      isActiveCallPhase(groupSessionRef.current?.phase)
    );
  }, []);

  const handleIncomingCallSignal = useCallback(
    (call: IncomingLiveKitCall) => {
      if (shouldIgnoreIncomingSignal()) return;
      if (!isAppForeground()) return;
      if (call.callId === activeCallIdRef.current && incomingCallRef.current) {
        return;
      }
      setActiveIncomingCall(call);
    },
    [setActiveIncomingCall, shouldIgnoreIncomingSignal],
  );

  const handleIncomingGroupCallSignal = useCallback(
    (call: IncomingGroupLiveKitCall) => {
      if (shouldIgnoreIncomingSignal()) return;
      if (!isAppForeground()) return;
      if (
        call.callId === activeGroupCallIdRef.current &&
        incomingGroupCallRef.current
      ) {
        return;
      }
      setActiveIncomingGroupCall(call);
    },
    [setActiveIncomingGroupCall, shouldIgnoreIncomingSignal],
  );

  useEffect(() => {
    const nativeCallService = loadNativeCallService();
    nativeCallService?.configureNativeCallService?.().catch(() => undefined);
    connectLiveKitCallRealtime();
    const cleanupIncomingSocket = onLiveKitCallIncoming(
      handleIncomingCallSignal,
    );
    const cleanupIncomingGroupSocket = onLiveKitGroupCallIncoming(
      handleIncomingGroupCallSignal,
    );
    const clearIncomingDirectCall = (callId: string) => {
      if (incomingCallRef.current?.callId !== callId) return;
      setActiveIncomingCall(null);
    };
    const cleanupDeclinedSocket = onLiveKitCallDeclined(event => {
      clearIncomingDirectCall(event.callId);
    });
    const cleanupClosedSocket = onLiveKitCallClosed(event => {
      clearIncomingDirectCall(event.callId);
    });
    const cleanupGroupClosedSocket = onLiveKitGroupCallClosed(event => {
      if (incomingGroupCallRef.current?.callId !== event.callId) return;
      setActiveIncomingGroupCall(null);
    });
    const cleanupListeners =
      nativeCallService?.setNativeCallListeners?.({
      onIncoming: handleIncomingCallSignal,
      onIncomingGroup: handleIncomingGroupCallSignal,
      onAnswer(callUuid) {
        const nativeCall = nativeCallService.getNativeCall(callUuid);
        if (!nativeCall?.callId || !navigationRef.isReady()) return;
        if (nativeCall.context === 'group') {
          const groupId = nativeCall.groupId ?? nativeCall.group?.id ?? '';
          if (!groupId) return;
          answerIncomingGroupCall({
            callId: nativeCall.callId,
            groupId,
            callType: nativeCall.callType,
            provider: 'livekit',
            roomName: '',
            group: nativeCall.group ?? {
              id: groupId,
              name: 'Nhóm',
              avatar: '',
            },
            caller: nativeCall.peer ?? {
              id: '',
              name: 'Người dùng',
              avatar: '',
            },
            participantCount: 0,
          });
          navigationRef.navigate(ROUTES.GROUP_CALL_ROOM, {
            groupId,
            callId: nativeCall.callId,
            callType: nativeCall.callType,
            direction: 'incoming',
            groupName: nativeCall.group?.name,
            groupAvatar: nativeCall.group?.avatar,
          });
          return;
        }
        openIncomingCallRoom({
          callId: nativeCall.callId,
          callType: nativeCall.callType,
          provider: 'livekit',
          roomName: '',
          peer: nativeCall.peer ?? {
            id: '',
            name: 'Người dùng',
            avatar: '',
          },
        });
      },
      onEnd(callUuid) {
        const nativeCall = nativeCallService.getNativeCall(callUuid);
        if (nativeCall?.context === 'group') {
          const activeGroupSession = groupSessionRef.current;
          if (activeGroupSession?.callId === nativeCall.callId) {
            leaveCall().catch(() => undefined);
            return;
          }
          if (nativeCall.callId) {
            groupRepository
              .declineCall({ callId: nativeCall.callId })
              .catch(() => undefined);
          }
          return;
        }
        if (!nativeCall?.callId) {
          endCall('declined').catch(() => undefined);
          return;
        }
        const activeSession = sessionRef.current;
        if (activeSession?.callId === nativeCall.callId) {
          endCall(
            activeSession.phase === 'connected' ? 'ended' : 'declined',
          ).catch(() => undefined);
          return;
        }
        emitLiveKitCallDeclined({
          callId: nativeCall.callId,
          callType: nativeCall.callType,
          recipientId: nativeCall.peer?.id ?? '',
          duration: 0,
        });
        repository
          .closeCall({
            callId: nativeCall.callId,
            callType: nativeCall.callType,
            status: 'declined',
            duration: 0,
          })
          .catch(() => undefined);
      },
    }) ?? (() => undefined);

    nativeCallService?.getInitialNativeGroupCallAction?.()
      .then(call => {
        if (!call || !navigationRef.isReady()) return;
        answerIncomingGroupCall(call);
        navigationRef.navigate(ROUTES.GROUP_CALL_ROOM, {
          groupId: call.groupId,
          callId: call.callId,
          callType: call.callType,
          direction: 'incoming',
          groupName: call.group.name,
          groupAvatar: call.group.avatar,
        });
      })
      .catch(() => undefined);

    nativeCallService?.getInitialNativeCallAction?.()
      .then(call => {
        if (!call) return;
        openIncomingCallRoom(call);
      })
      .catch(() => undefined);

    const realtimeConnectInterval = setInterval(() => {
      if (!isAppForeground()) return;
      connectLiveKitCallRealtime();
    }, LIVEKIT_REALTIME_CONNECT_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState !== 'active') return;
        connectLiveKitCallRealtime();
      },
    );

    return () => {
      cleanupIncomingSocket();
      cleanupIncomingGroupSocket();
      cleanupDeclinedSocket();
      cleanupClosedSocket();
      cleanupGroupClosedSocket();
      cleanupListeners();
      clearInterval(realtimeConnectInterval);
      appStateSubscription.remove();
    };
  }, [
    answerIncomingCall,
    answerIncomingGroupCall,
    endCall,
    groupRepository,
    handleIncomingCallSignal,
    handleIncomingGroupCallSignal,
    leaveCall,
    openIncomingCallRoom,
    repository,
  ]);

  return {
    incomingCall,
    incomingGroupCall,
    acceptIncomingCall,
    acceptIncomingGroupCall,
    declineIncomingCall,
    declineIncomingGroup,
  };
}
