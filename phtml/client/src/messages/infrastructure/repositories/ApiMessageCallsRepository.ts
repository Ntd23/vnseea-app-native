// Description: Implements message calls repository against Nuxt server API bridges.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { MessageCallsRepository } from "../../domain/repositories/MessageCallsRepository"
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
} from "../../domain/types/calls.types"

const createCallQuery = (input: { id: number, type: MessageCallType }) => ({
  id: input.id,
  type: input.type,
})

export function createApiMessageCallsRepository(): MessageCallsRepository {
  const client = useNuxtApiClient()

  return {
    async createCall(input) {
      return await client.post<MessageCallCreateResult, Record<string, unknown>>(
        apiRoutes.messages.calls.create,
        input,
      )
    },
    async getOutgoingStatus(input) {
      return await client.get<{ status: number, url?: string, text?: string }>(
        apiRoutes.messages.calls.status,
        createCallQuery(input),
      )
    },
    async getSessionPayload(input) {
      return await client.get<MessageCallSession>(
        apiRoutes.messages.calls.payload,
        createCallQuery(input),
      )
    },
    async answerCall(input) {
      return await client.post<MessageCallSession, Record<string, unknown>>(
        apiRoutes.messages.calls.answer,
        input,
      )
    },
    async declineCall(input) {
      return await client.post<{ ok: boolean }, Record<string, unknown>>(
        apiRoutes.messages.calls.decline,
        input,
      )
    },
    async endCall(input) {
      return await client.post<{ ok: boolean }, Record<string, unknown>>(
        apiRoutes.messages.calls.end,
        input,
      )
    },
    async getIncomingCall(type) {
      return await client.get<MessageIncomingCall | null>(
        apiRoutes.messages.calls.incoming,
        { type },
      )
    },
    async createGroupCall(input) {
      return await client.post<MessageGroupCallResult, Record<string, unknown>>(
        apiRoutes.messages.calls.groupCreate,
        input,
      )
    },
    async getIncomingGroupCall() {
      return await client.get<MessageIncomingGroupCall | null>(
        apiRoutes.messages.calls.groupIncoming,
      )
    },
    async joinGroupCall(input) {
      return await client.post<MessageGroupCallResult, Record<string, unknown>>(
        apiRoutes.messages.calls.groupJoin,
        input,
      )
    },
    async declineGroupCall(input) {
      return await client.post<{ ok: boolean }, Record<string, unknown>>(
        apiRoutes.messages.calls.groupDecline,
        input,
      )
    },
    async getGroupCallPayload(input) {
      return await client.get<MessageGroupCallPayload>(
        apiRoutes.messages.calls.groupPayload,
        { id: input.id },
      )
    },
    async syncGroupCall(input) {
      return await client.get<MessageGroupCallSync>(
        apiRoutes.messages.calls.groupSync,
        { id: input.id },
      )
    },
    async leaveGroupCall(input) {
      return await client.post<{ ok: boolean }, Record<string, unknown>>(
        apiRoutes.messages.calls.groupLeave,
        input,
      )
    },
    leaveGroupCallKeepalive(input) {
      if (!import.meta.client) {
        return
      }

      const apiBase = input.apiBase.replace(/\/+$/, "")

      void fetch(`${apiBase}/messages/calls/group/leave`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({ id: input.id }),
      }).catch(() => null)
    },
    async getGroupCallCandidates(input) {
      const response = await client.get<{ items: MessageGroupCallCandidate[] }>(
        apiRoutes.messages.calls.groupCandidates,
        { id: input.id, groupId: input.groupId },
      )
      return response.items ?? []
    },
    async inviteGroupCallMembers(input) {
      return await client.post<{ ok: boolean, count: number }, Record<string, unknown>>(
        apiRoutes.messages.calls.groupInvite,
        input,
      )
    },
  }
}
