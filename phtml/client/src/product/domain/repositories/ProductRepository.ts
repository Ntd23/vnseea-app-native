// English description: Product repository contract for marketplace listing and editor operations.

import type { ProductEditorDraft, ProductRecord } from "../types/product-editor.types"
import type { ProductMarketplaceQuery, ProductMarketplaceResponse } from "../types/product-marketplace.types"

export interface ProductRepository {
  list(query?: ProductMarketplaceQuery): Promise<ProductMarketplaceResponse>
  addToCart(productId: number, quantity?: number): Promise<{ count: number }>
  getById(id: string): Promise<ProductRecord | null>
  create(draft: ProductEditorDraft): Promise<ProductRecord>
  update(id: string, draft: ProductEditorDraft): Promise<ProductRecord>
  delete(id: string | number): Promise<{ success: boolean }>
}
