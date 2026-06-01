// English description: Settings page ViewModel that maps settings screen state and commands to the PHP-backed repository.

import { toValue, type MaybeRefOrGetter } from "vue"
import { createApiSettingsRepository } from "../../infrastructure/repositories/ApiSettingsRepository"
import {
  normalizeLocationSelection,
  type LocationSelection,
} from "../../../location/domain/types/location.types"
import type {
  SettingSession,
  SettingsBlockedUser,
  SettingsFieldValue,
  SettingsSectionSlug,
  SettingsUpdateInput,
  SettingsUser,
} from "../../domain/types/settings.types"
import type {
  SettingField,
  SettingFieldType,
  SettingFieldValue,
  SettingItem,
  SettingPage,
} from "./settings-page.types"

export type { SettingField, SettingFieldValue, SettingItem, SettingPage }

type SettingTranslate = ReturnType<typeof useI18n>["t"]
type SettingOptionDefinition = {
  labelKey: string
  value: string
}

const settingsText = (
  t: SettingTranslate,
  key: string,
  params?: Record<string, string | number | boolean>,
) => t(`settings.data.${key}`, params ?? {})

const pageText = (
  t: SettingTranslate,
  page: string,
  key: string,
  params?: Record<string, string | number | boolean>,
) => settingsText(t, `pages.${page}.${key}`, params)

const fieldText = (
  t: SettingTranslate,
  key: string,
  params?: Record<string, string | number | boolean>,
) => settingsText(t, `fields.${key}`, params)

const messageText = (
  t: SettingTranslate,
  key: string,
  params?: Record<string, string | number | boolean>,
) => settingsText(t, `messages.${key}`, params)

const pageIcons: Record<string, string> = {
  general: "i-ph-user-fill",
  profile: "i-ph-identification-card-fill",
  privacy: "i-ph-lock-key-fill",
  avatar: "i-ph-image-fill",
  password: "i-ph-key-fill",
  twoFactor: "i-ph-shield-check-fill",
  notifications: "i-ph-bell-fill",
  emailNotifications: "i-ph-envelope-fill",
  socialLinks: "i-ph-link-fill",
  verification: "i-ph-seal-check-fill",
  deleteAccount: "i-ph-warning-octagon-fill",
  myPoints: "i-ph-star-fill",
  manageSessions: "i-ph-devices-fill",
  blockedUsers: "i-ph-user-minus-fill",
  myInfo: "i-ph-info-fill",
  addresses: "i-ph-map-pin-fill",
  monetization: "i-ph-currency-circle-dollar-fill",
}

const supportedUpdateSections = new Set<SettingsSectionSlug>([
  "general",
  "profile",
  "privacy",
  "avatar",
  "password",
  "twoFactor",
  "notifications",
  "emailNotifications",
  "socialLinks",
  "deleteAccount",
])

const countryOptions: SettingOptionDefinition[] = [
  { labelKey: "options.countryVietnam", value: "233" },
  { labelKey: "options.countrySingapore", value: "192" },
  { labelKey: "options.countryThailand", value: "213" },
  { labelKey: "options.countryUnitedStates", value: "1" },
]

const genderOptions: SettingOptionDefinition[] = [
  { labelKey: "options.male", value: "male" },
  { labelKey: "options.female", value: "female" },
]

const relationshipOptions: SettingOptionDefinition[] = [
  { labelKey: "options.none", value: "0" },
  { labelKey: "options.single", value: "1" },
  { labelKey: "options.inRelationship", value: "2" },
  { labelKey: "options.married", value: "3" },
  { labelKey: "options.engaged", value: "4" },
]

const postPrivacyOptions: SettingOptionDefinition[] = [
  { labelKey: "options.everyone", value: "everyone" },
  { labelKey: "options.peopleIFollow", value: "ifollow" },
  { labelKey: "options.nobody", value: "nobody" },
]

const binaryOptions: SettingOptionDefinition[] = [
  { labelKey: "options.enabled", value: "1" },
  { labelKey: "options.disabled", value: "0" },
]

const messagePrivacyOptions: SettingOptionDefinition[] = [
  { labelKey: "options.everyone", value: "0" },
  { labelKey: "options.peopleIFollow", value: "1" },
  { labelKey: "options.nobody", value: "2" },
]

