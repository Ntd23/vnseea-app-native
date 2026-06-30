// Description: Handles foreground LiveKit call ringing from push and socket signals for Messages.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
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
const INCOMING_CALL_POLL_INTERVAL_MS = 3_000;
const INCOMING_CALL_AUTO_DISMISS_MS = 50_000;

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
  const isConsumingInitialNativeActionRef = useRef(false);
  const incomingCallPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingIncomingRef = useRef(false);
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

  const clearIncomingCallTimers = useCallback(() => {
    if (incomingCallPollRef.current) {
      clearInterval(incomingCallPollRef.current);
      incomingCallPollRef.current = null;
    }
    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }
    isPollingIncomingRef.current = false;
  }, []);

  const setActiveIncomingCall = useCallback(
    (nextCall: IncomingLiveKitCall | null) => {
      incomingCallRef.current = nextCall;
      activeCallIdRef.current = nextCall?.callId ?? '';
      setIncomingCall(nextCall);
      if (!nextCall) {
        clearIncomingCallTimers();
      }
    },
    [clearIncomingCallTimers],
  );

  const setActiveIncomingGroupCall = useCallback(
    (nextCall: IncomingGroupLiveKitCall | null) => {
      incomingGroupCallRef.current = nextCall;
      activeGroupCallIdRef.current = nextCall?.callId ?? '';
      setIncomingGroupCall(nextCall);
    },
    [],
  );

  const runWhenNavigationReady = useCallback((task: () => void, attempts = 16) => {
    if (navigationRef.isReady()) {
      task();
      return;
    }
    if (attempts <= 0) return;
    setTimeout(() => runWhenNavigationReady(task, attempts - 1), 250);
  }, []);

  const dismissNativeIncomingCall = useCallback((callId?: string) => {
    if (!callId) return;
    loadNativeCallService()?.dismissNativeIncomingCall?.(callId);
  }, []);

  const dismissAndroidIncomingCall = useCallback(
    (callId?: string) => {
      if (Platform.OS !== 'android') return;
      dismissNativeIncomingCall(callId);
    },
    [dismissNativeIncomingCall],
  );

  const openIncomingCallRoom = useCallback(
    (call: IncomingLiveKitCall) => {
      dismissAndroidIncomingCall(call.callId);
      runWhenNavigationReady(() => {
        answerIncomingCall(call)
          .then(didAnswer => {
            if (!didAnswer) return;
            navigationRef.navigate(ROUTES.CALL_ROOM, {
              callId: call.callId,
              callType: call.callType,
              direction: 'incoming',
              peer: call.peer,
            });
          })
          .catch(() => undefined);
      });
    },
    [answerIncomingCall, dismissAndroidIncomingCall, runWhenNavigationReady],
  );

  const openIncomingGroupCallRoom = useCallback(
    (call: IncomingGroupLiveKitCall) => {
      dismissAndroidIncomingCall(call.callId);
      runWhenNavigationReady(() => {
        answerIncomingGroupCall(call);
        navigationRef.navigate(ROUTES.GROUP_CALL_ROOM, {
          groupId: call.groupId,
          callId: call.callId,
          callType: call.callType,
          direction: 'incoming',
          groupName: call.group.name,
          groupAvatar: call.group.avatar,
        });
      });
    },
    [answerIncomingGroupCall, dismissAndroidIncomingCall, runWhenNavigationReady],
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

    dismissNativeIncomingCall(call.callId);
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
  }, [dismissNativeIncomingCall, repository, setActiveIncomingCall]);

  const acceptIncomingGroupCall = useCallback(() => {
    const call = incomingGroupCallRef.current;
    if (!call) return;

    setActiveIncomingGroupCall(null);
    openIncomingGroupCallRoom(call);
  }, [openIncomingGroupCallRoom, setActiveIncomingGroupCall]);

  const declineIncomingGroup = useCallback(() => {
    const call = incomingGroupCallRef.current;
    setActiveIncomingGroupCall(null);
    if (!call) return;
    dismissNativeIncomingCall(call.callId);
    declineIncomingGroupCall(call).catch(() => undefined);
  }, [
    declineIncomingGroupCall,
    dismissNativeIncomingCall,
    setActiveIncomingGroupCall,
  ]);

  const clearNativeAnsweredIncomingState = useCallback(() => {
    setActiveIncomingCall(null);
    setActiveIncomingGroupCall(null);
  }, [setActiveIncomingCall, setActiveIncomingGroupCall]);

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
      if (call.callId === activeCallIdRef.current && incomingCallRef.current) {
        return;
      }
      if (Platform.OS === 'android') {
        loadNativeCallService()?.displayNativeIncomingCall?.(call);
      } else {
        if (!isAppForeground()) return;
        loadNativeCallService()?.displayNativeIncomingCall?.(call);
      }
    },
    [shouldIgnoreIncomingSignal],
  );

  const handleIncomingGroupCallSignal = useCallback(
    (call: IncomingGroupLiveKitCall) => {
      if (shouldIgnoreIncomingSignal()) return;
      if (
        call.callId === activeGroupCallIdRef.current &&
        incomingGroupCallRef.current
      ) {
        return;
      }
      if (Platform.OS === 'android') {
        loadNativeCallService()?.displayNativeIncomingGroupCall?.(call);
      } else {
        if (!isAppForeground()) return;
        if (call.ringMode !== 'passive') {
          loadNativeCallService()?.displayNativeIncomingGroupCall?.(call);
          return;
        }
        setActiveIncomingGroupCall(call);
      }
    },
    [setActiveIncomingGroupCall, shouldIgnoreIncomingSignal],
  );

  const handleInitialNativeCallAction = useCallback(() => {
    if (isConsumingInitialNativeActionRef.current) return;
    const nativeCallService = loadNativeCallService();
    if (!nativeCallService) return;
    const service = nativeCallService;

    async function consumeInitialAction() {
      isConsumingInitialNativeActionRef.current = true;
      const groupCall =
        (await service.getInitialNativeGroupCallAction?.()) ?? null;
      if (groupCall) {
        openIncomingGroupCallRoom(groupCall);
        return;
      }

      const directCall =
        (await service.getInitialNativeCallAction?.()) ?? null;
      if (directCall) {
        openIncomingCallRoom(directCall);
      }
    }

    consumeInitialAction()
      .catch(() => undefined)
      .finally(() => {
        isConsumingInitialNativeActionRef.current = false;
      });
  }, [openIncomingCallRoom, openIncomingGroupCallRoom]);

  const handleInitialNativeMessageAction = useCallback(() => {
    const nativeCallService = loadNativeCallService();
    if (!nativeCallService?.getInitialNativeMessageAction) return;

    nativeCallService
      .getInitialNativeMessageAction()
      .then(action => {
        if (!action) return;
        dismissNativeIncomingCall(action.callId);
        setActiveIncomingCall(null);
        setActiveIncomingGroupCall(null);
        runWhenNavigationReady(() => {
          navigationRef.navigate(ROUTES.CHAT, { chat: action.chat });
        });
      })
      .catch(() => undefined);
  }, [
    dismissNativeIncomingCall,
    runWhenNavigationReady,
    setActiveIncomingCall,
    setActiveIncomingGroupCall,
  ]);

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
      nativeCallService?.dismissNativeIncomingCall?.(callId);
      if (incomingCallRef.current?.callId === callId) {
        setActiveIncomingCall(null);
      }
    };
    const cleanupDeclinedSocket = onLiveKitCallDeclined(event => {
      clearIncomingDirectCall(event.callId);
    });
    const cleanupClosedSocket = onLiveKitCallClosed(event => {
      clearIncomingDirectCall(event.callId);
    });
    const cleanupGroupClosedSocket = onLiveKitGroupCallClosed(event => {
      nativeCallService?.dismissNativeIncomingCall?.(event.callId);
      if (incomingGroupCallRef.current?.callId === event.callId) {
        setActiveIncomingGroupCall(null);
      }
    });
    // ---------- START: Fix for caller-ends-but-receiver-still-shows-calling ----------
    // Clean up any previous timers
    clearIncomingCallTimers();
    const cleanupListeners =
      nativeCallService?.setNativeCallListeners?.({
      onIncoming: handleIncomingCallSignal,
      onIncomingGroup: handleIncomingGroupCallSignal,
      onAnswer(callUuid) {
        clearNativeAnsweredIncomingState();
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

    handleInitialNativeCallAction();
    handleInitialNativeMessageAction();

    const realtimeConnectInterval = setInterval(() => {
      if (!isAppForeground()) return;
      connectLiveKitCallRealtime();
    }, LIVEKIT_REALTIME_CONNECT_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState !== 'active') return;
        connectLiveKitCallRealtime();
        handleInitialNativeCallAction();
        handleInitialNativeMessageAction();
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
      clearIncomingCallTimers();
      appStateSubscription.remove();
    };
  }, [
    answerIncomingCall,
    answerIncomingGroupCall,
    clearNativeAnsweredIncomingState,
    clearIncomingCallTimers,
    endCall,
    groupRepository,
    handleIncomingCallSignal,
    handleIncomingGroupCallSignal,
    handleInitialNativeCallAction,
    handleInitialNativeMessageAction,
    leaveCall,
    openIncomingCallRoom,
    repository,
    setActiveIncomingCall,
    setActiveIncomingGroupCall,
  ]);

  // Poll incoming call status and auto-dismiss if the call is no longer active
  useEffect(() => {
    const currentIncoming = incomingCall;
    if (!currentIncoming) {
      clearIncomingCallTimers();
      return;
    }

    // Auto-dismiss after INCOMING_CALL_AUTO_DISMISS_MS (fallback safety net)
    incomingCallTimeoutRef.current = setTimeout(() => {
      if (incomingCallRef.current?.callId === currentIncoming.callId) {
        console.log('[LiveKitIncoming] auto-dismiss timeout fired for', currentIncoming.callId);
        loadNativeCallService()?.dismissNativeIncomingCall?.(currentIncoming.callId);
        setActiveIncomingCall(null);
      }
    }, INCOMING_CALL_AUTO_DISMISS_MS);

    // Poll the server periodically to check if the call is still active
    incomingCallPollRef.current = setInterval(() => {
      if (isPollingIncomingRef.current) return;
      const callToCheck = incomingCallRef.current;
      if (!callToCheck) {
        clearIncomingCallTimers();
        return;
      }

      isPollingIncomingRef.current = true;
      repository
        .checkCall({
          callId: callToCheck.callId,
          callType: callToCheck.callType,
        })
        .then(status => {
          if (
            status &&
            (status.finished ||
              status.status === 'cancelled' ||
              status.status === 'ended' ||
              status.status === 'no_answer' ||
              status.status === 'missed')
          ) {
            console.log(
              '[LiveKitIncoming] poll detected call ended:',
              callToCheck.callId,
              status.status,
            );
            loadNativeCallService()?.dismissNativeIncomingCall?.(callToCheck.callId);
            setActiveIncomingCall(null);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          isPollingIncomingRef.current = false;
        });
    }, INCOMING_CALL_POLL_INTERVAL_MS);

    return () => {
      clearIncomingCallTimers();
    };
  }, [clearIncomingCallTimers, incomingCall, repository, setActiveIncomingCall]);

  return {
    incomingCall,
    incomingGroupCall,
    acceptIncomingCall,
    acceptIncomingGroupCall,
    declineIncomingCall,
    declineIncomingGroup,
  };
}
