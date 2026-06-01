// English description: Domain types for backend-backed games and legacy migration shapes.

export type GameTabKey = "my" | "new" | "popular"
export type GameCategoryKey = "all" | "puzzle" | "arcade" | "strategy" | "quiz" | "sport"

export type GameOption<T extends string = string> = {
  label: string
  value: T
  icon: string
}

export type GameTab = GameOption<GameTabKey>
export type GameCategory = GameOption<GameCategoryKey>

export type GameLeaderboardEntry = {
  name: string
  score: number
}

export type GameAchievement = {
  title: string
  description: string
  progress: number
}

export type MockGame = {
  id: string
  title: string
  category: Exclude<GameCategoryKey, "all">
  categoryLabel: string
  cover: string
  description: string
  players: number
  rating: number
  plays: number
  bestScore: number
  isMine: boolean
  isNew: boolean
  isPopular: boolean
  tags: string[]
  leaderboard: GameLeaderboardEntry[]
}

export type GameSessionPayload = {
  gameId: string
  score: number
  duration: string
}

export type GamesTabKey = "my" | "latest" | "popular"

export type GameRecord = {
  id: number
  title: string
  avatarUrl: string
  url: string
  category: string
  description: string
  lastPlay: string
  players: number
  isMine: boolean
}

export type GamesCatalog = {
  items: GameRecord[]
  activeTab: GamesTabKey
  hasMore: boolean
  nextOffset: number | null
}

export type GamesCatalogQuery = {
  tab?: GamesTabKey
  q?: string
  offset?: number | null
}
