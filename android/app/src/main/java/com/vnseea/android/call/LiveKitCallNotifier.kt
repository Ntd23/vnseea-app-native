// Description: Builds high-priority Android call notifications with a full-screen intent.
package com.vnseea.android.call

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Notification
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import com.vnseea.android.MainActivity
import com.vnseea.android.R
import org.json.JSONObject

object LiveKitCallNotifier {
  private const val CHANNEL_ID = "vnseea_calls_fullscreen_v7_managed_ringing"

  fun show(context: Context, data: JSONObject) {
    val callId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    Log.i("LiveKitCallPush", "build notification call_id=$callId event_type=${data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE)}")
    if (LiveKitCallNativeActions.isIncomingCallHandledRecently(context, callId)) {
      Log.i("LiveKitCallPush", "ignored handled incoming call_id=$callId")
      return
    }

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          context.getString(R.string.incoming_call_channel_name),
          NotificationManager.IMPORTANCE_HIGH,
        ).apply {
          description = context.getString(R.string.incoming_call_channel_description)
          lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
          enableVibration(false)
          setSound(null, null)
        },
      )
    }

    val notificationId = callId.hashCode()
    val notification = buildNotification(context, data, manager)

    if (LiveKitCallNativeActions.isIncomingCallHandledRecently(context, callId)) {
      Log.i("LiveKitCallPush", "skip late notification for handled call_id=$callId")
      return
    }
    manager.notify(notificationId, notification)
    if (LiveKitCallNativeActions.isIncomingCallHandledRecently(context, callId)) {
      manager.cancel(notificationId)
      Log.i("LiveKitCallPush", "cancel raced notification for handled call_id=$callId")
      return
    }
    IncomingCallRinger.start(context, callId)
    Handler(Looper.getMainLooper()).postDelayed({
      if (!LiveKitCallNativeActions.isIncomingCallHandledRecently(context, callId)) {
        LiveKitCallNativeActions.dismissIncomingCall(context, callId)
      }
    }, expiryDelayMs(data))
    try {
      IncomingCallRingingService.start(context, data)
    } catch (error: Throwable) {
      Log.w("LiveKitCallPush", "ringing service unavailable call_id=$callId", error)
    }
    LiveKitCallNativeActions.reportProgress(data, "ringing")
    Log.i("LiveKitCallPush", "notification posted id=$notificationId")
  }

  internal fun buildNotification(
    context: Context,
    data: JSONObject,
    manager: NotificationManager,
    includeFullScreen: Boolean = true,
  ): Notification {
    val callId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    val notificationId = callId.hashCode()
    val fullScreenIntent = Intent(context, IncomingCallActivity::class.java).apply {
      flags =
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      copyCallExtras(data, this)
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      notificationId,
      fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val answerActivityIntent = Intent(context, MainActivity::class.java).apply {
      flags =
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      copyCallExtras(data, this)
      putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "answer")
    }
    val declineIntent = Intent(context, LiveKitCallActionReceiver::class.java).apply {
      copyCallExtras(data, this)
      putExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, "decline")
    }

    val isGroupCall = data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE) == "livekit_group_call"
    val callerName = if (isGroupCall) {
      data.optString(LiveKitCallNativeActions.EXTRA_GROUP_NAME)
        .ifBlank { context.getString(R.string.incoming_call_default_group) }
    } else {
      data.optString(LiveKitCallNativeActions.EXTRA_NAME)
        .ifBlank { context.getString(R.string.incoming_call_default_caller) }
    }
    val text = if (data.optString(LiveKitCallNativeActions.EXTRA_CALL_TYPE) == "audio") {
      if (isGroupCall) {
        context.getString(R.string.incoming_group_call_audio)
      } else {
        context.getString(R.string.incoming_call_audio)
      }
    } else {
      if (isGroupCall) {
        context.getString(R.string.incoming_group_call_video)
      } else {
        context.getString(R.string.incoming_call_video)
      }
    }

    val declinePendingIntent = PendingIntent.getBroadcast(
      context,
      notificationId + 1,
      declineIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val answerPendingIntent = PendingIntent.getActivity(
      context,
      notificationId + 2,
      answerActivityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(callerName)
      .setContentText(text)
      .setSubText(context.getString(R.string.incoming_call_subtext))
      .setStyle(NotificationCompat.CallStyle.forIncomingCall(
        Person.Builder().setName(callerName).setImportant(true).build(),
        declinePendingIntent,
        answerPendingIntent,
      ))
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setColor(Color.rgb(185, 28, 28))
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(expiryDelayMs(data))
      .setContentIntent(fullScreenPendingIntent)
      .setOnlyAlertOnce(true)

    if (includeFullScreen && canUseFullScreenIntent(manager)) {
      notificationBuilder.setFullScreenIntent(fullScreenPendingIntent, true)
    } else {
      Log.i(
        "LiveKitCallPush",
        "full-screen intent unavailable; using heads-up notification call_id=$callId",
      )
    }
    return notificationBuilder.build()
  }

  internal fun expiryDelayMs(data: JSONObject): Long {
    val raw = data.optString(LiveKitCallNativeActions.EXTRA_EXPIRES_AT).trim().toLongOrNull()
    val expiresAtMs = raw?.let { if (it >= 10_000_000_000L) it else it * 1_000L }
    return (expiresAtMs?.let { it - System.currentTimeMillis() } ?: 43_000L)
      .coerceIn(0L, 60_000L)
  }

  private fun canUseFullScreenIntent(manager: NotificationManager): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
      manager.canUseFullScreenIntent()
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
      LiveKitCallNativeActions.EXTRA_CLIENT_ENDPOINT_ID,
      LiveKitCallNativeActions.EXTRA_API_URL,
      LiveKitCallNativeActions.EXTRA_EXPIRES_AT,
      LiveKitCallNativeActions.EXTRA_RING_MODE,
      LiveKitCallNativeActions.EXTRA_CALL_CONTEXT,
    )) {
      intent.putExtra(key, data.optString(key))
    }
  }
}
