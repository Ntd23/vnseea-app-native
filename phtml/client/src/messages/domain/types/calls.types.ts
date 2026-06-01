// Description: Types for one-to-one message calls backed by the PHP call tables and LiveKit.
export type MessageCallType = "audio" | "video"
export type MessageCallDirection = "incoming" | "outgoing"
export type MessageCallStatus = "idle" | "ringing" | "connecting" | "active" | "ended" | "busy" | "declined" | "no_answer" | "error"

export type MessageCallPeer = {
  id: number
  name: string
  avatar?: string
}

export type MessageCallSession = {
  id: number
  type: MessageCallType
  direction: MessageCallDirection
  provider: "livekit"
  roomName: string
  wsUrl: string
  token: string
  currentUser: MessageCallPeer
  peer: MessageCallPeer
}

export type MessageIncomingCall = {
  id: number
  type: MessageCallType
  peer: MessageCallPeer
}

export type MessageCallCreateResult = {
  status: number
  id: number
  type: MessageCallType
  provider?: string
  busy?: boolean
  message?: string
}

export type MessageGroupCallResult = {
  status: number
  id: number
  groupId: number
  type: MessageCallType
  url: string
  groupName: string
  participantCount: number
  isExisting?: boolean
}

export type MessageIncomingGroupCall = {
  id: number
  groupId: number
  type: MessageCallType
  url: string
  groupName: string
  avatar?: string
}

export type MessageCallLogAction = {
  type: MessageCallType
  action: "start" | "join"
  callId?: number
  groupId?: number
}

export type MessageGroupCallParticipant = {
  userId: number
  name: string
  username?: string
  avatar?: string
  joinedAt?: number
}

export type MessageGroupCallCandidate = {
  userId: number
  name: string
  username?: string
  avatar?: string
}

export type MessageGroupCallPayload = {
  status: number
  id: number
  groupId: number
  type: MessageCallType
  roomName: string
  wsUrl: string
  token: string
  livekitConfigured: boolean
  startedAt: number
  serverNow: number
  participantCount: number
  groupName: string
  groupAvatar?: string
  currentUser: MessageCallPeer
  participants: MessageGroupCallParticipant[]
}

export type MessageGroupCallSync = {
  status: number
  id: number
  groupId: number
  type: MessageCallType
  callStatus: string
  participantCount: number
  groupName: string
  groupAvatar?: string
  participants: MessageGroupCallParticipant[]
}
