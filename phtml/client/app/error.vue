<template>
  <UApp>
    <div class="min-h-screen bg-[#f1f4fb] px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto flex min-h-[calc(100dvh-80px)] max-w-3xl items-center justify-center">
        <section class="surface-card w-full overflow-hidden border-none ring-1 ring-secondary-100 shadow-2xl">
          <div class="bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-900 px-8 py-10 text-white sm:px-10">
            <p class="text-[11px] font-black uppercase tracking-[0.32em] text-white/70">
              Loi dieu huong
            </p>
            <h1 class="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {{ statusTitle }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/78">
              {{ statusDescription }}
            </p>
          </div>

          <div class="space-y-6 px-8 py-8 sm:px-10 sm:py-10">
            <div class="rounded-[24px] border border-secondary-100 bg-secondary-50/70 p-5">
              <div class="flex flex-wrap items-center gap-3">
                <UBadge color="primary" variant="soft" class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                  {{ error.statusCode || 500 }}
                </UBadge>
                <span class="text-xs font-black uppercase tracking-[0.2em] text-secondary-500">
                  {{ route.fullPath }}
                </span>
              </div>
              <p class="mt-4 text-sm font-medium leading-relaxed text-secondary-600">
                {{ errorMessage }}
              </p>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <UButton
                size="xl"
                class="justify-center rounded-2xl bg-primary-600 px-6 font-black uppercase tracking-[0.18em] shadow-xl shadow-primary-500/20 hover:bg-primary-700"
                @click="recoverToLastSafeRoute"
              >
                Quay lai trang truoc
              </UButton>
              <UButton
                size="xl"
                color="white"
                variant="soft"
                class="justify-center rounded-2xl px-6 font-black uppercase tracking-[0.18em] text-secondary-700 ring-1 ring-secondary-200 hover:ring-primary-500"
                @click="recoverToHome"
              >
                Ve trang chu
              </UButton>
            </div>

            <p class="text-xs font-semibold text-secondary-400">
              Trang se tu dong quay ve trong giay lat de ban tiep tuc dieu huong ma khong can reload.
            </p>
          </div>
        </section>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app"

const props = defineProps<{
  error: NuxtError
}>()

const route = useRoute()
const lastSafeRoute = useState("last-safe-route", () => "/home")

const statusCode = computed(() => props.error.statusCode || 500)

const statusTitle = computed(() => {
  if (statusCode.value === 404) return "Trang nay khong ton tai"
  if (statusCode.value >= 500) return "Trang nay dang gap loi"
  return "Khong the mo trang"
})

const statusDescription = computed(() => {
  if (statusCode.value === 404) {
    return "Lien ket ban vua mo chua co page hoac route tuong ung. He thong se dua ban ve trang an toan ngay."
  }

  if (statusCode.value >= 500) {
    return "Page vua truy cap dang loi render hoac loi du lieu. He thong se tu dong tra ban ve route on dinh de khong bi ket app."
  }

  return "Da xay ra loi khi dieu huong. He thong se tu dong khoi phuc de ban tiep tuc su dung nav binh thuong."
})

const errorMessage = computed(() => props.error.message || "Da xay ra loi khong xac dinh trong qua trinh dieu huong.")

const recoveryTarget = computed(() => {
  const fallback = lastSafeRoute.value || "/home"
  if (fallback && fallback !== route.fullPath) return fallback
  if (route.fullPath !== "/home") return "/home"
  return "/"
})

const canAutoRecover = computed(() => recoveryTarget.value !== route.fullPath)

const recoverToLastSafeRoute = async () => {
  await clearError({ redirect: recoveryTarget.value })
}

const recoverToHome = async () => {
  await clearError({ redirect: "/home" })
}

let recoveryTimer: ReturnType<typeof window.setTimeout> | null = null

onMounted(() => {
  if (!canAutoRecover.value) return

  recoveryTimer = window.setTimeout(() => {
    void recoverToLastSafeRoute()
  }, 180)
})

onBeforeUnmount(() => {
  if (recoveryTimer) window.clearTimeout(recoveryTimer)
})
</script>
