type RuntimeTranslator = (message: unknown) => string

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const isI18nMessageNode = (value: Record<string, unknown>) =>
  typeof value.type === "number"
  && ("body" in value || "items" in value || "static" in value)

export const resolveI18nMessage = <T>(value: T, rt: RuntimeTranslator): T => {
  if (value === null || value === undefined) return value
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (typeof value === "function") return rt(value) as T

  if (Array.isArray(value)) {
    return value.map(item => resolveI18nMessage(item, rt)) as T
  }

  if (isRecord(value)) {
    if (isI18nMessageNode(value)) return rt(value) as T

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveI18nMessage(item, rt)]),
    ) as T
  }

  return value
}
