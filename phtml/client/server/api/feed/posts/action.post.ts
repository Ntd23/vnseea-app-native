// English description: Proxies feed post actions and PHP-parity comment attachments to backend post handlers.

import { createError, getHeader, readBody, readMultipartFormData, type H3Event } from "h3"
import { isFeedStoryReaction } from "../../../../src/feed/domain/constants/story-reactions"
import { runPostAction } from "../_shared"

type MultipartFilePart = {
  filename?: string
  type?: string
  data: Buffer
}

type PostActionPayload = {
  action: string
  postId: number
  optionId: number
  reaction: string
  text: string
  imageFile: MultipartFilePart | null
  gifFile: MultipartFilePart | null
  audioFile: MultipartFilePart | null
}

const parseJsonPayload = async (event: H3Event): Promise<PostActionPayload> => {
  const body = await readBody<Record<string, unknown>>(event)

  return {
    action: String(body.action ?? "").trim(),
    postId: Number(body.postId ?? 0) || 0,
    optionId: Number(body.optionId ?? 0) || 0,
    reaction: typeof body.reaction === "string" ? body.reaction.trim() : "",
    text: typeof body.text === "string" ? body.text.trim() : "",
    imageFile: null,
    gifFile: null,
    audioFile: null,
  }
}

const parseMultipartPayload = async (event: H3Event): Promise<PostActionPayload> => {
  const parts = await readMultipartFormData(event) ?? []
  const payload: PostActionPayload = {
    action: "",
    postId: 0,
    optionId: 0,
    reaction: "",
    text: "",
    imageFile: null,
    gifFile: null,
    audioFile: null,
  }

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      const file = {
        filename: part.filename,
        type: part.type,
        data: part.data,
      }

      if (part.name === "commentImage") {
        payload.imageFile = file
      }
      else if (part.name === "commentGif") {
        payload.gifFile = file
      }
      else if (part.name === "commentAudio") {
        payload.audioFile = file
      }

      continue
    }

    const value = part.data.toString().trim()

    if (part.name === "action") payload.action = value
    if (part.name === "postId") payload.postId = Number(value) || 0
    if (part.name === "optionId") payload.optionId = Number(value) || 0
    if (part.name === "reaction") payload.reaction = value
    if (part.name === "text") payload.text = value
  }

  return payload
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""
  const payload = contentType.includes("multipart/form-data")
    ? await parseMultipartPayload(event)
    : await parseJsonPayload(event)
  const { action, postId, optionId, reaction, text } = payload

  if (!["like", "reaction", "comment", "save", "report", "unsave", "delete", "hide", "votePoll"].includes(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post action is invalid.",
    })
  }

  if (!postId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post id is required.",
    })
  }

  if (action === "votePoll" && !optionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Poll option id is required.",
    })
  }

  if (action === "comment" && !text && !payload.imageFile && !payload.gifFile && !payload.audioFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "Comment content is required.",
    })
  }

  if (action === "reaction" && reaction && !isFeedStoryReaction(reaction)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post reaction is invalid.",
    })
  }

  return await runPostAction(event, {
    action: action as "like" | "reaction" | "comment" | "save" | "report" | "unsave" | "delete" | "hide" | "votePoll",
    postId,
    optionId,
    reaction,
    text,
    imageFile: payload.imageFile,
    gifFile: payload.gifFile,
    audioFile: payload.audioFile,
  })
})
