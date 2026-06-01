// English description: Nuxt API backed repository implementation for account settings.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { SettingsRepository } from "../../domain/repositories/SettingsRepository"
import type {
  SettingSession,
  SettingsBlockedUser,
  SettingsFieldValue,
  SettingsPointsExchangeInput,
  SettingsPointsExchangeResult,
  SettingsUpdateInput,
  SettingsUpdateResult,
  SettingsUser,
} from "../../domain/types/settings.types"

type SettingsApiUpdatePayload = Record<string, SettingsFieldValue>

const toApiRequestBody = (payload: SettingsApiUpdatePayload) => {
  const hasFile = Object.values(payload).some(value =>
    typeof File !== "undefined" && value instanceof File,
  )

  if (!hasFile) {
    return payload
  }

  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (typeof File !== "undefined" && value instanceof File) {
      formData.append(key, value)
      continue
    }

    formData.append(key, String(value))
  }

  return formData
}

const toApiUpdatePayload = (input: SettingsUpdateInput) => {
  const payload: SettingsApiUpdatePayload = {}

  payload.section = input.section
  if (input.username !== undefined) payload.username = input.username
  if (input.email !== undefined) payload.email = input.email
  if (input.phone !== undefined) payload.phone_number = input.phone
  if (input.gender !== undefined) payload.gender = input.gender
  if (input.birthday !== undefined) payload.birthday = input.birthday
  if (input.countryId !== undefined) payload.country_id = input.countryId
  if (input.verified !== undefined) payload.verified = input.verified
  if (input.wallet !== undefined) payload.wallet = input.wallet
  if (input.website !== undefined) payload.website = input.website
  if (input.about !== undefined) payload.about = input.about
  if (input.firstName !== undefined) payload.first_name = input.firstName
  if (input.lastName !== undefined) payload.last_name = input.lastName
  if (input.working !== undefined) payload.working = input.working
  if (input.workingLink !== undefined) payload.working_link = input.workingLink
  if (input.address !== undefined) payload.address = input.address
  if (input.lat !== undefined) payload.lat = input.lat
  if (input.lng !== undefined) payload.lng = input.lng
  if (input.school !== undefined) payload.school = input.school
  if (input.relationship !== undefined) payload.relationship = input.relationship
  if (input.completed !== undefined) payload.completed = input.completed
  if (input.currentPassword !== undefined) payload.current_password = input.currentPassword
  if (input.newPassword !== undefined) payload.new_password = input.newPassword
  if (input.confirmPassword !== undefined) payload.repeat_new_password = input.confirmPassword
  if (input.twoFactor !== undefined) payload.two_factor = input.twoFactor
  if (input.phoneNumber !== undefined) payload.phone_number = input.phoneNumber
  if (input.code !== undefined) payload.code = input.code
  if (input.factorMethod !== undefined) payload.factor_method = input.factorMethod
  if (input.passwordConfirm !== undefined) payload.password = input.passwordConfirm

  for (const group of [input.privacy, input.emailNotifications, input.notifications, input.socialLinks, input.fields]) {
    for (const [key, value] of Object.entries(group ?? {})) {
      payload[key] = value
    }
  }

  return payload
}

export function createApiSettingsRepository(): SettingsRepository {
  const client = useNuxtApiClient()

  return {
    async getCurrentUser() {
      return await client.get<SettingsUser>(apiRoutes.settings.me)
    },
    async update(input) {
      const payload = toApiUpdatePayload(input)

      return await client.post<SettingsUpdateResult, SettingsApiUpdatePayload | FormData>(
        apiRoutes.settings.update,
        toApiRequestBody(payload),
      )
    },
    async getSessions() {
      return await client.get<SettingSession[]>(apiRoutes.settings.sessions)
    },
    async deleteSession(id) {
      const response = await client.delete<{ success: boolean }>(apiRoutes.settings.sessions, { id })
      return response.success
    },
    async getBlockedUsers() {
      return await client.get<SettingsBlockedUser[]>(apiRoutes.settings.blocked)
    },
    async unblockUser(userId) {
      const response = await client.post<{ success: boolean }>(apiRoutes.settings.unblock, { userId })
      return response.success
    },
    async requestMyInfo(options) {
      const response = await client.post<{ success: boolean }>(apiRoutes.settings.myInfo, options)
      return response.success
    },
    async exchangePoints(input: SettingsPointsExchangeInput) {
      return await client.post<SettingsPointsExchangeResult, SettingsPointsExchangeInput>(
        apiRoutes.settings.pointsExchange,
        input,
      )
    },
  }
}
