// English description: Manages the create-page draft lifecycle and backend submission flow for the community create page route.

import { useStorage } from "@vueuse/core"
import { hasLocationCoordinates } from "../../../location/domain/types/location.types"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { createCommunityPageDraft } from "../factories/community-drafts"
import { getCommunityPagePath } from "../../domain/services/community-helpers.service"
import type { CommunityDraft } from "../../domain/types/community.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

type CommunityCreationState = "idle" | "loading" | "success" | "error"

export function useCommunityCreatePagePageVM(
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const draft = useStorage<CommunityDraft>(
    "community:create-page-draft",
    createCommunityPageDraft(),
    undefined,
    {
      mergeDefaults: true,
      initOnMounted: true,
    },
  )

  const submitState = ref<CommunityCreationState>("idle")
  const draftRestored = ref(false)

  const highlights = computed(() => [
    t("community.creation.page.highlights.0"),
    t("community.creation.page.highlights.1"),
    t("community.creation.page.highlights.2"),
  ])

  const nextSteps = computed(() => [
    {
      title: t("community.creation.page.nextSteps.step1Title"),
      description: t("community.creation.page.nextSteps.step1Desc"),
    },
    {
      title: t("community.creation.page.nextSteps.step2Title"),
      description: t("community.creation.page.nextSteps.step2Desc"),
    },
    {
      title: t("community.creation.page.nextSteps.step3Title"),
      description: t("community.creation.page.nextSteps.step3Desc"),
    },
  ])

  const isSubmitDisabled = computed(() =>
    submitState.value === "loading"
    || !(draft.value.name || "").trim()
    || !(draft.value.slug || "").trim()
    || (draft.value.description || "").trim().length < 24
    || !draft.value.category
    || !(draft.value.location?.address || "").trim()
    || !hasLocationCoordinates(draft.value.location),
  )

  onMounted(async () => {
    await nextTick()
    draftRestored.value = !isDefaultDraft(draft.value)
  })

  watch(
    () => ({ ...draft.value }),
    () => {
      if (submitState.value !== "loading") {
        submitState.value = "idle"
      }

      draftRestored.value = false
    },
  )

  async function handleCreatePage() {
    submitState.value = "loading"

    try {
      const createdPage = await repository.createPage(draft.value)

      submitState.value = "success"

      toast.add({
        title: t("community.creation.common.statusSuccessTitle", {
          entity: t("community.creation.common.entityLabelPage"),
        }),
        description: t("community.creation.common.statusSuccessDescription", {
          entity: t("community.creation.common.entityLabelPage"),
        }),
        color: "success",
      })

      draft.value = createCommunityPageDraft()
      draftRestored.value = false

      await navigateTo(getCommunityPagePath(createdPage.slug))
    }
    catch {
      submitState.value = "error"

      toast.add({
        title: t("community.creation.common.statusErrorTitle"),
        description: t("community.creation.common.statusErrorDescription"),
        color: "error",
      })
    }
  }

  function isDefaultDraft(value: CommunityDraft) {
    const defaultDraft = createCommunityPageDraft()

    return value.name === defaultDraft.name
      && value.slug === defaultDraft.slug
      && value.description === defaultDraft.description
      && value.privacy === defaultDraft.privacy
      && value.category === defaultDraft.category
      && JSON.stringify(value.location ?? null) === JSON.stringify(defaultDraft.location ?? null)
  }

  return {
    draft,
    submitState,
    draftRestored,
    highlights,
    nextSteps,
    isSubmitDisabled,
    handleCreatePage,
    appRoutes,
  }
}
