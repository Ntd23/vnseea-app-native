<template>
  <div
    :class="compact
      ? 'inline-flex items-center gap-1 rounded-2xl border border-[#e2e8f0] bg-white p-1.5 shadow-sm'
      : 'surface-card p-5 ring-1 ring-secondary-100 bg-white rounded-2xl shadow-xs space-y-4'"
  >
    <!-- Non-compact settings tab layout -->
    <template v-if="!compact">
      <div class="flex items-center gap-2 pb-3 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        <Icon name="i-ph-translate-duotone" class="h-4 w-4 text-[#0000ff]" />
        <span>{{ $t("settings.general.languageBadge") || "Language" }}</span>
      </div>

      <div class="flex items-center justify-between py-2 w-full gap-4">
        <!-- Descriptions on the left -->
        <div class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-slate-900">{{ $t("settings.general.languageRowTitle") || "Ngôn ngữ hiển thị" }}</span>
          <span class="text-xs text-slate-500">{{ $t("settings.general.languageRowDesc") || "Chọn ngôn ngữ mặc định cho giao diện ứng dụng của bạn" }}</span>
        </div>

        <!-- Premium Segmented Control using UButton with clear physical borders -->
        <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 flex-shrink-0">
          <UButton
            v-for="item in localeOptions"
            :key="item.code"
            type="button"
            variant="solid"
            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer select-none border"
            :class="activeLocale === item.code 
              ? 'border-[#0000ff] bg-[#0000ff] text-white shadow-sm font-extrabold' 
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-xs'"
            @click.prevent.stop="changeLocale(item.code)"
          >
            {{ item.short }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- Compact layout (pill-toggle) -->
    <template v-else>
      <div class="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
        <UButton
          v-for="item in localeOptions"
          :key="item.code"
          type="button"
          variant="solid"
          class="px-2 py-0.5 rounded text-[10px] font-bold transition-all duration-150 cursor-pointer select-none border min-w-[32px] justify-center flex items-center"
          :class="activeLocale === item.code 
            ? 'border-[#0000ff] bg-[#0000ff] text-white shadow-xxs font-extrabold' 
            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-xxs'"
          @click.prevent.stop="changeLocale(item.code)"
        >
          {{ item.short }}
        </UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const { locale, locales, setLocale } = useI18n()
const pendingLocale = ref("")

const localeOptions = computed(() =>
  locales.value.map((entry) => {
    if (typeof entry === "string") {
      return {
        code: entry,
        name: entry.toUpperCase(),
        short: entry.toUpperCase(),
      }
    }

    return {
      code: entry.code,
      name: entry.name ?? entry.code.toUpperCase(),
      short: entry.code.toUpperCase(),
    }
  }),
)

const activeLocale = computed(() => String(locale.value))

const changeLocale = async (code: string) => {
  if (code === activeLocale.value || pendingLocale.value) return

  try {
    pendingLocale.value = code
    await setLocale(code)
  }
  finally {
    pendingLocale.value = ""
  }
}
</script>
