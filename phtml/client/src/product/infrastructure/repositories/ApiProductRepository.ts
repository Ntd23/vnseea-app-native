// English description: Product repository implementation that calls context-local Nuxt API bridges.

import type { ProductRepository } from "../../domain/repositories/ProductRepository"
import type { ProductEditorDraft, ProductRecord } from "../../domain/types/product-editor.types"
import type { ProductMarketplaceQuery, ProductMarketplaceResponse } from "../../domain/types/product-marketplace.types"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"

const productApiRoutes = {
  list: "product",
  cart: "product/cart",
  detail: (id: string) => `product/${id}`,
  create: "product/create",
  update: (id: string) => `product/${id}`,
}

export function createApiProductRepository(): ProductRepository {
  const client = useNuxtApiClient()

  return {
    list(query?: ProductMarketplaceQuery) {
      return client.get<ProductMarketplaceResponse>(productApiRoutes.list, query)
    },
    addToCart(productId: number, quantity = 1) {
      return client.post<{ count: number }, { productId: number; quantity: number }>(productApiRoutes.cart, {
        productId,
        quantity,
      })
    },
    getById(id: string) {
      return client.get<ProductRecord | null>(productApiRoutes.detail(id))
    },
    create(draft: ProductEditorDraft) {
      return client.post<ProductRecord, ProductEditorDraft>(productApiRoutes.create, draft)
    },
    update(id: string, draft: ProductEditorDraft) {
      return client.post<ProductRecord, ProductEditorDraft>(productApiRoutes.update(id), draft)
    },
    delete(id: string | number) {
      return client.delete<{ success: boolean }>(productApiRoutes.detail(String(id)))
    },
  }
}