const friendPrivacyOptions: SettingOptionDefinition[] = [
  { labelKey: "options.everyone", value: "0" },
  { labelKey: "options.peopleIFollow", value: "1" },
  { labelKey: "options.peopleFollowingMe", value: "2" },
  { labelKey: "options.nobody", value: "3" },
]

const twoFactorOptions: SettingOptionDefinition[] = [
  { labelKey: "options.enable", value: "enable" },
  { labelKey: "options.disable", value: "disable" },
]

const twoFactorMethodOptions: SettingOptionDefinition[] = [
  { labelKey: "options.emailSmsCode", value: "two_factor" },
  { labelKey: "options.googleAuthenticator", value: "google" },
  { labelKey: "options.authy", value: "authy" },
]

const optionLabel = (
  t: SettingTranslate,
  options: SettingOptionDefinition[],
  value: unknown,
) => {
  const option = options.find(option => option.value === String(value ?? ""))

  return option ? settingsText(t, option.labelKey) : ""
}

const optionValue = (
  t: SettingTranslate,
  options: SettingOptionDefinition[],
  value: SettingsFieldValue,
) => options.find(option =>
  settingsText(t, option.labelKey) === String(value) || option.value === String(value),
)?.value ?? String(value)

const optionLabels = (
  t: SettingTranslate,
  options: SettingOptionDefinition[],
) => options.map(option => settingsText(t, option.labelKey))

const toPhpBirthday = (value: SettingsFieldValue) => {
  const textValue = String(value)
  const isoMatch = textValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  return isoMatch ? `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}` : textValue
}

const toHtmlBirthday = (value: unknown) => {
  const textValue = String(value ?? "")
  const phpMatch = textValue.match(/^(\d{2})-(\d{2})-(\d{4})$/)

  return phpMatch ? `${phpMatch[3]}-${phpMatch[2]}-${phpMatch[1]}` : textValue
}

const isTrue = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "on" || value === "enabled"

const toNullableNumber = (value: unknown) => {
  const normalized = Number(value)

  return Number.isFinite(normalized) ? normalized : null
}

const isLocationValue = (value: SettingsFieldValue): value is LocationSelection =>
  typeof value === "object"
  && value !== null
  && !(typeof File !== "undefined" && value instanceof File)
  && "address" in value

const hasAdminSettingsRights = (user: SettingsUser | null) =>
  user?.role === "admin" || user?.role === "moderator"

const inAppNotificationValue = (user: SettingsUser | null, key: string) => {
  const notificationSettings = user?.notification_settings
  return isTrue(notificationSettings?.[key])
}

const emailNotificationValue = (user: SettingsUser | null, key: string) => {
  return isTrue(user?.[key as keyof SettingsUser])
}

const field = (
  key: string,
  label: string,
  type: SettingFieldType,
  value: SettingField["value"],
  options?: string[],
  extra: Partial<SettingField> = {},
): SettingField => ({
  key,
  label,
  type,
  value,
  options,
  ...extra,
})

const summaryItem = (title: string, description: string, meta?: string): SettingItem => ({
  title,
  description,
  meta,
})

// const pageText = (t: SettingTranslate, page: string, key: string) =>
//   settingsText(t, `pages.${page}.${key}`)

// const fieldText = (t: SettingTranslate, key: string) =>
//   settingsText(t, `fields.${key}`)

// const messageText = (t: SettingTranslate, key: string, params?: Record<string, string | number | boolean>) =>
//   settingsText(t, `messages.${key}`, params)

const generalPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "general",
  label: pageText(t, "general", "label"),
  icon: pageIcons.general,
  description: pageText(t, "general", "description"),
  sections: [{
    title: pageText(t, "general", "sections.account.title"),
    description: pageText(t, "general", "sections.account.description"),
    kind: "form",
    fields: [
      field("username", fieldText(t, "username"), "text", user?.username ?? ""),
      field("phone_number", fieldText(t, "phone"), "tel", user?.phone ?? ""),
      field("gender", fieldText(t, "gender"), "select", optionLabel(t, genderOptions, user?.gender), optionLabels(t, genderOptions)),
      field("email", fieldText(t, "email"), "email", user?.email ?? "", undefined, { span: "full" }),
      field("birthday", fieldText(t, "birthday"), "date", toHtmlBirthday(user?.birthday)),
      field("country_id", fieldText(t, "country"), "select", optionLabel(t, countryOptions, user?.countryId), optionLabels(t, countryOptions)),
      field("verified", fieldText(t, "verification"), "verification", user?.verified ?? false, undefined, {
        span: "full",
        readOnly: !hasAdminSettingsRights(user),
      }),
      field("wallet", fieldText(t, "wallet"), "number", user?.wallet ?? "", undefined, {
        span: "full",
        readOnly: !hasAdminSettingsRights(user),
      }),
    ],
  }],
})

