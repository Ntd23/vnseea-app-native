// English description: Repository contract for loading backend-backed directory destinations.

import type { DirectoryCatalog } from "../types/directory.types"

export interface DirectoryRepository {
  getCatalog(): Promise<DirectoryCatalog>
}
