// English description: Funding create/edit page view-model that owns form draft, image preview, and mutations.

import type { ComputedRef, Ref } from "vue"
import type { FundingCampaign } from "../../domain/types/funding.types"
import { createApiFundingRepository } from "../../infrastructure/repositories/ApiFundingRepository"

type FundingEditorMode = "create" | "edit"
type MaybeRef<T> = T | Ref<T> | ComputedRef<T>
type FundingEditorOptions = {
  mode: MaybeRef<FundingEditorMode>
  campaignId?: MaybeRef<string>
}

export function useCreateFundingPageVM(options: FundingEditorOptions) {
  const toast = useToast()
  const repository = createApiFundingRepository()
  const submitting = ref(false)
  const imageFile = ref<File | null>(null)
  const previewUrl = ref("")
  const previewIsObjectUrl = ref(false)
  const isEditMode = computed(() => unref(options.mode) === "edit")
  const campaignId = computed(() => unref(options.campaignId) || "")
  const draft = reactive({
    title: "",
    amount: null as number | null,
    description: "",
  })

  const { data: campaignData, pending: loadingCampaign } = useAsyncData(
    () => `funding-edit:${campaignId.value}`,
    () => repository.getCampaign(campaignId.value),
    {
      immediate: isEditMode.value && Boolean(campaignId.value),
      watch: [campaignId],
    },
  )

  const campaign = computed(() => campaignData.value?.campaign ?? null)

  watch(
    campaign,
    (currentCampaign) => {
      if (!currentCampaign || !isEditMode.value) return
      draft.title = currentCampaign.title
      draft.amount = currentCampaign.amount
      draft.description = currentCampaign.description
      previewUrl.value = currentCampaign.imageUrl
      previewIsObjectUrl.value = false
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    revokePreview()
  })

  const revokePreview = () => {
    if (!previewUrl.value || !previewIsObjectUrl.value || !import.meta.client) return
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ""
    previewIsObjectUrl.value = false
  }

  const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    imageFile.value = input.files?.[0] ?? null
    revokePreview()

    if (imageFile.value && import.meta.client) {
      previewUrl.value = URL.createObjectURL(imageFile.value)
      previewIsObjectUrl.value = true
    }
  }

  const submit = async () => {
    if (!draft.title || !draft.description || !draft.amount || (!isEditMode.value && !imageFile.value)) return
    submitting.value = true

    try {
      if (isEditMode.value) {
        const currentCampaign = campaign.value
        if (!currentCampaign) return

        await repository.updateCampaign(currentCampaign.id, {
          title: draft.title,
          amount: draft.amount,
          description: draft.description,
        })
        await navigateTo(currentCampaign.detailUrl)
        return
      }

      if (!imageFile.value) return

      await repository.createCampaign({
        title: draft.title,
        amount: draft.amount,
        description: draft.description,
        image: imageFile.value,
      })
      await navigateTo("/funding?tab=mine")
    }
    catch (err) {
      toast.add({
        color: "error",
        title: err instanceof Error ? err.message : "Unable to save funding campaign.",
      })
    }
    finally {
      submitting.value = false
    }
  }

  return {
    campaign: campaign as ComputedRef<FundingCampaign | null>,
    draft,
    imageFile,
    previewUrl,
    submitting,
    loadingCampaign,
    isEditMode,
    onFileChange,
    submit,
  }
}
