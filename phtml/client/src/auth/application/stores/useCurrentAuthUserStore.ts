import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useCookie } from "#app"
import type { CurrentAuthUser } from "../../domain/types/auth.types"
import { createApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository"

export const useCurrentAuthUserStore = defineStore("current-auth-user", () => {
  const user = ref<CurrentAuthUser | null>(null)
  const loading = ref(false)
  const hydrated = ref(false)

  async function hydrate(force = false) {
    if (loading.value) {
      return user.value
    }

    if (hydrated.value && !force) {
      return user.value
    }

    loading.value = true

    try {
      const backendSession = useCookie<string | null>("user_id", {
        default: () => null,
        sameSite: "lax",
        path: "/",
      })

      if (!backendSession.value) {
        user.value = null
        hydrated.value = true
        return null
      }

      const repository = createApiAuthRepository()
      user.value = await repository.getCurrentUser()
      hydrated.value = true

      return user.value
    }
    catch {
      user.value = null
      hydrated.value = true
      return null
    }
    finally {
      loading.value = false
    }
  }

  function clear() {
    user.value = null
    hydrated.value = false
    loading.value = false
  }

  const isAdmin = computed(() => user.value?.isAdmin === true)
  const isModerator = computed(() => user.value?.isModerator === true)

  return {
    user,
    loading,
    hydrated,
    isAdmin,
    isModerator,
    hydrate,
    clear,
  }
})