const profilePage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "profile",
  label: pageText(t, "profile", "label"),
  icon: pageIcons.profile,
  description: pageText(t, "profile", "description"),
  sections: [{
    title: pageText(t, "profile", "sections.publicProfile.title"),
    description: pageText(t, "profile", "sections.publicProfile.description"),
    kind: "form",
    fields: [
      field("first_name", fieldText(t, "firstName"), "text", user?.first_name ?? ""),
      field("last_name", fieldText(t, "lastName"), "text", user?.last_name ?? ""),
      field("website", fieldText(t, "website"), "url", user?.website ?? ""),
      field("about", fieldText(t, "about"), "textarea", user?.about ?? ""),
      field("working", fieldText(t, "working"), "text", user?.working ?? ""),
      field("working_link", fieldText(t, "workingLink"), "url", user?.working_link ?? ""),
      field("address", fieldText(t, "address"), "location", normalizeLocationSelection({
        address: user?.address ?? "",
        lat: toNullableNumber(user?.lat),
        lng: toNullableNumber(user?.lng),
      }), undefined, { span: "full" }),
      field("school", fieldText(t, "school"), "text", user?.school ?? ""),
      field("relationship", fieldText(t, "relationship"), "select", optionLabel(t, relationshipOptions, user?.relationship_id), optionLabels(t, relationshipOptions)),
      field("completed", fieldText(t, "schoolCompleted"), "select", optionLabel(t, binaryOptions, isTrue(user?.school_completed) ? "1" : "0"), optionLabels(t, binaryOptions)),
    ],
  }],
})

const privacyPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "privacy",
  label: pageText(t, "privacy", "label"),
  icon: pageIcons.privacy,
  description: pageText(t, "privacy", "description"),
  sections: [{
    title: pageText(t, "privacy", "sections.privacyControls.title"),
    description: pageText(t, "privacy", "sections.privacyControls.description"),
    kind: "form",
    fields: [
      field("message_privacy", fieldText(t, "messagePrivacy"), "select", optionLabel(t, messagePrivacyOptions, user?.message_privacy), optionLabels(t, messagePrivacyOptions)),
      field("follow_privacy", fieldText(t, "followPrivacy"), "select", optionLabel(t, binaryOptions, user?.follow_privacy), optionLabels(t, binaryOptions)),
      field("friend_privacy", fieldText(t, "friendPrivacy"), "select", optionLabel(t, friendPrivacyOptions, user?.friend_privacy), optionLabels(t, friendPrivacyOptions)),
      field("post_privacy", fieldText(t, "postPrivacy"), "select", optionLabel(t, postPrivacyOptions, user?.post_privacy), optionLabels(t, postPrivacyOptions)),
      field("showlastseen", fieldText(t, "showLastSeen"), "select", optionLabel(t, binaryOptions, user?.showlastseen), optionLabels(t, binaryOptions)),
      field("confirm_followers", fieldText(t, "confirmFollowers"), "select", optionLabel(t, binaryOptions, user?.confirm_followers), optionLabels(t, binaryOptions)),
      field("show_activities_privacy", fieldText(t, "showActivities"), "select", optionLabel(t, binaryOptions, user?.show_activities_privacy), optionLabels(t, binaryOptions)),
      field("visit_privacy", fieldText(t, "visitPrivacy"), "select", optionLabel(t, binaryOptions, user?.visit_privacy), optionLabels(t, binaryOptions)),
      field("birth_privacy", fieldText(t, "birthPrivacy"), "select", optionLabel(t, messagePrivacyOptions, user?.birth_privacy), optionLabels(t, messagePrivacyOptions)),
      field("status", fieldText(t, "onlineStatus"), "select", optionLabel(t, binaryOptions, user?.status), optionLabels(t, binaryOptions)),
      field("share_my_location", fieldText(t, "shareLocation"), "select", optionLabel(t, binaryOptions, user?.share_my_location), optionLabels(t, binaryOptions)),
      field("share_my_data", fieldText(t, "shareData"), "select", optionLabel(t, binaryOptions, user?.share_my_data), optionLabels(t, binaryOptions)),
    ],
  }],
})

const avatarPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "avatar",
  label: pageText(t, "avatar", "label"),
  icon: pageIcons.avatar,
  description: pageText(t, "avatar", "description"),
  sections: [{
    title: pageText(t, "avatar", "sections.uploadAvatar.title"),
    description: pageText(t, "avatar", "sections.uploadAvatar.description"),
    kind: "profile-images",
    fields: [
      field("avatar", fieldText(t, "avatarImage"), "file", "", undefined, {
        accept: ".jpg,.jpeg,.png,.gif",
        previewShape: "avatar",
        previewUrl: user?.avatar,
        span: "full",
      }),
      field("cover", fieldText(t, "coverImage"), "file", "", undefined, {
        accept: ".jpg,.jpeg,.png,.gif",
        previewShape: "cover",
        previewUrl: user?.cover,
        span: "full",
      }),
    ],
  }],
})

const passwordPage = (t: SettingTranslate): SettingPage => ({
  slug: "password",
  label: pageText(t, "password", "label"),
  icon: pageIcons.password,
  description: pageText(t, "password", "description"),
  sections: [{
    title: pageText(t, "password", "sections.changePassword.title"),
    description: pageText(t, "password", "sections.changePassword.description"),
    kind: "form",
    fields: [
      field("current_password", fieldText(t, "currentPassword"), "password", ""),
      field("new_password", fieldText(t, "newPassword"), "password", ""),
      field("repeat_new_password", fieldText(t, "confirmPassword"), "password", ""),
    ],
  }],
})

const twoFactorPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "twoFactor",
  label: pageText(t, "twoFactor", "label"),
  icon: pageIcons.twoFactor,
  description: pageText(t, "twoFactor", "description"),
  sections: [{
    title: pageText(t, "twoFactor", "sections.authenticator.title"),
    description: messageText(t, "twoFactorStatus", {
      status: settingsText(t, isTrue(user?.two_factor) ? "options.enabled" : "options.disabled"),
    }),
    kind: "form",
    fields: [
      field("two_factor", fieldText(t, "twoFactorAction"), "select", optionLabel(t, twoFactorOptions, isTrue(user?.two_factor) ? "disable" : "enable"), optionLabels(t, twoFactorOptions)),
      field("phone_number", fieldText(t, "twoFactorPhone"), "tel", user?.phone ?? ""),
      field("code", fieldText(t, "verificationCode"), "text", ""),
      field("factor_method", fieldText(t, "verificationMethod"), "select", optionLabel(t, twoFactorMethodOptions, user?.two_factor_method || "two_factor"), optionLabels(t, twoFactorMethodOptions)),
    ],
  }],
})

const notificationKeys = [
  ["e_liked", "liked"],
  ["e_shared", "shared"],
  ["e_wondered", "wondered"],
  ["e_commented", "commented"],
  ["e_followed", "followed"],
  ["e_liked_page", "likedPage"],
  ["e_visited", "visited"],
  ["e_mentioned", "mentioned"],
  ["e_joined_group", "joinedGroup"],
  ["e_accepted", "accepted"],
  ["e_profile_wall_post", "profileWallPost"],
  ["e_memory", "memory"],
] as const

const notificationsPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "notifications",
  label: pageText(t, "notifications", "label"),
  icon: pageIcons.notifications,
  description: pageText(t, "notifications", "description"),
  sections: [{
    title: pageText(t, "notifications", "sections.inApp.title"),
    description: pageText(t, "notifications", "sections.inApp.description"),
    kind: "toggles",
    toggles: notificationKeys.map(([key, labelKey]) => ({
      key,
      label: settingsText(t, `notificationTypes.${labelKey}.label`),
      description: settingsText(t, `notificationTypes.${labelKey}.description`),
      enabled: inAppNotificationValue(user, key),
    })),
  }],
})

const emailNotificationKeys = notificationKeys
  .filter(([key]) => key !== "e_memory")
  .concat([["e_sentme_msg", "sentMeMessage"] as const])

const emailNotificationsPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "emailNotifications",
  label: pageText(t, "emailNotifications", "label"),
  icon: pageIcons.emailNotifications,
  description: pageText(t, "emailNotifications", "description"),
  sections: [{
    title: pageText(t, "emailNotifications", "sections.email.title"),
    description: pageText(t, "emailNotifications", "sections.email.description"),
    kind: "toggles",
    toggles: emailNotificationKeys.map(([key, labelKey]) => ({
      key,
      label: settingsText(t, `notificationTypes.${labelKey}.label`),
      description: settingsText(t, `emailNotificationTypes.${labelKey}.description`),
      enabled: emailNotificationValue(user, key),
    })),
  }],
})

const socialLinksPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "socialLinks",
  label: pageText(t, "socialLinks", "label"),
  icon: pageIcons.socialLinks,
  description: pageText(t, "socialLinks", "description"),
  sections: [{
    title: pageText(t, "socialLinks", "sections.socialLinks.title"),
    description: pageText(t, "socialLinks", "sections.socialLinks.description"),
    kind: "form",
    fields: [
      field("facebook", fieldText(t, "facebook"), "url", user?.facebook ?? ""),
      field("twitter", fieldText(t, "twitter"), "url", user?.twitter ?? ""),
      field("linkedin", fieldText(t, "linkedin"), "url", user?.linkedin ?? ""),
      field("instagram", fieldText(t, "instagram"), "url", user?.instagram ?? ""),
      field("youtube", fieldText(t, "youtube"), "url", user?.youtube ?? ""),
      field("vk", fieldText(t, "vk"), "url", user?.vk ?? ""),
    ],
  }],
})

const verificationPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "verification",
  label: pageText(t, "verification", "label"),
  icon: pageIcons.verification,
  description: pageText(t, "verification", "description"),
  sections: [{
    title: pageText(t, "verification", "sections.request.title"),
    description: pageText(t, "verification", "sections.request.description"),
    kind: "summary",
    items: [
      summaryItem(
        user?.verified ? fieldText(t, "verified") : fieldText(t, "notVerified"),
        messageText(t, "verificationSummary"),
      ),
    ],
  }],
})

const deleteAccountPage = (t: SettingTranslate): SettingPage => ({
  slug: "deleteAccount",
  label: pageText(t, "deleteAccount", "label"),
  icon: pageIcons.deleteAccount,
  description: pageText(t, "deleteAccount", "description"),
  sections: [{
    title: pageText(t, "deleteAccount", "sections.deleteAccount.title"),
    description: pageText(t, "deleteAccount", "sections.deleteAccount.description"),
    kind: "danger",
    fields: [
      field("password", fieldText(t, "passwordConfirm"), "password", ""),
    ],
    actions: [{ label: pageText(t, "deleteAccount", "sections.deleteAccount.action"), icon: "i-ph-trash-duotone", tone: "danger" }],
  }],
})

const myPointsPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "myPoints",
  label: pageText(t, "myPoints", "label"),
  icon: pageIcons.myPoints,
  description: pageText(t, "myPoints", "description"),
  sections: [{
    title: pageText(t, "myPoints", "sections.myPoints.title"),
    description: pageText(t, "myPoints", "sections.myPoints.description"),
    kind: "summary",
    items: [
      summaryItem(messageText(t, "pointsValue", { points: user?.points ?? 0 }), messageText(t, "currentBalance"), messageText(t, "backendSource")),
    ],
  }],
})

const manageSessionsPage = (t: SettingTranslate, sessions: SettingSession[]): SettingPage => ({
  slug: "manage-sessions",
  label: pageText(t, "manage-sessions", "label"),
  icon: pageIcons.manageSessions,
  description: pageText(t, "manage-sessions", "description"),
  sections: [{
    title: pageText(t, "manage-sessions", "sections.sessions.title"),
    description: pageText(t, "manage-sessions", "sections.sessions.description"),
    kind: "list",
    items: sessions.map(session => ({
      id: session.id,
      title: `${session.browser} (${session.platform})`,
      description: session.ip,
      meta: session.time,
      action: pageText(t, "manage-sessions", "sections.sessions.action"),
    })),
  }],
})

const blockedUsersPage = (t: SettingTranslate, blockedUsers: SettingsBlockedUser[]): SettingPage => ({
  slug: "blocked-users",
  label: pageText(t, "blocked-users", "label"),
  icon: pageIcons.blockedUsers,
  description: pageText(t, "blocked-users", "description"),
  sections: [{
    title: pageText(t, "blocked-users", "sections.blocked.title"),
    description: pageText(t, "blocked-users", "sections.blocked.description"),
    kind: "list",
    items: blockedUsers.map(user => ({
      id: user.id,
      title: user.name,
      description: "",
      meta: "",
      action: t("settings.section.unblockAction") || "Unblock",
    })),
  }],
})

