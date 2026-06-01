import type { ProductEditorDraft } from "../types/product-editor.types"

const hasText = (value: string) => value.trim().length > 0

export const getProductEditorCompletionCount = (draft: ProductEditorDraft) =>
  [
    hasText(draft.fields.title),
    hasText(draft.fields.price),
    hasText(draft.fields.description),
    hasText(draft.fields.category),
    hasText(draft.fields.condition),
    hasText(draft.fields.location),
    hasText(draft.fields.stock),
  ].filter(Boolean).length

export const validateProductEditorDraft = (draft: ProductEditorDraft) => {
  const errors: string[] = []

  if (!hasText(draft.fields.title)) errors.push("Title is required")
  if (!hasText(draft.fields.description)) errors.push("Description is required")
  if (!hasText(draft.fields.location)) errors.push("Location is required")

  const price = Number(draft.fields.price)
  if (!Number.isFinite(price) || price <= 0) {
    errors.push("Price must be greater than zero")
  }

  const stock = Number(draft.fields.stock)
  if (!Number.isFinite(stock) || stock < 0) {
    errors.push("Stock must be zero or greater")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
