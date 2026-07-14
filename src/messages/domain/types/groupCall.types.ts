// Description: Defines LiveKit group call domain types owned by the Messages context.
import type { LiveKitCallDirection } from './call.types';

export type GroupLiveKitCallType = 'video';

export type GroupLiveKitCallStatus = 'active' | 'ended' | 'unknown';

export type GroupLiveKitPeer = {
  id: string;
  name: string;
  avatar: string;
  username?: string;
};

export type GroupLiveKitGroup = {
  id: string;
  name: string;
  avatar: string;
};

export type GroupLiveKitParticipant = GroupLiveKitPeer & {
  joinedAt: number;
  isLocal?: boolean;
  isMicrophoneMuted?: boolean;
  isCameraMuted?: boolean;
};

export type GroupLiveKitCallSummary = {
  id: string;
  groupId: string;
  callType: GroupLiveKitCallType;
  provider: 'livekit';
  roomName: string;
  status: GroupLiveKitCallStatus;
  startedAt: number;
  startedAtMs: number;
  serverNow: number;
  serverNowMs: number;
  elapsedMs: number;
  participantCount: number;
};

export type GroupLiveKitCreateResult = {
  call: GroupLiveKitCallSummary;
  group: GroupLiveKitGroup;
  isExisting: boolean;
};

export type GroupLiveKitJoinPayload = {
  call: GroupLiveKitCallSummary;
  group: GroupLiveKitGroup;
  currentUser: GroupLiveKitPeer;
  wsUrl: string;
  token: string;
  participants: GroupLiveKitParticipant[];
  elapsedSeconds: number;
  elapsedMs: number;
};

export type GroupLiveKitSyncResult = {
  call: GroupLiveKitCallSummary;
  group: GroupLiveKitGroup;
  participants: GroupLiveKitParticipant[];
  elapsedSeconds: number;
  elapsedMs: number;
};

export type IncomingGroupLiveKitCall = {
  callId: string;
  groupId: string;
  callType: GroupLiveKitCallType;
  provider: 'livekit';
  roomName: string;
  group: GroupLiveKitGroup;
  caller: GroupLiveKitPeer;
  participantCount: number;
  actionToken?: string;
  expiresAt?: number;
  apiUrl?: string;
  ringMode?: 'fullscreen' | 'passive';
};

export type GroupLiveKitCallRouteParams = {
  groupId: string;
  callId?: string;
  direction: LiveKitCallDirection;
  groupName?: string;
  groupAvatar?: string;
};
