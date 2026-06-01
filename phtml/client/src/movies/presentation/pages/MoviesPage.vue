<template>
  <div class="movies-page pb-10">
    <div class="movies-page__head">
      <div class="container mx-auto px-4 sm:px-6">
        <h1 class="movies-page__title">
          <Icon name="i-ph-film-strip-bold" class="h-5 w-5" />
          {{ $t("pages.moviesPage.heroEyebrow") }}
        </h1>
      </div>
    </div>

    <div class="movies-page__backdrop" />

    <div class="container mx-auto px-4 sm:px-6">
      <section class="movies-page__filters">
        <div class="movies-page__search">
          <Icon name="i-ph-magnifying-glass-bold" class="movies-page__search-icon" />
          <input
            v-model="search"
            class="movies-page__search-input"
            :placeholder="$t('pages.moviesPage.searchPlaceholder')"
            type="text"
          >
        </div>

        <div ref="filterMenuRef" class="movies-page__filter">
          <button
            class="movies-page__filter-button"
            type="button"
            :aria-expanded="isFilterOpen"
            @click.stop="isFilterOpen = !isFilterOpen"
          >
            <Icon name="i-ph-funnel-simple-bold" class="h-5 w-5" />
          </button>

          <div v-if="isFilterOpen" class="movies-page__filter-menu" @click.stop>
            <button class="movies-page__filter-section" type="button" @click="genreOpen = !genreOpen">
              <span>Thể loại</span>
              <Icon name="i-ph-caret-down-bold" class="h-4 w-4" :class="{ 'rotate-180': genreOpen }" />
            </button>
            <div v-if="genreOpen" class="movies-page__filter-list">
              <button
                v-for="genre in genres"
                :key="genre.value"
                class="movies-page__filter-item"
                :class="{ 'movies-page__filter-item--active': selectedGenre === genre.value }"
                type="button"
                @click="selectGenre(genre.value)"
              >
                {{ genre.label }}
              </button>
            </div>

            <button class="movies-page__filter-section" type="button" @click="countryOpen = !countryOpen">
              <span>Quốc gia</span>
              <Icon name="i-ph-caret-down-bold" class="h-4 w-4" :class="{ 'rotate-180': countryOpen }" />
            </button>
            <div v-if="countryOpen" class="movies-page__filter-list">
              <button
                v-for="country in countries"
                :key="country.value"
                class="movies-page__filter-item"
                :class="{ 'movies-page__filter-item--active': selectedCountry === country.value }"
                type="button"
                @click="selectCountry(country.value)"
              >
                {{ country.label }}
              </button>
            </div>

            <button class="movies-page__reset" type="button" @click="resetFilters">
              <Icon name="i-ph-arrow-counter-clockwise-bold" class="h-4 w-4" />
              {{ $t("pages.moviesPage.resetFilters") }}
            </button>
          </div>
        </div>
      </section>

      <section class="movies-page__tabs" aria-label="Movie filters">
        <MoviesTabs v-model="activeTab" :tabs="navigationTabs" />
      </section>

      <section class="movies-page__content">
        <div v-if="visibleMovies.length > 0" class="movies-page__grid">
          <MoviesCard
            v-for="movie in visibleMovies"
            :key="movie.id"
            :genre-label="genreLabelMap[movie.genre] || movie.genre"
            :movie="movie"
          />
        </div>

        <div v-else class="movies-page__empty">
          <Icon name="i-ph-film-strip-bold" class="h-9 w-9" />
          <span>{{ $t("pages.moviesPage.emptyTitle") }}</span>
          <button type="button" @click="resetFilters">
            {{ $t("pages.moviesPage.resetFilters") }}
          </button>
        </div>

        <div v-if="hasMoreMovies" class="movies-page__load-more">
          <button class="movies-page__load-more-button" type="button" @click="visibleCount += pageSize">
            <Icon name="i-ph-arrow-down-bold" class="h-4 w-4" />
            Tải thêm
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import MoviesCard from "../components/Card.vue"
import MoviesTabs from "../components/Tabs.vue"
import type { MovieTabId } from "../components/Tabs.vue"
import { useMockMoviesData } from "../../application/composables/useMockMoviesData"

const { movies } = useMockMoviesData()
const { t: translate } = useI18n()

useSeoMeta({
  title: () => translate("pages.moviesPage.seoTitle"),
  description: () => translate("pages.moviesPage.seoDescription"),
})

const pageSize = 26
const search = ref("")
const activeTab = ref<MovieTabId>("new")
const selectedGenre = ref("all")
const selectedCountry = ref("all")
const visibleCount = ref(pageSize)
const isFilterOpen = ref(false)
const genreOpen = ref(false)
const countryOpen = ref(false)
const filterMenuRef = ref<HTMLElement | null>(null)

const genres = [
  { label: "Tất cả", value: "all" },
  { label: "Tài liệu", value: "documentary" },
  { label: "Chính kịch", value: "drama" },
  { label: "Hành động", value: "action" },
  { label: "Hài hước", value: "comedy" },
  { label: "Tình cảm", value: "romance" },
  { label: "Kinh dị", value: "horror" },
  { label: "Viễn tưởng", value: "sci-fi" },
]

