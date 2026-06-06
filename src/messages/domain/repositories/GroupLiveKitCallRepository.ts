// Description: Declares the Messages context repository contract for LiveKit group calls.
import type { LiveKitCallType } from '../types/call.types';
import type {
  GroupLiveKitCreateResult,
  GroupLiveKitJoinPayload,
  GroupLiveKitParticipant,
  GroupLiveKitSyncResult,
  IncomingGroupLiveKitCall,
} from '../types/groupCall.types';

export type CreateGroupLiveKitCallInput = {
  groupId: string;
  callType: LiveKitCallType;
};

export type GroupLiveKitCallIdentityInput = {
  callId: string;
};

export type AddGroupLiveKitMembersInput = GroupLiveKitCallIdentityInput & {
  groupId: string;
  userIds: string[];
};

export interface GroupLiveKitCallRepository {
  createCall(
    input: CreateGroupLiveKitCallInput,
  ): Promise<GroupLiveKitCreateResult>;
  getJoinPayload(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitJoinPayload>;
  joinCall(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitSyncResult>;
  leaveCall(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitSyncResult>;
  syncCall(
    input: GroupLiveKitCallIdentityInput,
  ): Promise<GroupLiveKitSyncResult>;
  getIncomingCall(): Promise<IncomingGroupLiveKitCall | null>;
  declineCall(input: GroupLiveKitCallIdentityInput): Promise<void>;
  getCandidates(
    input: GroupLiveKitCallIdentityInput & { groupId: string },
  ): Promise<GroupLiveKitParticipant[]>;
  addMembers(input: AddGroupLiveKitMembersInput): Promise<string[]>;
}
