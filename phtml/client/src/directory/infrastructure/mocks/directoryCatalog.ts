import { computed } from "vue"
import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"
import type {
  DirectoryCategory,
  DirectoryCategoryKey,
  DirectoryItem,
} from "../../domain/types/directory.types"

export const directoryCategoryKeys: DirectoryCategoryKey[] = [
  "all",
  "users",
  "pages",
  "groups",
  "market",
  "events",
  "jobs",
  "blogs",
  "funding",
  "live",
  "watch",
  "games",
  "forum",
]

export const useDirectoryCatalog = () => {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  const categories = computed(() => localized<DirectoryCategory[]>("pages.directoryPage.categories"))
  const items = computed(() => localized<DirectoryItem[]>("pages.directoryPage.items"))

  return { categories, items }
}
