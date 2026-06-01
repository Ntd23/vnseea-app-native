// English description: Owns group settings draft persistence, validation, preview mapping, and backend save flow for the group settings page.

import { useStorage, watchDebounced } from "@vueuse/core"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useCommunityGroupDetail } from "../composables/useCommunityGroupDetail"
import { createCommunityGroupSettingsDraft } from "../factories/community-drafts"
import {
  communityCategoryOptions,
  communityPrivacyOptions,
} from "../../domain/constants/community-options"
import {
  createCommunitySlug,
  getCommunityGroupPath,
  getCommunityOptionDescription,
  getCommunityOptionLabel,
} from "../../domain/services/community-helpers.service"
import type { CommunityGroupRecord, CommunityGroupSettingsDraft } from "../../domain/types/community.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

type GroupSettingsState = "idle" | "loading" | "success" | "error"
type GroupSettingsError = { name?: keyof CommunityGroupSettingsDraft, message: string }

export function useCommunityGroupSettingPageVM(
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const toast = useToast()
  const translateText = useMaybeTranslatedText()

  const { group, members, memberCountLabel, status } = useCommunityGroupDetail(computed(() => String(route.params.group || "")))

  const draft = ref<CommunityGroupSettingsDraft>(createCommunityGroupSettingsDraft())
  const saveState = ref<GroupSettingsState>("idle")
  const draftRestored = ref(false)
  const storageHydrated = ref(false)
  const isSyncingDraft = ref(false)
  const requests = ref<any[]>([])
  const loadingRequests = ref(false)
  const groupMembers = ref<any[]>([])
  const loadingMembers = ref(false)

  const draftStorage = useStorage<CommunityGroupSettingsDraft | null>(
    `community:group-settings:${String(route.params.group || "")}`,
    null,
    undefined,
    { initOnMounted: true },
  )

  const previewGroup = computed<CommunityGroupRecord | null>(() => {
    if (!group.value) return null

    return {
      ...group.value,
      name: (draft.value.name || "").trim() || group.value.name,
      slug: (draft.value.slug || "").trim() || group.value.slug,
      summary: (draft.value.summary || "").trim() || group.value.summary,
      privacy: draft.value.privacy,
      category: draft.value.category,
      avatar: draft.value.avatarUrl || group.value.avatar,
      banner: draft.value.bannerUrl || group.value.banner,
    }
  })

  const translatedGroupName = computed(() =>
    group.value ? translateText(group.value.name, group.value.slug) : "",
  )
  const selectedPrivacyLabel = computed(() =>
    t(getCommunityOptionLabel(communityPrivacyOptions, draft.value.privacy, "community.settings.controls.privacyFallback")),
  )
  const selectedPrivacyDescription = computed(() =>
    t(getCommunityOptionDescription(communityPrivacyOptions, draft.value.privacy, "community.settings.controls.noPrivacy")),
  )
  const selectedCategoryLabel = computed(() =>
    t(getCommunityOptionLabel(communityCategoryOptions, draft.value.category, "community.groups.card.noCategory")),
  )

  const totalPolicies = 1
  const enabledPolicies = computed(() =>
    [
      draft.value.joinApproval,
    ].filter(Boolean).length,
  )

  const visibleMembers = computed(() =>
    members.value.slice(0, 3),
  )

  const groupPath = computed(() =>
    group.value ? getCommunityGroupPath(group.value.slug) : appRoutes.groups,
  )
  const settingsNavItems = computed(() => [
    { id: "basics", label: t("community.settings.basics.title") },
    { id: "controls", label: t("community.settings.controls.title") },
    { id: "finish", label: t("community.settings.finish.title") },
  ])

  const isBusy = computed(() => saveState.value === "loading")
  const isSaveDisabled = computed(() =>
    isBusy.value
    || !(draft.value.name || "").trim()
    || !(draft.value.slug || "").trim()
    || (draft.value.summary || "").trim().length < 24
    || !draft.value.category,
  )

  const statusAlert = computed(() => {
    if (saveState.value === "loading") {
      return {
        color: "primary" as const,
        icon: "i-ph-spinner-gap-bold",
        title: t("community.settings.finish.statusSavingTitle"),
        description: t("community.settings.finish.statusSavingDescription"),
      }
    }

    if (saveState.value === "success") {
      return {
        color: "success" as const,
        icon: "i-ph-check-circle-fill",
        title: t("community.settings.finish.statusSuccessTitle"),
        description: t("community.settings.finish.statusSuccessDescription"),
      }
    }

    if (saveState.value === "error") {
      return {
        color: "error" as const,
        icon: "i-ph-warning-circle-fill",
        title: t("community.settings.finish.statusErrorTitle"),
        description: t("community.settings.finish.statusErrorDescription"),
      }
    }

    if (draftRestored.value) {
      return {
        color: "primary" as const,
        icon: "i-ph-clock-counter-clockwise-fill",
        title: t("community.settings.finish.draftRestoredTitle"),
        description: t("community.settings.finish.draftRestoredDescription"),
      }
    }

    return null
  })

  watch(group, (newGroup) => {
    syncDraftFromGroup()
    if (newGroup) {
      fetchRequests()
      fetchGroupMembers()
    }
  }, { immediate: true })

  async function fetchGroupMembers() {
    if (!group.value) return
    loadingMembers.value = true
    try {
      groupMembers.value = await repository.getGroupMembers(group.value.slug)
    }
    catch (err) {
      console.error("Failed to load group members:", err)
    }
    finally {
      loadingMembers.value = false
    }
  }

  async function handleKickMember(userId: number) {
    if (!group.value) return
    const confirmKick = window.confirm(t("community.settings.members.kickConfirm", "Bạn có chắc chắn muốn trục xuất thành viên này ra khỏi nhóm không?"))
    if (!confirmKick) return

    try {
      await repository.kickGroupMember(group.value.slug, userId)

      groupMembers.value = groupMembers.value.filter(m => m.id !== userId)

      toast.add({
        title: t("community.settings.members.kickSuccessTitle", "Đã trục xuất thành viên"),
        description: t("community.settings.members.kickSuccessDesc", "Thành viên đã bị xóa khỏi nhóm thành công."),
        color: "success",
      })
    }
    catch (err: any) {
      toast.add({
        title: t("community.settings.members.kickErrorTitle", "Trục xuất thất bại"),
        description: err?.data?.message || err?.message || t("community.settings.members.kickErrorDesc", "Không thể xóa thành viên này."),
        color: "error",
      })
    }
  }

  async function fetchRequests() {
    if (!group.value) return
    loadingRequests.value = true
    try {
      requests.value = await repository.getGroupRequests(group.value.slug)
    } catch (err) {
      console.error("Failed to load group requests:", err)
    } finally {
      loadingRequests.value = false
    }
  }

  async function handleRequestAction(userId: number, action: "accept" | "decline") {
    if (!group.value) return
    try {
      await repository.respondToGroupRequest(group.value.slug, userId, action)

      // Instantly remove from local requests list
      requests.value = requests.value.filter(req => req.id !== userId)

      // Show elegant feedback toast
      toast.add({
        title: action === "accept"
          ? t("community.settings.requests.acceptSuccessTitle")
          : t("community.settings.requests.declineSuccessTitle"),
        description: action === "accept"
          ? t("community.settings.requests.acceptSuccessDesc")
          : t("community.settings.requests.declineSuccessDesc"),
        color: "success",
      })
    }
    catch (err: any) {
      toast.add({
        title: t("community.settings.requests.actionErrorTitle"),
        description: err?.data?.message || err?.message || t("community.settings.requests.actionErrorDesc"),
        color: "error",
      })
    }
  }

  async function handleApproveAll() {
    if (!group.value || requests.value.length === 0) return
    const originalRequests = [...requests.value]
    loadingRequests.value = true
    try {
      await Promise.all(
        originalRequests.map(req => repository.respondToGroupRequest(group.value!.slug, req.id, "accept")),
      )

      requests.value = []

      toast.add({
        title: t("community.settings.requests.acceptAllSuccessTitle"),
        description: t("community.settings.requests.acceptAllSuccessDesc"),
        color: "success",
      })
    }
    catch (err: any) {
      await fetchRequests()

      toast.add({
        title: t("community.settings.requests.actionErrorTitle"),
        description: err?.data?.message || err?.message || t("community.settings.requests.actionErrorDesc"),
        color: "error",
      })
    }
    finally {
      loadingRequests.value = false
    }
  }

  watchDebounced(
    () => normalizeDraft(draft.value),
    (value) => {
      if (!storageHydrated.value || !group.value) return
      // We don't want to store File objects or temporary blob URLs in local storage
      const storageValue = { ...value }
      delete storageValue.avatarFile
      delete storageValue.bannerFile
      delete storageValue.avatarUrl
      delete storageValue.bannerUrl
      draftStorage.value = storageValue
    },
    { debounce: 250, maxWait: 1000 },
  )

  watch(
    () => ({ ...draft.value }),
    () => {
      if (isSyncingDraft.value) return
      if (saveState.value !== "loading") saveState.value = "idle"
      draftRestored.value = false
    },
  )

  onMounted(async () => {
    storageHydrated.value = true
    await nextTick()
    syncDraftFromGroup()
  })

  async function handleSave() {
    saveState.value = "loading"

    try {
      if (!group.value) throw new Error("group_missing")
      const savedGroup = await repository.updateGroup(group.value.slug, draft.value)
      const normalized = normalizeDraft(createLocalizedDraft(savedGroup))

      draft.value = { ...normalized }
      draftStorage.value = { ...normalized }
      draftRestored.value = false
      saveState.value = "success"

      toast.add({
        title: t("community.settings.finish.statusSuccessTitle"),
        description: t("community.settings.finish.statusSuccessDescription"),
        color: "success",
      })
    }
    catch (err: any) {
      saveState.value = "error"

      const errorMessage = err?.data?.message || err?.message || t("community.settings.finish.statusErrorDescription")

      toast.add({
        title: t("community.settings.finish.statusErrorTitle"),
        description: errorMessage,
        color: "error",
      })
    }
  }

  function handleSaveError() {
    saveState.value = "error"
  }

  function syncDraftFromGroup() {
    if (!group.value) return

    const baseDraft = createLocalizedDraft(group.value)
    const stored = draftStorage.value
    const restoredDraft = storageHydrated.value && stored && (stored.name || stored.summary)
      ? normalizeDraft(stored)
      : null

    const shouldRestore = restoredDraft && !isSameDraft(restoredDraft, baseDraft)

    applyDraft(
      shouldRestore ? { ...baseDraft, ...restoredDraft } : baseDraft,
      Boolean(shouldRestore),
    )
  }

  function applyDraft(value: CommunityGroupSettingsDraft, restored: boolean) {
    isSyncingDraft.value = true
    draft.value = value
    draftRestored.value = restored
    saveState.value = "idle"

    nextTick(() => {
      isSyncingDraft.value = false
    })
  }

  function createLocalizedDraft(value: CommunityGroupRecord): CommunityGroupSettingsDraft {
    return createCommunityGroupSettingsDraft(value)
  }

  function normalizeDraft(value: CommunityGroupSettingsDraft): CommunityGroupSettingsDraft {
    return {
      ...value,
      name: (value.name || "").trim(),
      slug: (value.slug || "").trim(),
      summary: (value.summary || "").trim(),
      website: (value.website || "").trim(),
      locationLabel: (value.locationLabel || "").trim(),
      category: (value.category || "").trim(),
      tags: (value.tags || "").split(",").map(tag => tag.trim()).filter(Boolean).join(", "),
      guidelines: (value.guidelines || "").split("\n").map(rule => rule.trim()).filter(Boolean).join("\n"),
    }
  }

  function isSameDraft(first: CommunityGroupSettingsDraft, second: CommunityGroupSettingsDraft) {
    return JSON.stringify(normalizeDraft(first)) === JSON.stringify(normalizeDraft(second))
  }

  const validateDraft = (state: CommunityGroupSettingsDraft): GroupSettingsError[] => {
    const errors: GroupSettingsError[] = []
    const slug = (state.slug || "").trim()

    if (!(state.name || "").trim()) {
      errors.push({ name: "name", message: t("community.creation.common.validationNameRequired") })
    }

    if (!slug) {
      errors.push({ name: "slug", message: t("community.creation.common.validationSlugRequired") })
    }
    else if (slug.length < 5 || createCommunitySlug(slug) !== slug) {
      errors.push({ name: "slug", message: t("community.creation.common.validationSlugInvalid") })
    }

    if ((state.summary || "").trim().length < 24) {
      errors.push({ name: "summary", message: t("community.creation.common.validationDescriptionRequired") })
    }

    if (!state.category) {
      errors.push({ name: "category", message: t("community.creation.common.validationCategoryRequired") })
    }

    return errors
  }

  return {
    group,
    status,
    previewGroup,
    translatedGroupName,
    memberCountLabel,
    selectedPrivacyLabel,
    selectedPrivacyDescription,
    selectedCategoryLabel,
    settingsNavItems,
    draft,
    validateDraft,
    handleSave,
    handleSaveError,
    groupPath,
    statusAlert,
    isBusy,
    isSaveDisabled,
    enabledPolicies,
    totalPolicies,
    visibleMembers,
    requests,
    loadingRequests,
    handleRequestAction,
    handleApproveAll,
    fetchRequests,
    groupMembers,
    loadingMembers,
    handleKickMember,
    fetchGroupMembers,
    appRoutes,
  }
}
