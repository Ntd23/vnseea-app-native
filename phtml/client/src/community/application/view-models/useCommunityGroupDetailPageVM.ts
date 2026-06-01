// English description: Coordinates group detail tab state, join action, and invite flow on top of the backend-backed group detail data source.

import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useCommunityGroupDetail } from "../composables/useCommunityGroupDetail"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

type CommunityDetailTab = "posts" | "about"
type CommunityActionState = "idle" | "loading" | "success" | "error"

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

function normalizeDetailTab(value: string): CommunityDetailTab {
  return value === "about" ? "about" : "posts"
}

export function useCommunityGroupDetailPageVM(
  repository = createApiCommunityRepository(),
) {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const toast = useToast()
  const translateText = useMaybeTranslatedText()

  const activeTab = ref<CommunityDetailTab>(normalizeDetailTab(readQueryValue(route.query.tab)))
  const joinState = ref<CommunityActionState>("idle")
  const inviteState = ref<CommunityActionState>("idle")
  const joined = ref(false)
  const requested = ref(false)

  const {
    group,
    members,
    privacyLabel,
    privacyDescription,
    categoryLabel,
    memberCountLabel,
    onlineCountLabel,
    groupPosts,
    refreshGroupPosts,
    refresh,
    slug,
    status,
  } = useCommunityGroupDetail(computed(() => String(route.params.name || "")))

  const localizedGroupName = computed(() =>
    group.value ? translateText(group.value.name, group.value.slug) : t("pages.groupDetailPage.seoFallbackTitle"),
  )

  const emptyBackPath = computed(() => appRoutes.groups)

  watch(() => route.query.tab, (value) => {
    const normalizedTab = normalizeDetailTab(readQueryValue(value))

    if (normalizedTab !== activeTab.value) {
      activeTab.value = normalizedTab
    }
  })

  watch(activeTab, (value) => {
    const currentTab = readQueryValue(route.query.tab)
    const nextTab = value === "posts" ? "" : value

    if (currentTab === nextTab) {
      return
    }

    const nextQuery = { ...route.query }

    if (value === "posts") {
      delete nextQuery.tab
    }
    else {
      nextQuery.tab = value
    }

    router.replace({ query: nextQuery })
  })

  watch(() => route.params.name, () => {
    activeTab.value = normalizeDetailTab(readQueryValue(route.query.tab))
    joinState.value = "idle"
    inviteState.value = "idle"
    joined.value = Boolean(group.value?.joined)
    requested.value = Boolean(group.value?.requested)
  })

  watch(group, (value) => {
    joined.value = Boolean(value?.joined)
    requested.value = Boolean(value?.requested)
  }, { immediate: true })

  async function handleJoinGroup() {
    if (!group.value || joinState.value === "loading" || group.value.canManage) {
      return
    }

    joinState.value = "loading"

    try {
      const wasJoined = joined.value || requested.value
      const updatedGroup = await repository.joinGroup(group.value.slug)
      await refresh()

      joinState.value = "success"
      joined.value = Boolean(updatedGroup.joined)
      requested.value = Boolean(updatedGroup.requested)

      toast.add({
        title: wasJoined ? t("pages.groupDetailPage.leaveSuccessTitle") : t("pages.groupDetailPage.joinSuccessTitle"),
        description: wasJoined ? t("pages.groupDetailPage.leaveSuccessDescription", {
          group: localizedGroupName.value,
        }) : t("pages.groupDetailPage.joinSuccessDescription", {
          group: localizedGroupName.value,
        }),
        color: "success",
      })
    }
    catch {
      joinState.value = "error"

      toast.add({
        title: t("pages.groupDetailPage.joinErrorTitle"),
        description: t("pages.groupDetailPage.joinErrorDescription"),
        color: "error",
      })
    }
  }

  async function handleDeleteGroup() {
    if (!group.value || !group.value.canManage || joinState.value === "loading") {
      return
    }

    const password = window.prompt(t("pages.groupDetailPage.deletePrompt"))

    if (!password) {
      return
    }

    joinState.value = "loading"

    try {
      await repository.deleteGroup(group.value.slug, password)

      toast.add({
        title: t("pages.groupDetailPage.deleteSuccessTitle"),
        description: t("pages.groupDetailPage.deleteSuccessDescription"),
        color: "success",
      })

      await navigateTo(appRoutes.groups)
    }
    catch {
      joinState.value = "error"

      toast.add({
        title: t("pages.groupDetailPage.deleteErrorTitle"),
        description: t("pages.groupDetailPage.deleteErrorDescription"),
        color: "error",
      })
    }
    finally {
      joinState.value = "idle"
    }
  }

  async function handleInviteMembers() {
    if (!group.value || inviteState.value === "loading") {
      return
    }

    inviteState.value = "loading"

    try {
      await navigateTo({
        path: appRoutes.messages,
        query: {
          tab: "multi",
        },
      })
      inviteState.value = "success"
    }
    catch {
      inviteState.value = "error"

      toast.add({
        title: t("pages.groupDetailPage.inviteErrorTitle"),
        description: t("pages.groupDetailPage.inviteErrorDescription"),
        color: "error",
      })
    }
  }

  return {
    activeTab,
    joinState,
    inviteState,
    joined,
    requested,
    group,
    members,
    privacyLabel,
    privacyDescription,
    categoryLabel,
    memberCountLabel,
    onlineCountLabel,
    groupPosts,
    refreshGroupPosts,
    handleJoinGroup,
    handleDeleteGroup,
    handleInviteMembers,
    emptyBackPath,
    status,
    slug,
  }
}
