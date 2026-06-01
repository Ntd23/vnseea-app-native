<template>
  <div class="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-6 py-12 text-center">
    <div class="space-y-3">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0000ff]">Session</p>
      <h1 class="text-2xl font-black tracking-tight text-slate-900">Signing you out</h1>
      <p class="text-sm leading-6 text-slate-500">
        VNSEEA is handing control back to the backend logout flow so the browser session is cleared in one place.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { backendRoutes } from "#shared-kernel/application/constants/route-registry"
import { useBackendWebUrl } from "#shared-kernel/application/utils/backend-web-url"
import { useCurrentAuthUserStore } from "../../src/auth/application/stores/useCurrentAuthUserStore"

const currentAuthUserStore = useCurrentAuthUserStore()
const backendLogoutUrl = useBackendWebUrl(backendRoutes.auth.logout)

const markPresenceOffline = async () => {
  try {
    if (import.meta.server) {
      const requestFetch = useRequestFetch()
      await requestFetch("/_api/messages/presence", {
        method: "POST",
        body: { action: "offline" },
      })
      return
    }

    await $fetch("/_api/messages/presence", {
      method: "POST",
      body: { action: "offline" },
    })
  }
  catch {
    // Logout must continue even if the best-effort chat presence update fails.
  }
}

if (import.meta.server) {
  await markPresenceOffline()
  currentAuthUserStore.clear()

  await navigateTo(backendLogoutUrl, {
    external: true,
    redirectCode: 302,
  })
}

onMounted(async () => {
  await markPresenceOffline()
  currentAuthUserStore.clear()

  void navigateTo(backendLogoutUrl, {
    external: true,
    replace: true,
  })
})
</script>
