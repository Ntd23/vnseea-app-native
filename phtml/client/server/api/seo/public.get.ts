// English description: Builds public Nuxt SEO metadata from real PHP backend entities without generic fallbacks.

import { createError, getQuery, getRequestURL, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import { cleanSeoKeywords, cleanSeoText } from "../../../src/seo/domain/services/seo-text.service"
import type { PublicSeoMeta, PublicSeoRouteType } from "../../../src/seo/domain/types/public-seo.types"

type BackendEntity = Record<string, unknown>

type BackendResponse = {
  api_status?: number | string
  user_data?: BackendEntity
  page_data?: BackendEntity
  group_data?: BackendEntity
  post_data?: BackendEntity
  data?: BackendEntity
  groups?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const routeTypes: PublicSeoRouteType[] = ["profile", "page", "group", "post", "blog"]

const asRecord = (value: unknown): BackendEntity =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as BackendEntity
    : {}

const asArray = (value: unknown): BackendEntity[] =>
  Array.isArray(value)
    ? value.map(item => asRecord(item))
    : []

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const firstString = (entity: BackendEntity, keys: string[], maxLength?: number) => {
  for (const key of keys) {
    const value = cleanSeoText(entity[key], maxLength)
    if (value) return value
  }

  return ""
}

const firstMedia = (
  entity: BackendEntity,
  keys: string[],
  resolveMediaUrl: (value: unknown) => string,
) => {
  for (const key of keys) {
    const value = resolveMediaUrl(entity[key])
    if (value) return value
  }

  return ""
}

const slugify = (value: string) =>
  cleanSeoText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const toCanonical = (event: H3Event, path: string) =>
  new URL(path, getRequestURL(event).origin).toString()

const normalizeUsername = (value: string) => {
  try {
    return decodeURIComponent(value).trim().replace(/^@+/, "")
  }
  catch {
    return value.trim().replace(/^@+/, "")
  }
}

const normalizeRouteType = (value: unknown): PublicSeoRouteType => {
  const routeType = asString(Array.isArray(value) ? value[0] : value) as PublicSeoRouteType

  if (!routeTypes.includes(routeType)) {
    throw createError({
      statusCode: 400,
      statusMessage: "SEO route type is invalid.",
    })
  }

  return routeType
}

const normalizeIdentifier = (value: unknown) => {
  const identifier = asString(Array.isArray(value) ? value[0] : value)

  if (!identifier) {
    throw createError({
      statusCode: 400,
      statusMessage: "SEO identifier is required.",
    })
  }

  return identifier
}

const requireTitle = (title: string) => {
  if (!title) {
    throw createError({
      statusCode: 404,
      statusMessage: "SEO entity title is missing.",
    })
  }

  return title
}

const fetchProfileSeo = async (
  event: H3Event,
  identifier: string,
  resolveMediaUrl: (value: unknown) => string,
): Promise<PublicSeoMeta> => {
  const username = normalizeUsername(identifier)
  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendResponse, Record<string, unknown>>(
      "get-user-data-username",
      {
        username,
        fetch: "user_data",
      },
    ),
    "Unable to load profile SEO.",
  )
  const user = asRecord(response.user_data)
  const resolvedUsername = firstString(user, ["username"]) || username
  const title = requireTitle(firstString(user, ["name", "username"], 80))
  const description = firstString(user, ["about"], 160)
    || [
      firstString(user, ["working"], 80),
      firstString(user, ["school"], 80),
      firstString(user, ["address"], 100),
    ].filter(Boolean).join(" - ")
  const imageUrl = firstMedia(user, ["avatar_full", "avatar", "cover_full", "cover"], resolveMediaUrl)

  return {
    title,
    description: description || undefined,
    canonicalUrl: toCanonical(event, appRoutes.profile(resolvedUsername)),
    imageUrl: imageUrl || undefined,
    type: "profile",
    robots: "index, follow",
  }
}

const fetchPageSeo = async (
  event: H3Event,
  identifier: string,
  resolveMediaUrl: (value: unknown) => string,
): Promise<PublicSeoMeta> => {
  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendResponse, Record<string, unknown>>(
      "get-page-data",
      {
        page_name: identifier,
      },
    ),
    "Unable to load page SEO.",
  )
  const page = asRecord(response.page_data)
  const slug = firstString(page, ["page_name", "slug", "name"]) || identifier
  const title = requireTitle(firstString(page, ["page_title", "title", "name", "page_name"], 90))
  const description = firstString(page, ["page_description", "about", "description"], 160)
  const imageUrl = firstMedia(page, ["avatar_full", "avatar", "cover_full", "cover"], resolveMediaUrl)

  return {
    title,
    description: description || undefined,
    canonicalUrl: toCanonical(event, appRoutes.pageDetail(slug)),
    imageUrl: imageUrl || undefined,
    type: "website",
    robots: "index, follow",
  }
}

