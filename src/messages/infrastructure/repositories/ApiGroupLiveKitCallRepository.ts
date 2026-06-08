// Description: Implements LiveKit group call repository calls through the shared WoWonder API bridge.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import {
  mapAddedGroupLiveKitMembers,
  mapGroupLiveKitCandidates,
  mapGroupLiveKitCreateResponse,
  mapGroupLiveKitJoinPayload,
  mapGroupLiveKitSyncResponse,
  mapIncomingGroupLiveKitCall,
} from '../../application/mappers/groupLiveKitCallMapper';
import type {
  AddGroupLiveKitMembersInput,
  CreateGroupLiveKitCallInput,
  GroupLiveKitCallIdentityInput,
  GroupLiveKitCallRepository,
} from '../../domain/repositories/GroupLiveKitCallRepository';
import type {
  GroupLiveKitCreateResult,
  GroupLiveKitJoinPayload,
  GroupLiveKitParticipant,
  GroupLiveKitSyncResult,
  IncomingGroupLiveKitCall,
} from '../../domain/types/groupCall.types';

type GroupCallApiEnvelope = Record<string, unknown> & {
  api_status: number | string;
};

class ApiGroupLiveKitCallRepository implements GroupLiveKitCallRepository {
  async createCall(
    input: CreateGroupLiveKitCallInput,
  ): Promise<GroupLiveKitCreateResult> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'create',
        group_id: input.groupId,
        call_type: input.callType,
      },
    );
    return mapGroupLiveKitCreateResponse(response);
  }

  async getJoinPayload(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitJoinPayload> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'payload',
        call_id: input.callId,
      },
    );
    return mapGroupLiveKitJoinPayload(response);
  }

  async joinCall(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitSyncResult> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'join',
        call_id: input.callId,
      },
    );
    return mapGroupLiveKitSyncResponse(response);
  }

  async leaveCall(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitSyncResult> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'leave',
        call_id: input.callId,
      },
    );
    return mapGroupLiveKitSyncResponse(response);
  }

  async syncCall(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitSyncResult> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'sync',
        call_id: input.callId,
      },
    );
    return mapGroupLiveKitSyncResponse(response);
  }

  async getIncomingCall(): Promise<IncomingGroupLiveKitCall | null> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'incoming',
      },
    );
    return mapIncomingGroupLiveKitCall(response);
  }

  async declineCall(input: GroupLiveKitCallIdentityInput): Promise<void> {
    await apiBridge.post<GroupCallApiEnvelope>(apiRoutes.messages.groupCall, {
      type: 'decline',
      call_id: input.callId,
    });
  }

  async getCandidates(
    input: GroupLiveKitCallIdentityInput & { groupId: string },
  ): Promise<GroupLiveKitParticipant[]> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'candidates',
        call_id: input.callId,
        group_id: input.groupId,
      },
    );
    return mapGroupLiveKitCandidates(response);
  }

  async addMembers(input: AddGroupLiveKitMembersInput): Promise<string[]> {
    const response = await apiBridge.post<GroupCallApiEnvelope>(
      apiRoutes.messages.groupCall,
      {
        type: 'add_members',
        call_id: input.callId,
        group_id: input.groupId,
        user_ids: input.userIds.join(','),
      },
    );
    return mapAddedGroupLiveKitMembers(response);
  }
}

export function createGroupLiveKitCallRepository(): GroupLiveKitCallRepository {
  return new ApiGroupLiveKitCallRepository();
}
