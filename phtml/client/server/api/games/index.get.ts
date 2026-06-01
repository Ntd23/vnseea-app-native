// English description: Returns the self-hosted HTML5 games catalog served from Nuxt public assets.

import { getQuery } from "h3"
import type { GameRecord, GamesCatalog, GamesTabKey } from "../../../src/games/domain/types/games.types"

const localGames: GameRecord[] = [
  {
    id: 2048,
    title: "2048",
    avatarUrl: "/html5-games/2048/meta/apple-touch-icon.png",
    url: "/html5-games/2048/index.html",
    category: "puzzle",
    description: "Ghep cac o so de dat den 2048.",
    lastPlay: "",
    players: 1240,
    isMine: false,
  },
  {
    id: 2049,
    title: "Flappy Bird",
    avatarUrl: "/html5-games/Flappy_Bird/assets/flappybirdbg.png",
    url: "/html5-games/Flappy_Bird/index.html",
    category: "arcade",
    description: "Dieu khien chu chim bay qua cac ong nuoc va giu diem cao nhat.",
    lastPlay: "",
    players: 2187,
    isMine: false,
  },
]

const normalizeTab = (value: unknown): GamesTabKey =>
  value === "latest" || value === "popular" ? value : "my"

export default defineEventHandler((event): GamesCatalog => {
  const query = getQuery(event)
  const activeTab = normalizeTab(query.tab)
  const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : ""
  const offset = typeof query.offset === "string" ? Number(query.offset) || 0 : 0
  const limit = typeof query.limit === "string" ? Number(query.limit) || 20 : 20

  const filtered = localGames.filter((game) => {
    if (!q) return true

    return [
      game.title,
      game.category,
      game.description,
    ].join(" ").toLowerCase().includes(q)
  })

  const sorted = activeTab === "popular"
    ? [...filtered].sort((left, right) => right.players - left.players)
    : filtered

  const startIndex = offset
    ? Math.max(sorted.findIndex(game => game.id === offset) + 1, 0)
    : 0
  const items = sorted.slice(startIndex, startIndex + limit)

  return {
    items,
    activeTab,
    hasMore: startIndex + limit < sorted.length,
    nextOffset: items.length ? items[items.length - 1]!.id : null,
  }
})
