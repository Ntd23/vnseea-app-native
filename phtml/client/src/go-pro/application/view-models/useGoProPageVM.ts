// English description: Go Pro page view-model that loads backend packages and submits upgrade requests.

import { ApiGoProRepository } from "../../infrastructure/repositories/ApiGoProRepository"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"

export function useGoProPageVM() {
  const toast = useToast()
  const repository = new ApiGoProRepository()
  const currentAuthUserStore = useCurrentAuthUserStore()
  const upgradingType = ref("")
  const { data, pending, error, refresh } = useAsyncData(
    "go-pro:catalog",
    () => repository.getCatalog(),
  )

  const packages = computed(() => data.value?.packages ?? [])
  const membershipSystem = computed(() => Boolean(data.value?.membershipSystem))
  const currentIsPro = computed(() => Boolean(data.value?.currentIsPro))

  const upgrade = async (type: string) => {
    upgradingType.value = type

    try {
      await repository.upgrade(type)
      await currentAuthUserStore.hydrate(true)
      await refresh()
    }
    catch (err) {
      toast.add({
        color: "error",
        title: err instanceof Error ? err.message : "Unable to upgrade.",
      })
    }
    finally {
      upgradingType.value = ""
    }
  }

  const cancelingType = ref("")

  const cancelPro = async (type: string) => {
    cancelingType.value = type

    try {
      await repository.cancel()
      await currentAuthUserStore.hydrate(true)
      await refresh()
      toast.add({
        color: "success",
        title: "Hủy gói PRO thành công.",
        description: "Tài khoản của bạn đã được chuyển về gói thường.",
      })
    }
    catch (err) {
      toast.add({
        color: "error",
        title: err instanceof Error ? err.message : "Không thể hủy gói PRO.",
      })
    }
    finally {
      cancelingType.value = ""
    }
  }

  return {
    packages,
    membershipSystem,
    currentIsPro,
    pending,
    error,
    upgradingType,
    upgrade,
    cancelingType,
    cancelPro,
  }
}
