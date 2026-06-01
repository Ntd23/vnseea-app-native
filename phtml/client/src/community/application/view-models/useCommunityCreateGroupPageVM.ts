// English description: Manages the create-group draft lifecycle and backend submission flow for the community create group page.

import { useStorage } from "@vueuse/core"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { createCommunityGroupDraft } from "../factories/community-drafts"
import { getCommunityGroupPath } from "../../domain/services/community-helpers.service"
import type { CommunityDraft } from "../../domain/types/community.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

type CommunityCreationState = "idle" | "loading" | "success" | "error"

export function useCommunityCreateGroupPageVM(
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const draft = useStorage<CommunityDraft>(
    "community:create-group-draft",
    createCommunityGroupDraft(),
    undefined,
    {
      mergeDefaults: true,
      initOnMounted: true,
    },
  )

  const submitState = ref<CommunityCreationState>("idle")
  const draftRestored = ref(false)

  const highlights = computed(() => [
    t("community.creation.group.highlights[0]"),
    t("community.creation.group.highlights[1]"),
    t("community.creation.group.highlights[2]"),
  ])

  const isSubmitDisabled = computed(() =>
    submitState.value === "loading"
    || !(draft.value.name || "").trim()
    || !(draft.value.slug || "").trim()
    || (draft.value.description || "").trim().length < 24
    || !draft.value.privacy
    || !draft.value.category,
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

  async function handleCreateGroup() {
    submitState.value = "loading"

    try {
      const createdGroup = await repository.createGroup(draft.value)

      submitState.value = "success"

      toast.add({
        title: t("community.creation.common.statusSuccessTitle", {
          entity: t("community.creation.common.entityLabelGroup"),
        }),
        description: t("community.creation.common.statusSuccessDescription", {
          entity: t("community.creation.common.entityLabelGroup"),
        }),
        color: "success",
      })

      draft.value = createCommunityGroupDraft()
      draftRestored.value = false

      await navigateTo(getCommunityGroupPath(createdGroup.slug))
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
    const defaultDraft = createCommunityGroupDraft()

    return value.name === defaultDraft.name
      && value.slug === defaultDraft.slug
      && value.description === defaultDraft.description
      && value.privacy === defaultDraft.privacy
      && value.category === defaultDraft.category
  }

  return {
    draft,
    submitState,
    draftRestored,
    highlights,
    isSubmitDisabled,
    handleCreateGroup,
    appRoutes,
  }
}
