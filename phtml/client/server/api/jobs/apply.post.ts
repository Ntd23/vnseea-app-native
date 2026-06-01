// English description: Applies the current authenticated user to a backend job using the PHP jobs API through the Nuxt bridge.

import { createError, readBody } from "h3"
import { applyToJob } from "./_shared"
import type { JobApplicationDraft } from "../../../src/jobs/domain/types/jobs.types"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const payload: JobApplicationDraft = {
    jobId: Number(body.jobId ?? 0) || 0,
    userName: typeof body.userName === "string" ? body.userName.trim() : "",
    phoneNumber: typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "",
    location: typeof body.location === "string" ? body.location.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    experience: {
      position: typeof body.experience === "object" && body.experience && typeof (body.experience as Record<string, unknown>).position === "string"
        ? String((body.experience as Record<string, unknown>).position).trim()
        : "",
      whereDidYouWork: typeof body.experience === "object" && body.experience && typeof (body.experience as Record<string, unknown>).whereDidYouWork === "string"
        ? String((body.experience as Record<string, unknown>).whereDidYouWork).trim()
        : "",
      experienceDescription: typeof body.experience === "object" && body.experience && typeof (body.experience as Record<string, unknown>).experienceDescription === "string"
        ? String((body.experience as Record<string, unknown>).experienceDescription).trim()
        : "",
      experienceStartDate: typeof body.experience === "object" && body.experience && typeof (body.experience as Record<string, unknown>).experienceStartDate === "string"
        ? String((body.experience as Record<string, unknown>).experienceStartDate).trim()
        : "",
      experienceEndDate: typeof body.experience === "object" && body.experience && typeof (body.experience as Record<string, unknown>).experienceEndDate === "string"
        ? String((body.experience as Record<string, unknown>).experienceEndDate).trim()
        : "",
      currentlyWorkHere: typeof body.experience === "object" && body.experience
        ? Boolean((body.experience as Record<string, unknown>).currentlyWorkHere)
        : false,
    },
    answers: typeof body.answers === "object" && body.answers
      ? {
          1: (body.answers as Record<string, unknown>)["1"] as string | undefined,
          2: (body.answers as Record<string, unknown>)["2"] as string | undefined,
          3: (body.answers as Record<string, unknown>)["3"] as string | undefined,
        }
      : {},
  }

  if (!payload.jobId || !payload.userName || !payload.phoneNumber || !payload.location || !payload.email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Job application fields are required.",
    })
  }

  return await applyToJob(event, payload)
})
