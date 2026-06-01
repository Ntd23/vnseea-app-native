import type {
  GameAchievement,
  GameCategory,
  GameCategoryKey,
  GameTab,
  GameTabKey,
  MockGame,
} from "../../domain/types/games.types"

export const defaultGameTab: GameTabKey = "popular"

export const gameTabKeys = [
  "my",
  "new",
  "popular",
] as const satisfies GameTabKey[]

export const gameCategoryKeys = [
  "puzzle",
  "arcade",
  "strategy",
  "quiz",
  "sport",
] as const satisfies Exclude<GameCategoryKey, "all">[]

export const readGameQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

export const normalizeGameTab = (value: string): GameTabKey => {
  if (gameTabKeys.includes(value as GameTabKey)) {
    return value as GameTabKey
  }

  return defaultGameTab
}

export const normalizeGameCategory = (value: string): GameCategoryKey => {
  if (value === "all") return "all"

  if (gameCategoryKeys.includes(value as Exclude<GameCategoryKey, "all">)) {
    return value as Exclude<GameCategoryKey, "all">
  }

  return "all"
}

export const filterMockGames = (
  games: ReadonlyArray<MockGame>,
  options: {
    search: string
    category: GameCategoryKey
    tab: GameTabKey
    savedById?: Record<string, boolean>
  },
) => {
  const keyword = options.search.trim().toLowerCase()
  const savedLookup = options.savedById ?? {}

  return games.filter((game) => {
    const matchesTab = options.tab === "my"
      ? (savedLookup[game.id] ?? game.isMine)
      : options.tab === "new"
        ? game.isNew
        : game.isPopular

    const matchesCategory = options.category === "all" || game.category === options.category
    const matchesKeyword = keyword.length === 0 || [
      game.title,
      game.categoryLabel,
      game.description,
      ...game.tags,
    ].some(field => field.toLowerCase().includes(keyword))

    return matchesTab && matchesCategory && matchesKeyword
  })
}

export const formatGameNumber = (value: number, locale = "vi") =>
  new Intl.NumberFormat(
    locale.toLowerCase().startsWith("en") ? "en-US" : "vi-VN",
    {
      notation: value >= 10000 ? "compact" : "standard",
      maximumFractionDigits: value >= 10000 ? 1 : 0,
    },
  ).format(value)

