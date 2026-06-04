// Description: Defines LiveKit call domain types owned by the Messages context.
export type LiveKitCallType = 'audio' | 'video';

export type LiveKitCallDirection = 'incoming' | 'outgoing';

export type LiveKitCallStatus =
  | 'calling'
  | 'answered'
  | 'declined'
  | 'cancelled'
  | 'no_answer'
  | 'missed'
  | 'busy'
  | 'ended'
  | 'finished'
  | 'not_answered'
  | 'not_configured'
  | 'unknown';

export type LiveKitCallPeer = {
  id: string;
  name: string;
  avatar: string;
  username?: string;
};

export type LiveKitCallSummary = {
  id: string;
  type: LiveKitCallType;
  provider: 'livekit';
  roomName: string;
  sourceRoomName: string;
  status: LiveKitCallStatus;
  startedAt: number;
};

export type LiveKitJoinPayload = {
  call: LiveKitCallSummary;
  currentUser: LiveKitCallPeer;
  peer: LiveKitCallPeer;
  wsUrl: string;
  token: string;
};

export type LiveKitCallCreateResult = {
  callId: string;
  callType: LiveKitCallType;
  provider: 'livekit';
  roomName: string;
  status: LiveKitCallStatus;
  busy: boolean;
  peer?: LiveKitCallPeer;
};

export type LiveKitCallCheckResult = {
  callId: string;
  callType: LiveKitCallType;
  status: LiveKitCallStatus;
  active: boolean;
  finished: boolean;
};

export type IncomingLiveKitCall = {
  callId: string;
  callType: LiveKitCallType;
  provider: 'livekit';
  roomName: string;
  peer: LiveKitCallPeer;
};

export type LiveKitCallRouteParams = {
  callId?: string;
  recipientId?: string;
  callType: LiveKitCallType;
  direction: LiveKitCallDirection;
  peer?: LiveKitCallPeer;
};
