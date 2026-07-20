// Description: Performs signed LiveKit call actions from Android native call UI.
package com.vnseea.android.call

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import com.vnseea.android.BuildConfig
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object LiveKitCallNativeActions {
  private const val HANDLED_INCOMING_CALLS_PREFS = "vnseea_handled_incoming_calls"
  // Call IDs are unique. Keep answered/declined IDs long enough that a delayed
  // duplicate push cannot resurrect an incoming-call notification mid-call.
  private const val HANDLED_INCOMING_CALL_TTL_MS = 12 * 60 * 60 * 1000L

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
  const val EXTRA_COVER = "cover"
  const val EXTRA_COVER_URL = "cover_url"
  const val EXTRA_CALLER_COVER = "caller_cover"
  const val EXTRA_GROUP_COVER = "group_cover"
  const val EXTRA_ACTION_TOKEN = "action_token"
  const val EXTRA_API_URL = "api_url"
  const val EXTRA_RING_MODE = "ring_mode"
  const val EXTRA_CALL_CONTEXT = "call_context"
  const val EXTRA_NATIVE_ACTION = "vnseea_call_action"
  const val ACTION_DISMISS_INCOMING_CALL = "com.vnseea.android.call.DISMISS_INCOMING_CALL"

  fun markIncomingCallHandled(context: Context, callId: String?) {
    if (callId.isNullOrBlank()) return
    val now = System.currentTimeMillis()
    val prefs = context.applicationContext.getSharedPreferences(
      HANDLED_INCOMING_CALLS_PREFS,
      Context.MODE_PRIVATE,
    )
    val editor = prefs.edit().putLong(callId, now)
    for ((key, value) in prefs.all) {
      val handledAt = value as? Long ?: continue
      if (now - handledAt > HANDLED_INCOMING_CALL_TTL_MS) {
        editor.remove(key)
      }
    }
    editor.apply()
  }

  fun isIncomingCallHandledRecently(context: Context, callId: String?): Boolean {
    if (callId.isNullOrBlank()) return false
    val prefs = context.applicationContext.getSharedPreferences(
      HANDLED_INCOMING_CALLS_PREFS,
      Context.MODE_PRIVATE,
    )
    val handledAt = prefs.getLong(callId, 0L)
    if (handledAt <= 0L) return false

    val ageMs = System.currentTimeMillis() - handledAt
    if (ageMs in 0..HANDLED_INCOMING_CALL_TTL_MS) return true

    prefs.edit().remove(callId).apply()
    return false
  }

  fun dismissIncomingCall(context: Context, callId: String?) {
    if (callId.isNullOrBlank()) return
    markIncomingCallHandled(context, callId)
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancel(callId.hashCode())
    context.sendBroadcast(Intent(ACTION_DISMISS_INCOMING_CALL).apply {
      setPackage(context.packageName)
      putExtra(EXTRA_CALL_ID, callId)
    })
  }

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
