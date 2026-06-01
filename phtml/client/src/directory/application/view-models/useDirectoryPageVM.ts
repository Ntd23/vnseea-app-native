// English description: Directory page view-model that loads enabled backend destinations.

import { ApiDirectoryRepository } from "../../infrastructure/repositories/ApiDirectoryRepository"

export function useDirectoryPageVM() {
  const repository = new ApiDirectoryRepository()
  const { data, pending, error } = useAsyncData(
    "directory:catalog",
    () => repository.getCatalog(),
  )

  return {
    title: computed(() => data.value?.title ?? ""),
    description: computed(() => data.value?.description ?? ""),
    items: computed(() => data.value?.items ?? []),
    pending,
    error,
  }
}
