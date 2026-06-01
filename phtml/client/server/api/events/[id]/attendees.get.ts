// English description: Returns backend-backed attendee lists for an event detail sidebar in the Nuxt events context.

import { createError, getQuery, getRouterParam } from "h3"
import { fetchEventAttendees } from "../_shared"
import type { EventAttendeeKind } from "../../../../src/events/domain/types/events.types"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const query = getQuery(event)
  const kind = String(query.kind || "going") as EventAttendeeKind

  if (kind !== "going" && kind !== "interested") {
    throw createError({
      statusCode: 400,
      statusMessage: "Attendee kind is invalid.",
    })
  }

  return await fetchEventAttendees(event, id, kind)
})
