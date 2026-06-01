import type { ProductEditorDraft } from "../../domain/types/product-editor.types"

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const loadProductEditorDraft = (
  storageKey: string,
  fallback: ProductEditorDraft,
): ProductEditorDraft => {
  if (typeof localStorage === "undefined") {
    return clone(fallback)
  }

  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return clone(fallback)
  }

  try {
    return JSON.parse(raw) as ProductEditorDraft
  }
  catch {
    return clone(fallback)
  }
}

export const saveProductEditorDraft = (storageKey: string, draft: ProductEditorDraft) => {
  if (typeof localStorage === "undefined") {
    return
  }

  localStorage.setItem(storageKey, JSON.stringify(draft))
}
