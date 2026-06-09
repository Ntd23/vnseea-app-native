// Description: Builds high-priority Android call notifications with a full-screen intent.
package com.vnseearn.call

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.vnseearn.R
import org.json.JSONObject

object LiveKitCallNotifier {
  private const val CHANNEL_ID = "vnseea_calls"

  fun show(context: Context, data: JSONObject) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          "VNSEEA calls",
          NotificationManager.IMPORTANCE_HIGH,
        ).apply {
          description = "Incoming VNSEEA calls"
          lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
          enableVibration(true)
        },
      )
    }

    val callId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    val notificationId = callId.hashCode()
    val fullScreenIntent = Intent(context, IncomingCallActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      copyCallExtras(data, this)
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      notificationId,
      fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val answerIntent = Intent(context, LiveKitCallActionReceiver::class.java).apply {
      copyCallExtras(data, this)
      putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "answer")
    }
    val declineIntent = Intent(context, LiveKitCallActionReceiver::class.java).apply {
      copyCallExtras(data, this)
      putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "decline")
    }

    val isGroupCall = data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE) == "livekit_group_call"
    val callerName = if (isGroupCall) {
      data.optString(LiveKitCallNativeActions.EXTRA_GROUP_NAME).ifBlank { "Nhom" }
    } else {
      data.optString(LiveKitCallNativeActions.EXTRA_NAME).ifBlank { "VNSEEA" }
    }
    val text = if (data.optString(LiveKitCallNativeActions.EXTRA_CALL_TYPE) == "audio") {
      if (isGroupCall) "Cuoc goi nhom thoai den" else "Cuoc goi thoai den"
    } else {
      if (isGroupCall) "Cuoc goi nhom video den" else "Cuoc goi video den"
    }

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(callerName)
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(43_000)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .addAction(
        0,
        "Decline",
        PendingIntent.getBroadcast(
          context,
          notificationId + 1,
          declineIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
      .addAction(
        0,
        "Answer",
        PendingIntent.getBroadcast(
          context,
          notificationId + 2,
          answerIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
      .build()

    manager.notify(notificationId, notification)
  }

  private fun copyCallExtras(data: JSONObject, intent: Intent) {
    for (key in listOf(
      LiveKitCallNativeActions.EXTRA_EVENT_TYPE,
      LiveKitCallNativeActions.EXTRA_CALL_ID,
      LiveKitCallNativeActions.EXTRA_CALL_TYPE,
      LiveKitCallNativeActions.EXTRA_ROOM_NAME,
      LiveKitCallNativeActions.EXTRA_FROM_ID,
      LiveKitCallNativeActions.EXTRA_GROUP_ID,
      LiveKitCallNativeActions.EXTRA_GROUP_NAME,
      LiveKitCallNativeActions.EXTRA_GROUP_AVATAR,
      LiveKitCallNativeActions.EXTRA_CALLER_ID,
      LiveKitCallNativeActions.EXTRA_CALLER_NAME,
      LiveKitCallNativeActions.EXTRA_CALLER_AVATAR,
      LiveKitCallNativeActions.EXTRA_NAME,
      LiveKitCallNativeActions.EXTRA_AVATAR,
      LiveKitCallNativeActions.EXTRA_ACTION_TOKEN,
      LiveKitCallNativeActions.EXTRA_API_URL,
      LiveKitCallNativeActions.EXTRA_RING_MODE,
      LiveKitCallNativeActions.EXTRA_CALL_CONTEXT,
    )) {
      intent.putExtra(key, data.optString(key))
    }
  }
}
