// English description: Repository contract for loading and mutating backend-backed game catalogs.

import type { GamesCatalog, GamesCatalogQuery } from "../types/games.types"

export interface GamesRepository {
  getCatalog(query: GamesCatalogQuery): Promise<GamesCatalog>
  play(gameId: number): Promise<void>
}
