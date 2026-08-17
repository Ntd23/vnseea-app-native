// Description: Converts OneSignal LiveKit call pushes into Android full-screen call notifications.
package com.vnseea.android.call

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.text.Html
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension
import com.vnseea.android.MainActivity
import com.vnseea.android.R
import com.vnseea.android.messages.MessagePushNotification
import org.json.JSONObject

class LiveKitCallNotificationServiceExtension : INotificationServiceExtension {
  companion object {
    private const val PASSIVE_CALL_CHANNEL_ID = "vnseea_calls_passive_v1"
  }

  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val notification = event.notification
    Log.i("LiveKitCallPush", "received call notification")
    val data = notification.additionalData ?: parseBodyData(notification.body)
    if (data == null) {
      Log.i("LiveKitCallPush", "ignored: no livekit data")
      return
    }
    if (MessagePushNotification.isDuplicateCallActivityPush(data, notification.body)) {
      event.preventDefault()
      Log.i("LiveKitCallPush", "suppressed duplicate call activity message")
      return
    }
    if (MessagePushNotification.isMessagePush(data)) {
      event.preventDefault()
      val context: Context = event.context ?: return
      MessagePushNotification.show(context, notification)
      return
    }
    normalizeLiveKitData(data, notification.title)
    val eventType = data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE)
    val status = data.optString("status")
    val callId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    if (shouldDismissIncomingCall(eventType, status)) {
      event.preventDefault()
      val context: Context = event.context ?: return
      Log.i("LiveKitCallPush", "dismiss incoming call event_type=$eventType status=$status call_id=$callId")
      LiveKitCallNativeActions.dismissIncomingCall(context, callId)
      return
    }
    if (eventType != "livekit_call" && eventType != "livekit_group_call") {
      Log.i("LiveKitCallPush", "ignored: event_type=$eventType")
      return
    }
    event.preventDefault()
    val context: Context = event.context ?: return
    if (isExpiredIncomingCall(data)) {
      Log.i("LiveKitCallPush", "ignored expired incoming push call_id=$callId expires_at=${data.optString("expires_at")}")
      return
    }
    if (LiveKitCallNativeActions.isIncomingCallHandledRecently(context, callId)) {
      Log.i("LiveKitCallPush", "ignored handled incoming push call_id=$callId")
      return
    }
    val ringMode = data.optString(LiveKitCallNativeActions.EXTRA_RING_MODE).trim().lowercase()
    if (eventType == "livekit_group_call" && (ringMode == "silent" || ringMode == "passive")) {
      Log.i("LiveKitCallPush", "show passive group call call_id=$callId ring_mode=$ringMode")
      showPassiveGroupCall(context, data)
      return
    }
    Log.i("LiveKitCallPush", "show fullscreen call event_type=$eventType call_id=${data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)}")
    LiveKitCallNotifier.show(context, data)
  }

  private fun isExpiredIncomingCall(data: JSONObject): Boolean {
    val rawExpiresAt = data.optString("expires_at").trim()
    val expiresAt = rawExpiresAt.toLongOrNull()?.takeIf { it > 0L } ?: return false
    val expiresAtMillis = if (expiresAt >= 10_000_000_000L) expiresAt else expiresAt * 1_000L
    return expiresAtMillis <= System.currentTimeMillis()
  }

  private fun showPassiveGroupCall(context: Context, data: JSONObject) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          PASSIVE_CALL_CHANNEL_ID,
          "Group call invitations",
          NotificationManager.IMPORTANCE_LOW,
        ).apply {
          description = "Passive group call invitations"
          enableVibration(false)
          setSound(null, null)
          lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
        },
      )
    }

    val callId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    val openIntent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      copyCallExtras(data, this)
    }
    val pendingIntent = PendingIntent.getActivity(
      context,
      callId.hashCode(),
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val groupName = data.optString(LiveKitCallNativeActions.EXTRA_GROUP_NAME)
      .ifBlank { data.optString(LiveKitCallNativeActions.EXTRA_NAME) }
      .ifBlank { context.getString(R.string.incoming_call_default_group) }
    val body = if (data.optString(LiveKitCallNativeActions.EXTRA_CALL_TYPE) == "audio") {
      context.getString(R.string.incoming_group_call_audio)
    } else {
      context.getString(R.string.incoming_group_call_video)
    }
    val notification = NotificationCompat.Builder(context, PASSIVE_CALL_CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(groupName)
      .setContentText(body)
      .setCategory(NotificationCompat.CATEGORY_EVENT)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setDefaults(0)
      .setTimeoutAfter(43_000)
      .build()

    try {
      NotificationManagerCompat.from(context).notify(callId.hashCode(), notification)
    } catch (error: Throwable) {
      Log.w("LiveKitCallPush", "failed passive group call notification: ${error.message}")
    }
  }

  private fun copyCallExtras(data: JSONObject, intent: Intent) {
    for (key in listOf(
      LiveKitCallNativeActions.EXTRA_EVENT_TYPE,
      LiveKitCallNativeActions.EXTRA_CALL_ID,
      LiveKitCallNativeActions.EXTRA_CALL_TYPE,
      LiveKitCallNativeActions.EXTRA_ROOM_NAME,
      LiveKitCallNativeActions.EXTRA_FROM_ID,
      "initiator_id",
      "receiver_id",
      LiveKitCallNativeActions.EXTRA_GROUP_ID,
      LiveKitCallNativeActions.EXTRA_GROUP_NAME,
      LiveKitCallNativeActions.EXTRA_GROUP_AVATAR,
      LiveKitCallNativeActions.EXTRA_CALLER_ID,
      LiveKitCallNativeActions.EXTRA_CALLER_NAME,
      LiveKitCallNativeActions.EXTRA_CALLER_AVATAR,
      LiveKitCallNativeActions.EXTRA_NAME,
      LiveKitCallNativeActions.EXTRA_AVATAR,
      LiveKitCallNativeActions.EXTRA_COVER,
      LiveKitCallNativeActions.EXTRA_COVER_URL,
      LiveKitCallNativeActions.EXTRA_CALLER_COVER,
      LiveKitCallNativeActions.EXTRA_GROUP_COVER,
      LiveKitCallNativeActions.EXTRA_ACTION_TOKEN,
      LiveKitCallNativeActions.EXTRA_API_URL,
      LiveKitCallNativeActions.EXTRA_RING_MODE,
      LiveKitCallNativeActions.EXTRA_CALL_CONTEXT,
      LiveKitCallNativeActions.EXTRA_EXPIRES_AT,
    )) {
      intent.putExtra(key, data.optString(key))
    }
  }

  private fun parseBodyData(body: String?): JSONObject? {
    if (body.isNullOrBlank()) return null
    val decoded = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      Html.fromHtml(body, Html.FROM_HTML_MODE_LEGACY).toString()
    } else {
      @Suppress("DEPRECATION")
      Html.fromHtml(body).toString()
    }
    return try {
      JSONObject(decoded)
    } catch (_: Throwable) {
      null
    }
  }

  private fun normalizeLiveKitData(data: JSONObject, title: String?) {
    val provider = data.optString("provider")
    val callId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    val status = data.optString("status")
    if (data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE).isBlank() &&
      provider == "livekit" &&
      callId.isNotBlank() &&
      (status.isBlank() || status == "calling")
    ) {
      val isGroupCall =
        data.optString(LiveKitCallNativeActions.EXTRA_CALL_CONTEXT) == "group" ||
          data.optString("type") == "group" ||
          data.optString(LiveKitCallNativeActions.EXTRA_GROUP_ID).isNotBlank()
      data.put(
        LiveKitCallNativeActions.EXTRA_EVENT_TYPE,
        if (isGroupCall) "livekit_group_call" else "livekit_call",
      )
    }
    if (data.optString(LiveKitCallNativeActions.EXTRA_NAME).isBlank() && !title.isNullOrBlank()) {
      data.put(LiveKitCallNativeActions.EXTRA_NAME, title)
    }
    if (data.optString(LiveKitCallNativeActions.EXTRA_CALLER_NAME).isBlank() && !title.isNullOrBlank()) {
      data.put(LiveKitCallNativeActions.EXTRA_CALLER_NAME, title)
    }
    if (data.optString(LiveKitCallNativeActions.EXTRA_FROM_ID).isBlank() && data.optString("initiator_id").isNotBlank()) {
      data.put(LiveKitCallNativeActions.EXTRA_FROM_ID, data.optString("initiator_id"))
    }
    if (data.optString(LiveKitCallNativeActions.EXTRA_CALLER_ID).isBlank() && data.optString("initiator_id").isNotBlank()) {
      data.put(LiveKitCallNativeActions.EXTRA_CALLER_ID, data.optString("initiator_id"))
    }
  }

  private fun shouldDismissIncomingCall(eventType: String, status: String): Boolean {
    val normalizedEvent = eventType.lowercase()
    val normalizedStatus = status.lowercase()
    return normalizedEvent == "livekit_call_closed" ||
      normalizedEvent == "livekit_call_cancelled" ||
      normalizedEvent == "livekit_call_canceled" ||
      normalizedEvent == "livekit_call_declined" ||
      normalizedEvent == "livekit_call_answered" ||
      normalizedEvent == "livekit_group_call_closed" ||
      normalizedEvent == "livekit_group_call_answered" ||
      normalizedStatus == "answered" ||
      normalizedStatus == "ended" ||
      normalizedStatus == "cancelled" ||
      normalizedStatus == "canceled" ||
      normalizedStatus == "declined" ||
      normalizedStatus == "no_answer" ||
      normalizedStatus == "missed" ||
      normalizedStatus == "closed"
  }
}