const fetchGroupSeo = async (
  event: H3Event,
  identifier: string,
  resolveMediaUrl: (value: unknown) => string,
): Promise<PublicSeoMeta> => {
  const client = createBackendApiClient(event)
  const normalizedSlug = identifier.trim().toLowerCase()
  const searchResponse = assertBackendApiSuccess(
    await client.post<BackendResponse, Record<string, unknown>>(
      "search",
      {
        search_key: normalizedSlug,
        limit: 20,
      },
    ),
    "Unable to resolve group SEO.",
  )
  const searchMatch = asArray(searchResponse.groups).find((entity) =>
    firstString(entity, ["group_name", "slug", "name"]).toLowerCase() === normalizedSlug,
  )
  const groupId = asNumber(searchMatch?.group_id ?? searchMatch?.id)

  if (!groupId) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found.",
    })
  }

  const detailResponse = assertBackendApiSuccess(
    await client.post<BackendResponse, Record<string, unknown>>(
      "get-group-data",
      {
        group_id: groupId,
      },
    ),
    "Unable to load group SEO.",
  )
  const group = asRecord(detailResponse.group_data)
  const slug = firstString(group, ["group_name", "slug", "name"]) || identifier
  const title = requireTitle(firstString(group, ["group_title", "title", "name", "group_name"], 90))
  const description = firstString(group, ["about", "description"], 160)
  const imageUrl = firstMedia(group, ["avatar_full", "avatar", "cover_full", "cover"], resolveMediaUrl)

  return {
    title,
    description: description || undefined,
    canonicalUrl: toCanonical(event, appRoutes.groupDetail(slug)),
    imageUrl: imageUrl || undefined,
    type: "website",
    robots: "index, follow",
  }
}

const isPublicPost = (post: BackendEntity) => {
  const privacy = asString(post.postPrivacy ?? post.privacy ?? post.post_privacy)

  return !privacy || privacy === "0"
}

const readPostImage = (
  post: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
) => {
  const product = asRecord(post.product)
  const productImages = asArray(product.images)
  const albumMedia = asArray(post.photo_album)
  const multiMedia = asArray(post.photo_multi)
  const firstProductImage = productImages[0]
  const firstAlbumImage = albumMedia[0]
  const firstMultiImage = multiMedia[0]

  return firstMedia(product, ["image", "image_org", "thumbnail"], resolveMediaUrl)
    || firstMedia(firstProductImage ?? {}, ["image_org", "image", "filename", "src"], resolveMediaUrl)
    || firstMedia(post, ["postFileThumb", "postFile", "postPhoto", "postSticker"], resolveMediaUrl)
    || firstMedia(firstAlbumImage ?? {}, ["image_org", "image", "filename"], resolveMediaUrl)
    || firstMedia(firstMultiImage ?? {}, ["image_org", "image", "filename"], resolveMediaUrl)
    || firstMedia(asRecord(post.publisher), ["avatar_full", "avatar"], resolveMediaUrl)
}

