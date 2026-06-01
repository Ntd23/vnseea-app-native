// English description: Returns normalized blog articles from the PHP backend.

import { getQuery } from "h3"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import type { BlogCategory, BlogListArticle } from "../../../src/blogs/domain/types/blog.types"

type BackendEntity = Record<string, any>

type BackendArticlesResponse = {
  api_status?: number | string
  articles?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const categoryIdMap: Record<string, Exclude<BlogCategory, "all">> = {
  "2": "vehicles",
  "4": "business",
  "5": "education",
  "7": "movies",
  "8": "gaming",
  "9": "history",
  "10": "lifestyle",
  "13": "people",
  "14": "pets",
  "16": "science",
  "17": "sports",
  "18": "travel",
  "1": "other",
}

const categoryValueToId: Record<string, number> = {
  vehicles: 2,
  business: 4,
  education: 5,
  movies: 7,
  gaming: 8,
  history: 9,
  lifestyle: 10,
  people: 13,
  pets: 14,
  science: 16,
  sports: 17,
  travel: 18,
  other: 1,
}

const fallbackGradients = [
  "linear-gradient(135deg,#1e3a8a 0%,#2563eb 46%,#bfdbfe 100%)",
  "linear-gradient(135deg,#172554 0%,#1d4ed8 46%,#7dd3fc 100%)",
  "linear-gradient(135deg,#111827 0%,#4f46e5 42%,#c4b5fd 100%)",
  "linear-gradient(135deg,#0369a1 0%,#7dd3fc 100%)",
]

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const asEntity = (value: unknown): BackendEntity =>
  value && typeof value === "object" ? value as BackendEntity : {}

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const readMinutesOf = (content: string) => {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(words / 180))
}

const categoryFromEntity = (entity: BackendEntity): Exclude<BlogCategory, "all"> => {
  const rawCategory = asString(entity.category_id || entity.category_key || entity.category_raw || entity.category)
  const normalized = rawCategory.toLowerCase()

  if (categoryIdMap[normalized]) return categoryIdMap[normalized]
  if (Object.keys(categoryValueToId).includes(normalized)) return normalized as Exclude<BlogCategory, "all">

  return "other"
}

const mapArticle = (
  entity: BackendEntity,
  currentUserId: number,
  index: number,
  resolveMediaUrl: (value: unknown) => string,
): BlogListArticle | null => {
  const id = asNumber(entity.id)
  const title = asString(entity.title)

  if (!id || !title) return null

  const author = asEntity(entity.author)
  const authorName = asString(author.name)
    || [asString(author.first_name), asString(author.last_name)].filter(Boolean).join(" ")
    || asString(author.username)
    || "VNSEEA"
  const authorUsername = asString(author.username)
  const category = categoryFromEntity(entity)
  const categoryLabel = asString(entity.category_name || entity.category) || category
  const content = asString(entity.content)
  const excerpt = stripHtml(asString(entity.description) || content).slice(0, 180)
  const postedRaw = asString(entity.posted)
  const postedNumber = asNumber(entity.posted)
  const publishedHoursAgo = postedNumber > 100000
    ? Math.max(0, (Date.now() / 1000 - postedNumber) / 3600)
    : index
  const slug = `${id}_${slugify(title) || "blog"}`

  return {
    id,
    slug,
    title,
    excerpt,
    category,
    categoryLabel,
    author: authorName,
    authorAvatarUrl: resolveMediaUrl(asString(author.avatar_full || author.avatar)),
    authorPath: authorUsername ? appRoutes.profile(authorUsername) : undefined,
    publishedAt: postedRaw || "",
    publishedHoursAgo,
    views: asNumber(entity.view) || asNumber(entity.views),
    readMinutes: readMinutesOf(content || excerpt),
    likes: asNumber(entity.likes) || asNumber(entity.reaction?.count),
    tags: asString(entity.tags)
      .split(",")
      .map(tag => tag.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 8),
    image: asString(entity.thumbnail),
    imageFallback: fallbackGradients[index % fallbackGradients.length],
    href: appRoutes.readBlog(slug),
    mine: currentUserId > 0 && asNumber(entity.user) === currentUserId,
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Math.max(asNumber(query.limit) || 25, 1), 50)
  const offset = Math.max(asNumber(query.offset) || 0, 0)
  const category = asString(query.category)
  const categoryId = category && category !== "all" ? categoryValueToId[category] : 0
  const currentUser = await getBackendCurrentUser(event)
  const currentUserId = asNumber(currentUser.user_id)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendArticlesResponse, Record<string, unknown>>(
      "get-articles",
      {
        limit,
        offset,
        category: categoryId || undefined,
        user_id: asString(query.mine) === "1" ? currentUserId : undefined,
      },
    ),
    "Unable to load blogs.",
  )

  return (response.articles ?? [])
    .filter(entity => asString(entity.active === undefined || entity.active === null ? "1" : entity.active) === "1")
    .map((entity, index) => mapArticle(entity, currentUserId, index, resolveMediaUrl))
    .filter(Boolean) as BlogListArticle[]
})
