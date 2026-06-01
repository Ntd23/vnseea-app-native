<!-- English description: Global header search trigger using Nuxt UI ContentSearch for users, pages, groups, and hashtags. -->
<template>
  <div class="w-full">
    <ClientOnly>
      <LazyUContentSearchButton
        :label="$t('navigation.headerSearchInput.placeholder')"
        icon="i-ph-magnifying-glass-duotone"
        color="none"
        variant="none"
        :collapsed="false"
        :kbds="['ctrl', 'k']"
        class="header-search-fallback header-search-trigger"
        :ui="{
          label: 'flex-1 text-left truncate text-sm font-normal text-[var(--text-tertiary)]',
          leadingIcon: 'h-4 w-4 shrink-0 text-[var(--text-tertiary)]',
          trailing: 'ms-auto flex items-center gap-1',
        }"
      />

      <template #fallback>
        <button type="button" class="header-search-fallback" aria-hidden="true" tabindex="-1">
          <span class="flex min-w-0 items-center gap-2">
            <Icon name="i-ph-magnifying-glass-duotone" class="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <span class="truncate text-sm font-medium text-[var(--text-tertiary)]">
              {{ $t('navigation.headerSearchInput.placeholder') }}
            </span>
          </span>
          <span class="hidden items-center gap-1 sm:flex">
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  autofocus?: boolean
}>(), {
  autofocus: false
})
</script>

<style scoped>
/* Trigger button */
.header-search-trigger {
  width: 100%;
}

/* Kbd inside trigger & fallback */
.header-search-trigger :deep(kbd),
.header-search-fallback kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  border-radius: 5px;
  border: 1px solid var(--border-default);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-primary);
  box-shadow: 0 1px 0 var(--border-default);
  user-select: none;
}

/* SSR fallback button */
.header-search-fallback {
  display: flex;
  height: 2.5rem;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0 0.75rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.header-search-fallback:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: var(--border-strong);
}
</style>
