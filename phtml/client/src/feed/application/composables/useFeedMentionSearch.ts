// English description: Provides reusable feed mention search and insertion state for text composers.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import {
  createMentionSegments,
  escapeMentionRegExp,
  normalizeFeedMentionSearchText,
} from "../utils/feed-mentions"

type BackendMentionSearchResult = {
  id: string
  title: string
  subtitle?: string
  username?: string
  firstName?: string
  avatarUrl?: string
  initials: string
}

type BackendMentionSearchResponse = {
  users: BackendMentionSearchResult[]
}

export type FeedMentionSuggestion = {
  id: string
  name: string
  username: string
  displayLabel: string
  avatarUrl: string
  initials: string
  searchText: string
}

type UseFeedMentionSearchOptions = {
  text: Ref<string>
  textarea: Readonly<Ref<HTMLTextAreaElement | null>>
  active?: Ref<boolean>
}

function getMentionUsername(user: BackendMentionSearchResult) {
  const fromUsername = user.username?.trim()
  if (fromUsername) {
    return fromUsername.replace(/^@/, "")
  }

  const fromSubtitle = user.subtitle?.trim().replace(/^@/, "")
  if (fromSubtitle) {
    return fromSubtitle
  }

  return user.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function getMentionDisplayLabel(user: BackendMentionSearchResult, fallback: string) {
  const value = (user.firstName || user.title || fallback)
    .trim()
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)[0]

  return (value || fallback)
    .replace(/^@/, "")
    .replace(/[^\p{L}\p{N}_.-]+/gu, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizeMentionUsers(users: BackendMentionSearchResult[]) {
  const seenUsers = new Set<string>()

  return users
    .map((user) => {
      const username = getMentionUsername(user)
      const name = user.title.trim() || username
      const displayLabel = getMentionDisplayLabel(user, username)

      return {
        id: user.id,
        name,
        username,
        displayLabel,
        avatarUrl: user.avatarUrl || "",
        initials: user.initials || (name[0]?.toUpperCase() ?? "U"),
        searchText: normalizeFeedMentionSearchText([
          name,
          username,
          displayLabel,
          user.firstName,
          user.subtitle,
        ].filter(Boolean).join(" ")),
      }
    })
    .filter((user) => {
      const uniqueKey = user.username || user.id

      if (!user.username || seenUsers.has(uniqueKey)) {
        return false
      }

      seenUsers.add(uniqueKey)
      return true
    })
}

export function useFeedMentionSearch(options: UseFeedMentionSearchOptions) {
  const apiClient = useNuxtApiClient()
  const mentionQuery = ref("")
  const mentionStartIndex = ref<number | null>(null)
  const mentionCandidates = ref<FeedMentionSuggestion[]>([])
  const mentionLoading = ref(false)
  const mentionSelectionLocked = ref(false)
  const selectedMentionUsernames = ref<Record<string, string>>({})
  let mentionSearchTimer: ReturnType<typeof setTimeout> | undefined
  let mentionRequestId = 0

  const mentionSuggestions = computed(() => {
    const keyword = normalizeFeedMentionSearchText(mentionQuery.value.trim())
    const users = keyword
      ? mentionCandidates.value.filter(user => user.searchText.includes(keyword))
      : mentionCandidates.value

    return users.slice(0, 6)
  })

  const showMentionSuggestions = computed(() =>
    (options.active?.value ?? true)
    && mentionStartIndex.value !== null,
  )

  const highlightedMentionSegments = computed(() =>
    createMentionSegments(options.text.value, selectedMentionUsernames.value, {
      highlightUnknownMentions: false,
    }),
  )

  watch(options.text, (text) => {
    const nextSelectedMentionUsernames = Object.fromEntries(
      Object.entries(selectedMentionUsernames.value).filter(([displayMention]) =>
        new RegExp(`(^|\\s)${escapeMentionRegExp(displayMention)}(?=\\s|$)`).test(text),
      ),
    )

    if (Object.keys(nextSelectedMentionUsernames).length !== Object.keys(selectedMentionUsernames.value).length) {
      selectedMentionUsernames.value = nextSelectedMentionUsernames
    }
  })

  function closeMentionSuggestions() {
    mentionRequestId += 1
    if (mentionSearchTimer) {
      clearTimeout(mentionSearchTimer)
      mentionSearchTimer = undefined
    }
    mentionStartIndex.value = null
    mentionQuery.value = ""
    mentionLoading.value = false
    mentionCandidates.value = []
  }

  function createBackendMentionText(text = options.text.value) {
    return Object.entries(selectedMentionUsernames.value).reduce((nextText, [displayMention, username]) => {
      const backendMention = `@${username.trim().replace(/^@/, "")}`

      if (!displayMention || displayMention === backendMention) {
        return nextText
      }

      return nextText.replace(
        new RegExp(`(^|\\s)${escapeMentionRegExp(displayMention)}(?=\\s|$)`, "g"),
        `$1${backendMention}`,
      )
    }, text)
  }

  function queueMentionSearch(keyword: string) {
    const searchKeyword = keyword.trim()

    if (mentionSearchTimer) {
      clearTimeout(mentionSearchTimer)
      mentionSearchTimer = undefined
    }

    if (!searchKeyword) {
      mentionRequestId += 1
      mentionCandidates.value = []
      mentionLoading.value = false
      return
    }

    mentionSearchTimer = setTimeout(() => {
      void loadMentionCandidates(searchKeyword)
    }, 180)
  }

  async function loadMentionCandidates(keyword: string) {
    const requestId = ++mentionRequestId
    mentionLoading.value = true

    try {
      const response = await apiClient.get<BackendMentionSearchResponse>(apiRoutes.search.index, {
        q: keyword,
        limit: 12,
      })

      if (requestId !== mentionRequestId) {
        return
      }

      mentionCandidates.value = normalizeMentionUsers(response.users ?? [])
    }
    catch {
      if (requestId !== mentionRequestId) {
        return
      }

      mentionCandidates.value = []
    }
    finally {
      if (requestId === mentionRequestId) {
        mentionLoading.value = false
      }
    }
  }

  function extractMentionQuery(text = options.text.value, caret = options.textarea.value?.selectionStart ?? text.length) {
    if (mentionSelectionLocked.value) {
      return
    }

    const beforeCaret = text.slice(0, caret)
    const match = beforeCaret.match(/(^|\s)@([^\s@]{0,40})$/)

    if (!match) {
      closeMentionSuggestions()
      return
    }

    const nextStartIndex = caret - (match[2]?.length ?? 0) - 1
    const nextQuery = match[2] ?? ""
    const mentionStartChanged = mentionStartIndex.value !== nextStartIndex
    const mentionQueryChanged = mentionQuery.value !== nextQuery

    mentionStartIndex.value = nextStartIndex
    mentionQuery.value = nextQuery

    if (mentionStartChanged || mentionQueryChanged) {
      queueMentionSearch(nextQuery)
    }
  }

  function updateMentionQuery(event?: Event) {
    const textarea = event?.target instanceof HTMLTextAreaElement
      ? event.target
      : options.textarea.value
    const text = textarea?.value ?? options.text.value

    extractMentionQuery(text, textarea?.selectionStart ?? text.length)
  }

  function handleMentionKeyup(event: KeyboardEvent) {
    if (event.key === "Escape") {
      return
    }

    updateMentionQuery(event)
  }

  async function selectMention(user: FeedMentionSuggestion) {
    const start = mentionStartIndex.value
    const textarea = options.textarea.value

    if (start === null || !textarea) {
      return
    }

    mentionSelectionLocked.value = true
    const caret = textarea.selectionStart ?? options.text.value.length
    const beforeMention = options.text.value.slice(0, start)
    const afterMention = options.text.value.slice(caret)
    const mentionUsername = user.username.trim().replace(/^@/, "")
    const mentionDisplayLabel = (user.displayLabel || user.name || mentionUsername).trim().replace(/^@/, "")
    const displayMention = `@${mentionDisplayLabel}`
    const inserted = `${displayMention} `
    const nextCaret = beforeMention.length + inserted.length

    selectedMentionUsernames.value = {
      ...selectedMentionUsernames.value,
      [displayMention]: mentionUsername,
    }
    options.text.value = `${beforeMention}${inserted}${afterMention}`
    closeMentionSuggestions()

    await nextTick()
    textarea.focus()
    textarea.setSelectionRange(nextCaret, nextCaret)
    mentionSelectionLocked.value = false
  }

  function clearSelectedMentions() {
    selectedMentionUsernames.value = {}
  }

  if (options.active) {
    watch(options.active, (value) => {
      if (!value) {
        closeMentionSuggestions()
      }
    })
  }

  return {
    mentionQuery,
    mentionLoading,
    mentionSuggestions,
    showMentionSuggestions,
    highlightedMentionSegments,
    updateMentionQuery,
    handleMentionKeyup,
    closeMentionSuggestions,
    selectMention,
    clearSelectedMentions,
    createBackendMentionText,
  }
}