const myInfoPage = (t: SettingTranslate): SettingPage => ({
  slug: "my-info",
  label: pageText(t, "my-info", "label"),
  icon: pageIcons.myInfo,
  description: pageText(t, "my-info", "description"),
  sections: [{
    title: pageText(t, "my-info", "sections.download.title"),
    description: pageText(t, "my-info", "sections.download.description"),
    kind: "toggles",
    toggles: [
      { key: "my_information", label: pageText(t, "my-info", "sections.download.fields.my_information"), description: "", enabled: true },
      { key: "posts", label: pageText(t, "my-info", "sections.download.fields.posts"), description: "", enabled: true },
      { key: "pages", label: pageText(t, "my-info", "sections.download.fields.pages"), description: "", enabled: true },
      { key: "groups", label: pageText(t, "my-info", "sections.download.fields.groups"), description: "", enabled: true },
      { key: "following", label: pageText(t, "my-info", "sections.download.fields.following"), description: "", enabled: true },
      { key: "followers", label: pageText(t, "my-info", "sections.download.fields.followers"), description: "", enabled: true },
    ],
    actions: [{ label: pageText(t, "my-info", "sections.download.action"), icon: "i-ph-download-simple-duotone" }],
  }],
})

const addressesPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "addresses",
  label: pageText(t, "addresses", "label"),
  icon: pageIcons.addresses,
  description: pageText(t, "addresses", "description"),
  sections: [{
    title: pageText(t, "addresses", "sections.list.title"),
    description: pageText(t, "addresses", "sections.list.description"),
    kind: "list",
    actions: [{ label: pageText(t, "addresses", "sections.list.action"), icon: "i-ph-plus-duotone" }],
  }],
})

const monetizationPage = (t: SettingTranslate, user: SettingsUser | null): SettingPage => ({
  slug: "monetization",
  label: pageText(t, "monetization", "label"),
  icon: pageIcons.monetization,
  description: pageText(t, "monetization", "description"),
  sections: [{
    title: pageText(t, "monetization", "sections.plans.title"),
    description: pageText(t, "monetization", "sections.plans.description"),
    kind: "list",
    actions: [{ label: pageText(t, "monetization", "sections.plans.action"), icon: "i-ph-plus-duotone" }],
  }],
})

const createPages = (
  t: SettingTranslate,
  user: SettingsUser | null,
  sessions: SettingSession[],
  blockedUsers: SettingsBlockedUser[],
): SettingPage[] => [
  generalPage(t, user),
  profilePage(t, user),
  privacyPage(t, user),
  avatarPage(t, user),
  passwordPage(t),
  twoFactorPage(t, user),
  notificationsPage(t, user),
  emailNotificationsPage(t, user),
  socialLinksPage(t, user),
  verificationPage(t, user),
  myPointsPage(t, user),
  manageSessionsPage(t, sessions),
  blockedUsersPage(t, blockedUsers),
  myInfoPage(t),
  addressesPage(t, user),
  monetizationPage(t, user),
  deleteAccountPage(t),
]

const mapFieldsForSection = (
  t: SettingTranslate,
  section: string,
  fields: Record<string, SettingsFieldValue>,
) => {
  const payload: Record<string, SettingsFieldValue> = {}

  for (const [key, value] of Object.entries(fields)) {
    if (key === "address" && isLocationValue(value)) {
      const location = normalizeLocationSelection(value)
      payload.address = location.address

      if (location.lat !== null) {
        payload.lat = location.lat
      }

      if (location.lng !== null) {
        payload.lng = location.lng
      }

      continue
    }

    switch (key) {
      case "gender":
        payload[key] = optionValue(t, genderOptions, value)
        break
      case "birthday":
        payload[key] = toPhpBirthday(value)
        break
      case "country_id":
        payload[key] = optionValue(t, countryOptions, value)
        break
      case "relationship":
        payload[key] = optionValue(t, relationshipOptions, value)
        break
      case "post_privacy":
        payload[key] = optionValue(t, postPrivacyOptions, value)
        break
      case "message_privacy":
      case "birth_privacy":
        payload[key] = optionValue(t, messagePrivacyOptions, value)
        break
      case "friend_privacy":
        payload[key] = optionValue(t, friendPrivacyOptions, value)
        break
      case "follow_privacy":
      case "showlastseen":
      case "confirm_followers":
      case "show_activities_privacy":
      case "visit_privacy":
      case "status":
      case "share_my_location":
      case "share_my_data":
      case "completed":
        payload[key] = optionValue(t, binaryOptions, value)
        break
      case "two_factor":
        payload[key] = optionValue(t, twoFactorOptions, value)
        break
      case "factor_method":
        payload[key] = optionValue(t, twoFactorMethodOptions, value)
        break
      default:
        payload[key] = value
    }
  }

  if (section === "password") {
    payload.repeat_new_password = payload.repeat_new_password || payload.confirm_password || ""
  }

  return payload
}

