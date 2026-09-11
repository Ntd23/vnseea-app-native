// Description: Declares the Messages context repository contract for LiveKit group calls.
import type {
  GroupLiveKitCreateResult,
  GroupLiveKitJoinPayload,
  GroupLiveKitParticipant,
  GroupLiveKitSyncResult,
  IncomingGroupLiveKitCall,
} from '../types/groupCall.types';
import type {
  LiveKitCallProgress,
  LiveKitCallProgressState,
} from '../types/call.types';

export type CreateGroupLiveKitCallInput = {
  groupId: string;
};

export type GroupLiveKitCallIdentityInput = {
  callId: string;
};

export type ReportGroupLiveKitCallProgressInput =
  GroupLiveKitCallIdentityInput & {
    progress: Exclude<LiveKitCallProgressState, 'dispatching' | 'answered'>;
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
  reportProgress(
    input: ReportGroupLiveKitCallProgressInput,
  ): Promise<LiveKitCallProgress>;
  getIncomingCall(): Promise<IncomingGroupLiveKitCall | null>;
  declineCall(input: GroupLiveKitCallIdentityInput): Promise<void>;
  getCandidates(
    input: GroupLiveKitCallIdentityInput & { groupId: string },
  ): Promise<GroupLiveKitParticipant[]>;
  addMembers(input: AddGroupLiveKitMembersInput): Promise<string[]>;
}
