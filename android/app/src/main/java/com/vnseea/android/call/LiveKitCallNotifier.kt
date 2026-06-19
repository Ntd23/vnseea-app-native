// Description: Builds high-priority Android call notifications with a full-screen intent.
package com.vnseea.android.call

import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.vnseea.android.MainActivity
import com.vnseea.android.R
import org.json.JSONObject

object LiveKitCallNotifier {
  private const val CHANNEL_ID = "vnseea_calls_fullscreen_v4"

  fun show(context: Context, data: JSONObject) {
    Log.i("LiveKitCallPush", "build notification call_id=${data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)} event_type=${data.optString(LiveKitCallNativeActions.EXTRA_EVENT_TYPE)}")
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val ringtoneUri = incomingCallRingtoneUri(context)
    val ringtoneAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
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
          vibrationPattern = longArrayOf(0, 700, 350, 700)
          setSound(ringtoneUri, ringtoneAttributes)
        },
      )
    }

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
      .setContentIntent(fullScreenPendingIntent)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
      .setSound(ringtoneUri)
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
        PendingIntent.getActivity(
          context,
          notificationId + 2,
          answerActivityIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
      .build()

    manager.notify(notificationId, notification)
    Log.i("LiveKitCallPush", "notification posted id=$notificationId")
    maybeLaunchFullScreen(context, fullScreenIntent)
  }

  private fun maybeLaunchFullScreen(context: Context, intent: Intent) {
    val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    val isLocked = keyguardManager?.isKeyguardLocked == true
    try {
      context.startActivity(intent)
      Log.i("LiveKitCallPush", "activity launched directly locked=$isLocked sdk=${Build.VERSION.SDK_INT}")
    } catch (error: Throwable) {
      Log.w("LiveKitCallPush", "activity launch failed ${error.message}")
    }
  }

  private fun incomingCallRingtoneUri(context: Context): Uri {
    val customRingtoneId = context.resources.getIdentifier(
      "incoming_call_ringtone",
      "raw",
      context.packageName,
    )
    if (customRingtoneId != 0) {
      return Uri.parse("android.resource://${context.packageName}/$customRingtoneId")
    }
    return android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
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
    )) {
      intent.putExtra(key, data.optString(key))
    }
  }
}
