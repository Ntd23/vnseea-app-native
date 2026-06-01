// English description: Creates a new backend-backed event, including optional cover upload, through the Nuxt server bridge.

import { createError, getHeader, readBody, readMultipartFormData } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { postBackendApiUpload } from "../../utils/backend-api-upload"
import { fetchEventDetail } from "./_shared"

type BackendCreateEventResponse = {
  api_status?: number | string
  event_id?: number | string
  data?: Record<string, unknown>
  errors?: {
    error_text?: string
  }
}

type CreateEventPayload = {
  name: string
  location: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  coverFile: {
    filename?: string
    type?: string
    data: Buffer
  } | null
}

const parseJsonPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<CreateEventPayload> => {
  const body = await readBody<Record<string, unknown>>(event)

  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    location: typeof body.location === "string" ? body.location.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    startDate: typeof body.startDate === "string" ? body.startDate.trim() : "",
    startTime: typeof body.startTime === "string" ? body.startTime.trim() : "",
    endDate: typeof body.endDate === "string" ? body.endDate.trim() : "",
    endTime: typeof body.endTime === "string" ? body.endTime.trim() : "",
    coverFile: null,
  }
}

const parseMultipartPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<CreateEventPayload> => {
  const parts = await readMultipartFormData(event) ?? []
  const payload: CreateEventPayload = {
    name: "",
    location: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    coverFile: null,
  }

  for (const part of parts) {
    if (!part.name) continue

    if (part.filename) {
      if (part.name === "coverFile" || part.name === "event_cover") {
        payload.coverFile = {
          filename: part.filename,
          type: part.type,
          data: part.data,
        }
      }

      continue
    }

    const value = part.data.toString().trim()

    if (part.name === "name") payload.name = value
    if (part.name === "location") payload.location = value
    if (part.name === "description") payload.description = value
    if (part.name === "startDate") payload.startDate = value
    if (part.name === "startTime") payload.startTime = value
    if (part.name === "endDate") payload.endDate = value
    if (part.name === "endTime") payload.endTime = value
  }

  return payload
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""
  const payload = contentType.includes("multipart/form-data")
    ? await parseMultipartPayload(event)
    : await parseJsonPayload(event)

  if (!payload.name || !payload.location || !payload.description || !payload.startDate || !payload.startTime || !payload.endDate || !payload.endTime) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event fields are required.",
    })
  }

  const formData = new FormData()
  formData.append("event_name", payload.name)
  formData.append("event_location", payload.location)
  formData.append("event_description", payload.description)
  formData.append("event_start_date", payload.startDate)
  formData.append("event_start_time", payload.startTime)
  formData.append("event_end_date", payload.endDate)
  formData.append("event_end_time", payload.endTime)

  if (payload.coverFile) {
    formData.append(
      "event_cover",
      new File(
        [payload.coverFile.data],
        payload.coverFile.filename || "event-cover.jpg",
        { type: payload.coverFile.type || "image/jpeg" },
      ),
    )
  }

  const response = assertBackendApiSuccess(
    await postBackendApiUpload<BackendCreateEventResponse>(
      event,
      "create-event",
      formData,
    ),
    "Unable to create event.",
  )

  const eventId = Number(response.event_id ?? response.data?.id ?? 0)

  if (!eventId) {
    throw createError({
      statusCode: 500,
      statusMessage: "Created event id is missing.",
      data: response,
    })
  }

  return await fetchEventDetail(event, eventId)
})
