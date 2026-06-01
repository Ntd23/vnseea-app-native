// Description: Declares the frontend repository contract for one-to-one message call flows.

import type {
  MessageCallCreateResult,
  MessageCallSession,
  MessageCallType,
  MessageGroupCallResult,
  MessageGroupCallCandidate,
  MessageGroupCallPayload,
  MessageGroupCallSync,
  MessageIncomingCall,
  MessageIncomingGroupCall,
} from "../types/calls.types"

export interface MessageCallsRepository {
  createCall(input: {
    userId: number
    type: MessageCallType
  }): Promise<MessageCallCreateResult>
  getOutgoingStatus(input: {
    id: number
    type: MessageCallType
  }): Promise<{ status: number, url?: string, text?: string }>
  getSessionPayload(input: {
    id: number
    type: MessageCallType
  }): Promise<MessageCallSession>
  answerCall(input: {
    id: number
    type: MessageCallType
  }): Promise<MessageCallSession>
  declineCall(input: {
    id: number
    type: MessageCallType
  }): Promise<{ ok: boolean }>
  endCall(input: {
    id: number
    type: MessageCallType
    status: string
    duration?: number
    provider?: string
  }): Promise<{ ok: boolean }>
  getIncomingCall(type: MessageCallType): Promise<MessageIncomingCall | null>
  createGroupCall(input: {
    groupId: number
    type: MessageCallType
  }): Promise<MessageGroupCallResult>
  getIncomingGroupCall(): Promise<MessageIncomingGroupCall | null>
  joinGroupCall(input: {
    id: number
  }): Promise<MessageGroupCallResult>
  declineGroupCall(input: {
    id: number
  }): Promise<{ ok: boolean }>
  getGroupCallPayload(input: {
    id: number
  }): Promise<MessageGroupCallPayload>
  syncGroupCall(input: {
    id: number
  }): Promise<MessageGroupCallSync>
  leaveGroupCall(input: {
    id: number
  }): Promise<{ ok: boolean }>
  leaveGroupCallKeepalive(input: {
    id: number
    apiBase: string
  }): void
  getGroupCallCandidates(input: {
    id: number
    groupId: number
  }): Promise<MessageGroupCallCandidate[]>
  inviteGroupCallMembers(input: {
    id: number
    userIds: number[]
  }): Promise<{ ok: boolean, count: number }>
}
