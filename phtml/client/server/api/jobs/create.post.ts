// English description: Creates a new backend job with page ownership and optional image upload through the Nuxt jobs bridge.

import { createError, getHeader, readBody, readMultipartFormData } from "h3"
import { createJob } from "./_shared"
import type { JobCreateDraft, JobCreateQuestionDraft, JobQuestionType } from "../../../src/jobs/domain/types/jobs.types"

const toQuestionDraft = (
  prompt: string,
  type: string,
  answers: string,
): JobCreateQuestionDraft => ({
  enabled: prompt.trim().length > 0,
  prompt: prompt.trim(),
  type: (type || "free_text_question") as JobQuestionType,
  answers: answers
    .split(",")
    .map(item => item.trim())
    .filter(Boolean),
})

const parseJsonPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<JobCreateDraft> => {
  const body = await readBody<Record<string, unknown>>(event)

  return {
    pageId: Number(body.pageId ?? 0) || 0,
    title: typeof body.title === "string" ? body.title.trim() : "",
    location: typeof body.location === "string" ? body.location.trim() : "",
    lat: typeof body.lat === "number" ? body.lat : Number(body.lat ?? 0) || null,
    lng: typeof body.lng === "number" ? body.lng : Number(body.lng ?? 0) || null,
    minimum: typeof body.minimum === "number" ? body.minimum : Number(body.minimum ?? 0) || null,
    maximum: typeof body.maximum === "number" ? body.maximum : Number(body.maximum ?? 0) || null,
    currency: typeof body.currency === "string" ? body.currency.trim() : "",
    salaryDate: typeof body.salaryDate === "string" ? body.salaryDate.trim() : "",
    jobType: typeof body.jobType === "string" ? body.jobType.trim() : "",
    category: typeof body.category === "string" ? body.category.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    imageType: body.imageType === "upload" ? "upload" : "cover",
    thumbnailFile: null,
    questions: [
      toQuestionDraft(
        typeof body.questionOne === "string" ? body.questionOne : "",
        typeof body.questionOneType === "string" ? body.questionOneType : "",
        typeof body.questionOneAnswers === "string" ? body.questionOneAnswers : "",
      ),
      toQuestionDraft(
        typeof body.questionTwo === "string" ? body.questionTwo : "",
        typeof body.questionTwoType === "string" ? body.questionTwoType : "",
        typeof body.questionTwoAnswers === "string" ? body.questionTwoAnswers : "",
      ),
      toQuestionDraft(
        typeof body.questionThree === "string" ? body.questionThree : "",
        typeof body.questionThreeType === "string" ? body.questionThreeType : "",
        typeof body.questionThreeAnswers === "string" ? body.questionThreeAnswers : "",
      ),
    ],
  }
}

const parseMultipartPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<JobCreateDraft> => {
  const parts = await readMultipartFormData(event) ?? []
  const values: Record<string, string> = {}
  let thumbnailFile: File | null = null

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      if (part.name === "thumbnail") {
        thumbnailFile = new File(
          [part.data],
          part.filename,
          { type: part.type || "image/jpeg" },
        )
      }

      continue
    }

    values[part.name] = part.data.toString().trim()
  }

  return {
    pageId: Number(values.pageId) || 0,
    title: values.title || "",
    location: values.location || "",
    lat: Number(values.lat) || null,
    lng: Number(values.lng) || null,
    minimum: Number(values.minimum) || null,
    maximum: Number(values.maximum) || null,
    currency: values.currency || "",
    salaryDate: values.salaryDate || "",
    jobType: values.jobType || "",
    category: values.category || "",
    description: values.description || "",
    imageType: values.imageType === "upload" ? "upload" : "cover",
    thumbnailFile,
    questions: [
      toQuestionDraft(values.questionOne || "", values.questionOneType || "", values.questionOneAnswers || ""),
      toQuestionDraft(values.questionTwo || "", values.questionTwoType || "", values.questionTwoAnswers || ""),
      toQuestionDraft(values.questionThree || "", values.questionThreeType || "", values.questionThreeAnswers || ""),
    ],
  }
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, "content-type") || ""
  const payload = contentType.includes("multipart/form-data")
    ? await parseMultipartPayload(event)
    : await parseJsonPayload(event)

  if (!payload.title || !payload.location || !payload.jobType || !payload.category || !payload.description || !payload.currency) {
    throw createError({
      statusCode: 400,
      statusMessage: "Job creation fields are required.",
    })
  }

  if (payload.imageType === "upload" && !payload.thumbnailFile) {
    throw createError({
      statusCode: 400,
      statusMessage: "Uploaded image is required for custom job covers.",
    })
  }

  return await createJob(event, payload)
})
