// English description: Disables browser caching for Nuxt dev HTML and module responses to prevent stale hydration bundles.

export default defineEventHandler((event) => {
  if (!import.meta.dev) {
    return
  }

  const method = event.node.req.method || "GET"
  if (method !== "GET" && method !== "HEAD") {
    return
  }

  setHeader(event, "Cache-Control", "no-store, max-age=0, must-revalidate")
  setHeader(event, "Pragma", "no-cache")
  setHeader(event, "Expires", "0")
})
