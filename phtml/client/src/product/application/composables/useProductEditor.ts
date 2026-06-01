import { computed, ref, watch } from "vue"
import { validateProductEditorDraft } from "../../domain/specifications/product-editor.specification"
import type { ProductEditorDraft } from "../../domain/types/product-editor.types"
import { saveProductEditorDraft } from "../../infrastructure/persistence/product-editor.storage"

export const useProductEditor = (
  storageKey: string,
  initialDraft: ProductEditorDraft,
) => {
  const draft = ref<ProductEditorDraft>(JSON.parse(JSON.stringify(initialDraft)) as ProductEditorDraft)
  const status = ref<"idle" | "saving" | "saved" | "error">("idle")

  const completionCount = computed(() =>
    [
      draft.value.fields.title.trim(),
      draft.value.fields.price.trim(),
      draft.value.fields.description.trim(),
      draft.value.fields.category,
      draft.value.fields.condition,
      draft.value.fields.location.trim(),
      draft.value.fields.stock.trim(),
    ].filter(Boolean).length,
  )

  const validation = computed(() => validateProductEditorDraft(draft.value))

  const markSaved = () => {
    draft.value.lastSavedAt = Date.now()
    status.value = "saved"
  }

  const persistDraft = () => {
    try {
      status.value = "saving"
      saveProductEditorDraft(storageKey, draft.value)
      markSaved()
    }
    catch {
      status.value = "error"
    }
  }

  watch(
    draft,
    () => {
      status.value = "idle"
    },
    { deep: true },
  )

  return {
    draft,
    status,
    completionCount,
    validation,
    persistDraft,
    markSaved,
  }
}
