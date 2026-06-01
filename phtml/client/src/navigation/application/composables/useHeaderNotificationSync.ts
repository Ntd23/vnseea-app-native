// English description: Coordinates realtime notification events with header navigation counters without coupling notification state to navigation stores.

import { useNotificationCenterStore } from "../../../notifications/application/stores/useNotificationCenterStore"
import { useNavigationGeneralStore } from "../stores/useNavigationGeneralStore"
import { useNavigationRequestsStore } from "../stores/useNavigationRequestsStore"

export function useHeaderNotificationSync() {
  const notificationCenterStore = useNotificationCenterStore()
  const navigationGeneralStore = useNavigationGeneralStore()
  const navigationRequestsStore = useNavigationRequestsStore()

  const unsubscribe = notificationCenterStore.subscribeHeaderRefresh(async (target) => {
    if (target === "navigation") {
      await navigationGeneralStore.hydrate(true)
      return
    }

    if (navigationRequestsStore.hydrated) {
      await navigationRequestsStore.hydrate(true)
    }
  })

  const startRealtime = () => notificationCenterStore.startRealtime()

  const stopRealtime = () => {
    unsubscribe()
    notificationCenterStore.stopRealtime()
  }

  return {
    startRealtime,
    stopRealtime,
  }
}
