// English description: Keeps live API bridge paths local to the live bounded context.

export const liveApiRoutes = {
  bootstrap: "/_api/live/bootstrap",
  create: "/_api/live/create",
  join: "/_api/live/join",
  heartbeat: "/_api/live/heartbeat",
  end: "/_api/live/end",
  thumbnail: "/_api/live/thumbnail",
} as const
