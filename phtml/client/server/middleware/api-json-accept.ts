// English description: Forces Nuxt API bridge requests to negotiate JSON responses instead of rendering app HTML.

export default defineEventHandler((event) => {
  const url = event.node.req.url || ""

  if (!url.startsWith("/_api/")) {
    return
  }

  event.node.req.headers.accept = "application/json"
  event.node.req.headers["x-requested-with"] = "XMLHttpRequest"
})
