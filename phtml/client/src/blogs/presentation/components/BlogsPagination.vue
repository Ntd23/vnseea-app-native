<template>
  <nav
    class="blogs-pagination"
    :aria-label="$t('pages.blogsPage.paginationAria')"
  >
    <p class="blogs-pagination__status" role="status" aria-live="polite">
      {{ $t("pages.blogsPage.pageStatus", { current: currentPage, total: totalPages }) }}
    </p>

    <div class="blogs-pagination__controls">
      <button
        class="blogs-pagination__button blogs-pagination__button--edge"
        :disabled="currentPage === 1"
        type="button"
        :aria-label="$t('pages.blogsPage.previous')"
        @click="changePage(currentPage - 1)"
      >
        <Icon name="i-ph-caret-left-bold" class="blogs-pagination__icon" />
        <span class="blogs-pagination__edge-label">{{ $t("pages.blogsPage.previous") }}</span>
      </button>

      <div class="blogs-pagination__pages">
        <template v-for="(page, index) in pages" :key="`${page}-${index}`">
          <span v-if="page === 'ellipsis'" class="blogs-pagination__ellipsis" aria-hidden="true">
            ...
          </span>

          <button
            v-else
            class="blogs-pagination__button blogs-pagination__button--page"
            :class="{ 'blogs-pagination__button--active': currentPage === page }"
            type="button"
            :aria-current="currentPage === page ? 'page' : undefined"
            :aria-label="`Page ${page}`"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </template>
      </div>

      <button
        class="blogs-pagination__button blogs-pagination__button--edge"
        :disabled="currentPage === totalPages"
        type="button"
        :aria-label="$t('pages.blogsPage.next')"
        @click="changePage(currentPage + 1)"
      >
        <span class="blogs-pagination__edge-label">{{ $t("pages.blogsPage.next") }}</span>
        <Icon name="i-ph-caret-right-bold" class="blogs-pagination__icon" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
type PaginationPageItem = number | "ellipsis"

const props = defineProps<{
  currentPage: number
  totalPages: number
  pages: PaginationPageItem[]
}>()

const emit = defineEmits<{
  "update:currentPage": [value: number]
}>()

const changePage = (page: number) => {
  const nextPage = Math.min(Math.max(page, 1), props.totalPages)

  if (nextPage === props.currentPage) return

  emit("update:currentPage", nextPage)
}
</script>

<style scoped>
.blogs-pagination {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 12px;
}

.blogs-pagination__status {
  margin: 0;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 700;
}

.blogs-pagination__controls,
.blogs-pagination__pages {
  display: flex;
  align-items: center;
}

.blogs-pagination__controls {
  position: relative;
  z-index: 2;
  justify-content: space-between;
  gap: 8px;
}

.blogs-pagination__pages {
  min-width: 0;
  justify-content: center;
  gap: 6px;
}

.blogs-pagination__button,
.blogs-pagination__ellipsis {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.blogs-pagination__button {
  position: relative;
  z-index: 2;
  border: 1px solid #e2e8f0;
  background: #fafbfe;
  color: #334155;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.blogs-pagination__button > * {
  pointer-events: none;
}

.blogs-pagination__button:not(:disabled):hover {
  border-color: rgba(0, 0, 255, 0.18);
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
  transform: translateY(-1px);
}

.blogs-pagination__button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.blogs-pagination__button:active {
  transform: scale(0.98);
}

.blogs-pagination__button--edge {
  min-width: 42px;
  gap: 6px;
  padding: 0 12px;
}

.blogs-pagination__button--page {
  width: 38px;
  flex: 0 0 38px;
}

.blogs-pagination__button--active {
  border-color: #0000ff;
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
  color: #ffffff;
}

.blogs-pagination__button--active:not(:disabled):hover {
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  color: #ffffff;
}

.blogs-pagination__ellipsis {
  width: 28px;
  flex: 0 0 28px;
  color: #94a3b8;
}

.blogs-pagination__icon {
  height: 14px;
  width: 14px;
}

.blogs-pagination__edge-label {
  display: none;
}

@media (min-width: 640px) {
  .blogs-pagination {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
  }

  .blogs-pagination__edge-label {
    display: inline;
  }
}
</style>
