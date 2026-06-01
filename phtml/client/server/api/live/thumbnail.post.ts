// English description: Uploads a live thumbnail image through the legacy PHP create_thumb handler for the host studio route.

import { createError, readMultipartFormData } from "h3"
import { uploadLiveThumbnail } from "./_shared"

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event) ?? []
  let postId = 0
  let thumbnailFile: File | null = null

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      if (part.name === "thumbnailFile") {
        thumbnailFile = new File(
          [part.data],
          part.filename,
          { type: part.type || "image/jpeg" },
        )
      }
      continue
    }

    if (part.name === "postId") {
      postId = Number(part.data.toString().trim()) || 0
    }
  }

  if (postId <= 0 || !thumbnailFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "Live post ID and thumbnail file are required.",
    })
  }

  return await uploadLiveThumbnail(event, postId, thumbnailFile)
})