const countries = [
  { label: "Tất cả", value: "all" },
  { label: "Việt Nam", value: "vietnam" },
  { label: "Âu Mỹ", value: "usa" },
  { label: "Hàn Quốc", value: "korea" },
  { label: "Nhật Bản", value: "japan" },
  { label: "Trung Quốc", value: "china" },
]

const genreLabelMap = computed(() =>
  Object.fromEntries(genres.map(genre => [genre.value, genre.label])) as Record<string, string>,
)

const navigationTabs = computed(() => [
  { id: "new" as MovieTabId, label: translate("pages.moviesPage.tabNew"), icon: "i-ph-film-strip-bold" },
  { id: "recommended" as MovieTabId, label: translate("pages.moviesPage.tabRecommended"), icon: "i-ph-star-bold" },
  { id: "watched" as MovieTabId, label: translate("pages.moviesPage.tabWatched"), icon: "i-ph-trend-up-bold" },
])

const filteredMovies = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return movies.value.filter((movie) => {
    const matchesGenre = selectedGenre.value === "all" || movie.genre === selectedGenre.value
    const matchesCountry = selectedCountry.value === "all" || movie.country === selectedCountry.value
    const matchesKeyword = !keyword || [
      movie.title,
      movie.director,
      movie.summary,
      movie.genre,
      ...movie.tags,
    ].some(field => field.toLowerCase().includes(keyword))

    return matchesGenre && matchesCountry && matchesKeyword
  })
})

const displayMovies = computed(() => {
  const items = [...filteredMovies.value]

  if (activeTab.value === "recommended") {
    return items.filter(movie => movie.isEditorsPick)
  }

  if (activeTab.value === "watched") {
    return items.sort((left, right) => right.rating - left.rating)
  }

  return items
})

const visibleMovies = computed(() => displayMovies.value.slice(0, visibleCount.value))
const hasMoreMovies = computed(() => visibleMovies.value.length < displayMovies.value.length)

const selectGenre = (value: string) => {
  selectedGenre.value = value
}

const selectCountry = (value: string) => {
  selectedCountry.value = value
}

const resetFilters = () => {
  search.value = ""
  activeTab.value = "new"
  selectedGenre.value = "all"
  selectedCountry.value = "all"
  visibleCount.value = pageSize
  isFilterOpen.value = false
  genreOpen.value = false
  countryOpen.value = false
}

const closeFilterOnOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node | null

  if (isFilterOpen.value && target && !filterMenuRef.value?.contains(target)) {
    isFilterOpen.value = false
  }
}

watch([search, activeTab, selectedGenre, selectedCountry], () => {
  visibleCount.value = pageSize
})

onMounted(() => window.addEventListener("click", closeFilterOnOutsideClick))
onUnmounted(() => window.removeEventListener("click", closeFilterOnOutsideClick))
</script>

<style scoped>
.movies-page {
  background: #f0f2f5;
}

.movies-page__head {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #f9f9f9;
}

.movies-page__title {
  display: flex;
  height: 64px;
  align-items: center;
  gap: 10px;
  color: #111827;
  font-size: 24px;
  font-weight: 900;
}

.movies-page__title :deep(svg) {
  color: #0a58ca;
}

.movies-page__backdrop {
  height: 24px;
  background: #ffffff;
}

.movies-page__filters {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.movies-page__search {
  position: relative;
  min-width: 0;
  flex: 1;
}

.movies-page__search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  color: #94a3b8;
}

.movies-page__search-input {
  width: 100%;
  height: 42px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  padding: 0 14px 0 46px;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
  outline: none;
}

.movies-page__search-input:focus {
  border-color: #0a58ca;
  background: #ffffff;
}

.movies-page__filter {
  position: relative;
  flex: 0 0 auto;
}

.movies-page__filter-button {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbe1ea;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
}

.movies-page__filter-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: min(320px, calc(100vw - 32px));
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  padding: 8px 0;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.16);
}

.movies-page__filter-section,
.movies-page__filter-item,
.movies-page__reset {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  background: transparent;
  padding: 11px 16px;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.movies-page__filter-list {
  padding: 2px 0 8px 14px;
}

.movies-page__filter-item {
  justify-content: flex-start;
  padding: 8px 16px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.movies-page__filter-item:hover,
.movies-page__filter-item--active {
  color: #0a58ca;
}

.movies-page__reset {
  border-top: 1px solid #eef2f7;
  justify-content: flex-start;
  color: #0a58ca;
}

.movies-page__tabs {
  margin-top: 18px;
}

.movies-page__content {
  margin-top: 18px;
}

.movies-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.movies-page__empty {
  display: flex;
  min-height: 190px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  color: #64748b;
  font-weight: 800;
  text-align: center;
}

.movies-page__empty button {
  border: 0;
  background: transparent;
  color: #0a58ca;
  font-weight: 900;
  cursor: pointer;
}

.movies-page__load-more {
  display: flex;
  justify-content: center;
  padding: 26px 0 8px;
}

.movies-page__load-more-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbe1ea;
  background: #ffffff;
  padding: 10px 22px;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.rotate-180 {
  transform: rotate(180deg);
}

@media (min-width: 640px) {
  .movies-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .movies-page__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .movies-page__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>
