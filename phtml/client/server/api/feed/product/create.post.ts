// English description: Proxies product creation requests from the Nuxt client feed publisher box to the legacy WoWonder PHP api/phone/new_product.php endpoint.

import { createError, getCookie, getHeader, readMultipartFormData } from "h3"
import { getBackendCurrentUser } from "../../../utils/backend-current-user"
import { postBackendApiUpload } from "../../../utils/backend-api-upload"

type CreateProductPayload = {
  name: string
  price: string
  category: string
  description: string
  location: string
  type: string // "0" for New, "1" for Used
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

const parseMultipartPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<CreateProductPayload> => {
  const parts = await readMultipartFormData(event) ?? []
  const payload: CreateProductPayload = {
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
      const file = {
        filename: part.filename,
        type: part.type,
        data: part.data,
      }

      if (part.name === "postPhotos" || part.name === "postPhotos[]" || part.name === "imageFile") {
        payload.imageFile = file
      }

      continue
    }

    const value = part.data.toString().trim()

    if (part.name === "name") payload.name = value
    if (part.name === "price") payload.price = value
    if (part.name === "category") payload.category = value
    if (part.name === "description") payload.description = value
    if (part.name === "location") payload.location = value
    if (part.name === "type") payload.type = value || "0"
  }

  return payload
}

export default defineEventHandler(async (event) => {
  const currentUser = await getBackendCurrentUser(event)
  const currentUserId = asString(currentUser.user_id)
  const appSessionToken = asString(getCookie(event, "user_id"))

  if (!currentUserId || !appSessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  const payload = await parseMultipartPayload(event)

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

  // Build multipart form data body for PHP backend upload
  const requestBody = new FormData()
  requestBody.append("user_id", currentUserId)
  requestBody.append("s", appSessionToken)
  requestBody.append("name", payload.name)
  requestBody.append("price", payload.price)
  requestBody.append("category", payload.category)
  requestBody.append("description", payload.description)
  requestBody.append("location", payload.location)
  requestBody.append("type", payload.type)
  requestBody.append("active", "1")

  requestBody.append(
    "postPhotos",
    new File([payload.imageFile.data], payload.imageFile.filename || "product-image.jpg", {
      type: payload.imageFile.type || "image/jpeg",
    }),
  )

  const backendResponse = await postBackendApiUpload<any>(
    event,
    "phone/new_product",
    requestBody,
    { type: "new_product" }
  )

  if (backendResponse && (backendResponse.errors || backendResponse.api_status === "400")) {
    const errorText = backendResponse.errors?.error_text || 
      (Array.isArray(backendResponse.errors) ? backendResponse.errors.join(", ") : "Unable to list product.")
    
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
})
