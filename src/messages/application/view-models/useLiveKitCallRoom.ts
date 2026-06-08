// Description: Orchestrates outgoing and incoming LiveKit call room state for Messages screens.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestCallMediaPermissions } from '../../../shared-kernel/application/utils/microphonePermission';
import type {
  LiveKitCallRouteParams,
  LiveKitCallStatus,
  LiveKitJoinPayload,
} from '../../domain/types/call.types';
import {
  createNativeCallUuid,
  endNativeCall,
  markNativeCallConnected,
  startNativeOutgoingCall,
} from '../../infrastructure/calls/nativeCallService';
import { createLiveKitCallRepository } from '../../infrastructure/repositories/ApiLiveKitCallRepository';

type CallPhase =
  | 'initializing'
  | 'ringing'
  | 'answering'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';

type CloseReason = 'ended' | 'cancelled' | 'declined' | 'no_answer' | 'missed';
type CallIdentity = {
  callId: string;
  callType: LiveKitCallRouteParams['callType'];
};

const OUTGOING_RING_TIMEOUT_MS = 43_000;
const OUTGOING_POLL_INTERVAL_MS = 2_000;
const CONNECTED_POLL_INTERVAL_MS = 2_000;

export function useLiveKitCallRoom(params: LiveKitCallRouteParams) {
  const repository = useMemo(() => createLiveKitCallRepository(), []);
  const [callId, setCallId] = useState(params.callId ?? '');
  const [nativeCallUuid, setNativeCallUuid] = useState(
    params.callId ? createNativeCallUuid(params.callId, params.callType) : '',
  );
  const [phase, setPhase] = useState<CallPhase>('initializing');
  const [payload, setPayload] = useState<LiveKitJoinPayload | null>(null);
  const [error, setError] = useState('');
  const startedAtRef = useRef(0);
  const closeSentRef = useRef(false);

  const durationSeconds = useCallback(() => {
    if (!startedAtRef.current) return 0;
    return Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
  }, []);

  const ensureMediaPermission = useCallback(async () => {
    const isGranted = await requestCallMediaPermissions(params.callType);
    if (!isGranted) {
      throw new Error(
        params.callType === 'video'
          ? 'Bạn cần cấp quyền mic và camera để tham gia cuộc gọi.'
          : 'Bạn cần cấp quyền mic để tham gia cuộc gọi.',
      );
    }
  }, [params.callType]);

  const closeCall = useCallback(
    async (status: CloseReason = 'ended') => {
      if (!callId || closeSentRef.current) {
        endNativeCall(nativeCallUuid);
        setPhase('ended');
        return;
      }

      closeSentRef.current = true;
      await repository
        .closeCall({
          callId,
          callType: params.callType,
          status,
          duration: durationSeconds(),
        })
        .catch(() => undefined);
      endNativeCall(nativeCallUuid);
      setPhase('ended');
    },
    [callId, durationSeconds, nativeCallUuid, params.callType, repository],
  );

  const connectPayload = useCallback(
    async (identity: CallIdentity, callUuid: string) => {
      setPhase('connecting');
      const nextPayload = await repository.getJoinPayload(identity);
      setPayload(nextPayload);
      startedAtRef.current = Date.now();
      if (callUuid) markNativeCallConnected(callUuid);
      setPhase('connected');
    },
    [repository],
  );

  useEffect(() => {
    let isMounted = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function startOutgoingCall() {
      await ensureMediaPermission();
      if (!params.recipientId) {
        throw new Error('Thiếu người nhận cuộc gọi.');
      }

      const created = await repository.createCall({
        recipientId: params.recipientId,
        callType: params.callType,
      });
      if (!isMounted) return;

      if (created.busy) {
        setCallId(created.callId);
        setPhase('error');
        setError('Người nhận đang bận.');
        return;
      }

      const nextCallId = created.callId;
      if (!nextCallId || nextCallId === '0') {
        throw new Error('Không tạo được cuộc gọi.');
      }

      const nextUuid = createNativeCallUuid(nextCallId, params.callType);
      setCallId(nextCallId);
      setNativeCallUuid(nextUuid);
      setPhase('ringing');
      await startNativeOutgoingCall({
        callUuid: nextUuid,
        callType: params.callType,
        peer: params.peer ?? created.peer,
      });

      timeout = setTimeout(() => {
        repository
          .closeCall({
            callId: nextCallId,
            callType: params.callType,
            status: 'no_answer',
            duration: 0,
          })
          .catch(() => undefined);
        if (isMounted) {
          setError('Không có phản hồi.');
          setPhase('ended');
        }
      }, OUTGOING_RING_TIMEOUT_MS);

      interval = setInterval(async () => {
        const result = await repository.checkCall({
          callId: nextCallId,
          callType: params.callType,
        });
        if (!isMounted) return;
        if (result.status === 'answered' && result.active) {
          if (timeout) clearTimeout(timeout);
          if (interval) clearInterval(interval);
          await connectPayload(
            {
              callId: nextCallId,
              callType: params.callType,
            },
            nextUuid,
          );
        } else if (result.finished) {
          if (timeout) clearTimeout(timeout);
          if (interval) clearInterval(interval);
          setPhase('ended');
        }
      }, OUTGOING_POLL_INTERVAL_MS);
    }

    async function startIncomingCall() {
      await ensureMediaPermission();
      if (!params.callId) {
        throw new Error('Thiếu mã cuộc gọi đến.');
      }

      const nextUuid = createNativeCallUuid(params.callId, params.callType);
      setCallId(params.callId);
      setNativeCallUuid(nextUuid);
      setPhase('answering');
      await repository.answerCall({
        callId: params.callId,
        callType: params.callType,
      });
      if (!isMounted) return;
      await connectPayload(
        {
          callId: params.callId,
          callType: params.callType,
        },
        nextUuid,
      );
    }

    const boot =
      params.direction === 'outgoing' ? startOutgoingCall : startIncomingCall;
    boot().catch(caught => {
      if (!isMounted) return;
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể bắt đầu cuộc gọi.',
      );
      setPhase('error');
    });

    return () => {
      isMounted = false;
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [
    connectPayload,
    ensureMediaPermission,
    params.callId,
    params.callType,
    params.direction,
    params.peer,
    params.recipientId,
    repository,
  ]);

  useEffect(() => {
    if (phase !== 'connected' || !callId) return;

    const interval = setInterval(async () => {
      const result = await repository
        .checkCall({
          callId,
          callType: params.callType,
        })
        .catch(() => null);

      if (!result?.finished) return;

      closeSentRef.current = true;
      endNativeCall(nativeCallUuid);
      setPayload(null);
      setPhase('ended');
    }, CONNECTED_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [callId, nativeCallUuid, params.callType, phase, repository]);

  const statusText = useMemo(() => {
    const statusMap: Record<CallPhase, string> = {
      initializing: 'Đang chuẩn bị cuộc gọi...',
      ringing: 'Đang gọi...',
      answering: 'Đang trả lời...',
      connecting: '',
      connected: 'Đã kết nối',
      ended: 'Cuộc gọi đã kết thúc',
      error: error || 'Không thể thực hiện cuộc gọi.',
    };
    return statusMap[phase];
  }, [error, phase]);

  return {
    phase,
    payload,
    error,
    statusText,
    callId,
    nativeCallUuid,
    closeCall,
  };
}

export type { CallPhase, CloseReason, LiveKitCallStatus };
