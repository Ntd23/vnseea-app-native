// English description: Creates a new story through the backend API v2 create-story endpoint.

import { createError, getHeader, readMultipartFormData } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { postBackendApiUpload } from "../../../utils/backend-api-upload"
import { fetchLatestOwnStory } from "../_shared"

type BackendCreateStoryResponse = {
  api_status?: number | string
  story_id?: number | string
  errors?: {
    error_text?: string
  }
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""

  if (!contentType.includes("multipart/form-data")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Story upload must use multipart form data.",
    })
  }

  const parts = await readMultipartFormData(event) ?? []
  const payload = new FormData()
  let fileAttached = false

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename && part.name === "file") {
      payload.append(
        "file",
        new Blob([part.data], { type: part.type || "application/octet-stream" }),
        part.filename,
      )
      fileAttached = true
      continue
    }

    const value = part.data.toString().trim()

    if (!value) {
      continue
    }

    if (part.name === "fileType") {
      payload.append("file_type", value)
      continue
    }

    if (part.name === "title") {
      payload.append("story_title", value)
      continue
    }

    if (part.name === "description") {
      payload.append("story_description", value)
    }
  }

  if (!fileAttached) {
    throw createError({
      statusCode: 400,
      statusMessage: "Story file is required.",
    })
  }

  const response = assertBackendApiSuccess(
    await postBackendApiUpload<BackendCreateStoryResponse>(
      event,
      "create-story",
      payload,
    ),
    "Unable to create story.",
  )

  const story = await fetchLatestOwnStory(event).catch(() => null)

  return {
    ok: true,
    storyId: Number(response.story_id ?? 0) || undefined,
    story,
  }
})