export const useMockGamesData = () => {
  const { t } = useI18n()

  const tabs: GameTab[] = [
    { label: t("pages.gamesPage.tabPopular"), value: "popular", icon: "i-ph-fire-fill" },
    { label: t("pages.gamesPage.tabNew"), value: "new", icon: "i-ph-sparkle-fill" },
    { label: t("pages.gamesPage.tabMy"), value: "my", icon: "i-ph-user-circle-check-fill" },
  ]

  const categories: GameCategory[] = [
    { label: t("pages.gamesPage.categoryAll"), value: "all", icon: "i-ph-squares-four-fill" },
    { label: t("pages.gamesPage.categoryPuzzle"), value: "puzzle", icon: "i-ph-puzzle-piece-fill" },
    { label: t("pages.gamesPage.categoryArcade"), value: "arcade", icon: "i-ph-game-controller-fill" },
    { label: t("pages.gamesPage.categoryStrategy"), value: "strategy", icon: "i-ph-flag-fill" },
    { label: t("pages.gamesPage.categoryQuiz"), value: "quiz", icon: "i-ph-question-fill" },
    { label: t("pages.gamesPage.categorySport"), value: "sport", icon: "i-ph-soccer-ball-fill" },
  ]

  const games: MockGame[] = [
    {
      id: "market-maze",
      title: t("pages.gamesPage.game1Title"),
      category: "puzzle",
      categoryLabel: t("pages.gamesPage.categoryPuzzle"),
      cover: "https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game1Description"),
      players: 1284,
      rating: 4.8,
      plays: 18400,
      bestScore: 9200,
      isMine: true,
      isNew: false,
      isPopular: true,
      tags: ["#logic", "#market", "#fast"],
      leaderboard: [
        { name: "Justin", score: 9200 },
        { name: "Hoangne", score: 8840 },
        { name: "Dung1", score: 8320 },
        { name: "Nicolas", score: 7900 },
      ],
    },
    {
      id: "startup-sprint",
      title: t("pages.gamesPage.game2Title"),
      category: "arcade",
      categoryLabel: t("pages.gamesPage.categoryArcade"),
      cover: "https://images.unsplash.com/photo-1556438064-2d7646166914?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game2Description"),
      players: 842,
      rating: 4.6,
      plays: 12600,
      bestScore: 7400,
      isMine: true,
      isNew: true,
      isPopular: true,
      tags: ["#startup", "#speed", "#demo"],
      leaderboard: [
        { name: "Hoangne", score: 7400 },
        { name: "Justin", score: 7110 },
        { name: "Ngoc Tokyo", score: 6880 },
        { name: "Dung1", score: 6500 },
      ],
    },
    {
      id: "green-city-builder",
      title: t("pages.gamesPage.game3Title"),
      category: "strategy",
      categoryLabel: t("pages.gamesPage.categoryStrategy"),
      cover: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game3Description"),
      players: 536,
      rating: 4.7,
      plays: 9300,
      bestScore: 6800,
      isMine: true,
      isNew: true,
      isPopular: false,
      tags: ["#green", "#strategy", "#city"],
      leaderboard: [
        { name: "Learning Guild", score: 6800 },
        { name: "Justin", score: 6420 },
        { name: "Quynh Lan", score: 6210 },
        { name: "Hoangne", score: 5900 },
      ],
    },
    {
      id: "vnseea-quiz-night",
      title: t("pages.gamesPage.game4Title"),
      category: "quiz",
      categoryLabel: t("pages.gamesPage.categoryQuiz"),
      cover: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game4Description"),
      players: 2190,
      rating: 4.9,
      plays: 24100,
      bestScore: 9900,
      isMine: true,
      isNew: false,
      isPopular: true,
      tags: ["#quiz", "#community", "#knowledge"],
      leaderboard: [
        { name: "Justin", score: 9900 },
        { name: "Dung1", score: 9440 },
        { name: "Ngoc Tokyo", score: 9010 },
        { name: "Nicolas", score: 8730 },
      ],
    },
    {
      id: "event-runner",
      title: t("pages.gamesPage.game5Title"),
      category: "sport",
      categoryLabel: t("pages.gamesPage.categorySport"),
      cover: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game5Description"),
      players: 412,
      rating: 4.4,
      plays: 5200,
      bestScore: 6100,
      isMine: false,
      isNew: true,
      isPopular: false,
      tags: ["#event", "#runner", "#friends"],
      leaderboard: [
        { name: "Event Crew", score: 6100 },
        { name: "Justin", score: 5840 },
        { name: "Hoangne", score: 5520 },
        { name: "Dung1", score: 5200 },
      ],
    },
    {
      id: "code-quest",
      title: t("pages.gamesPage.game6Title"),
      category: "strategy",
      categoryLabel: t("pages.gamesPage.categoryStrategy"),
      cover: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game6Description"),
      players: 730,
      rating: 4.7,
      plays: 11700,
      bestScore: 8600,
      isMine: true,
      isNew: true,
      isPopular: true,
      tags: ["#code", "#strategy", "#logic"],
      leaderboard: [
        { name: "Justin", score: 8600 },
        { name: "Ngoc Tokyo", score: 8210 },
        { name: "Hoangne", score: 7940 },
        { name: "Dung1", score: 7600 },
      ],
    },
    {
      id: "supply-chain-rush",
      title: t("pages.gamesPage.game7Title"),
      category: "arcade",
      categoryLabel: t("pages.gamesPage.categoryArcade"),
      cover: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game7Description"),
      players: 1190,
      rating: 4.5,
      plays: 15100,
      bestScore: 8150,
      isMine: false,
      isNew: true,
      isPopular: true,
      tags: ["#logistics", "#rush", "#arcade"],
      leaderboard: [
        { name: "Hoangne", score: 8150 },
        { name: "Justin", score: 7880 },
        { name: "Nicolas", score: 7410 },
        { name: "Dung1", score: 7030 },
      ],
    },
    {
      id: "memory-lab",
      title: t("pages.gamesPage.game8Title"),
      category: "puzzle",
      categoryLabel: t("pages.gamesPage.categoryPuzzle"),
      cover: "https://images.unsplash.com/photo-1607706189992-eae578626c86?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game8Description"),
      players: 604,
      rating: 4.6,
      plays: 8800,
      bestScore: 7700,
      isMine: false,
      isNew: true,
      isPopular: false,
      tags: ["#memory", "#puzzle", "#combo"],
      leaderboard: [
        { name: "Ngoc Tokyo", score: 7700 },
        { name: "Justin", score: 7420 },
        { name: "Quynh Lan", score: 7100 },
        { name: "Dung1", score: 6890 },
      ],
    },
    {
      id: "penalty-master",
      title: t("pages.gamesPage.game9Title"),
      category: "sport",
      categoryLabel: t("pages.gamesPage.categorySport"),
      cover: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80",
      description: t("pages.gamesPage.game9Description"),
      players: 1560,
      rating: 4.4,
      plays: 17600,
      bestScore: 8300,
      isMine: false,
      isNew: false,
      isPopular: true,
      tags: ["#football", "#sport", "#score"],
      leaderboard: [
        { name: "Nicolas", score: 8300 },
        { name: "Hoangne", score: 8020 },
        { name: "Justin", score: 7900 },
        { name: "Dung1", score: 7550 },
      ],
    },
  ]

  const achievements: GameAchievement[] = [
    {
      title: t("pages.gamesPage.achievement1Title"),
      description: t("pages.gamesPage.achievement1Description"),
      progress: 100,
    },
    {
      title: t("pages.gamesPage.achievement2Title"),
      description: t("pages.gamesPage.achievement2Description"),
      progress: 68,
    },
    {
      title: t("pages.gamesPage.achievement3Title"),
      description: t("pages.gamesPage.achievement3Description"),
      progress: 40,
    },
  ]

  return {
    tabs,
    categories,
    games,
    achievements,
  }
}
