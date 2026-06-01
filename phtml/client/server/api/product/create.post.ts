// English description: Creates marketplace or personal feed products by forwarding multipart form data to the matching PHP API.

import { createError, getCookie, readMultipartFormData, type H3Event } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { assertBackendOk } from "./_shared"

type MultipartPart = {
  name?: string
  filename?: string
  type?: string
  data: Buffer
}

type PersonalProductPayload = {
  name: string
  price: string
  category: string
  description: string
  location: string
  type: string
  imageFile: {
    filename?: string
    type?: string
    data: Buffer
  } | null
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const getPartText = (part: MultipartPart) => Buffer.from(part.data).toString("utf8").trim()

const isPersonalFeedProductPayload = (parts: MultipartPart[]) => {
  let hasPersonalName = false
  let hasPersonalImage = false
  let hasMarketplaceTitle = false

  for (const part of parts) {
    if (part.name === "product_title") {
      hasMarketplaceTitle = true
    }

    if (part.name === "name" && !part.filename) {
      hasPersonalName = true
    }

    if (part.filename && (part.name === "postPhotos" || part.name === "postPhotos[]" || part.name === "imageFile")) {
      hasPersonalImage = true
    }
  }

  return !hasMarketplaceTitle && (hasPersonalName || hasPersonalImage)
}

const parsePersonalProductPayload = (parts: MultipartPart[]): PersonalProductPayload => {
  const payload: PersonalProductPayload = {
    name: "",
    price: "",
    category: "",
    description: "",
    location: "",
    type: "0",
    imageFile: null,
  }

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      if (part.name === "postPhotos" || part.name === "postPhotos[]" || part.name === "imageFile") {
        payload.imageFile = {
          filename: part.filename,
          type: part.type,
          data: part.data,
        }
      }

      continue
    }

    const value = getPartText(part)

    if (part.name === "name") payload.name = value
    if (part.name === "price") payload.price = value
    if (part.name === "category") payload.category = value
    if (part.name === "description") payload.description = value
    if (part.name === "location") payload.location = value
    if (part.name === "type") payload.type = value || "0"
  }

  return payload
}

const createPersonalFeedProduct = async (event: H3Event, parts: MultipartPart[]) => {
  const currentUser = await getBackendCurrentUser(event)
  const currentUserId = asString(currentUser.user_id)
  const currentUserHash = asString(currentUser.session_hash)
  const appSessionToken = asString(getCookie(event, "user_id"))
  const payload = parsePersonalProductPayload(parts)

  if (!currentUserId || !currentUserHash || !appSessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  if (!payload.name || !payload.category || !payload.description) {
    throw createError({
      statusCode: 400,
      statusMessage: "Product name, category, and description are required.",
    })
  }

  if (!payload.price || Number.isNaN(Number(payload.price)) || Number(payload.price) <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid numeric price greater than 0 is required.",
    })
  }

  if (!payload.imageFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one product image is required.",
    })
  }

  const requestBody = new FormData()
  requestBody.append("hash_id", currentUserHash)
  requestBody.append("name", payload.name)
  requestBody.append("price", payload.price)
  requestBody.append("currency", "0")
  requestBody.append("category", payload.category)
  requestBody.append("description", payload.description)
  requestBody.append("location", payload.location)
  requestBody.append("type", payload.type)
  requestBody.append("units", "1")
  requestBody.append(
    "postPhotos[]",
    new File([payload.imageFile.data], payload.imageFile.filename || "product-image.jpg", {
      type: payload.imageFile.type || "image/jpeg",
    }),
  )

  const client = createBackendWebClient(event)
  const backendResponse = await client.postForm<any>("products", requestBody, { s: "create" })

  if (backendResponse && (backendResponse.errors || backendResponse.status === 400 || backendResponse.api_status === "400")) {
    const errorText = backendResponse.errors?.error_text
      || (Array.isArray(backendResponse.errors) ? backendResponse.errors.join(", ") : "Unable to list product.")

    throw createError({
      statusCode: 400,
      statusMessage: errorText,
      data: { backendResponse },
    })
  }

  return {
    ok: true,
    status: 200,
    href: backendResponse?.href || "",
    message: "Product created successfully.",
  }
}

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const parts = await readMultipartFormData(event)

  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Product form data is required.",
    })
  }

  if (isPersonalFeedProductPayload(parts)) {
    return await createPersonalFeedProduct(event, parts)
  }

  const form = new FormData()

  for (const part of parts) {
    if (!part.name) continue

    if (part.filename) {
      form.append(part.name, new Blob([part.data], { type: part.type || "application/octet-stream" }), part.filename)
    }
    else {
      form.append(part.name, Buffer.from(part.data).toString("utf8"))
    }
  }

  const response = await client.post<{ api_status?: number | string; product_id?: number | string; product_post_id?: number | string; message?: string; errors?: { error_text?: string } }>("create-product", form)
  assertBackendOk(response)

  return {
    id: String(response.product_id || ""),
    postId: String(response.product_post_id || ""),
  }
})
