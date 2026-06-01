<!-- Description: Renders the poke route with a structured list of cards following the user's specific reference. -->
<template>
  <div class="mx-auto max-w-[900px] min-h-screen space-y-6 px-4 py-12 sm:px-6 lg:px-8">
    <!-- Simple Header (Matching Screenshot) -->
    <header class="space-y-2 pb-6">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {{ t("pages.pokePage.listEyebrow") }}
      </p>
      <h1 class="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
        {{ t("pages.pokePage.heroTitle") }}
      </h1>
      <p class="max-w-2xl text-sm font-medium text-slate-500 leading-relaxed">
        {{ t("pages.pokePage.heroDescription") }}
      </p>
      
      <div class="flex items-center gap-4 pt-4">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ t("pages.pokePage.pendingLabel") }}</span>
          <span class="text-3xl font-black text-slate-900">{{ pokeRecords.length }}</span>
        </div>
        <button 
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:ring-primary-500 active:scale-90"
          @click="fetchPokes"
        >
          <Icon name="i-ph-arrow-counter-clockwise-bold" class="h-6 w-6 text-slate-600" />
        </button>
      </div>
    </header>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-ph-warning-octagon-fill"
      class="rounded-2xl border-none font-semibold"
      :description="errorMessage"
    />

    <!-- List Container -->
    <div v-if="loading" class="space-y-6">
      <div v-for="i in 3" :key="i" class="h-64 w-full animate-pulse rounded-[24px] bg-slate-100" />
    </div>

    <div v-else-if="pokeRecords.length === 0">
      <section class="flex flex-col items-center justify-center py-24 text-center bg-white border border-dashed border-slate-200 rounded-[24px]">
        <Icon name="i-ph-hand-pointing-duotone" class="h-16 w-16 text-slate-300 mb-4" />
        <h2 class="text-xl font-bold text-slate-900">{{ t('pages.pokePage.listTitle', { count: 0 }) }}</h2>
        <p class="text-sm font-medium text-slate-500">{{ t('pages.pokePage.listDescription') }}</p>
      </section>
    </div>

    <div v-else class="flex flex-col gap-6">
      <PokeRequestCard
        v-for="item in pokeRecords"
        :key="item.id"
        :record="item"
        :poked-back="pokedBackIds.includes(item.id)"
        @poke="pokeBack"
        @remove="removePoke"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import PokeRequestCard from "../components/RequestCard.vue"
import { usePokePageVM } from "../../application/view-models/usePokePageVM"

const { t } = useI18n()
const {
  loading,
  errorMessage,
  pokeRecords,
  pokedBackIds,
  fetchPokes,
  pokeBack,
  removePoke,
} = usePokePageVM()

useSeoMeta({
  title: () => t("pages.pokePage.seoTitle"),
  description: () => t("pages.pokePage.seoDescription"),
})

await fetchPokes()
</script>
