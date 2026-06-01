// English description: Keeps jobs API bridge paths local to the jobs bounded context to preserve strict route ownership boundaries.

export const jobsApiRoutes = {
  catalog: "/_api/jobs",
  create: "/_api/jobs/create",
  apply: "/_api/jobs/apply",
} as const
