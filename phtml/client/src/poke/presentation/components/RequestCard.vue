<!-- Description: Renders one API-backed poke request with real-time dynamic time updates and refined activity status. -->
<template>
  <article class="relative flex flex-col gap-6 bg-white p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-primary-300" style="border-radius: 24px 24px 24px 4px; border-width: 1px;">
    <!-- Top Row: Avatar & Name -->
    <div class="flex items-center gap-4">
      <div class="h-14 w-14 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
        <img 
          v-if="record.avatarUrl" 
          :src="record.avatarUrl" 
          :alt="record.name" 
          class="h-full w-full object-cover"
          @error="(e: any) => e.target.src = '/img/user.png'"
        >
        <div v-else class="flex h-full w-full items-center justify-center bg-primary-50 text-primary-600 font-bold">
          {{ record.initials }}
        </div>
      </div>
      
      <div class="min-w-0">
        <h3 class="text-lg font-bold text-slate-900 leading-tight">
          {{ record.name }}
        </h3>
        <p class="truncate text-sm font-medium text-slate-500">
          {{ record.role || `@${record.href.split('@')[1]}` }}
        </p>
      </div>
    </div>

    <!-- Bottom Row: Status & Time & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="flex gap-8">
        <!-- Activity Status -->
        <div class="space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {{ t("pages.pokePage.pokeCountLabel") }}
          </p>
          <div class="flex items-center gap-2">
             <div class="h-2 w-2 rounded-full" :class="record.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'" />
             <p class="text-xs font-bold" :class="record.online ? 'text-green-600' : 'text-slate-500'">
                {{ record.online ? t("pages.pokePage.activeNow") : t("pages.pokePage.offlineStatus") }}
             </p>
          </div>
        </div>

        <!-- Poke Time (Dynamic) -->
        <div class="space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
             {{ t("pages.pokePage.pokeActionLabel") }}
          </p>
          <p class="text-xs font-bold text-slate-600">
            {{ displayTime }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <UButton
          size="lg"
          class="rounded-xl px-8 font-bold shadow-sm"
          color="primary"
          variant="solid"
          @click="$emit('poke', record.id)"
        >
          <template #leading>
            <Icon :name="pokedBack ? 'i-ph-check-circle-bold' : 'i-ph-hand-pointing-bold'" class="h-5 w-5" />
          </template>
          {{ pokedBack ? t("pages.pokePage.invitationSent") : t("pages.pokePage.pokeBack") }}
        </UButton>

        <UButton
          v-if="!pokedBack"
          size="lg"
          color="gray"
          variant="ghost"
          class="rounded-xl p-2.5 hover:bg-red-50 hover:text-red-600 transition-colors"
          @click="$emit('remove', record.id)"
        >
          <Icon name="i-ph-trash-bold" class="h-5 w-5" />
        </UButton>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useNow } from "@vueuse/core"
import type { PokeRecord } from "../../application/composables/usePokeData"

const props = defineProps<{
  record: PokeRecord
  pokedBack: boolean
}>()

const { t } = useI18n()

defineEmits<{
  poke: [id: string]
  remove: [id: string]
}>()

// Real-time dynamic time-ago logic
const now = useNow({ interval: 30000 })
const displayTime = computed(() => {
  const timestamp = props.record.timestamp
  if (!timestamp) return props.record.timeLabel

  const diffInSeconds = Math.floor((now.value.getTime() - timestamp * 1000) / 1000)
  
  if (diffInSeconds < 60) {
    return t('pages.pokePage.justNow')
  }
  
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return t('pages.pokePage.minuteAgo', { count: minutes })
  }
  
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return t('pages.pokePage.hoursAgo', { count: hours })
  }

  // If older than a day, show the formatted date string from server
  return props.record.timeLabel
})
</script>
