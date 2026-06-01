// English description: Nuxt API implementation of the games repository contract.

import type { GamesRepository } from "../../domain/repositories/GamesRepository"
import type { GamesCatalog, GamesCatalogQuery } from "../../domain/types/games.types"

export class ApiGamesRepository implements GamesRepository {
  async getCatalog(query: GamesCatalogQuery): Promise<GamesCatalog> {
    return await $fetch<GamesCatalog>("/_api/games", { query })
  }

  async play(gameId: number) {
    await $fetch("/_api/games/play", {
      method: "POST",
      body: { gameId },
    })
  }
}
