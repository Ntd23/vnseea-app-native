<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center" @click.self="emit('close')">
        <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="emit('close')" />

        <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-6 scale-[0.97]" enter-to-class="opacity-100 translate-y-0 scale-100">
          <section v-if="open" class="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.10)] sm:max-h-[90vh] sm:rounded-[28px]">
            <div class="flex shrink-0 items-center justify-between border-b border-[#0000ff]/8 px-5 py-4">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#0000ff]/8 text-[#0000ff]">
                  <Icon name="i-ph-sliders-horizontal-bold" class="h-[18px] w-[18px]" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-800">{{ t("feed.publisherBox.advancedTitle") }}</span>
                  <span class="block text-[12px] text-slate-500">{{ t("feed.publisherBox.advancedDescription") }}</span>
                </div>
              </div>
              <UButton color="neutral" variant="ghost" size="xs" class="rounded-full" @click="emit('close')">
                <Icon name="i-lucide-x" class="h-[18px] w-[18px]" />
              </UButton>
            </div>

            <div class="flex-1 space-y-5 overflow-y-auto p-5">
              <UAlert
                color="neutral"
                variant="subtle"
                icon="i-ph-floppy-disk-back-fill"
                :title="t('feed.publisherBox.advancedSummaryTitle')"
                :description="summaryDescription"
                class="rounded-[18px]"
              />

              <div>
                <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0000ff]/50">{{ t("feed.publisherBox.audienceTitle") }}</p>
                <div class="grid gap-2 sm:grid-cols-3">
                  <UButton
                    v-for="option in audienceOptions"
                    :key="option.value"
                    color="neutral"
                    :variant="audience === option.value ? 'soft' : 'outline'"
                    class="justify-start rounded-[16px] px-4 py-3 text-left text-[12px] font-semibold"
                    @click="emit('update:audience', option.value)"
                  >
                    <Icon :name="option.icon" class="h-4 w-4" />
                    {{ option.label }}
                  </UButton>
                </div>
              </div>

              <div>
                <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0000ff]/50">{{ t("feed.publisherBox.advancedActionTitle") }}</p>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <UButton
                    v-for="item in actions"
                    :key="item.value"
                    color="neutral"
                    :variant="selectedAction === item.value ? 'soft' : 'outline'"
                    class="justify-start rounded-[16px] px-4 py-3 text-[12px] font-semibold"
                    @click="emit('update:selected-action', selectedAction === item.value ? '' : item.value)"
                  >
                    <Icon :name="item.icon" class="h-4 w-4" />
                    {{ item.label }}
                  </UButton>
                </div>
              </div>

              <div>
                <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0000ff]/50">{{ t("feed.publisherBox.advancedChipTitle") }}</p>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="item in chips"
                    :key="item.value"
                    color="neutral"
                    :variant="selectedChips.includes(item.value) ? 'soft' : 'outline'"
                    size="xs"
                    class="rounded-full px-4 py-2 text-[12px] font-semibold"
                    @click="emit('toggle-chip', item.value)"
                  >
                    <Icon :name="item.icon" class="h-3.5 w-3.5" />
                    {{ item.label }}
                  </UButton>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#0000ff]/8 px-5 py-4">
              <UButton color="neutral" variant="outline" class="rounded-xl" @click="emit('reset')">
                {{ t("feed.publisherBox.resetOptions") }}
              </UButton>
              <UButton color="primary" class="rounded-xl px-5" @click="emit('close')">
                {{ t("feed.publisherBox.done") }}
              </UButton>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
type PublisherAction = "image" | "video" | "poll" | "gif" | "feeling" | "audio" | "file" | "story" | "product" | ""
type PublisherAudience = "public" | "connections" | "group"
type PublisherChip = "onlyMe" | "location" | "tagFriends" | "colors"

const { t } = useI18n()

const props = withDefaults(defineProps<{
  open?: boolean
  audience: PublisherAudience
  selectedAction: PublisherAction
  selectedChips: PublisherChip[]
}>(), {
  open: false,
})

const emit = defineEmits<{
  close: []
  reset: []
  "update:audience": [value: PublisherAudience]
  "update:selected-action": [value: PublisherAction]
  "toggle-chip": [value: PublisherChip]
}>()

const audienceOptions = computed(() => [
  { value: "public" as const, label: t("feed.publisherBox.audiencePublic"), icon: "i-ph-globe-hemisphere-west-bold" },
  { value: "connections" as const, label: t("feed.publisherBox.audienceConnections"), icon: "i-ph-users-three-bold" },
  { value: "group" as const, label: t("feed.publisherBox.audienceGroup"), icon: "i-ph-user-list-bold" },
])

const actions = computed(() => [
  { value: "image" as const, label: t("feed.publisherBox.actionImage"), icon: "i-ph-image-bold" },
  { value: "video" as const, label: t("feed.publisherBox.actionVideo"), icon: "i-ph-video-camera-bold" },
  { value: "poll" as const, label: t("feed.publisherBox.actionPoll"), icon: "i-ph-list-checks-bold" },
  { value: "gif" as const, label: t("feed.publisherBox.actionGif"), icon: "i-ph-film-strip-bold" },
  { value: "feeling" as const, label: t("feed.publisherBox.actionFeeling"), icon: "i-ph-smiley-bold" },
  { value: "audio" as const, label: t("feed.publisherBox.actionAudio"), icon: "i-ph-music-notes-bold" },
  { value: "file" as const, label: t("feed.publisherBox.actionFile"), icon: "i-ph-file-text-bold" },
  { value: "story" as const, label: t("feed.publisherBox.actionStory"), icon: "i-ph-sparkle-bold" },
  { value: "product" as const, label: t("feed.publisherBox.actionProduct"), icon: "i-ph-shopping-bag-open-bold" },
])

const chips = computed(() => [
  { value: "onlyMe" as const, label: t("feed.publisherBox.chipOnlyMe"), icon: "i-ph-lock-key-bold" },
  { value: "location" as const, label: t("feed.publisherBox.chipAddLocation"), icon: "i-ph-map-pin-bold" },
  { value: "tagFriends" as const, label: t("feed.publisherBox.chipTagFriends"), icon: "i-ph-user-plus-bold" },
  { value: "colors" as const, label: t("feed.publisherBox.chipColors"), icon: "i-ph-palette-bold" },
])

const selectedActionLabel = computed(() =>
  actions.value.find(item => item.value === props.selectedAction)?.label ?? t("feed.publisherBox.advancedActionEmpty"),
)

const summaryDescription = computed(() =>
  t("feed.publisherBox.advancedSummaryDescription", {
    audience: audienceOptions.value.find(item => item.value === props.audience)?.label ?? "",
    action: selectedActionLabel.value,
    count: props.selectedChips.length,
  }),
)
</script>
