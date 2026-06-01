// English description: Nuxt API implementation of the directory repository contract.

import type { DirectoryRepository } from "../../domain/repositories/DirectoryRepository"
import type { DirectoryCatalog } from "../../domain/types/directory.types"

export class ApiDirectoryRepository implements DirectoryRepository {
  async getCatalog(): Promise<DirectoryCatalog> {
    return await $fetch<DirectoryCatalog>("/_api/directory")
  }
}
