// English description: Serves the same self-removing worker for legacy service-worker.js registrations.

export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "application/javascript; charset=utf-8")
  setHeader(event, "Cache-Control", "no-store, max-age=0, must-revalidate")
  setHeader(event, "Service-Worker-Allowed", "/")

  return `
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      client.navigate(client.url);
    }
  })());
});
`
})
