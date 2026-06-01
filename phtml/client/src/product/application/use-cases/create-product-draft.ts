import type { ProductEditorDraft, ProductRecord } from "../../domain/types/product-editor.types"

export const createEmptyProductDraft = (): ProductEditorDraft => ({
  mode: "create",
  fields: {
    title: "",
    price: "",
    description: "",
    category: "vehicles",
    condition: "new",
    location: "",
    currency: "USD",
    stock: "",
  },
  removedImageIds: [],
  lastSavedAt: null,
})

export const createDraftFromProductRecord = (product: ProductRecord): ProductEditorDraft => ({
  mode: "edit",
  productId: product.id,
  fields: {
    title: product.title,
    price: String(product.price),
    description: product.description,
    category: product.category,
    condition: product.condition,
    location: product.location,
    currency: product.currency,
    stock: String(product.stock),
  },
  removedImageIds: [],
  lastSavedAt: null,
})
