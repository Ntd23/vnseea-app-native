// English description: Bridges the PHP multi_send message handler through Nuxt so the messages multi-recipient tab can use the same backend workflow as phtml.

import { createError, getHeader, readBody, readMultipartFormData, type H3Event } from "h3"
import type { MultiMessageSendResult } from "../../../src/messages/domain/types/messages.types"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendWebClient } from "../../utils/backend-web-client"

type MultipartFilePart = {
  filename?: string
  type?: string
  data: Buffer
}

type BackendMultiSendResponse = {
  status?: number | string
  sent?: number | string
  sent_ids?: Array<number | string>
  failed?: Array<number | string | Record<string, unknown>>
  failed_count?: number | string
  invalid_file?: number | string
  error?: string
  message?: string
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const normalizeRecipientIds = (value: unknown) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : value === undefined || value === null
        ? []
        : [value]

  return [...new Set(
    values
      .map(item => asNumber(item))
      .filter(item => item > 0),
  )]
}

const toNumberArray = (value: unknown) =>
  Array.isArray(value)
    ? value
      .map((item) => {
        if (typeof item === "object" && item) {
          const entity = item as Record<string, unknown>
          return asNumber(entity.id ?? entity.user_id ?? entity.recipient_id ?? entity.failed_id)
        }

        return asNumber(item)
      })
      .filter(item => item > 0)
    : []

const normalizeResponse = (response: BackendMultiSendResponse): MultiMessageSendResult => {
  const sentIds = toNumberArray(response.sent_ids)
  const failedIds = toNumberArray(response.failed)

  return {
    status: asNumber(response.status),
    sentCount: sentIds.length || asNumber(response.sent),
    failedCount: failedIds.length || asNumber(response.failed_count),
    sentIds,
    failedIds,
    invalidFile: asNumber(response.invalid_file) || undefined,
    error: asString(response.error || response.message),
  }
}

const parseMultipartBody = async (event: H3Event) => {
  const recipientIds: unknown[] = []
  let text = ""
  let recordFile = ""
  let recordName = ""
  let file: MultipartFilePart | null = null
  const parts = await readMultipartFormData(event) ?? []

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename && (part.name === "file" || part.name === "sendMessageFile")) {
      file = {
        filename: part.filename,
        type: part.type,
        data: part.data,
      }
      continue
    }

    if (part.name === "text") {
      text = part.data.toString().trim()
      continue
    }

    if (part.name === "recordFile") {
      recordFile = part.data.toString().trim()
      continue
    }

    if (part.name === "recordName") {
      recordName = part.data.toString().trim()
      continue
    }

    if (part.name === "recipientIds[]" || part.name === "recipientIds" || part.name === "recipients[]") {
      recipientIds.push(part.data.toString())
    }
  }

  return {
    text,
    recordFile,
    recordName,
    recipientIds: normalizeRecipientIds(recipientIds),
    file,
  }
}

const parseJsonBody = async (event: H3Event) => {
  const body = await readBody<Record<string, unknown>>(event)

  return {
    text: asString(body.text),
    recordFile: asString(body.recordFile),
    recordName: asString(body.recordName),
    recipientIds: normalizeRecipientIds(body.recipientIds ?? body["recipientIds[]"]),
    file: null as MultipartFilePart | null,
  }
}

const toBackendBody = (
  recipientIds: number[],
  text: string,
  sessionHash: string,
  file: MultipartFilePart | null,
  recordFile?: string,
  recordName?: string,
) => {
  if (!file) {
    const body = new URLSearchParams()

    body.append("textSendMessage", text)
    body.append("hash_id", sessionHash)
    if (recordFile) body.append("record-file", recordFile)
    if (recordName) body.append("record-name", recordName)

    for (const recipientId of recipientIds) {
      body.append("recipients[]", String(recipientId))
    }

    return body
  }

  const body = new FormData()

  body.append("textSendMessage", text)
  body.append("hash_id", sessionHash)

  for (const recipientId of recipientIds) {
    body.append("recipients[]", String(recipientId))
  }

  body.append(
    "sendMessageFile",
    new Blob([file.data], { type: file.type || "application/octet-stream" }),
    file.filename || "attachment",
  )

  return body
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""
  const payload = contentType.includes("multipart/form-data")
    ? await parseMultipartBody(event)
    : await parseJsonBody(event)

  if (payload.recipientIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one recipient is required.",
    })
  }

  if (!payload.text && !payload.file && !payload.recordFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "Message content, file, or recording is required.",
    })
  }

  const currentUser = await getBackendCurrentUser(event)
  const sessionHash = asString(currentUser.session_hash)

  if (!sessionHash) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  const client = createBackendWebClient(event)
  const response = await client.postForm<BackendMultiSendResponse, FormData | URLSearchParams>(
    "messages",
    toBackendBody(
      payload.recipientIds,
      payload.text,
      sessionHash,
      payload.file,
      payload.recordFile,
      payload.recordName,
    ),
    {
      s: "multi_send",
      hash: sessionHash,
    },
  )

  return normalizeResponse(response)
})