const fetchPostSeo = async (
  event: H3Event,
  identifier: string,
  resolveMediaUrl: (value: unknown) => string,
): Promise<PublicSeoMeta | null> => {
  const postId = Number.parseInt(identifier, 10)

  if (!Number.isInteger(postId) || postId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Post not found.",
    })
  }

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendResponse, Record<string, unknown>>(
      "get-post-data",
      {
        post_id: postId,
        fetch: "post_data",
      },
    ),
    "Unable to load post SEO.",
  )
  const post = asRecord(response.post_data)

  if (!Object.keys(post).length) {
    throw createError({
      statusCode: 404,
      statusMessage: "Post not found.",
    })
  }

  if (!isPublicPost(post)) {
    return {
      title: "",
      canonicalUrl: toCanonical(event, appRoutes.postDetail(postId)),
      type: "article",
      robots: "noindex, nofollow",
    }
  }

  const product = asRecord(post.product)
  const rawText = firstString(post, ["Orginaltext", "postText_API", "postText", "text"], 160)
  const productTitle = firstString(product, ["name", "title"], 90)
  const productDescription = firstString(product, ["description"], 160)
  const albumTitle = firstString(post, ["album_name"], 90)
  const title = productTitle || albumTitle || cleanSeoText(rawText, 70)

  if (!title) {
    return null
  }

  const imageUrl = readPostImage(post, resolveMediaUrl)
  const publisher = asRecord(post.publisher)

  return {
    title,
    description: productDescription || rawText || undefined,
    canonicalUrl: toCanonical(event, appRoutes.postDetail(postId)),
    imageUrl: imageUrl || undefined,
    type: "article",
    robots: "index, follow",
    publishedTime: asString(post.time) || undefined,
    authorName: firstString(publisher, ["name", "username"], 80) || undefined,
    keywords: cleanSeoKeywords(post.hashtag || post.hash || post.tags),
  }
}

const fetchBlogSeo = async (
  event: H3Event,
  identifier: string,
  resolveMediaUrl: (value: unknown) => string,
): Promise<PublicSeoMeta> => {
  const blogId = Number.parseInt(identifier, 10)

  if (!Number.isInteger(blogId) || blogId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Blog not found.",
    })
  }

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendResponse, Record<string, unknown>>(
      "get-blog-by-id",
      {
        blog_id: blogId,
      },
    ),
    "Unable to load blog SEO.",
  )
  const article = asRecord(response.data)
  const title = requireTitle(firstString(article, ["title"], 90))
  const description = firstString(article, ["description", "content"], 160)
  const author = asRecord(article.author)
  const slug = `${blogId}_${slugify(title) || "blog"}`
  const imageUrl = firstMedia(article, ["thumbnail", "image"], resolveMediaUrl)

  return {
    title,
    description: description || undefined,
    canonicalUrl: toCanonical(event, appRoutes.readBlog(slug)),
    imageUrl: imageUrl || undefined,
    type: "article",
    robots: "index, follow",
    publishedTime: asString(article.posted) || undefined,
    authorName: firstString(author, ["name", "username"], 80) || undefined,
    keywords: cleanSeoKeywords(article.tags),
  }
}

export default defineEventHandler(async (event): Promise<PublicSeoMeta | null> => {
  const query = getQuery(event)
  const routeType = normalizeRouteType(query.routeType)
  const identifier = normalizeIdentifier(query.identifier)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  switch (routeType) {
    case "profile":
      return await fetchProfileSeo(event, identifier, resolveMediaUrl)
    case "page":
      return await fetchPageSeo(event, identifier, resolveMediaUrl)
    case "group":
      return await fetchGroupSeo(event, identifier, resolveMediaUrl)
    case "post":
      return await fetchPostSeo(event, identifier, resolveMediaUrl)
    case "blog":
      return await fetchBlogSeo(event, identifier, resolveMediaUrl)
  }
})
