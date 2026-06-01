// English description: Shared route-safe event tab definitions and helpers for the events bounded context.

import type { EventTabKey } from "../types/events.types"

export const eventTabKeys: EventTabKey[] = [
  "browse",
  "going",
  "invited",
  "interested",
  "past",
  "mine",
]

export const normalizeEventTab = (value: string): EventTabKey =>
  eventTabKeys.includes(value as EventTabKey)
    ? value as EventTabKey
    : "browse"
