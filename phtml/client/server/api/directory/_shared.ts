// English description: Maps backend PHP directory destinations into the directory bounded-context catalog shape.

import { type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import type { DirectoryCatalog, DirectoryDestination } from "../../../src/directory/domain/types/directory.types"

type BackendEntity = Record<string, unknown>

type BackendDirectoryResponse = {
  api_status?: number | string
  title?: string
  description?: string
  items?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

const mapItem = (item: BackendEntity): DirectoryDestination => ({
  key: asString(item.key),
  label: asString(item.label),
  description: asString(item.description),
  href: asString(item.href),
  icon: asString(item.icon) || "i-ph-squares-four-duotone",
})

export async function fetchDirectoryCatalog(event: H3Event): Promise<DirectoryCatalog> {
  const response = await createBackendApiClient(event).get<BackendDirectoryResponse>("directory")
  const data = assertBackendApiSuccess(response, "Unable to load directory.")

  return {
    title: asString(data.title),
    description: asString(data.description),
    items: (data.items ?? []).map(mapItem),
  }
}
