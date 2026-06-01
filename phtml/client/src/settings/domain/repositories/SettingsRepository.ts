// English description: Domain repository contract for account settings persistence.

import type {
  SettingSession,
  SettingsBlockedUser,
  SettingsPointsExchangeInput,
  SettingsPointsExchangeResult,
  SettingsUpdateInput,
  SettingsUpdateResult,
  SettingsUser,
} from "../types/settings.types"

export interface SettingsRepository {
  getCurrentUser(): Promise<SettingsUser>
  update(input: SettingsUpdateInput): Promise<SettingsUpdateResult>
  getSessions(): Promise<SettingSession[]>
  deleteSession(id: number | "all"): Promise<boolean>
  getBlockedUsers(): Promise<SettingsBlockedUser[]>
  unblockUser(userId: number): Promise<boolean>
  requestMyInfo(options: Record<string, boolean>): Promise<boolean>
  exchangePoints(input: SettingsPointsExchangeInput): Promise<SettingsPointsExchangeResult>
}
