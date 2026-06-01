// English description: Nuxt API implementation of the go-pro repository contract.

import type { GoProRepository } from "../../domain/repositories/GoProRepository"
import type { GoProCatalog } from "../../domain/types/go-pro.types"

export class ApiGoProRepository implements GoProRepository {
  async getCatalog(): Promise<GoProCatalog> {
    return await $fetch<GoProCatalog>("/_api/go-pro")
  }

  async upgrade(type: string) {
    await $fetch("/_api/go-pro/upgrade", {
      method: "POST",
      body: { type },
    })
  }

  async cancel() {
    await $fetch("/_api/go-pro/cancel", {
      method: "POST",
    })
  }
}
