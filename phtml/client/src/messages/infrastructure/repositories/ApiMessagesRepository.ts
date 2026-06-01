// Description: Implements the messages repository against Nuxt server API bridges for inbox, sending, recording, typing, and realtime auth.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"
import type { MessagesRepository } from "../../domain/repositories/MessagesRepository"
import type {
  MessageActionResult,
  MessageContact,
  MessageGroupCandidate,
  MessageGroupCreateCandidate,
  MessageCreateGroupResult,
  MessageGroupDetails,
  MessageItem,
  MessageRealtimeToken,
  MessageTypingState,
  MessageSendDraft,
  MessageTagsPayload,
  MessageThread,
  MultiMessageSendResult,
  UploadedMessageRecord,
} from "../../domain/types/messages.types"

const MESSAGES_API = {
  createGroup: apiRoutes.messages.groupCreate,
  updateGroup: apiRoutes.messages.groupUpdate,
  deleteConversation: "messages/delete",
  markAllAsRead: "messages/read",
  presence: apiRoutes.messages.presence,
  tags: "messages/tags",
} as const

const createThreadQuery = (contact: MessageContact, beforeId?: number) => ({
  type: contact.type,
  userId: contact.userId,
  groupId: contact.groupId,
  pageId: contact.pageId,
  recipientId: contact.recipientId,
  beforeId,
})

const normalizeRecipientIds = (recipientIds: number[]) =>
  [...new Set(
    recipientIds
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0),
  )]

const createRecordPayload = (record?: UploadedMessageRecord | null) => ({
  recordFile: record?.url || "",
  recordName: record?.name || "",
})

const createMultiSendBody = (input: {
  recipientIds: number[]
  text: string
  file?: File | null
  record?: UploadedMessageRecord | null
}) => {
  const recipientIds = normalizeRecipientIds(input.recipientIds)

  if (input.file) {
    const formData = new FormData()

    formData.append("text", input.text)

    for (const recipientId of recipientIds) {
      formData.append("recipientIds[]", String(recipientId))
    }

    if (input.record?.url) formData.append("recordFile", input.record.url)
    if (input.record?.name) formData.append("recordName", input.record.name)
    formData.append("file", input.file, input.file.name)

    return formData
  }

  return {
    recipientIds,
    text: input.text,
    ...createRecordPayload(input.record),
  }
}

const createSingleSendBody = (
  contact: MessageContact,
  input: MessageSendDraft,
) => {
  const thread = createThreadQuery(contact)
  const text = input.text.trim()

  if (input.file) {
    const formData = new FormData()

    formData.append("type", String(thread.type))
    formData.append("text", text)

    if (thread.userId) formData.append("userId", String(thread.userId))
    if (thread.groupId) formData.append("groupId", String(thread.groupId))
    if (thread.pageId) formData.append("pageId", String(thread.pageId))
    if (thread.recipientId) formData.append("recipientId", String(thread.recipientId))

    if (input.record?.url) formData.append("recordFile", input.record.url)
    if (input.record?.name) formData.append("recordName", input.record.name)
    formData.append("file", input.file, input.file.name)

    return formData
  }

  return {
    ...thread,
    text,
    ...createRecordPayload(input.record),
  }
}

