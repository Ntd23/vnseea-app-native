// English description: Connects the jobs bounded context to the Nuxt jobs API bridge through a dedicated repository.

import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import { jobsApiRoutes } from "../../application/constants/jobs-api-routes"
import type { JobsRepository } from "../../domain/repositories/JobsRepository"
import type {
  JobApplicationDraft,
  JobCatalogQuery,
  JobCreateDraft,
  JobMutationResult,
  JobsCatalogRecord,
} from "../../domain/types/jobs.types"

const normalizeNumber = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined

export function createApiJobsRepository(): JobsRepository {
  const client = useNuxtApiClient()

  return {
    async getCatalog(input?: JobCatalogQuery) {
      return await client.get<JobsCatalogRecord>(jobsApiRoutes.catalog, {
        q: input?.q,
        category: input?.category,
        type: input?.type,
        distance: normalizeNumber(input?.distance),
        afterId: normalizeNumber(input?.afterId),
        limit: normalizeNumber(input?.limit),
      })
    },
    async applyToJob(input: JobApplicationDraft) {
      return await client.post<JobMutationResult, JobApplicationDraft>(
        jobsApiRoutes.apply,
        input,
      )
    },
    async createJob(input: JobCreateDraft) {
      const formData = new FormData()

      formData.append("pageId", String(input.pageId))
      formData.append("title", input.title)
      formData.append("location", input.location)
      formData.append("currency", input.currency)
      formData.append("salaryDate", input.salaryDate)
      formData.append("jobType", input.jobType)
      formData.append("category", input.category)
      formData.append("description", input.description)
      formData.append("imageType", input.imageType)

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
        const slot = index + 1

        if (!question.enabled || !question.prompt.trim()) {
          return
        }

        if (slot === 1) {
          formData.append("questionOne", question.prompt.trim())
          formData.append("questionOneType", question.type)
          formData.append("questionOneAnswers", question.answers.join(","))
        }

        if (slot === 2) {
          formData.append("questionTwo", question.prompt.trim())
          formData.append("questionTwoType", question.type)
          formData.append("questionTwoAnswers", question.answers.join(","))
        }

        if (slot === 3) {
          formData.append("questionThree", question.prompt.trim())
          formData.append("questionThreeType", question.type)
          formData.append("questionThreeAnswers", question.answers.join(","))
        }
      })

      if (input.thumbnailFile) {
        formData.append("thumbnail", input.thumbnailFile, input.thumbnailFile.name)
      }

      return await client.post<JobMutationResult, FormData>(
        jobsApiRoutes.create,
        formData,
      )
    },
  }
}
