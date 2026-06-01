// English description: Normalizes real backend text for SEO without inventing fallback copy.

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
}

export const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase()

    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16)
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
        ? String.fromCodePoint(codePoint)
        : match
    }

    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10)
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
        ? String.fromCodePoint(codePoint)
        : match
    }

    return namedEntities[normalized] ?? match
  })

export const stripSeoHtml = (value: string) =>
  decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

export const cleanSeoText = (value: unknown, maxLength?: number) => {
  const text = typeof value === "string" || typeof value === "number"
    ? stripSeoHtml(String(value))
    : ""

  if (!text || !maxLength || text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength).replace(/\s+\S*$/, "").trim()
}

export const cleanSeoKeywords = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map(item => cleanSeoText(item))
      .filter(Boolean)
      .slice(0, 12)
  }

  return cleanSeoText(value)
    .split(",")
    .map(item => item.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 12)
}
