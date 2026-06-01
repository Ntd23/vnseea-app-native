// English description: Games page view-model that owns backend loading, tab/search query state, and play actions.

import type { GameRecord, GamesTabKey } from "../../domain/types/games.types"
import { ApiGamesRepository } from "../../infrastructure/repositories/ApiGamesRepository"

const readQueryValue = (value: unknown) => Array.isArray(value) ? String(value[0] || "") : String(value || "")
const normalizeTab = (value: string): GamesTabKey => value === "latest" || value === "popular" ? value : "my"

export function useGamesPageVM() {
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const repository = new ApiGamesRepository()
  const activeTab = computed(() => normalizeTab(readQueryValue(route.query.tab)))
  const search = ref(readQueryValue(route.query.q))
  const playing = ref(false)

  const { data, pending, error, refresh } = useAsyncData(
    () => `games:${activeTab.value}:${readQueryValue(route.query.q)}`,
    () => repository.getCatalog({
      tab: activeTab.value,
      q: readQueryValue(route.query.q),
    }),
    { watch: [activeTab, () => route.query.q] },
  )

  const items = computed(() => data.value?.items ?? [])
  const activeGame = computed(() => {
    const gameId = Number(readQueryValue(route.query.game))

    return items.value.find(game => game.id === gameId) || null
  })
  const hasMore = computed(() => Boolean(data.value?.hasMore))
  const loadingMore = ref(false)

  const syncQuery = async () => {
    await router.push({
      path: "/games",
      query: {
        ...(activeTab.value === "my" ? {} : { tab: activeTab.value }),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
  }

  const setTab = async (tab: GamesTabKey) => {
    await router.push({
      path: "/games",
      query: {
        ...(tab === "my" ? {} : { tab }),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
  }

  const loadMore = async () => {
    if (!data.value?.nextOffset || loadingMore.value) return
    loadingMore.value = true

    try {
      const next = await repository.getCatalog({
        tab: activeTab.value,
        q: readQueryValue(route.query.q),
        offset: data.value.nextOffset,
      })
      data.value = {
        ...next,
        items: [...items.value, ...next.items],
      }
    }
    finally {
      loadingMore.value = false
    }
  }

  const play = async (game: GameRecord) => {
    playing.value = true

    try {
      await repository.play(game.id)
      await router.push({
        path: "/games",
        query: {
          ...(activeTab.value === "my" ? {} : { tab: activeTab.value }),
          ...(search.value.trim() ? { q: search.value.trim() } : {}),
          game: String(game.id),
        },
      })
      await refresh()
    }
    catch (err) {
      toast.add({
        color: "error",
        title: err instanceof Error ? err.message : "Unable to start game.",
      })
    }
    finally {
      playing.value = false
    }
  }

  const closeGame = async () => {
    await router.push({
      path: "/games",
      query: {
        ...(activeTab.value === "my" ? {} : { tab: activeTab.value }),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
  }

  return {
    activeTab,
    search,
    items,
    activeGame,
    hasMore,
    pending,
    error,
    loadingMore,
    playing,
    setTab,
    syncQuery,
    loadMore,
    play,
    closeGame,
  }
}
