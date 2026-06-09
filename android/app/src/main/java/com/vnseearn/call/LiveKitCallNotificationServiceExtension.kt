// Description: Converts OneSignal LiveKit call pushes into Android full-screen call notifications.
package com.vnseearn.call

import android.content.Context
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

class LiveKitCallNotificationServiceExtension : INotificationServiceExtension {
  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val notification = event.notification
    val data = notification.additionalData ?: return
    val eventType = data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE)
    if (eventType != "livekit_call" && eventType != "livekit_group_call") {
      return
    }
    if (eventType == "livekit_group_call" && data.optString(LiveKitCallNativeActions.EXTRA_RING_MODE) != "fullscreen") {
      return
    }
    event.preventDefault()
    val context: Context = event.context ?: return
    LiveKitCallNotifier.show(context, data)
  }
}