export function createApiMessagesRepository(): MessagesRepository {
  const client = useNuxtApiClient()

  return {
    async getInbox() {
      return await client.get<MessageContact[]>(apiRoutes.messages.conversations)
    },
    async getTags() {
      return await client.get<MessageTagsPayload>(apiRoutes.messages.tags)
    },
    async getThread(contact: MessageContact, options?: { beforeId?: number }) {
      return await client.get<MessageThread>(
        apiRoutes.messages.thread,
        createThreadQuery(contact, options?.beforeId),
      )
    },
    async sendMessage(contact: MessageContact, input: MessageSendDraft) {
      return await client.post<MessageItem[], FormData | Record<string, unknown>>(
        apiRoutes.messages.send,
        createSingleSendBody(contact, input),
      )
    },
    async reactToMessage(input) {
      return await client.post<MessageActionResult & { messageId: number, reaction: FeedStoryReactionType }, Record<string, unknown>>(
        apiRoutes.messages.reactions,
        input,
      )
    },
    async deleteMessage(input) {
      return await client.post<MessageActionResult & {
        messageId: number
        deletedAt: number
        deletedTime: string
        deletedByName?: string
      }, Record<string, unknown>>(
        apiRoutes.messages.deleteMessage,
        input,
      )
    },
    async sendMultiMessage(input) {
      return await client.post<MultiMessageSendResult, FormData | Record<string, unknown>>(
        apiRoutes.messages.multi,
        createMultiSendBody(input),
      )
    },
    async uploadRecord(blob, filename, options) {
      const formData = new FormData()
      const mimeType = options?.mimeType || blob.type || "audio/webm"

      formData.append(
        "audioBlob",
        blob instanceof File ? blob : new File([blob], filename, { type: mimeType }),
        filename,
      )
      formData.append("audioFilename", filename)
      formData.append("mimeType", mimeType)

      if (Number.isFinite(options?.durationMs)) {
        formData.append("durationMs", String(options?.durationMs))
      }

      return await client.post<UploadedMessageRecord, FormData>(
        apiRoutes.messages.recordUpload,
        formData,
      )
    },
    async setTyping(userId) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        apiRoutes.messages.typing,
        {
          action: "start",
          userId,
        },
      )
    },
    async clearTyping(userId) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        apiRoutes.messages.typing,
        {
          action: "stop",
          userId,
        },
      )
    },
    async getTyping(userId) {
      return await client.post<MessageTypingState, Record<string, unknown>>(
        apiRoutes.messages.typing,
        {
          action: "status",
          userId,
        },
      )
    },
    async setGroupTyping(groupId) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        apiRoutes.messages.groupTyping,
        {
          action: "start",
          groupId,
        },
      )
    },
    async clearGroupTyping(groupId) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        apiRoutes.messages.groupTyping,
        {
          action: "stop",
          groupId,
        },
      )
    },
    async getGroupTyping(groupId) {
      return await client.post<MessageTypingState, Record<string, unknown>>(
        apiRoutes.messages.groupTyping,
        {
          action: "status",
          groupId,
        },
      )
    },
    async getRealtimeToken() {
      return await client.get<MessageRealtimeToken>("realtime/token")
    },
    async createTagLabel(input) {
      return await client.post<MessageActionResult, Record<string, unknown>>(MESSAGES_API.tags, {
        action: "create",
        name: input.name,
        color: input.color,
      })
    },
    async deleteTagLabel(input) {
      return await client.post<MessageActionResult, Record<string, unknown>>(MESSAGES_API.tags, {
        action: "delete",
        tagId: input.tagId,
      })
    },
    async attachTag(input) {
      return await client.post<MessageActionResult, Record<string, unknown>>(MESSAGES_API.tags, {
        action: "attach",
        userId: input.userId,
        tagId: input.tagId,
      })
    },
    async detachTag(input) {
      return await client.post<MessageActionResult, Record<string, unknown>>(MESSAGES_API.tags, {
        action: "detach",
        userId: input.userId,
        tagId: input.tagId,
      })
    },
    async markAllAsRead() {
      return await client.post<MessageActionResult>(MESSAGES_API.markAllAsRead)
    },
    async markPresenceOnline() {
      return await client.post<MessageActionResult>(MESSAGES_API.presence)
    },
    async deleteConversation(contact) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        MESSAGES_API.deleteConversation,
        createThreadQuery(contact),
      )
    },
    async getGroupDetails(groupId) {
      return await client.get<MessageGroupDetails>(
        apiRoutes.messages.groupDetails,
        { groupId },
      )
    },
    async searchCreateGroupParticipants(query) {
      return await client.get<MessageGroupCreateCandidate[]>(
        apiRoutes.messages.groupParticipants,
        { query },
      )
    },
    async searchGroupCandidates(groupId, query) {
      return await client.get<MessageGroupCandidate[]>(
        apiRoutes.messages.groupCandidates,
        { groupId, query },
      )
    },
    async addGroupMembers(groupId, userIds) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        apiRoutes.messages.groupMembers,
        {
          action: "add",
          groupId,
          userIds: normalizeRecipientIds(userIds),
        },
      )
    },
    async removeGroupMember(groupId, userId) {
      return await client.post<MessageActionResult, Record<string, unknown>>(
        apiRoutes.messages.groupMembers,
        {
          action: "remove",
          groupId,
          userId,
        },
      )
    },
    async createGroup(input) {
      const recipientIds = normalizeRecipientIds(input.recipientIds)

      if (input.avatar) {
        const formData = new FormData()

        formData.append("name", input.name)

        for (const recipientId of recipientIds) {
          formData.append("recipientIds[]", String(recipientId))
        }

        formData.append("avatar", input.avatar, input.avatar.name)

        return await client.post<MessageCreateGroupResult, FormData>(
          MESSAGES_API.createGroup,
          formData,
        )
      }

      return await client.post<MessageCreateGroupResult, Record<string, unknown>>(
        MESSAGES_API.createGroup,
        {
          name: input.name,
          recipientIds,
        },
      )
    },
    async updateGroup(input) {
      const name = input.name?.trim() || ""

      if (input.avatar) {
        const formData = new FormData()

        formData.append("groupId", String(input.groupId))

        if (name) {
          formData.append("name", name)
        }

        formData.append("avatar", input.avatar, input.avatar.name)

        return await client.post<MessageActionResult, FormData>(
          MESSAGES_API.updateGroup,
          formData,
        )
      }

      return await client.post<MessageActionResult, Record<string, unknown>>(
        MESSAGES_API.updateGroup,
        {
          groupId: input.groupId,
          name,
        },
      )
    },
  }
}
