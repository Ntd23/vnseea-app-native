// English description: Maps backend PHP jobs API responses into the frontend jobs bounded context shape and reuses existing backend behavior.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { getBackendWebBaseUrl } from "../../utils/backend-media-url"
import type {
  JobApplicationDraft,
  JobCatalogQuery,
  JobCreateDraft,
  JobMutationResult,
  JobOwnerPageOption,
  JobQuestionRecord,
  JobQuestionType,
  JobRecord,
  JobsCatalogRecord,
  JobsSelectOption,
} from "../../../src/jobs/domain/types/jobs.types"

type BackendEntity = Record<string, unknown>

type BackendJobsMetaResponse = {
  api_status?: number | string
  can_create?: boolean
  create_disabled_reason?: string
  distance_enabled?: boolean
  current_user?: BackendEntity
  owned_pages?: BackendEntity[]
  categories?: Array<{ value?: string | number; label?: string }>
  types?: Array<{ value?: string; label?: string }>
  currencies?: Array<{ value?: string; label?: string; symbol?: string }>
  salary_dates?: Array<{ value?: string; label?: string }>
  question_types?: Array<{ value?: string; label?: string }>
  image_types?: Array<{ value?: string; label?: string }>
  errors?: {
    error_text?: string
  }
}

type BackendJobsSearchResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendJobMutationResponse = {
  api_status?: number | string
  message_data?: string
  errors?: {
    error_text?: string
  }
}

type BackendJobWebMutationResponse = {
  status?: number | string
  error?: string
  message?: string
}

const DEFAULT_DISTANCE_OPTIONS: JobsSelectOption[] = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "300", label: "300 km" },
]

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const asNullableNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized !== 0 ? normalized : null
}

const asBoolean = (value: unknown) =>
  value === true
  || value === 1
  || value === "1"
  || value === "true"
  || value === "yes"

const normalizeImageUrl = (value: string, baseUrl: string) => {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) {
    try {
      const imageUrl = new URL(value)
      const requestBase = new URL(baseUrl)

      if (requestBase.protocol === "https:" && imageUrl.protocol === "http:" && imageUrl.hostname === requestBase.hostname) {
        return `${requestBase.origin}${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`
      }
    }
    catch {
      // Keep the raw backend value when URL parsing fails.
    }

    return value
  }
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const normalizedPath = value.startsWith("/") ? value : `/${value}`
  return `${normalizedBase}${normalizedPath}`
}

const normalizeLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, match => match.toUpperCase())

const normalizeOptions = (items: Array<{ value?: string | number; label?: string }> | undefined) =>
  (items ?? [])
    .map(item => ({
      value: asString(item.value),
      label: asString(item.label),
    }))
    .filter(item => item.value)

const assertBackendWebSuccess = (
  response: BackendJobWebMutationResponse,
  fallbackMessage: string,
) => {
  const status = Number(response.status ?? 0)

  if (status >= 200 && status < 300) {
    return response
  }

  throw createError({
    statusCode: 400,
    statusMessage: asString(response.error || response.message) || fallbackMessage,
    data: response,
  })
}

const mapQuestion = (
  slot: 1 | 2 | 3,
  entity: BackendEntity,
): JobQuestionRecord | null => {
  const suffix = slot === 1 ? "one" : slot === 2 ? "two" : "three"
  const prompt = asString(entity[`question_${suffix}`])
  const type = asString(entity[`question_${suffix}_type`]) as JobQuestionType
  const answersValue = entity[`question_${suffix}_answers`]
  const answers = Array.isArray(answersValue)
    ? answersValue
        .map((value, index) => ({
          value: String(index),
          label: asString(value),
        }))
        .filter(option => option.label)
    : answersValue && typeof answersValue === "object"
      ? Object.entries(answersValue as Record<string, unknown>)
          .map(([value, label]) => ({
            value: asString(value),
            label: asString(label),
          }))
          .filter(option => option.value && option.label)
      : []

  if (!prompt || !type) {
    return null
  }

  return {
    slot,
    prompt,
    type,
    answers,
  }
}

const buildSalaryLabel = (job: {
  minimum: number | null
  maximum: number | null
  currencySymbol: string
  salaryDateLabel: string
}) => {
  const range = [job.minimum, job.maximum]
    .filter((value): value is number => typeof value === "number" && value > 0)
    .map(value => `${job.currencySymbol}${value}`)
    .join(" - ")

  if (!range && !job.salaryDateLabel) {
    return ""
  }

  if (!job.salaryDateLabel) {
    return range
  }

  if (!range) {
    return job.salaryDateLabel
  }

  return `${range} / ${job.salaryDateLabel}`
}

