<!-- Description: Profile navigation tabs with a Teleport-based 'More' dropdown that is never clipped by parent overflow. -->
<template>
  <div class="surface-card rounded-[24px] border border-[#0000ff]/10 shadow-[0_2px_14px_rgba(0,0,255,0.05)]">
    <div class="flex items-center gap-1 p-2">
      <!-- Scrollable tab list -->
      <div class="scrollbar-hide flex flex-1 items-center gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="relative shrink-0 rounded-full px-4 py-2.5 text-[13px] font-semibold transition"
          :class="modelValue === tab.key
            ? 'bg-[#0000ff] text-white shadow-[0_8px_24px_rgba(0,0,255,0.18)]'
            : 'text-slate-500 hover:bg-[#0000ff]/5 hover:text-[#0000ff]'"
          type="button"
          @click="$emit('update:modelValue', tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- More trigger button (outside overflow container) -->
      <button
        ref="triggerRef"
        class="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-slate-500 transition hover:bg-[#0000ff]/5 hover:text-[#0000ff]"
        :class="{ 'bg-[#0000ff]/5 text-[#0000ff]': moreOpen }"
        type="button"
        @click="toggleDropdown"
      >
        <Icon name="i-lucide-more-horizontal" class="h-4 w-4" />
        {{ t('pages.profilePage.tabs.more') }}
      </button>
    </div>

    <!-- Dropdown rendered at body level to escape all parent overflow clipping -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="moreOpen"
          class="profile-more-dropdown"
          :style="dropdownStyle"
        >
          <!-- Group 1: Social -->
          <div class="py-1">
            <button class="profile-more-item" type="button" @click="handleAction('poke')">
              <span class="profile-more-icon" style="background:rgba(249,115,22,0.1)">
                <Icon name="i-ph-hand-pointing-fill" class="h-4 w-4 text-orange-500" />
              </span>
              <div class="min-w-0">
                <p class="profile-more-label">{{ t('pages.profilePage.tabs.poke') }}</p>
                <p class="profile-more-desc">{{ t('pages.profilePage.tabs.pokeDesc') }}</p>
              </div>
            </button>
          </div>

          <div class="profile-more-divider" />

          <!-- Group 2: Link & Report -->
          <div class="py-1">
            <button class="profile-more-item" type="button" @click="handleAction('copy')">
              <span class="profile-more-icon">
                <Icon name="i-ph-link-bold" class="h-4 w-4" />
              </span>
              <div class="min-w-0">
                <p class="profile-more-label">{{ t('pages.profilePage.tabs.copyLink') }}</p>
                <p class="profile-more-desc">{{ t('pages.profilePage.tabs.copyLinkDesc') }}</p>
              </div>
            </button>

            <button class="profile-more-item" type="button" @click="handleAction('report')">
              <span class="profile-more-icon" style="background:rgba(245,158,11,0.1)">
                <Icon name="i-ph-warning-circle-bold" class="h-4 w-4 text-amber-500" />
              </span>
              <div class="min-w-0">
                <p class="profile-more-label">{{ t('pages.profilePage.tabs.report') }}</p>
                <p class="profile-more-desc">{{ t('pages.profilePage.tabs.reportDesc') }}</p>
              </div>
            </button>
          </div>

          <div class="profile-more-divider" />

          <!-- Group 3: Destructive -->
          <div class="py-1">
            <button class="profile-more-item" type="button" @click="handleAction('block')">
              <span class="profile-more-icon" style="background:rgba(220,38,38,0.08)">
                <Icon name="i-ph-prohibit-bold" class="h-4 w-4 text-red-500" />
              </span>
              <div class="min-w-0">
                <p class="profile-more-label" style="color:#dc2626">{{ t('pages.profilePage.tabs.block') }}</p>
                <p class="profile-more-desc">{{ t('pages.profilePage.tabs.blockDesc') }}</p>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()

defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const moreOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const tabs = computed(() => [
  { key: 'timeline', label: t('pages.profilePage.tabs.timeline') },
  { key: 'about', label: t('pages.profilePage.tabs.about') },
  { key: 'friends', label: t('pages.profilePage.tabs.friends') },
  { key: 'photos', label: t('pages.profilePage.tabs.photos') },
  { key: 'videos', label: t('pages.profilePage.tabs.videos') },
  { key: 'albums', label: t('pages.profilePage.tabs.albums') },
])

function toggleDropdown() {
  if (!moreOpen.value) {
    // Calculate position from trigger button before opening
    if (triggerRef.value) {
      const rect = triggerRef.value.getBoundingClientRect()
      dropdownStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        right: `${window.innerWidth - rect.right}px`,
        'transform-origin': 'top right',
      }
    }
  }
  moreOpen.value = !moreOpen.value
}

function closeDropdown(e: MouseEvent) {
  if (!triggerRef.value?.contains(e.target as Node)) {
    moreOpen.value = false
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', closeDropdown, true)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('click', closeDropdown, true)
  }
})

function handleAction(action: string) {
  moreOpen.value = false

  if (action === 'copy') {
    if (import.meta.client) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast.add({ title: t('feed.shareModal.copied'), color: 'success', icon: 'i-ph-check-circle-fill' })
        })
        .catch(() => {
          toast.add({ title: t('pages.profilePage.tabs.copyLink'), description: window.location.href, color: 'warning', icon: 'i-ph-warning-circle-fill' })
        })
    }
    return
  }

  toast.add({
    title: t('pages.profilePage.tabs.' + action),
    description: 'Tính năng đang phát triển',
    color: 'primary',
    icon: 'i-ph-info-bold',
  })
}
</script>

<style>
/* Not scoped — dropdown is teleported to body */
.profile-more-dropdown {
  z-index: 9999;
  width: 268px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 255, 0.08);
  background: #ffffff;
  box-shadow: 0 12px 40px rgba(0, 0, 255, 0.12);
}

.profile-more-divider {
  height: 1px;
  background: rgba(0, 0, 255, 0.06);
}

.profile-more-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.12s ease;
}

.profile-more-item:hover {
  background: rgba(0, 0, 255, 0.03);
}

.profile-more-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 255, 0.05);
  color: rgba(0, 0, 255, 0.6);
  margin-top: 2px;
}

.profile-more-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.profile-more-desc {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 1.3;
}
</style>
