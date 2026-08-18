// Description: Handles foreground LiveKit call ringing from push and socket signals for Messages.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import type {
  IncomingLiveKitCall,
  LiveKitCallCheckResult,
} from '../../domain/types/call.types';
import type { IncomingGroupLiveKitCall } from '../../domain/types/groupCall.types';
import { useGroupLiveKitCallSession } from './useGroupLiveKitCallSession';
import { useLiveKitCallSession } from './useLiveKitCallSession';
import {
  connectLiveKitCallRealtime,
  onLiveKitCallClosed,
  onLiveKitCallAnswered,
  onLiveKitCallDeclined,
  onLiveKitCallIncoming,
  onLiveKitGroupCallClosed,
  onLiveKitGroupCallIncoming,
  onLiveKitGroupCallSync,
} from '../../infrastructure/realtime/liveKitCallRealtime';
import { createGroupLiveKitCallRepository } from '../../infrastructure/repositories/ApiGroupLiveKitCallRepository';
import { createLiveKitCallRepository } from '../../infrastructure/repositories/ApiLiveKitCallRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

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

function shouldDismissTrackedDirectCall(status: LiveKitCallCheckResult) {
  return (
    (status.status === 'answered' && status.endpointOwned === false) ||
    status.finished ||
    status.status === 'declined' ||
    status.status === 'cancelled' ||
    status.status === 'ended' ||
    status.status === 'no_answer' ||
    status.status === 'missed' ||
    status.status === 'not_answered' ||
    status.status === 'busy'
  );
}

type NativeCallServiceModule =
  typeof import('../../infrastructure/calls/nativeCallService');

