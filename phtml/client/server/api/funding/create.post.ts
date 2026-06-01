// English description: Bridges funding campaign creation to the backend funding create API with uploaded image data.

import { createError, readMultipartFormData } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"

type BackendCreateFundingResponse = {
  api_status?: number | string
  data?: unknown
  errors?: {
    error_text?: string
  }
}

const fieldValue = (parts: Awaited<ReturnType<typeof readMultipartFormData>>, name: string) =>
  parts?.find(part => part.name === name && !part.filename)?.data.toString("utf8").trim() ?? ""

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const image = parts?.find(part => part.name === "image" && part.filename)
  const title = fieldValue(parts, "title")
  const description = fieldValue(parts, "description")
  const amount = fieldValue(parts, "amount")

  if (!title || !description || !amount || !image?.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Title, description, amount, and image are required.",
    })
  }

  const form = new FormData()
  form.append("type", "create")
  form.append("title", title)
  form.append("description", description)
  form.append("amount", amount)
  form.append(
    "image",
    new Blob([image.data], { type: image.type || "application/octet-stream" }),
    image.filename || "funding-image",
  )

  const response = await createBackendApiClient(event).post<BackendCreateFundingResponse>("funding", form)
  assertBackendApiSuccess(response, "Unable to create funding campaign.")

  return { ok: true, data: response.data ?? null }
})