const mapJobRecord = (
  entity: BackendEntity,
  options: {
    currentUserId: number
    categoryLabels: Record<string, string>
    typeLabels: Record<string, string>
    salaryDateLabels: Record<string, string>
    currencySymbols: Record<string, string>
    baseUrl: string
  },
): JobRecord => {
  const pageData = (entity.page ?? {}) as BackendEntity
  const userData = (entity.user ?? {}) as BackendEntity
  const ownerSource = asNumber(pageData.page_id) > 0 ? pageData : userData
  const ownerKind = asNumber(pageData.page_id) > 0 ? "page" : "user"
  const category = asString(entity.category)
  const jobType = asString(entity.job_type)
  const salaryDate = asString(entity.salary_date)
  const currency = asString(entity.currency)
  const minimum = asNullableNumber(entity.minimum)
  const maximum = asNullableNumber(entity.maximum)
  const currencySymbol = options.currencySymbols[currency] || currency
  const salaryDateLabel = options.salaryDateLabels[salaryDate] || normalizeLabel(salaryDate)
  const mappedJob = {
    minimum,
    maximum,
    currencySymbol,
    salaryDateLabel,
  }

  return {
    id: asNumber(entity.id),
    postId: asNumber(entity.post_id) || null,
    title: asString(entity.title),
    description: asString(entity.description),
    imageUrl: normalizeImageUrl(asString(entity.image), options.baseUrl),
    imageType: (asString(entity.image_type) || "unknown") as "cover" | "upload" | "unknown",
    location: asString(entity.location),
    lat: asNullableNumber(entity.lat),
    lng: asNullableNumber(entity.lng),
    category,
    categoryLabel: options.categoryLabels[category] || category,
    jobType,
    typeLabel: options.typeLabels[jobType] || normalizeLabel(jobType),
    minimum,
    maximum,
    currency,
    currencySymbol,
    salaryDate,
    salaryDateLabel,
    salaryLabel: buildSalaryLabel(mappedJob),
    owner: asNumber(ownerSource.page_id || ownerSource.user_id) > 0
      ? {
          kind: ownerKind,
          id: asNumber(ownerSource.page_id || ownerSource.user_id),
          name: asString(ownerSource.page_title || ownerSource.name || ownerSource.username),
          slug: asString(ownerSource.page_name || ownerSource.username),
          avatarUrl: normalizeImageUrl(
            asString(ownerSource.avatar || ownerSource.page_avatar || ownerSource.page_picture),
            options.baseUrl,
          ),
        }
      : null,
    applyCount: asNumber(entity.apply_count),
    alreadyApplied: asBoolean(entity.apply),
    isOwner: asNumber(entity.user_id) === options.currentUserId,
    canApply: !asBoolean(entity.apply) && asNumber(entity.user_id) !== options.currentUserId,
    questions: [1, 2, 3]
      .map(slot => mapQuestion(slot as 1 | 2 | 3, entity))
      .filter((question): question is JobQuestionRecord => Boolean(question)),
    postUrl: asString(entity.url),
  }
}

const mapOwnedPages = (items: BackendEntity[] | undefined, baseUrl: string): JobOwnerPageOption[] =>
  (items ?? []).map(item => ({
    id: asNumber(item.page_id),
    slug: asString(item.page_name),
    title: asString(item.page_title) || asString(item.page_name),
    coverUrl: normalizeImageUrl(asString(item.cover), baseUrl),
  }))

export async function fetchJobsCatalog(
  event: H3Event,
  input: JobCatalogQuery,
): Promise<JobsCatalogRecord> {
  const currentUser = await getBackendCurrentUser(event)
  const client = createBackendApiClient(event)
  const baseUrl = getBackendWebBaseUrl(event)

  const [metaResponse, searchResponse] = await Promise.all([
    client.get<BackendJobsMetaResponse>("jobs-meta"),
    client.post<BackendJobsSearchResponse, Record<string, unknown>>("job", {
      type: "search",
      keyword: input.q,
      c_id: input.category,
      job_type: input.type,
      length: input.distance,
      offset: input.afterId,
      limit: input.limit ?? 10,
    }),
  ])

  const meta = assertBackendApiSuccess(metaResponse, "Unable to load jobs metadata.")
  const search = assertBackendApiSuccess(searchResponse, "Unable to load jobs.")
  const categories = normalizeOptions(meta.categories)
  const types = normalizeOptions(meta.types)
  const salaryDates = normalizeOptions(meta.salary_dates)
  const questionTypes = normalizeOptions(meta.question_types)
  const imageTypes = normalizeOptions(meta.image_types)
  const currencies = (meta.currencies ?? [])
    .map(item => ({
      value: asString(item.value),
      label: asString(item.label) || asString(item.value),
      symbol: asString(item.symbol) || asString(item.value),
    }))
    .filter(item => item.value)
  const categoryLabels = Object.fromEntries(categories.map(item => [item.value, item.label]))
  const typeLabels = Object.fromEntries(types.map(item => [item.value, item.label]))
  const salaryDateLabels = Object.fromEntries(salaryDates.map(item => [item.value, item.label]))
  const currencySymbols = Object.fromEntries(currencies.map(item => [item.value, item.symbol]))
  const items = (search.data ?? []).map(item =>
    mapJobRecord(item, {
      currentUserId: asNumber(currentUser.user_id),
      categoryLabels,
      typeLabels,
      salaryDateLabels,
      currencySymbols,
      baseUrl,
    }),
  )

  return {
    items,
    categories,
    types,
    distanceOptions: DEFAULT_DISTANCE_OPTIONS,
    currencies,
    salaryDates,
    questionTypes,
    imageTypes,
    ownedPages: mapOwnedPages(meta.owned_pages, baseUrl),
    currentUser: {
      name: asString(meta.current_user?.name),
      email: asString(meta.current_user?.email),
      phoneNumber: asString(meta.current_user?.phone_number),
      location: asString(meta.current_user?.address),
      lat: asNullableNumber(meta.current_user?.lat),
      lng: asNullableNumber(meta.current_user?.lng),
    },
    canCreate: asBoolean(meta.can_create),
    createDisabledReason: asString(meta.create_disabled_reason),
    distanceEnabled: asBoolean(meta.distance_enabled),
    hasMore: items.length >= (input.limit ?? 10),
    nextAfterId: items.at(-1)?.id ?? null,
  }
}

