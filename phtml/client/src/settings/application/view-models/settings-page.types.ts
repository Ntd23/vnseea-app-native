// English description: Application-level view models for rendering account settings screens.

import type { SettingsFieldValue } from "../../domain/types/settings.types"

export type SettingFieldType =
  | "text"
  | "email"
  | "tel"
  | "date"
  | "select"
  | "textarea"
  | "password"
  | "file"
  | "number"
  | "url"
  | "verification"
  | "location"

export type SettingSectionKind =
  | "form"
  | "toggles"
  | "list"
  | "danger"
  | "summary"
  | "profile-images"

export type SettingField = {
  label: string
  key: string
  type: SettingFieldType
  value: SettingsFieldValue
  description?: string
  placeholder?: string
  accept?: string
  options?: string[]
  previewUrl?: string
  previewShape?: "avatar" | "cover" | "image"
  span?: "full"
  readOnly?: boolean
}

export type SettingFieldValue = SettingsFieldValue

export type SettingToggle = {
  key: string
  label: string
  description: string
  enabled: boolean
  readOnly?: boolean
}

export type SettingAction = {
  label: string
  icon: string
  tone?: "primary" | "danger" | "neutral"
}

export type SettingItem = {
  id?: string | number
  title: string
  description: string
  meta?: string
  action?: string
}

export type SettingSection = {
  title: string
  description: string
  kind: SettingSectionKind
  fields?: SettingField[]
  toggles?: SettingToggle[]
  items?: SettingItem[]
  actions?: SettingAction[]
}

export type SettingPage = {
  slug: string
  label: string
  icon: string
  description: string
  sections: SettingSection[]
}
