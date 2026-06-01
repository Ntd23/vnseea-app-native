// English description: Deletes a marketplace product through the same PHP requests.php handler as Wowonder.

import { createError, getRouterParam } from "h3"
import { createBackendWebClient } from "../../utils/backend-web-client"

type BackendDeleteProductResponse = {
  status?: number | string
  message?: string
}

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, "id") ?? "")

  if (!id || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 422,
      statusMessage: "Invalid product id.",
    })
  }

  const client = createBackendWebClient(event)
  const response = await client.postForm<BackendDeleteProductResponse>(
    "products",
    { id },
    { s: "delete" },
  )
  const status = Number(response.status ?? 0)

  if (status !== 200) {
    throw createError({
      statusCode: status >= 400 ? status : 400,
      statusMessage: stripHtml(response.message || "Unable to delete product."),
      data: response,
    })
  }

  return {
    success: true,
  }
})