export async function applyToJob(
  event: H3Event,
  input: JobApplicationDraft,
): Promise<JobMutationResult> {
  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendJobMutationResponse, Record<string, unknown>>(
      "job",
      {
        type: "apply",
        job_id: input.jobId,
        user_name: input.userName,
        phone_number: input.phoneNumber,
        location: input.location,
        email: input.email,
        position: input.experience.position,
        where_did_you_work: input.experience.whereDidYouWork,
        experience_description: input.experience.experienceDescription,
        experience_start_date: input.experience.experienceStartDate,
        experience_end_date: input.experience.currentlyWorkHere
          ? ""
          : input.experience.experienceEndDate,
        i_currently_work: input.experience.currentlyWorkHere ? "on" : "",
        question_one_answer: input.answers[1] ?? "",
        question_two_answer: input.answers[2] ?? "",
        question_three_answer: input.answers[3] ?? "",
      },
    ),
    "Unable to apply for this job.",
  )

  return {
    success: true,
    message: asString(response.message_data),
  }
}

export async function createJob(
  event: H3Event,
  input: JobCreateDraft,
): Promise<JobMutationResult> {
  const client = createBackendWebClient(event)
  const hasUpload = input.imageType === "upload" && Boolean(input.thumbnailFile)

  if (hasUpload) {
    const formData = new FormData()
    formData.append("job_title", input.title)
    formData.append("description", input.description)
    formData.append("location", input.location)
    formData.append("job_type", input.jobType)
    formData.append("category", input.category)
    formData.append("salary_date", input.salaryDate)
    formData.append("currency", input.currency)
    formData.append("image_type", input.imageType)

    if (input.pageId) {
      formData.append("page_id", String(input.pageId))
    }

    if (typeof input.lat === "number" && Number.isFinite(input.lat)) {
      formData.append("lat", String(input.lat))
    }

    if (typeof input.lng === "number" && Number.isFinite(input.lng)) {
      formData.append("lng", String(input.lng))
    }

    if (typeof input.minimum === "number" && Number.isFinite(input.minimum)) {
      formData.append("minimum", String(input.minimum))
    }

    if (typeof input.maximum === "number" && Number.isFinite(input.maximum)) {
      formData.append("maximum", String(input.maximum))
    }

    input.questions.forEach((question, index) => {
      const slotKey = index === 0 ? "one" : index === 1 ? "two" : "three"

      if (!question.enabled || !question.prompt.trim()) {
        return
      }

      formData.append(`question_${slotKey}`, question.prompt.trim())
      formData.append(`question_${slotKey}_type`, question.type)

      if (question.type === "multiple_choice_question" && question.answers.length > 0) {
        formData.append(`question_${slotKey}_answers`, question.answers.join(","))
      }
    })

    if (input.thumbnailFile) {
      formData.append("thumbnail", input.thumbnailFile, input.thumbnailFile.name)
    }

    const response = assertBackendWebSuccess(
      await client.postForm<BackendJobWebMutationResponse, FormData>(
        "job",
        formData,
        { s: "create_job" },
      ),
      "Unable to create job.",
    )

    return {
      success: true,
      message: asString(response.message),
    }
  }

  const response = assertBackendWebSuccess(
    await client.postForm<BackendJobWebMutationResponse, Record<string, unknown>>(
      "job",
      {
        page_id: input.pageId || undefined,
        job_title: input.title,
        description: input.description,
        location: input.location,
        lat: input.lat ?? "",
        lng: input.lng ?? "",
        minimum: input.minimum ?? "",
        maximum: input.maximum ?? "",
        salary_date: input.salaryDate,
        currency: input.currency,
        job_type: input.jobType,
        category: input.category,
        image_type: input.imageType,
        question_one: input.questions[0].enabled ? input.questions[0].prompt : "",
        question_one_type: input.questions[0].type,
        question_one_answers: input.questions[0].answers.join(","),
        question_two: input.questions[1].enabled ? input.questions[1].prompt : "",
        question_two_type: input.questions[1].type,
        question_two_answers: input.questions[1].answers.join(","),
        question_three: input.questions[2].enabled ? input.questions[2].prompt : "",
        question_three_type: input.questions[2].type,
        question_three_answers: input.questions[2].answers.join(","),
      },
      { s: "create_job" },
    ),
    "Unable to create job.",
  )

  return {
    success: true,
    message: asString(response.message),
  }
}
