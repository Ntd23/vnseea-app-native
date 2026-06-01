// English description: Updates a marketplace product by forwarding editor fields to the PHP edit-product API.

import { getRouterParam, readBody } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import type { ProductEditorDraft } from "../../../src/product/domain/types/product-editor.types"
import { assertBackendOk } from "./_shared"

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const id = String(getRouterParam(event, "id") ?? "")
  const body = await readBody<ProductEditorDraft>(event)
  const fields = body.fields

  const response = await client.post<{ api_status?: number | string; message?: string; errors?: { error_text?: string } }>("edit-product", {
    product_id: id,
    product_title: fields.title,
    product_category: fields.category,
    product_description: fields.description,
    product_price: fields.price,
    product_location: fields.location,
    product_type: fields.condition === "used" ? "1" : "0",
    currency: fields.currency,
    units: fields.stock,
    deleted_images_ids: body.removedImageIds.join(","),
  })
  assertBackendOk(response)

  return {
    id,
  }
})
