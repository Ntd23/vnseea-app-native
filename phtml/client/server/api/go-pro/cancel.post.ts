// English description: Bridges Pro package cancellation requests to the backend cancel-pro endpoint.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"

export default defineEventHandler(async (event) => {
  const response = await createBackendApiClient(event).post("cancel-pro")

  assertBackendApiSuccess(response, "Unable to cancel Pro package.")

  return { ok: true }
})
