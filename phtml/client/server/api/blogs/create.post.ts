// English description: Creates a blog post or draft through the PHP backend API.

import { createError, getHeader, readBody, readMultipartFormData } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { postBackendApiUpload } from "../../utils/backend-api-upload"

type BlogCreateStatus = "draft" | "publish"

type BlogCreatePayload = {
  title: string
  content: string
  description: string
  category: string
  tags: string
  status: BlogCreateStatus
  thumbnailFile: {
    filename?: string
    type?: string
    data: Buffer
  } | null
}

type BackendCreateBlogResponse = {
  api_status?: number | string
  blog_id?: number | string
  status?: "draft" | "published" | "pending"
  url?: string
  errors?: {
    error_text?: string
  }
}

const asText = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const summarize = (value: string) =>
  value
    .replace(/[#>*_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 290)

const normalizeStatus = (value: unknown): BlogCreateStatus =>
  asText(value) === "draft" ? "draft" : "publish"

const parseJsonPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<BlogCreatePayload> => {
  const body = await readBody<Record<string, unknown>>(event)
  const content = asText(body.content)
  const title = asText(body.title)

  return {
    title,
    content,
    description: asText(body.description) || summarize(content || title),
    category: asText(body.category) || "other",
    tags: asText(body.tags),
    status: normalizeStatus(body.status),
    thumbnailFile: null,
  }
}

const parseMultipartPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<BlogCreatePayload> => {
  const parts = await readMultipartFormData(event) ?? []
  const payload: BlogCreatePayload = {
    title: "",
    content: "",
    description: "",
    category: "other",
    tags: "",
    status: "publish",
    thumbnailFile: null,
  }

  for (const part of parts) {
    if (!part.name) continue

    if (part.filename) {
      if (part.name === "thumbnail") {
        payload.thumbnailFile = {
          filename: part.filename,
          type: part.type,
          data: part.data,
        }
      }

      continue
    }

    const value = part.data.toString().trim()

    if (part.name === "title") payload.title = value
    if (part.name === "content") payload.content = value
    if (part.name === "description") payload.description = value
    if (part.name === "category") payload.category = value || "other"
    if (part.name === "tags") payload.tags = value
    if (part.name === "status") payload.status = normalizeStatus(value)
  }

  payload.description ||= summarize(payload.content || payload.title)

  return payload
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""
  const payload = contentType.includes("multipart/form-data")
    ? await parseMultipartPayload(event)
    : await parseJsonPayload(event)

  if (payload.status === "publish") {
    if (payload.title.length < 10) {
      throw createError({
        statusCode: 400,
        statusMessage: "Blog title must be at least 10 characters.",
      })
    }

    if (payload.content.length < 80) {
      throw createError({
        statusCode: 400,
        statusMessage: "Blog content is too short.",
      })
    }

    if (!payload.tags) {
      throw createError({
        statusCode: 400,
        statusMessage: "Blog tags are required.",
      })
    }

    if (!payload.thumbnailFile) {
      throw createError({
        statusCode: 400,
        statusMessage: "Blog thumbnail is required.",
      })
    }
  }

  const requestBody = payload.thumbnailFile ? new FormData() : new URLSearchParams()

  requestBody.append("blog_title", payload.title)
  requestBody.append("blog_content", payload.content)
  requestBody.append("blog_description", payload.description)
  requestBody.append("blog_category", payload.category)
  requestBody.append("blog_tags", payload.tags)
  requestBody.append("status", payload.status)

  if (payload.thumbnailFile) {
    requestBody.append(
      "thumbnail",
      new File([payload.thumbnailFile.data], payload.thumbnailFile.filename || "blog-thumbnail.jpg", {
        type: payload.thumbnailFile.type || "image/jpeg",
      }),
    )
  }

  const response = assertBackendApiSuccess(
    await postBackendApiUpload<BackendCreateBlogResponse>(
      event,
      "create-blog",
      requestBody,
    ),
    "Unable to create blog.",
  )

  return {
    id: Number(response.blog_id ?? 0),
    status: response.status ?? "published",
    url: response.url ?? "",
  }
})
