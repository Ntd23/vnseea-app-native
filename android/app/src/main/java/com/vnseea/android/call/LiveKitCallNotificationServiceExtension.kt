// Description: Converts OneSignal LiveKit call pushes into Android full-screen call notifications.
package com.vnseea.android.call

import android.content.Context
import android.os.Build
import android.text.Html
import android.util.Log
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension
import com.vnseea.android.messages.MessagePushNotification
import org.json.JSONObject

class LiveKitCallNotificationServiceExtension : INotificationServiceExtension {
  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val notification = event.notification
    Log.i("LiveKitCallPush", "received title=${notification.title} body=${notification.body} additionalData=${notification.additionalData}")
    val data = notification.additionalData ?: parseBodyData(notification.body)
    if (data == null) {
      Log.i("LiveKitCallPush", "ignored: no livekit data")
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
    if (eventType == "livekit_group_call" && data.optString(LiveKitCallNativeActions.EXTRA_RING_MODE) == "silent") {
      Log.i("LiveKitCallPush", "ignored: silent group call")
      return
    }
    event.preventDefault()
    val context: Context = event.context ?: return
    if (LiveKitCallNativeActions.isIncomingCallHandledRecently(context, callId)) {
      Log.i("LiveKitCallPush", "ignored handled incoming push call_id=$callId")
      return
    }
    Log.i("LiveKitCallPush", "show fullscreen call event_type=$eventType call_id=${data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)}")
    LiveKitCallNotifier.show(context, data)
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
