<template>
  <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
    <!-- Header/Cover Area -->
    <div class="relative w-full overflow-hidden bg-slate-800" style="height: 300px !important; display: block !important;">
      <img 
        v-if="group.bannerUrl" 
        :src="group.bannerUrl" 
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
        loading="lazy"
      />
      <div v-else class="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      <!-- Top Badges (Minimal) -->
      <div class="absolute top-6 left-6 flex gap-2">
        <span class="rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20">
          {{ privacyLabel }}
        </span>
        <span class="rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20">
          {{ categoryLabel }}
        </span>
      </div>
    </div>

    <!-- Info Area -->
    <div class="group-hero__info">
      <div class="group-hero__identity-row">
        <!-- Avatar + Title Group -->
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end">
          <!-- Big Avatar/Icon -->
          <div class="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-slate-900 bg-slate-800 shadow-xl sm:h-40 sm:w-40">
            <img v-if="group.avatar" :src="group.avatar" class="h-full w-full object-cover" />
            <Icon v-else name="i-ph-users-three-fill" class="h-16 w-16 text-slate-400 sm:h-20 sm:w-20" />
          </div>

          <div class="min-w-0 pb-1">
            <h1 class="text-3xl font-black tracking-tight text-white sm:text-5xl">
              {{ groupName }}
            </h1>
            <p class="mt-2 max-w-xl text-[15px] font-medium text-slate-400">
              {{ groupSummary }}
            </p>
            <div class="mt-4 flex items-center gap-4 text-[13px] font-bold text-slate-300">
              <span class="flex items-center gap-1.5">
                <Icon name="i-ph-users-fill" class="h-4 w-4 text-primary-500" />
                {{ memberCountLabel }}
              </span>
              <span class="h-1 w-1 rounded-full bg-slate-600" />
              <span class="flex items-center gap-1.5 text-green-400">
                <span class="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                {{ onlineCountLabel }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons (Clean) -->
        <div class="group-hero__actions">
          <UButton
            v-if="group.canManage || (joined && group.allowMemberInvites)"
            color="primary"
            variant="solid"
            size="lg"
            :loading="inviteState === 'loading'"
            :disabled="inviteState === 'loading'"
            class="group-hero__action-btn rounded-xl px-8 font-bold shadow-lg"
            @click="emit('invite')"
          >
            <span class="whitespace-nowrap">{{ inviteButtonLabel }}</span>
          </UButton>

          <UButton
            :color="primaryButtonColor"
            variant="solid"
            size="lg"
            :loading="joinState === 'loading'"
            :disabled="joinState === 'loading'"
            class="group-hero__action-btn rounded-xl px-8 font-bold"
            @click="handlePrimaryAction"
          >
            <Icon :name="primaryButtonIcon" class="mr-2 h-5 w-5 shrink-0" />
            <span class="whitespace-nowrap">{{ joinButtonLabel }}</span>
          </UButton>

          <UButton
            v-if="group.canManage"
            :to="settingsPath"
            color="neutral"
            variant="ghost"
            size="xl"
            class="h-12 w-12 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
          >
            <Icon name="i-ph-gear-six-bold" class="h-6 w-6" />
          </UButton>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getCommunityGroupSettingsPath } from "../../domain/services/community-helpers.service"
import type { CommunityGroupRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

const props = defineProps<{
  group: CommunityGroupRecord
  memberCountLabel: string
  onlineCountLabel: string
  privacyLabel: string
  categoryLabel: string
  joinState?: "idle" | "loading" | "success" | "error"
  inviteState?: "idle" | "loading" | "success" | "error"
  joined?: boolean
  requested?: boolean
}>()

const emit = defineEmits<{
  join: []
  delete: []
  invite: []
}>()

const settingsPath = computed(() =>
  getCommunityGroupSettingsPath(props.group.slug),
)

const groupName = computed(() =>
  translateText(props.group.name),
)

const groupSummary = computed(() =>
  translateText(props.group.summary),
)

const joinButtonLabel = computed(() => {
  if (props.group.canManage) return t("pages.groupDetailPage.deleteGroupButton")
  if (props.joined) return t("pages.groupDetailPage.leaveButton")
  if (props.requested) return t("pages.groupDetailPage.requestPendingButton")
  return translateText(props.group.joinLabel, t("pages.groupDetailPage.joinFallback"))
})

const primaryButtonColor = computed(() =>
  props.group.canManage ? "error" : (props.joined || props.requested) ? "primary" : "white",
)

const primaryButtonIcon = computed(() => {
  if (props.group.canManage) return "i-ph-trash-bold"
  if (props.joined) return "i-ph-sign-out-bold"
  if (props.requested) return "i-ph-clock-bold"
  return "i-ph-user-plus-bold"
})

function handlePrimaryAction() {
  if (props.group.canManage) {
    emit("delete")
    return
  }

  emit("join")
}

const inviteButtonLabel = computed(() => {
  if (props.inviteState === "success") return t("pages.groupDetailPage.invitedButton")
  return translateText(props.group.inviteLabel, t("pages.groupDetailPage.inviteFallback"))
})
</script>

<style scoped>
.group-hero__info {
  padding: 0 40px 32px;
}

.group-hero__identity-row {
  position: relative;
  margin-top: -80px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 40px;
}

.group-hero__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
  padding-bottom: 4px;
}

.group-hero__action-btn {
  min-height: 44px;
  min-width: 150px;
  justify-content: center;
}

@media (max-width: 767px) {
  .group-hero__info {
    padding: 0 24px 28px;
  }

  .group-hero__identity-row {
    margin-top: -64px;
    flex-direction: column;
    align-items: stretch;
  }

  .group-hero__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
    padding-bottom: 0;
  }

  .group-hero__action-btn {
    min-width: 0;
    flex: 1 1 160px;
  }
}
</style>
