// English description: Uploads an audio recording through the legacy PHP messages handler and returns a normalized recording payload.

import { createError, getHeader, readMultipartFormData } from "h3"
import { uploadMessageRecord } from "../_shared"

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""

  if (!contentType.includes("multipart/form-data")) {
    throw createError({
      statusCode: 400,
      statusMessage: "A multipart recording upload is required.",
    })
  }

  const parts = await readMultipartFormData(event) ?? []
  let filePart: { filename?: string, type?: string, data: Buffer } | null = null
  let fileName = ""
  let mimeType = ""
  let durationMs = 0

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename && part.name === "audioBlob") {
      filePart = {
        filename: part.filename,
        type: part.type,
        data: part.data,
      }
      continue
    }

    if (part.name === "audioFilename") {
      fileName = part.data.toString().trim()
      continue
    }

    if (part.name === "mimeType") {
      mimeType = part.data.toString().trim()
      continue
    }

    if (part.name === "durationMs") {
      durationMs = Number(part.data.toString()) || 0
    }
  }

  if (!filePart) {
    throw createError({
      statusCode: 400,
      statusMessage: "The recording file is missing.",
    })
  }

  const uploadedRecord = await uploadMessageRecord(event, {
    file: {
      ...filePart,
      type: mimeType || filePart.type,
    },
    fileName: fileName || filePart.filename,
  })

  return {
    ...uploadedRecord,
    mimeType: mimeType || uploadedRecord.mimeType,
    durationMs,
  }
})
