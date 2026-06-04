// Description: Implements LiveKit call repository calls through the shared WoWonder API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import {
  mapIncomingLiveKitCall,
  mapLiveKitCheckResponse,
  mapLiveKitCreateResponse,
  mapLiveKitJoinPayload,
} from '../../application/mappers/liveKitCallMapper';
import type {
  CloseLiveKitCallInput,
  CreateLiveKitCallInput,
  LiveKitCallIdentityInput,
  LiveKitCallRepository,
} from '../../domain/repositories/LiveKitCallRepository';
import type {
  IncomingLiveKitCall,
  LiveKitCallCheckResult,
  LiveKitCallCreateResult,
  LiveKitCallType,
  LiveKitJoinPayload,
} from '../../domain/types/call.types';

type LiveKitApiEnvelope = Record<string, unknown> & {
  api_status: number | string;
};

class ApiLiveKitCallRepository implements LiveKitCallRepository {
  async createCall(
    input: CreateLiveKitCallInput,
  ): Promise<LiveKitCallCreateResult> {
    const response = await apiBridge.post<LiveKitApiEnvelope>(
      apiRoutes.messages.livekit,
      {
        type: 'create',
        recipient_id: input.recipientId,
        call_type: input.callType,
      },
    );
    return mapLiveKitCreateResponse(response);
  }

  async answerCall(
    input: LiveKitCallIdentityInput,
  ): Promise<LiveKitCallCheckResult> {
    const response = await apiBridge.post<LiveKitApiEnvelope>(
      apiRoutes.messages.livekit,
      {
        type: 'answer',
        call_id: input.callId,
        call_type: input.callType,
      },
    );
    return mapLiveKitCheckResponse(response);
  }

  async getJoinPayload(
    input: LiveKitCallIdentityInput,
  ): Promise<LiveKitJoinPayload> {
    const response = await apiBridge.post<LiveKitApiEnvelope>(
      apiRoutes.messages.livekit,
      {
        type: 'payload',
        call_id: input.callId,
        call_type: input.callType,
      },
    );
    return mapLiveKitJoinPayload(response);
  }

  async checkCall(
    input: LiveKitCallIdentityInput,
  ): Promise<LiveKitCallCheckResult> {
    const response = await apiBridge.post<LiveKitApiEnvelope>(
      apiRoutes.messages.livekit,
      {
        type: 'check',
        call_id: input.callId,
        call_type: input.callType,
      },
    );
    return mapLiveKitCheckResponse(response);
  }

  async closeCall(
    input: CloseLiveKitCallInput,
  ): Promise<LiveKitCallCheckResult> {
    const response = await apiBridge.post<LiveKitApiEnvelope>(
      apiRoutes.messages.livekit,
      {
        type: 'close',
        call_id: input.callId,
        call_type: input.callType,
        status: input.status,
        duration: input.duration,
      },
    );
    return mapLiveKitCheckResponse(response);
  }

  async getIncomingCall(
    callType?: LiveKitCallType,
  ): Promise<IncomingLiveKitCall | null> {
    const response = await apiBridge.post<LiveKitApiEnvelope>(
      apiRoutes.messages.livekit,
      {
        type: 'incoming',
        call_type: callType,
      },
    );
    return mapIncomingLiveKitCall(response);
  }
}

export function createLiveKitCallRepository(): LiveKitCallRepository {
  return new ApiLiveKitCallRepository();
}
