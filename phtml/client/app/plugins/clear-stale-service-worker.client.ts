// English description: Clears stale service workers and browser caches that can serve outdated Vite modules during local development.

export default defineNuxtPlugin(() => {
  if (!import.meta.dev || typeof navigator === "undefined") {
    return
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {
        // Stale service worker cleanup is best-effort and must not block app startup.
      })
  }

  if (typeof caches !== "undefined") {
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .catch(() => {
        // Browser cache cleanup is best-effort and must not block app startup.
      })
  }
})
