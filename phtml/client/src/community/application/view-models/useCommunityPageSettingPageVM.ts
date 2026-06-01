// English description: Owns page settings draft persistence, preview mapping, validation, and backend save flow for the page settings route.

import { useStorage, watchDebounced } from "@vueuse/core"
import { normalizeLocationSelection } from "../../../location/domain/types/location.types"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useCommunityPageDetail } from "../composables/useCommunityPageDetail"
import { createCommunityPageSettingsDraft } from "../factories/community-drafts"
import { communityPageCategoryOptions, communityPageCtaOptions } from "../../domain/constants/community-options"
import {
  appendCommunityQuery,
  createCommunitySlug,
  getCommunityInitials,
  getCommunityOptionLabel,
  getCommunityPagePath,
  getCommunityPageSettingsPath,
} from "../../domain/services/community-helpers.service"
import type { CommunityPageRecord, CommunityPageSettingsDraft } from "../../domain/types/community.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

type PageSettingsState = "idle" | "loading" | "success" | "error"
type PageSettingsError = { name?: keyof CommunityPageSettingsDraft, message: string }

export function useCommunityPageSettingPageVM(
  repository = createApiCommunityRepository(),
) {
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { t } = useI18n()
  const translateText = useMaybeTranslatedText()

  const {
    page,
    categoryLabel: baseCategoryLabel,
    followerCountLabel,
    likeCountLabel,
    refresh: refreshPage,
  } = useCommunityPageDetail(computed(() => String(route.params.page || "")))

  const draft = ref<CommunityPageSettingsDraft>(createCommunityPageSettingsDraft())
  const saveState = ref<PageSettingsState>("idle")
  const draftRestored = ref(false)
  const storageHydrated = ref(false)
  const isSyncingDraft = ref(false)
  const isInitialized = ref(false)
  const activeTab = ref("basics")

  const draftStorage = useStorage<CommunityPageSettingsDraft | null>(
    `community:page-settings:${String(route.params.page || "")}`,
    null,
    undefined,
    { initOnMounted: true },
  )

  const normalizedTags = computed(() =>
    (draft.value.tags || "").split(",").map(tag => tag.trim()).filter(Boolean),
  )

  const previewPage = computed<CommunityPageRecord | null>(() => {
    if (!page.value) return null

    // Resolve avatar: prefer blob/draft URL (from file picker), then page value
    const avatarUrl = draft.value.avatarUrl || page.value.avatarUrl

    // Resolve banner: prefer blob URL from draft, then page banner
    const bannerResolved = draft.value.bannerUrl || page.value.banner

    return {
      ...page.value,
      name: (draft.value.name || "").trim() || page.value.name,
      slug: (draft.value.slug || "").trim() || page.value.slug,
      summary: (draft.value.summary || "").trim() || page.value.summary,
      website: draft.value.showWebsite
        ? ((draft.value.website || "").trim() || page.value.website)
        : undefined,
      locationLabel: (normalizeLocationSelection(draft.value.location).address || draft.value.locationLabel || "").trim() || page.value.locationLabel,
      lat: normalizeLocationSelection(draft.value.location).lat ?? page.value.lat,
      lng: normalizeLocationSelection(draft.value.location).lng ?? page.value.lng,
      placeId: normalizeLocationSelection(draft.value.location).placeId || page.value.placeId,
      category: draft.value.category,
      ctaLabel: (draft.value.ctaLabel || "").trim() || page.value.ctaLabel,
      responseLabel: (draft.value.responseLabel || "").trim() || page.value.responseLabel,
      ownerLabel: (draft.value.ownerLabel || "").trim() || page.value.ownerLabel,
      tags: normalizedTags.value.length > 0 ? normalizedTags.value : page.value.tags,
      avatarUrl,
      banner: bannerResolved,
    }
  })

  const selectedCategoryLabel = computed(() =>
    t(getCommunityOptionLabel(communityPageCategoryOptions, draft.value.category, baseCategoryLabel.value)),
  )
  const selectedCtaLabel = computed(() => {
    const value = (draft.value.ctaLabel || "").trim() || page.value?.ctaLabel
    if (!value) return t("community.pageSettings.basics.stats.ctaFallback")
    
    return t(getCommunityOptionLabel(communityPageCtaOptions, value, value))
  })
  const totalPolicies = 5
  const enabledPolicies = computed(() =>
    [
      draft.value.allowMessages,
      draft.value.showFollowerCount,
      draft.value.showLikeCount,
      draft.value.showWebsite,
      draft.value.recommendRelatedPages,
    ].filter(Boolean).length,
  )
  const pagePath = computed(() =>
    page.value
      ? appendCommunityQuery(getCommunityPagePath(page.value.slug), route.query)
      : appRoutes.pages,
  )
  const settingsNavItems = computed(() => [
    { id: "basics", label: t("community.pageSettings.basics.title"), desc: t("community.pageSettings.basics.navDesc"), icon: "i-ph-identification-card-duotone" },
    { id: "media", label: t("community.pageSettings.sidebar.media.title"), desc: t("community.pageSettings.sidebar.media.navDesc"), icon: "i-ph-image-duotone" },
    { id: "controls", label: t("community.pageSettings.controls.title"), desc: t("community.pageSettings.controls.navDesc"), icon: "i-ph-sliders-duotone" },
    { id: "analytics", label: t("community.pageSettings.sidebar.analytics.title"), desc: t("community.pageSettings.sidebar.analytics.desc"), icon: "i-ph-chart-bar-duotone" },
    { id: "delete", label: t("community.pageSettings.sidebar.delete.title"), desc: t("community.pageSettings.sidebar.delete.desc"), icon: "i-ph-trash-duotone" },
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
        title: t("community.pageSettings.finish.statusSavingTitle"),
        description: t("community.pageSettings.finish.statusSavingDescription"),
      }
    }

    if (saveState.value === "success") {
      return {
        color: "success" as const,
        icon: "i-ph-check-circle-fill",
        title: t("community.pageSettings.finish.statusSuccessTitle"),
        description: t("community.pageSettings.finish.statusSuccessDescription"),
      }
    }

    if (saveState.value === "error") {
      return {
        color: "error" as const,
        icon: "i-ph-warning-circle-fill",
        title: t("community.pageSettings.finish.statusErrorTitle"),
        description: t("community.pageSettings.finish.statusErrorDescription"),
      }
    }

    if (draftRestored.value) {
      return {
        color: "primary" as const,
        icon: "i-ph-clock-counter-clockwise-fill",
        title: t("community.pageSettings.finish.draftRestoredTitle"),
        description: t("community.pageSettings.finish.draftRestoredDescription"),
      }
    }

    return null
  })

  watch(page, (newVal, oldVal) => {
    if (!newVal) return
    
    // If we switched to a different page, reset initialization to sync fresh data
    if (newVal.slug !== oldVal?.slug) {
      isInitialized.value = false
    }
    
    syncDraftFromPage()
  }, { immediate: true })

  watchDebounced(
    () => normalizeDraft(draft.value),
    (value) => {
      if (!storageHydrated.value || !page.value) return
      draftStorage.value = { ...value }
    },
    { debounce: 250, maxWait: 1000 },
  )

  watch(
    () => ({ ...draft.value }),
    () => {
      // Skip if we are syncing from page data or in the middle of a save
      if (isSyncingDraft.value) return
      if (saveState.value === "loading" || saveState.value === "success") return
      saveState.value = "idle"
      draftRestored.value = false
    },
  )

  onMounted(async () => {
    storageHydrated.value = true
    await nextTick()
    syncDraftFromPage()
  })

  async function handleSave() {
    saveState.value = "loading"

    try {
      if (!page.value) throw new Error("page_missing")
      const oldSlug = page.value.slug
      const savedPage = await repository.updatePage(page.value.slug, draft.value)
      // After successful save, we want the next syncDraftFromPage to force-update from DB
      isInitialized.value = false
      
      // Cleanup blob URLs
      if (draft.value.avatarUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.value.avatarUrl)
      if (draft.value.bannerUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.value.bannerUrl)

      // Handle Slug Change: If the slug changed, we MUST update the URL first.
      // This will trigger the useAsyncData in useCommunityPageDetail to refetch the NEW slug.
      if (savedPage.slug !== oldSlug) {
        await router.replace(getCommunityPageSettingsPath(savedPage.slug))
        // The route change will trigger useAsyncData refetch automatically.
        // We give it a moment to resolve.
      } else {
        // Slug didn't change, just refresh the current data to get absolute truth from DB.
        await refreshPage()
      }
      
      saveState.value = "success"
      
      toast.add({
        title: t("community.pageSettings.finish.statusSuccessTitle"),
        description: t("community.pageSettings.finish.statusSuccessDescription"),
        color: "success",
      })
    }
    catch (err) {
      console.error("[PageSettings] Save failed:", err)
      saveState.value = "error"

      toast.add({
        title: t("community.pageSettings.finish.statusErrorTitle"),
        description: t("community.pageSettings.finish.statusErrorDescription"),
        color: "error",
      })
    }
  }

  function handleSaveError() {
    saveState.value = "error"
  }

  async function handleDeletePage(pageId: number, password: string) {
    try {
      await repository.deletePage(pageId, password)
      
      toast.add({
        title: t("community.pageSettings.delete.successTitle") || "Đã xóa trang",
        description: t("community.pageSettings.delete.successDescription") || "Trang đã được xóa thành công.",
        color: "success",
      })
      router.push(appRoutes.pages)
    }
    catch (err) {
      toast.add({
        title: t("community.pageSettings.delete.errorTitle") || "Xóa trang thất bại",
        description: t("community.pageSettings.delete.errorDescription") || "Đã xảy ra lỗi khi xóa trang. Vui lòng thử lại.",
        color: "error",
      })
    }
  }

  function syncDraftFromPage() {
    if (!page.value) return

    const baseDraft = createLocalizedDraft(page.value)
    
    // 1. Initial load: try to restore from storage once
    if (!isInitialized.value && storageHydrated.value && draftStorage.value) {
      const restoredDraft = normalizeDraft(draftStorage.value)
      
      if (restoredDraft.slug === baseDraft.slug && !isSameDraft(restoredDraft, baseDraft)) {
        applyDraft({
          ...baseDraft,
          ...restoredDraft,
          avatarUrl: baseDraft.avatarUrl,
          bannerUrl: baseDraft.bannerUrl,
        }, true)
        isInitialized.value = true
        return
      }
    }

    // 2. Default Sync: update draft from DB data
    // We do this if NOT initialized yet, OR if we just finished a save (isInitialized was reset to false)
    if (!isInitialized.value || isSyncingDraft.value) {
      applyDraft(baseDraft, false)
      isInitialized.value = true
    }
  }

  function applyDraft(value: CommunityPageSettingsDraft, restored: boolean) {
    isSyncingDraft.value = true
    draft.value = value
    draftRestored.value = restored
    // Never overwrite a loading/success state — handleSave sets these
    // and syncDraftFromPage (triggered by page watcher) must not undo them
    if (saveState.value !== "loading" && saveState.value !== "success") {
      saveState.value = "idle"
    }
    nextTick(() => {
      isSyncingDraft.value = false
    })
  }

  function createLocalizedDraft(value: CommunityPageRecord): CommunityPageSettingsDraft {
    return {
      ...createCommunityPageSettingsDraft(value),
      // Content fields can be localized
      name: translateText(value.name, value.slug),
      summary: translateText(value.summary),
      locationLabel: translateText(value.locationLabel),
      location: normalizeLocationSelection({
        address: translateText(value.locationLabel),
        lat: value.lat ?? null,
        lng: value.lng ?? null,
        placeId: value.placeId ?? "",
      }),
      // Technical/Value fields must NOT be localized as strings 
      // or they break the backend value mapping
      ctaLabel: value.ctaLabel || "",
      responseLabel: value.responseLabel || "",
      ownerLabel: value.ownerLabel || "",
      tags: value.tags.map(tag => translateText(tag, tag)).join(", "),
    }
  }

  function normalizeDraft(value: CommunityPageSettingsDraft): CommunityPageSettingsDraft {
    return {
      ...value,
      name: (value.name || "").trim(),
      slug: (value.slug || "").trim(),
      summary: (value.summary || "").trim(),
      website: (value.website || "").trim(),
      locationLabel: (value.locationLabel || "").trim(),
      location: normalizeLocationSelection({
        ...value.location,
        address: (value.location?.address || value.locationLabel || "").trim(),
      }),
      category: (value.category || "").trim(),
      ctaLabel: (value.ctaLabel || "").trim(),
      responseLabel: (value.responseLabel || "").trim(),
      ownerLabel: (value.ownerLabel || "").trim(),
      tags: (value.tags || "").split(",").map(tag => tag.trim()).filter(Boolean).join(", "),
    }
  }

  function isSameDraft(first: CommunityPageSettingsDraft, second: CommunityPageSettingsDraft) {
    return JSON.stringify(normalizeDraft(first)) === JSON.stringify(normalizeDraft(second))
  }

  const validateDraft = (state: CommunityPageSettingsDraft): PageSettingsError[] => {
    const errors: PageSettingsError[] = []
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

  const initials = computed(() =>
    getCommunityInitials(previewPage.value?.name || ""),
  )
  const followerPreview = computed(() =>
    draft.value.showFollowerCount ? followerCountLabel.value : t("community.pageSettings.sidebar.hidden"),
  )
  const likePreview = computed(() =>
    draft.value.showLikeCount ? likeCountLabel.value : t("community.pageSettings.sidebar.hidden"),
  )

  return {
    page,
    previewPage,
    draft,
    validateDraft,
    handleSave,
    handleSaveError,
    handleDeletePage,
    activeTab,
    pagePath,
    settingsNavItems,
    statusAlert,
    isBusy,
    isSaveDisabled,
    selectedCategoryLabel,
    followerCountLabel,
    likeCountLabel,
    selectedCtaLabel,
    enabledPolicies,
    totalPolicies,
    initials,
    followerPreview,
    likePreview,
    appRoutes,
  }
}
