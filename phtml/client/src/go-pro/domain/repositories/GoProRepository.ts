// English description: Repository contract for loading and upgrading backend-backed Pro packages.

import type { GoProCatalog } from "../types/go-pro.types"

export interface GoProRepository {
  getCatalog(): Promise<GoProCatalog>
  upgrade(type: string): Promise<void>
  cancel(): Promise<void>
}
