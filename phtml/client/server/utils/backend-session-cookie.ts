import { deleteCookie, getRequestHeader, type H3Event } from "h3"

const hostWithoutPort = (host: string) => host.split(":")[0]?.trim()
const isIpv4Host = (host: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)

export function clearBackendSessionCookie(event: H3Event) {
  deleteCookie(event, "user_id", { path: "/" })

  const host = hostWithoutPort(getRequestHeader(event, "host") || "")
  if (!host || host === "localhost" || isIpv4Host(host)) return

  deleteCookie(event, "user_id", { path: "/", domain: host })
  deleteCookie(event, "user_id", { path: "/", domain: `.${host}` })
}