export const useSettingsPageVM = (
  pageSlugSource: MaybeRefOrGetter<string | undefined> = undefined,
) => {
  const { t } = useI18n()
  const user = ref<SettingsUser | null>(null)
  const loading = ref(false)
  const errorMessage = ref("")
  const settingsRepository = createApiSettingsRepository()

  async function hydrate() {
    loading.value = true
    errorMessage.value = ""

    try {
      user.value = await settingsRepository.getCurrentUser()
    }
    catch (error) {
      user.value = null
      errorMessage.value = error instanceof Error ? error.message : messageText(t, "loadError")
    }
    finally {
      loading.value = false
    }
  }

  async function updateSettings(section: string, fields: Record<string, SettingFieldValue>) {
    errorMessage.value = ""

    if (!supportedUpdateSections.has(section as SettingsSectionSlug)) {
      throw new Error(messageText(t, "readOnlySection"))
    }

    const mappedFields = mapFieldsForSection(t, section, fields)

    if (Object.keys(mappedFields).length === 0) {
      throw new Error(messageText(t, "noChangedFields"))
    }

    const updateInput: SettingsUpdateInput = {
      section: section as SettingsSectionSlug,
      fields: mappedFields,
    }

    const response = await settingsRepository.update(updateInput)

    await hydrate()

    return response.message
  }

  const sessions = ref<SettingSession[]>([])
  const blockedUsers = ref<SettingsBlockedUser[]>([])
  const defaultSlug = "general"
  const pages = computed<SettingPage[]>(() =>
    createPages(t, user.value, sessions.value, blockedUsers.value),
  )
  const findPageBySlug = (slug: string) => pages.value.find(page => page.slug === slug)
  const activePage = computed<SettingPage>(() =>
    findPageBySlug(toValue(pageSlugSource) || defaultSlug) ?? findPageBySlug(defaultSlug)!,
  )
  const userInitials = computed(() => {
    const name = user.value?.name || user.value?.username || ""
    const parts = name.trim().split(/\s+/).filter(Boolean)

    return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("")
  })

  async function fetchSessions() {
    loading.value = true
    try {
      sessions.value = await settingsRepository.getSessions()
    } finally {
      loading.value = false
    }
  }

  async function deleteSession(id: number | "all") {
    const success = await settingsRepository.deleteSession(id)
    if (success) await fetchSessions()
    return success
  }

  async function fetchBlockedUsers() {
    loading.value = true
    try {
      blockedUsers.value = await settingsRepository.getBlockedUsers()
    } finally {
      loading.value = false
    }
  }

  async function unblockUser(userId: number) {
    const success = await settingsRepository.unblockUser(userId)
    if (success) await fetchBlockedUsers()
    return success
  }

  async function requestMyInfo(options: Record<string, boolean>) {
    return await settingsRepository.requestMyInfo(options)
  }

  async function exchangePoints(points: number) {
    const response = await settingsRepository.exchangePoints({ points })
    await hydrate()
    return response
  }

  async function handleItemAction(item: SettingItem) {
    if (!item.id) return

    if (activePage.value.slug === "manage-sessions") {
      await deleteSession(item.id as number)
      return
    }

    if (activePage.value.slug === "blocked-users") {
      await unblockUser(item.id as number)
    }
  }

  watch(() => activePage.value.slug, (slug) => {
    if (slug === "manage-sessions") fetchSessions()
    if (slug === "blocked-users") fetchBlockedUsers()
  }, { immediate: true })

  void hydrate()

  return {
    pages,
    user,
    activePage,
    sessions,
    blockedUsers,
    loading,
    errorMessage,
    defaultSlug,
    userInitials,
    hydrate,
    updateSettings,
    handleItemAction,
    fetchSessions,
    deleteSession,
    fetchBlockedUsers,
    unblockUser,
    requestMyInfo,
    exchangePoints,
    findPageBySlug,
  }
}
