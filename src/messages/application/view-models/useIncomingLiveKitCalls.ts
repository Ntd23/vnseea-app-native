// Description: Polls foreground incoming LiveKit calls for the Messages context.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  configureNativeCallService,
  displayNativeIncomingCall,
  getNativeCall,
  setNativeCallListeners,
} from '../../infrastructure/calls/nativeCallService';
import { createLiveKitCallRepository } from '../../infrastructure/repositories/ApiLiveKitCallRepository';

const INCOMING_POLL_INTERVAL_MS = 3_000;

export function useIncomingLiveKitCalls() {
  const activeCallIdRef = useRef('');

  useEffect(() => {
    const repository = createLiveKitCallRepository();
    configureNativeCallService().catch(() => undefined);

    const cleanupListeners = setNativeCallListeners({
      onAnswer(callUuid) {
        const nativeCall = getNativeCall(callUuid);
        if (!nativeCall?.callId || !navigationRef.isReady()) return;
        navigationRef.navigate(ROUTES.CALL_ROOM, {
          callId: nativeCall.callId,
          callType: nativeCall.callType,
          direction: 'incoming',
          peer: nativeCall.peer,
        });
      },
      onEnd(callUuid) {
        const nativeCall = getNativeCall(callUuid);
        if (!nativeCall?.callId) return;
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
      if (navigationRef.getCurrentRoute()?.name === ROUTES.CALL_ROOM) return;

      const incoming = await repository.getIncomingCall().catch(() => null);
      if (!incoming || incoming.callId === activeCallIdRef.current) return;

      activeCallIdRef.current = incoming.callId;
      if (Platform.OS === 'android' && navigationRef.isReady()) {
        navigationRef.navigate(ROUTES.CALL_ROOM, {
          callId: incoming.callId,
          callType: incoming.callType,
          direction: 'incoming',
          peer: incoming.peer,
        });
        return;
      }
      await displayNativeIncomingCall(incoming).catch(() => undefined);
    }, INCOMING_POLL_INTERVAL_MS);

    return () => {
      cleanupListeners();
      clearInterval(interval);
    };
  }, []);
}
