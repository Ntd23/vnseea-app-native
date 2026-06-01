// English description: Loads poke requests and exposes backend-backed poke actions for the poke route.

import type { PokeRecord } from "../composables/usePokeData"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

export function usePokePageVM(
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const loading = ref(true)
  const errorMessage = ref("")
  const pokeRecords = ref<PokeRecord[]>([])
  const pokedBackIds = ref<string[]>([])

  async function fetchPokes() {
    loading.value = true
    errorMessage.value = ""

    try {
      pokeRecords.value = await repository.getPokes()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.pokePage.listDescription")
    }
    finally {
      loading.value = false
    }
  }

  async function pokeBack(id: string) {
    if (pokedBackIds.value.includes(id)) {
      return
    }

    const record = pokeRecords.value.find(item => item.id === id)
    if (!record) {
      return
    }

    errorMessage.value = ""

    try {
      await repository.runPokeAction({
        action: "create",
        userId: record.userId,
        pokeId: record.pokeId,
      })
      pokedBackIds.value = [...pokedBackIds.value, id]
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.pokePage.listDescription")
    }
  }

  async function removePoke(id: string) {
    const record = pokeRecords.value.find(item => item.id === id)
    if (!record) {
      return
    }

    errorMessage.value = ""

    try {
      await repository.runPokeAction({
        action: "remove",
        pokeId: record.pokeId,
      })
      pokeRecords.value = pokeRecords.value.filter(item => item.id !== id)
      pokedBackIds.value = pokedBackIds.value.filter(item => item !== id)
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.pokePage.listDescription")
    }
  }

  return {
    loading,
    errorMessage,
    pokeRecords,
    pokedBackIds,
    fetchPokes,
    pokeBack,
    removePoke,
  }
}