function loadNativeCallService(): NativeCallServiceModule | null {
  try {
    return (
      (require('../../infrastructure/calls/nativeCallService') as
        | NativeCallServiceModule
        | undefined) ?? null
    );
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
  const trackedDirectCallRef = useRef<IncomingLiveKitCall | null>(null);
  const incomingGroupCallRef = useRef<IncomingGroupLiveKitCall | null>(null);
  const isConsumingInitialNativeActionRef = useRef(false);
  const incomingCallPollRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const incomingCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const incomingGroupCallPollRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const isPollingIncomingRef = useRef(false);
  const isPollingIncomingGroupRef = useRef(false);
  const [incomingCall, setIncomingCall] = useState<IncomingLiveKitCall | null>(
    null,
  );
  const [trackedDirectCall, setTrackedDirectCallState] =
    useState<IncomingLiveKitCall | null>(null);
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
      setIncomingCall(nextCall);
      if (!nextCall && !trackedDirectCallRef.current) {
        clearIncomingCallTimers();
      }
    },
    [clearIncomingCallTimers],
  );

  const setTrackedDirectCall = useCallback(
    (nextCall: IncomingLiveKitCall | null) => {
      trackedDirectCallRef.current = nextCall;
      activeCallIdRef.current = nextCall?.callId ?? '';
      setTrackedDirectCallState(nextCall);
      if (!nextCall && !incomingCallRef.current) {
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
      if (!nextCall && incomingGroupCallPollRef.current) {
        clearInterval(incomingGroupCallPollRef.current);
        incomingGroupCallPollRef.current = null;
        isPollingIncomingGroupRef.current = false;
      }
    },
    [],
  );

  const runWhenNavigationReady = useCallback(
    (task: () => void, attempts = 16) => {
      if (navigationRef.isReady()) {
        task();
        return;
      }
      if (attempts <= 0) return;
      setTimeout(() => runWhenNavigationReady(task, attempts - 1), 250);
    },
    [],
  );

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

  const dismissTrackedDirectCall = useCallback(
    (callId?: string) => {
      if (!callId) return;
      dismissNativeIncomingCall(callId);
      if (trackedDirectCallRef.current?.callId === callId) {
        setTrackedDirectCall(null);
      }
      if (incomingCallRef.current?.callId === callId) {
        setActiveIncomingCall(null);
      }
    },
    [dismissNativeIncomingCall, setActiveIncomingCall, setTrackedDirectCall],
  );

  const checkTrackedDirectCall = useCallback(() => {
    if (isPollingIncomingRef.current) return;
    const callToCheck =
      trackedDirectCallRef.current ?? incomingCallRef.current;
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
        if (!shouldDismissTrackedDirectCall(status)) return;
        console.log(
          '[LiveKitIncoming] poll detected call ended:',
          callToCheck.callId,
          status.status,
        );
        dismissTrackedDirectCall(callToCheck.callId);
      })
      .catch(() => undefined)
      .finally(() => {
        isPollingIncomingRef.current = false;
      });
  }, [clearIncomingCallTimers, dismissTrackedDirectCall, repository]);

  const openIncomingCallRoom = useCallback(
    (call: IncomingLiveKitCall) => {
      setTrackedDirectCall(null);
      dismissAndroidIncomingCall(call.callId);
      runWhenNavigationReady(() => {
        answerIncomingCall(call)
          .then(didAnswer => {
            if (!didAnswer) return;
            dismissAndroidIncomingCall(call.callId);
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
    [
      answerIncomingCall,
      dismissAndroidIncomingCall,
      runWhenNavigationReady,
      setTrackedDirectCall,
    ],
  );

  const openIncomingGroupCallRoom = useCallback(
    (call: IncomingGroupLiveKitCall) => {
      dismissAndroidIncomingCall(call.callId);
      runWhenNavigationReady(() => {
        answerIncomingGroupCall(call)
          .then(didAnswer => {
            if (!didAnswer) return;
            navigationRef.navigate(ROUTES.GROUP_CALL_ROOM, {
              groupId: call.groupId,
              callId: call.callId,
              direction: 'incoming',
              groupName: call.group.name,
              groupAvatar: call.group.avatar,
            });
          })
          .catch(() => undefined);
      });
    },
    [
      answerIncomingGroupCall,
      dismissAndroidIncomingCall,
      runWhenNavigationReady,
    ],
  );

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;

    setActiveIncomingCall(null);
    setTrackedDirectCall(null);
    openIncomingCallRoom(call);
  }, [openIncomingCallRoom, setActiveIncomingCall, setTrackedDirectCall]);

  const prepareAndAnswerPassiveIosGroupCall = useCallback(
    async (call: IncomingGroupLiveKitCall) => {
      const nativeCallService = loadNativeCallService();
      if (!nativeCallService) return false;
      const callUuid = await nativeCallService.displayNativeIncomingGroupCall(
        call,
      );
      return nativeCallService.answerNativeIncomingCall(callUuid);
    },
    [],
  );

  const declineIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    setActiveIncomingCall(null);
    setTrackedDirectCall(null);
    if (!call) return;

    dismissNativeIncomingCall(call.callId);
    repository
      .closeCall({
        callId: call.callId,
        callType: call.callType,
        status: 'declined',
        duration: 0,
      })
      .catch(() => undefined);
  }, [
    dismissNativeIncomingCall,
    repository,
    setActiveIncomingCall,
    setTrackedDirectCall,
  ]);

  const acceptIncomingGroupCall = useCallback(() => {
    const call = incomingGroupCallRef.current;
    if (!call) return;

    setActiveIncomingGroupCall(null);
    if (Platform.OS === 'ios' && call.ringMode === 'passive') {
      prepareAndAnswerPassiveIosGroupCall(call)
        .then(answeredByCallKit => {
          if (!answeredByCallKit) openIncomingGroupCallRoom(call);
        })
        .catch(() => openIncomingGroupCallRoom(call));
      return;
    }
    openIncomingGroupCallRoom(call);
  }, [
    openIncomingGroupCallRoom,
    prepareAndAnswerPassiveIosGroupCall,
    setActiveIncomingGroupCall,
  ]);

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
    setTrackedDirectCall(null);
    setActiveIncomingGroupCall(null);
  }, [
    setActiveIncomingCall,
    setActiveIncomingGroupCall,
    setTrackedDirectCall,
  ]);

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
      if (Platform.OS !== 'android' && !isAppForeground()) return;
      if (
        call.callId === activeCallIdRef.current &&
        trackedDirectCallRef.current
      ) {
        return;
      }
      setTrackedDirectCall(call);
      if (Platform.OS === 'android') {
        loadNativeCallService()?.displayNativeIncomingCall?.(call);
      } else {
        loadNativeCallService()?.displayNativeIncomingCall?.(call);
      }
    },
    [setTrackedDirectCall, shouldIgnoreIncomingSignal],
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

      const directCall = (await service.getInitialNativeCallAction?.()) ?? null;
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
        dismissTrackedDirectCall(action.callId);
        setActiveIncomingGroupCall(null);
        runWhenNavigationReady(() => {
          navigationRef.navigate(ROUTES.CHAT, { chat: action.chat });
        });
      })
      .catch(() => undefined);
  }, [
    dismissTrackedDirectCall,
    runWhenNavigationReady,
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
    const cleanupDeclinedSocket = onLiveKitCallDeclined(event => {
      dismissTrackedDirectCall(event.callId);
    });
    const cleanupClosedSocket = onLiveKitCallClosed(event => {
      dismissTrackedDirectCall(event.callId);
    });
    const cleanupAnsweredSocket = onLiveKitCallAnswered(event => {
      const current =
        trackedDirectCallRef.current ?? incomingCallRef.current;
      if (!current || current.callId !== event.callId) return;
      repository
        .checkCall({ callId: current.callId, callType: current.callType })
        .then(status => {
          if (status.status === 'answered' && status.endpointOwned === false) {
            dismissTrackedDirectCall(event.callId);
          }
        })
        .catch(() => undefined);
    });
    const cleanupGroupSyncSocket = onLiveKitGroupCallSync(event => {
      const currentUserId = sessionStorage.getSession()?.userId;
      if (!currentUserId) return;
      if (event.declinedUserId === currentUserId) {
        nativeCallService?.dismissNativeIncomingCall?.(event.callId);
        if (incomingGroupCallRef.current?.callId === event.callId) {
          setActiveIncomingGroupCall(null);
        }
        return;
      }
      if (event.activeUserId !== currentUserId) return;
      const current = incomingGroupCallRef.current;
      if (!current || current.callId !== event.callId) return;
      groupRepository
        .syncCall({ callId: event.callId })
        .then(status => {
          if (status.endpointOwned === false) {
            nativeCallService?.dismissNativeIncomingCall?.(event.callId);
            if (incomingGroupCallRef.current?.callId === event.callId) {
              setActiveIncomingGroupCall(null);
            }
          }
        })
        .catch(() => undefined);
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
            openIncomingGroupCallRoom({
              callId: nativeCall.callId,
              groupId,
              callType: 'video',
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
              leaveCall('native_end').catch(() => undefined);
              return;
            }
            if (nativeCall.callId) {
              groupRepository
                .declineCall({ callId: nativeCall.callId })
                .catch(() => undefined);
            }
            return;
          }
          if (
            !nativeCall?.callId ||
            trackedDirectCallRef.current?.callId === nativeCall.callId
          ) {
            setTrackedDirectCall(null);
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
        checkTrackedDirectCall();
        handleInitialNativeCallAction();
        handleInitialNativeMessageAction();
      },
    );

    return () => {
      cleanupIncomingSocket();
      cleanupIncomingGroupSocket();
      cleanupDeclinedSocket();
      cleanupClosedSocket();
      cleanupAnsweredSocket();
      cleanupGroupSyncSocket();
      cleanupGroupClosedSocket();
      cleanupListeners();
      clearInterval(realtimeConnectInterval);
      clearIncomingCallTimers();
      appStateSubscription.remove();
    };
  }, [
    answerIncomingCall,
    checkTrackedDirectCall,
    clearNativeAnsweredIncomingState,
    clearIncomingCallTimers,
    dismissTrackedDirectCall,
    endCall,
    groupRepository,
    handleIncomingCallSignal,
    handleIncomingGroupCallSignal,
    handleInitialNativeCallAction,
    handleInitialNativeMessageAction,
    leaveCall,
    openIncomingCallRoom,
    openIncomingGroupCallRoom,
    repository,
    setActiveIncomingGroupCall,
    setTrackedDirectCall,
  ]);

  // Track native direct calls separately from the React Native modal so a
  // terminal server status can still close Android/iOS native incoming UI.
  useEffect(() => {
    const currentIncoming = trackedDirectCall ?? incomingCall;
    if (!currentIncoming) {
      clearIncomingCallTimers();
      return;
    }

    incomingCallTimeoutRef.current = setTimeout(() => {
      const latestTrackedCall =
        trackedDirectCallRef.current ?? incomingCallRef.current;
      if (latestTrackedCall?.callId === currentIncoming.callId) {
        console.log(
          '[LiveKitIncoming] auto-dismiss timeout fired for',
          currentIncoming.callId,
        );
        dismissTrackedDirectCall(currentIncoming.callId);
      }
    }, INCOMING_CALL_AUTO_DISMISS_MS);

    checkTrackedDirectCall();
    incomingCallPollRef.current = setInterval(
      checkTrackedDirectCall,
      INCOMING_CALL_POLL_INTERVAL_MS,
    );

    return () => {
      clearIncomingCallTimers();
    };
  }, [
    checkTrackedDirectCall,
    clearIncomingCallTimers,
    dismissTrackedDirectCall,
    incomingCall,
    trackedDirectCall,
  ]);

  useEffect(() => {
    if (!incomingGroupCall) return;
    incomingGroupCallPollRef.current = setInterval(() => {
      if (isPollingIncomingGroupRef.current) return;
      const current = incomingGroupCallRef.current;
      if (!current) return;
      isPollingIncomingGroupRef.current = true;
      groupRepository
        .getIncomingCall()
        .then(latest => {
          if (!latest || latest.callId !== current.callId) {
            dismissNativeIncomingCall(current.callId);
            setActiveIncomingGroupCall(null);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          isPollingIncomingGroupRef.current = false;
        });
    }, INCOMING_CALL_POLL_INTERVAL_MS);
    return () => {
      if (incomingGroupCallPollRef.current) {
        clearInterval(incomingGroupCallPollRef.current);
        incomingGroupCallPollRef.current = null;
      }
      isPollingIncomingGroupRef.current = false;
    };
  }, [
    dismissNativeIncomingCall,
    groupRepository,
    incomingGroupCall,
    setActiveIncomingGroupCall,
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
