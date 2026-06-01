<!-- English description: Hosts the root Nuxt app shell, global route loading, error boundary, and toaster. -->
<template>
  <UApp>
    <NuxtLoadingIndicator color="#0000ff" :height="3" :duration="2500" :throttle="0" />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtErrorBoundary :key="runtimeBoundaryKey" @error="handleRuntimePageError">
        <NuxtPage :page-key="pageKey" />

        <template #error="{ error: runtimeError, clearError: clearBoundaryError }">
          <div class="px-4 py-6 sm:px-6">
            <div class="overflow-hidden rounded-[28px] border border-[#dbe3f2] bg-white shadow-[0_18px_40px_rgba(15,35,110,0.08)]">
              <div class="bg-[linear-gradient(135deg,#0000ff_0%,#1e293b_100%)] px-6 py-6 text-white sm:px-8">
                <p class="text-[10px] font-black uppercase tracking-[0.32em] text-white/70">
                  Runtime Page Error
                </p>
                <h1 class="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                  Trang nay vua bi crash
                </h1>
                <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/80">
                  Nav van hoat dong. Ban co the bam sang trang khac ngay, hoac thu tai lai page hien tai ma khong can reload trinh duyet.
                </p>
              </div>

              <div class="space-y-5 px-6 py-6 sm:px-8">
                <div class="rounded-[22px] border border-[#dbe3f2] bg-[#f8fbff] p-4">
                  <p class="text-[11px] font-black uppercase tracking-[0.24em] text-[#0000ff]">
                    Route
                  </p>
                  <p class="mt-2 break-all text-sm font-semibold text-[#243b63]">
                    {{ route.fullPath }}
                  </p>

                  <p class="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#0000ff]">
                    Error
                  </p>
                  <p class="mt-2 text-sm leading-6 text-slate-600">
                    {{ formatRuntimeError(runtimeError) }}
                  </p>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row">
                  <UButton
                    size="xl"
                    class="justify-center rounded-2xl bg-[#0000ff] px-6 font-black uppercase tracking-[0.16em] shadow-[0_14px_28px_rgba(0,0,255,0.2)] hover:bg-[#0000d8]"
                    @click="retryCurrentPage(clearBoundaryError)"
                  >
                    Thu lai trang nay
                  </UButton>
                  <UButton
                    size="xl"
                    color="white"
                    variant="soft"
                    class="justify-center rounded-2xl px-6 font-black uppercase tracking-[0.16em] text-slate-700 ring-1 ring-[#dbe3f2] hover:ring-[#0000ff]"
                    @click="goToSafePage(clearBoundaryError)"
                  >
                    Ve trang on dinh
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </template>
      </NuxtErrorBoundary>
    </NuxtLayout>
    <UToaster />
    <MessagesMessageCallGlobalHost :poll-incoming="Boolean(backendUserSession)" />
  </UApp>
</template>

<script setup lang="ts">
import MessagesMessageCallGlobalHost from "../src/messages/presentation/components/MessageCallGlobalHost.vue"
import { useSiteBrandingHead } from "../src/site-branding/application/composables/useSiteBrandingHead"
import { useSiteBrandingStore } from "../src/site-branding/application/stores/useSiteBrandingStore"

const route = useRoute()
const nuxtApp = useNuxtApp()
const error = useError()
const siteBrandingStore = useSiteBrandingStore()
const backendUserSession = useCookie<string | null>("user_id", {
  default: () => null,
  sameSite: "lax",
  path: "/",
})
const lastSafeRoute = useState("last-safe-route", () => "/home")
const runtimeBoundaryNonce = ref(0)

await callOnce("site-branding", () => siteBrandingStore.hydrate())
useSiteBrandingHead()

if (import.meta.dev) {
  useHead({
    script: [
      {
        key: "clear-stale-dev-runtime-cache",
        innerHTML: `
(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then(function (registrations) {
      return Promise.all(registrations.map(function (registration) {
        return registration.unregister();
      }));
    })
    .catch(function () {});
  if ('caches' in window) {
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      })
      .catch(function () {});
  }
})();`,
        tagPosition: "head",
      },
    ],
  })
}

const pageKey = (route: { fullPath?: string, path: string }) => route.fullPath ?? route.path
const runtimeBoundaryKey = computed(() => `${route.fullPath || route.path}::${runtimeBoundaryNonce.value}`)

const rememberSafeRoute = () => {
  if (error.value) return
  lastSafeRoute.value = route.fullPath || route.path || "/home"
}

const handleRuntimePageError = () => {
  if (!error.value) {
    lastSafeRoute.value = route.fullPath || route.path || lastSafeRoute.value || "/home"
  }
}

const resetRuntimeBoundary = async (clearBoundaryError?: () => void | Promise<void>) => {
  if (clearBoundaryError) {
    await clearBoundaryError()
  }

  runtimeBoundaryNonce.value += 1
}

const retryCurrentPage = async (clearBoundaryError?: () => void | Promise<void>) => {
  await resetRuntimeBoundary(clearBoundaryError)
}

const goToSafePage = async (clearBoundaryError?: () => void | Promise<void>) => {
  const fallback = lastSafeRoute.value && lastSafeRoute.value !== route.fullPath
    ? lastSafeRoute.value
    : "/home"

  await resetRuntimeBoundary(clearBoundaryError)
  await navigateTo(fallback)
}

const formatRuntimeError = (runtimeError: unknown) => {
  if (runtimeError instanceof Error) return runtimeError.message
  if (typeof runtimeError === "string") return runtimeError
  if (runtimeError && typeof runtimeError === "object" && "message" in runtimeError) {
    return String((runtimeError as { message?: unknown }).message || "Unknown runtime error")
  }

  return "Unknown runtime error"
}

nuxtApp.hook("page:finish", rememberSafeRoute)

onMounted(() => {
  rememberSafeRoute()
})

watch(() => route.fullPath, () => {
  runtimeBoundaryNonce.value += 1
})
</script>
