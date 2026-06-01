// English description: Returns Wowonder configured post background colors normalized for the Nuxt feed UI.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"

type BackendPostColor = {
  id?: number | string
  color_1?: string
  color_2?: string
  text_color?: string
  image?: string
}

type BackendPostColorsResponse = {
  api_status?: number | string
  post_colors?: BackendPostColor[] | Record<string, BackendPostColor>
  errors?: {
    error_text?: string
  }
}

type FeedPostColorResponse = {
  colors: Array<{
    id: number
    bg: string
    text: string
  }>
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeColor = (value: string) =>
  /^#[0-9a-f]{3,8}$/i.test(value) ? value : ""

export default defineEventHandler(async (event): Promise<FeedPostColorResponse> => {
  const client = createBackendApiClient(event)
  const response = assertBackendApiSuccess(
    await client.get<BackendPostColorsResponse>("get-post-colors"),
    "Unable to load post colors.",
  )
  const rawColors = Array.isArray(response.post_colors)
    ? response.post_colors
    : Object.values(response.post_colors ?? {})

  const colors = rawColors.map((color, index) => {
    const id = asNumber(color.id) || index + 1
    const image = asString(color.image)
    const color1 = normalizeColor(asString(color.color_1))
    const color2 = normalizeColor(asString(color.color_2))
    const text = normalizeColor(asString(color.text_color)) || "#ffffff"
    const bg = image
      ? `url("${image}") center center / cover no-repeat`
      : color1 && color2
        ? `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
        : color1 || color2

    return {
      id,
      bg,
      text,
    }
  }).filter(color => color.id > 0 && color.bg)

  return { colors }
})
