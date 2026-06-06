// Description: Polls foreground incoming LiveKit calls and exposes accept/decline actions for Messages.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { IncomingLiveKitCall } from '../../domain/types/call.types';
import type { IncomingGroupLiveKitCall } from '../../domain/types/groupCall.types';
import { useGroupLiveKitCallSession } from './useGroupLiveKitCallSession';
import { useLiveKitCallSession } from './useLiveKitCallSession';
import {
  configureNativeCallService,
  displayNativeIncomingGroupCall,
  displayNativeIncomingCall,
  getNativeCall,
  setNativeCallListeners,
} from '../../infrastructure/calls/nativeCallService';
import { createGroupLiveKitCallRepository } from '../../infrastructure/repositories/ApiGroupLiveKitCallRepository';
import { createLiveKitCallRepository } from '../../infrastructure/repositories/ApiLiveKitCallRepository';

const INCOMING_POLL_INTERVAL_MS = 3_000;

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

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call || !navigationRef.isReady()) return;

    setActiveIncomingCall(null);
    answerIncomingCall(call);
    navigationRef.navigate(ROUTES.CALL_ROOM, {
      callId: call.callId,
      callType: call.callType,
      direction: 'incoming',
      peer: call.peer,
    });
  }, [answerIncomingCall, setActiveIncomingCall]);

  const declineIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    setActiveIncomingCall(null);
    if (!call) return;

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

  useEffect(() => {
    configureNativeCallService().catch(() => undefined);

    const cleanupListeners = setNativeCallListeners({
      onAnswer(callUuid) {
        const nativeCall = getNativeCall(callUuid);
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
        answerIncomingCall({
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
        navigationRef.navigate(ROUTES.CALL_ROOM, {
          callId: nativeCall.callId,
          callType: nativeCall.callType,
          direction: 'incoming',
          peer: nativeCall.peer,
        });
      },
      onEnd(callUuid) {
        const nativeCall = getNativeCall(callUuid);
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
        repository
          .closeCall({
            callId: nativeCall.callId,
            callType: nativeCall.callType,
            status: 'declined',
            duration: 0,
          })
          .catch(() => undefined);
      },
    });

    const interval = setInterval(async () => {
      if (!sessionStorage.getAccessToken()) return;
      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (
        currentRoute === ROUTES.CALL_ROOM ||
        currentRoute === ROUTES.GROUP_CALL_ROOM
      ) {
        return;
      }

      const incoming = await repository.getIncomingCall().catch(() => null);
      if (incoming) {
        if (incoming.callId !== activeCallIdRef.current) {
          if (Platform.OS === 'android') {
            setActiveIncomingCall(incoming);
          } else {
            activeCallIdRef.current = incoming.callId;
            await displayNativeIncomingCall(incoming).catch(() => undefined);
          }
        }
      } else {
        if (incomingCallRef.current) {
          setActiveIncomingCall(null);
        }
      }

      const incomingGroup = await groupRepository
        .getIncomingCall()
        .catch(() => null);
      if (incomingGroup) {
        if (incomingGroup.callId !== activeGroupCallIdRef.current) {
          if (Platform.OS === 'android') {
            setActiveIncomingGroupCall(incomingGroup);
          } else {
            activeGroupCallIdRef.current = incomingGroup.callId;
            await displayNativeIncomingGroupCall(incomingGroup).catch(
              () => undefined,
            );
          }
        }
      } else {
        if (incomingGroupCallRef.current) {
          setActiveIncomingGroupCall(null);
        }
      }
    }, INCOMING_POLL_INTERVAL_MS);

    return () => {
      cleanupListeners();
      clearInterval(interval);
    };
  }, [
    answerIncomingCall,
    answerIncomingGroupCall,
    endCall,
    groupRepository,
    leaveCall,
    repository,
    setActiveIncomingCall,
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
