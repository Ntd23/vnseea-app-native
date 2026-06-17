// Description: Performs signed LiveKit call actions from Android native call UI.
package com.vnseea.android.call

import com.vnseea.android.BuildConfig
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object LiveKitCallNativeActions {
  const val EXTRA_EVENT_TYPE = "event_type"
  const val EXTRA_CALL_ID = "call_id"
  const val EXTRA_CALL_TYPE = "call_type"
  const val EXTRA_ROOM_NAME = "room_name"
  const val EXTRA_FROM_ID = "from_id"
  const val EXTRA_GROUP_ID = "group_id"
  const val EXTRA_GROUP_NAME = "group_name"
  const val EXTRA_GROUP_AVATAR = "group_avatar"
  const val EXTRA_CALLER_ID = "caller_id"
  const val EXTRA_CALLER_NAME = "caller_name"
  const val EXTRA_CALLER_AVATAR = "caller_avatar"
  const val EXTRA_NAME = "name"
  const val EXTRA_AVATAR = "avatar"
  const val EXTRA_ACTION_TOKEN = "action_token"
  const val EXTRA_API_URL = "api_url"
  const val EXTRA_RING_MODE = "ring_mode"
  const val EXTRA_CALL_CONTEXT = "call_context"
  const val EXTRA_NATIVE_ACTION = "vnseea_call_action"

  fun postAction(apiUrl: String?, actionToken: String?, action: String) {
    if (apiUrl.isNullOrBlank() || actionToken.isNullOrBlank()) return
    Thread {
      try {
        val url = URL(apiUrl)
        val connection = (url.openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          connectTimeout = 2500
          readTimeout = 3500
          doOutput = true
          setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        }
        val body = listOf(
          "server_key" to BuildConfig.SERVER_KEY,
          "type" to "native_action",
          "call_action" to action,
          "action_token" to actionToken,
        ).joinToString("&") { (key, value) ->
          "${URLEncoder.encode(key, "UTF-8")}=${URLEncoder.encode(value, "UTF-8")}"
        }
        OutputStreamWriter(connection.outputStream).use { writer ->
          writer.write(body)
        }
        connection.inputStream.use { it.readBytes() }
        connection.disconnect()
      } catch (_: Throwable) {
      }
    }.start()
  }
}
