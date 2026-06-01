<template>
  <div class="space-y-6 xl:sticky xl:top-[84px]">
    <!-- Unified Elegant Preview Card -->
    <section v-if="group" class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <!-- Minimal Accent Header -->
      <div class="relative h-24 overflow-hidden">
        <div class="absolute inset-0" :style="bannerBackgroundStyle" />
        <div class="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
      </div>

      <!-- Main Content -->
      <div class="relative px-6 pb-6">
        <!-- Floating Avatar/Icon -->
        <div class="relative -mt-10 mb-4">
          <div class="flex h-20 w-20 items-center justify-center rounded-[20px] border-4 border-white bg-slate-50 shadow-lg overflow-hidden">
            <img v-if="group.avatar" :src="group.avatar" class="h-full w-full object-cover" />
            <Icon v-else name="i-ph-users-three-fill" class="h-10 w-10 text-primary-500" />
          </div>
        </div>

        <!-- Group Identity -->
        <div class="space-y-1">
          <h3 class="text-xl font-black tracking-tight text-slate-800">{{ groupName }}</h3>
          <p class="flex items-center gap-1.5 text-[12px] font-medium text-slate-400">
            <Icon name="i-ph-link-bold" class="h-3.5 w-3.5" />
            vnseea.vn/g/{{ group.slug }}
          </p>
        </div>

        <!-- Minimal Badges -->
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {{ privacyLabel }}
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {{ categoryLabel }}
          </span>
        </div>

        <p class="mt-4 text-[14px] font-medium leading-relaxed text-slate-500 line-clamp-2 italic">
          "{{ groupSummary }}"
        </p>

        <!-- Divider -->
        <div class="my-6 h-px bg-slate-100" />

        <!-- Compact Stats Row (Strict Horizontal) -->
        <div class="flex items-center justify-around rounded-2xl bg-slate-50/80 py-4 ring-1 ring-slate-100">
          <div class="flex flex-col items-center px-2 text-center">
            <p class="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-400">{{ $t('community.settings.basics.stats.tagCount') }}</p>
            <p class="mt-1 text-base font-black text-primary-600">{{ (group.tags || []).length }}</p>
          </div>
          <div class="h-8 w-px bg-slate-200/60" />
          <div class="flex flex-col items-center px-2 text-center">
            <p class="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-400">{{ $t('community.settings.basics.stats.guidelinesCount') }}</p>
            <p class="mt-1 text-base font-black text-primary-600">{{ group.guidelines?.length || 0 }}</p>
          </div>
          <div class="h-8 w-px bg-slate-200/60" />
          <div class="flex flex-col items-center px-2 text-center">
            <p class="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-400">STATUS</p>
            <p class="mt-1 text-base font-black text-green-500">Active</p>
          </div>
        </div>

        <!-- Integrated Progress Bar (Minimal) -->
        <div class="mt-6 space-y-2">
          <div class="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
            <span>Policies Enabled</span>
            <span class="text-primary-600">{{ enabledPolicies }}/{{ totalPolicies }}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div 
              class="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-1000 ease-out" 
              :style="{ width: `${policyProgress}%` }" 
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Loading State -->
    <section v-else class="animate-pulse rounded-[24px] bg-slate-50 p-6">
      <div class="h-20 w-20 rounded-2xl bg-slate-200" />
      <div class="mt-6 h-6 w-1/2 rounded bg-slate-200" />
      <div class="mt-2 h-4 w-1/3 rounded bg-slate-200" />
    </section>

    <!-- Notes Section (More Airy) -->
    <section class="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon name="i-ph-info-bold" class="h-6 w-6" />
        </div>
        <p class="text-[12px] font-black uppercase tracking-widest text-slate-700">
          {{ $t('community.settings.sidebar.notes') }}
        </p>
      </div>
      <div class="mt-6 space-y-4">
        <div class="flex gap-4">
          <div class="h-1.5 w-1.5 mt-1.5 shrink-0 rounded-full bg-primary-500" />
          <div>
            <p class="text-[13px] font-bold text-slate-700">{{ $t('community.settings.sidebar.tip1Title') }}</p>
            <p class="mt-1 text-[12px] text-slate-500">{{ $t('community.settings.sidebar.tip1Desc') }}</p>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="h-1.5 w-1.5 mt-1.5 shrink-0 rounded-full bg-primary-500" />
          <div>
            <p class="text-[13px] font-bold text-slate-700">{{ $t('community.settings.sidebar.tip2Title') }}</p>
            <p class="mt-1 text-[12px] text-slate-500">{{ $t('community.settings.sidebar.tip2Desc') }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getCommunityInitials } from "../../domain/services/community-helpers.service"
import type {
  CommunityGroupMember,
  CommunityGroupRecord,
} from "../../domain/types/community.types"

const translateText = useMaybeTranslatedText()

const props = defineProps<{
  group: CommunityGroupRecord | null
  members: CommunityGroupMember[]
  memberCountLabel: string
  privacyLabel: string
  privacyDescription: string
  categoryLabel: string
  enabledPolicies: number
  totalPolicies: number
  showMemberDirectory: boolean
}>()

const initials = computed(() =>
  props.group ? getCommunityInitials(props.group.name) : "",
)

const groupName = computed(() =>
  props.group ? translateText(props.group.name, props.group.slug) : "",
)

const groupSummary = computed(() =>
  props.group ? translateText(props.group.summary) : "",
)

const bannerBackgroundStyle = computed(() => {
  if (props.group?.banner && props.group.banner.startsWith("http")) {
    return {
      backgroundImage: `url(${props.group.banner})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }
  }

  // Modern Soft Gradient
  return {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  }
})

const policyProgress = computed(() => {
  if (!props.totalPolicies) {
    return 0
  }

  return (props.enabledPolicies / props.totalPolicies) * 100
})
</script>
