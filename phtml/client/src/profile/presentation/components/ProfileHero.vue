<template>
  <div class="surface-card overflow-hidden">
    <!-- Cover Identity -->
    <div class="relative min-h-[220px] overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 sm:min-h-[280px]">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_76%_24%,rgba(255,255,255,0.1),transparent_30%)] opacity-60" />
      
      <!-- Top Badges (Status/Role) -->
      <div class="absolute left-6 top-6 flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-xl shadow-[0_12px_32px_rgba(15,23,42,0.12)] transition-all hover:bg-white/15">
        <UAvatar
          text="QT"
          size="md"
          :ui="{ 
            rounded: 'rounded-xl',
            background: 'bg-white/20',
            text: 'text-white font-extrabold'
          }"
          class="ring-2 ring-white/30"
        />
        <div class="space-y-0.5">
          <p class="text-sm font-extrabold tracking-tight text-white leading-none">{{ t("pages.profilePage.heroRole") }}</p>
          <p class="text-[11px] font-semibold text-white/70">{{ t("pages.profilePage.heroStatus") }}</p>
        </div>
      </div>

      <!-- Emoji/Status Trigger -->
      <UButton
        icon="i-ph-smiley-duotone"
        color="white"
        variant="solid"
        size="md"
        class="absolute right-6 top-6 rounded-2xl bg-white/90 hover:bg-white shadow-lg text-[var(--text-primary)] active:scale-95 transition-transform"
      />

      <!-- Content Overlay -->
      <div class="absolute inset-x-0 bottom-0 p-6 sm:p-8 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div class="flex flex-col sm:flex-row sm:items-end gap-5">
            <!-- Profile Avatar Card -->
            <div class="relative group">
              <div class="relative -mb-12 sm:-mb-14">
                <UAvatar
                  text="VN"
                  size="3xl"
                  class="h-[100px] w-[100px] sm:h-[128px] sm:w-[128px] ring-[6px] ring-white shadow-2xl transition-transform group-hover:scale-[1.02]"
                  :ui="{ 
                    rounded: 'rounded-[2.5rem]',
                    background: 'bg-primary-600',
                    text: 'text-white font-black text-3xl'
                  }"
                />
                <UButton
                  icon="i-ph-camera-fill"
                  color="gray"
                  variant="solid"
                  size="xs"
                  class="absolute bottom-2 right-2 rounded-xl ring-4 ring-white shadow-md"
                />
              </div>
            </div>

            <!-- Identity Info -->
            <div class="rounded-3xl border border-white/20 bg-white/10 p-5 px-6 backdrop-blur-2xl shadow-[0_16px_36px_rgba(15,23,42,0.14)] space-y-1 sm:max-w-md">
              <h1 class="text-lg font-extrabold tracking-tight text-white sm:text-xl">{{ t("pages.profilePage.heroHeadline") }}</h1>
              <p class="text-xs font-medium leading-relaxed text-white/80 sm:text-sm">{{ t("pages.profilePage.heroDescription") }}</p>
            </div>
          </div>

          <!-- Action Buttons Group -->
          <div class="flex flex-wrap items-center gap-2.5 rounded-[2rem] border border-white/10 bg-white/10 p-2.5 backdrop-blur-2xl shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <UButton
              color="primary"
              size="md"
              class="rounded-full px-6 font-semibold shadow-lg shadow-primary-500/30"
            >
              {{ t("pages.profilePage.heroActionEdit") }}
            </UButton>
            <div class="h-6 w-[1.5px] bg-white/10 mx-1 hidden sm:block" />
            <div class="flex gap-2">
              <UButton
                v-for="action in [
                  { icon: 'i-ph-clock-counter-clockwise-duotone', label: t('pages.profilePage.heroActionActivities') },
                  { icon: 'i-ph-user-plus-duotone', label: t('pages.profilePage.heroActionFollow') },
                  { icon: 'i-ph-messenger-logo-duotone', label: t('pages.profilePage.heroActionMessage') }
                ]"
                :key="action.label"
                variant="soft"
                color="white"
                size="md"
                class="rounded-full px-4 font-semibold hover:bg-white/20"
                :icon="action.icon"
              >
                <span class="hidden lg:inline">{{ action.label }}</span>
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto border-t border-secondary-100 bg-white/80 px-4 py-3 sm:px-6 backdrop-blur-md">
      <UButton
        v-for="tab in tabs"
        :key="tab"
        variant="ghost"
        color="gray"
        size="sm"
        class="flex-shrink-0 rounded-full border border-transparent px-5 py-2.5 font-semibold text-[var(--text-primary)] transition-all hover:border-primary-100 hover:bg-primary-50/50 hover:text-primary-600"
      >
        <template #leading>
          <div class="h-1.5 w-1.5 rounded-full bg-primary-500/40" />
        </template>
        {{ tab }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const tabs = computed(() => [
  t("pages.profilePage.heroTabMarketplace"),
  t("pages.profilePage.heroTabTimeline"),
  t("pages.profilePage.heroTabGroups"),
  t("pages.profilePage.heroTabLikes"),
  t("pages.profilePage.heroTabFollowing"),
  t("pages.profilePage.heroTabFollowers"),
  t("pages.profilePage.heroTabPhotos"),
  t("pages.profilePage.heroTabAlbums"),
  t("pages.profilePage.heroTabProducts"),
  t("pages.profilePage.heroTabFamily"),
])
</script>
