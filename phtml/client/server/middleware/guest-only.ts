import { defineEventHandler, getCookie, getRequestURL, sendRedirect } from "h3"
import { isPublicPath } from "../../src/auth/application/constants/route-policy"
import { getBackendCurrentUser } from "../utils/backend-current-user"
import { clearBackendSessionCookie } from "../utils/backend-session-cookie"

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname

  if (!isPublicPath(pathname) || pathname === "/logout") {
    return
  }

  const backendUserSession = getCookie(event, "user_id")

  if (backendUserSession) {
    try {
      await getBackendCurrentUser(event)
      return sendRedirect(event, "/home", 302)
    }
    catch {
      clearBackendSessionCookie(event)
    }
  }
})
