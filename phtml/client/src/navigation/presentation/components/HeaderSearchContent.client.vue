<!-- English description: Client-only Nuxt UI ContentSearch palette wired to global header search suggestions. -->
<template>
  <LazyUContentSearch
    v-model:search-term="search"
    :groups="contentSearchGroups"
    :loading="suggestionsLoading"
    :placeholder="$t('navigation.headerSearchInput.placeholder')"
    :autofocus="true"
    :color-mode="false"
    shortcut="ctrl_k"
    :fuse="{ fuseOptions: { includeMatches: true, threshold: 0.35 } }"
    :ui="{
      modal: 'sm:max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-white/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,255,0.06),0_2px_8px_rgba(0,0,0,0.04)]',
      input: [
        'border-0 border-b border-[rgba(0,0,255,0.08)] bg-transparent',
        'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
        'rounded-none focus:ring-0 h-12 px-4 text-sm font-medium',
      ],
      group: 'p-1.5',
      groupLabel: 'px-2 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-tertiary)]',
      item: 'rounded-[var(--radius-md)] px-2 py-1.5 gap-2.5',
      itemLabel: 'text-sm font-semibold text-[var(--text-primary)]',
      itemDescription: 'text-xs text-[var(--text-tertiary)] truncate',
      itemTrailing: 'text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-tertiary)]',
      itemIcon: 'h-4 w-4',
      itemAvatar: 'rounded-[6px]',
      itemAvatarSize: 'xs',
      empty: 'py-6 text-sm text-[var(--text-secondary)]',
      footer: 'border-t border-[rgba(0,0,255,0.06)] bg-transparent px-3 py-2',
    }"
  />
</template>

<script setup lang="ts">
import { useHeaderSearchSuggestions } from '../../application/composables/useHeaderSearchSuggestions'

type HeaderSearchContentItem = {
  id: string
  label: string
  description?: string
  suffix?: string
  icon?: string
  avatar?: {
    src: string
    alt: string
  }
  chip?: {
    label: string
    color: 'primary'
    variant: 'soft'
  }
  onSelect: () => void
}

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '')
  return typeof value === 'string' ? value : ''
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const search = ref(readQueryValue(route.query.q))
const { open: contentSearchOpen } = useContentSearch()

const {
  items: suggestionItems,
  loading: suggestionsLoading,
  refresh: refreshSuggestions
} = useHeaderSearchSuggestions(search)

function kindLabel(kind: (typeof suggestionItems.value)[number]['kind']) {
  if (kind === 'user') return t('community.search.tabs.users.label')
  if (kind === 'page') return t('community.search.tabs.pages.label')
  if (kind === 'group') return t('community.search.tabs.groups.label')
  return 'Hashtag'
}

function kindIcon(kind: (typeof suggestionItems.value)[number]['kind']) {
  if (kind === 'user') return 'i-ph-user-circle-fill'
  if (kind === 'page') return 'i-ph-flag-fill'
  if (kind === 'group') return 'i-ph-users-three-fill'
  return 'i-ph-hash'
}

function toContentSearchItem(item: (typeof suggestionItems.value)[number]): HeaderSearchContentItem {
  return {
    id: item.id,
    label: item.title,
    description: item.subtitle,
    suffix: kindLabel(item.kind),
    icon: item.avatarUrl ? undefined : kindIcon(item.kind),
    avatar: item.avatarUrl ? { src: item.avatarUrl, alt: item.title } : undefined,
    chip: item.badge ? { label: item.badge, color: 'primary', variant: 'soft' } : undefined,
    onSelect: () => selectSuggestion(item.href)
  }
}

const searchActionGroup = computed(() => {
  const keyword = search.value.trim()
  if (!keyword) return null

  return {
    id: 'search-action',
    label: t('navigation.headerSearchInput.placeholder'),
    ignoreFilter: true,
    items: [{
      id: `search:${keyword}`,
      label: keyword,
      suffix: '/search',
      icon: 'i-ph-magnifying-glass-duotone',
      onSelect: () => submitSearch(keyword)
    }]
  }
})

const contentSearchGroups = computed(() => {
  return [
    searchActionGroup.value,
    buildGroup('users', t('community.search.tabs.users.label'), 'user'),
    buildGroup('pages', t('community.search.tabs.pages.label'), 'page'),
    buildGroup('groups', t('community.search.tabs.groups.label'), 'group'),
    buildGroup('hashtags', 'Hashtags', 'hashtag')
  ].filter(Boolean)
})

function buildGroup(
  id: string,
  label: string,
  kind: (typeof suggestionItems.value)[number]['kind']
) {
  const items = suggestionItems.value
    .filter(item => item.kind === kind)
    .map(toContentSearchItem)

  if (items.length === 0) return null

  return {
    id,
    label,
    ignoreFilter: true,
    items
  }
}

watch(
  () => route.query.q,
  (value) => {
    const next = readQueryValue(value)
    if (next !== search.value) search.value = next
  }
)

watchDebounced(
  search,
  (value) => {
    if (route.path === '/search') {
      const keyword = value.trim()
      void router.replace({ path: '/search', query: keyword ? { q: keyword } : {} })
    }
  },
  { debounce: 500, maxWait: 1000 }
)

watch(contentSearchOpen, (open) => {
  if (open && search.value.trim()) void refreshSuggestions()
})

function closeSearch() {
  contentSearchOpen.value = false
}

function selectSuggestion(href: string) {
  closeSearch()
  void router.push(href)
}

function submitSearch(value = search.value) {
  closeSearch()
  const keyword = value.trim()
  void router.push({ path: '/search', query: keyword ? { q: keyword } : {} })
}
</script>
