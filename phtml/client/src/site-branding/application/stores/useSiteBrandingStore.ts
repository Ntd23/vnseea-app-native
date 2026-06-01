// English description: Pinia store that hydrates backend-driven public branding once per app shell.

import { defineStore } from "pinia"
import { ref } from "vue"
import { createDefaultSiteBranding, type SiteBranding } from "../../domain/types/site-branding.types"
import { createApiSiteBrandingRepository } from "../../infrastructure/repositories/ApiSiteBrandingRepository"

export const useSiteBrandingStore = defineStore("site-branding", () => {
  const branding = ref<SiteBranding>(createDefaultSiteBranding())
  const loading = ref(false)
  const hydrated = ref(false)

  async function hydrate(force = false) {
    if (loading.value) {
      return branding.value
    }

    if (hydrated.value && !force) {
      return branding.value
    }

    loading.value = true

    try {
      const repository = createApiSiteBrandingRepository()
      const loadedBranding = await repository.getBranding()
      branding.value = {
        ...createDefaultSiteBranding(),
        ...loadedBranding,
      }
      hydrated.value = true
      return branding.value
    }
    catch {
      branding.value = createDefaultSiteBranding()
      hydrated.value = true
      return branding.value
    }
    finally {
      loading.value = false
    }
  }

  function clear() {
    branding.value = createDefaultSiteBranding()
    loading.value = false
    hydrated.value = false
  }

  return {
    branding,
    loading,
    hydrated,
    hydrate,
    clear,
  }
})
