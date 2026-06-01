// English description: Defines lightweight explore view options and shared discovery types for API-backed explore pages.

export type ExploreView = "all" | "posts" | "users" | "pages"

export function useExploreViewOptions() {
  const { t } = useI18n()

  return computed(() => [
    {
      value: "all" as const,
      label: t("pages.explorePage.viewAllLabel"),
      icon: "i-ph-squares-four-duotone",
    },
    {
      value: "posts" as const,
      label: t("pages.explorePage.viewPostsLabel"),
      icon: "i-ph-article-duotone",
    },
    {
      value: "users" as const,
      label: t("pages.explorePage.viewUsersLabel"),
      icon: "i-ph-users-three-duotone",
    },
    {
      value: "pages" as const,
      label: t("pages.explorePage.viewPagesLabel"),
      icon: "i-ph-flag-banner-duotone",
    },
  ])
}
