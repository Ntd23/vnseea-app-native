// Description: Creates Android notification channels used by OneSignal pushes.
package com.vnseea.android.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat

object VnseeaNotificationChannels {
  const val DEFAULT_PUSH_CHANNEL_ID = "vnseea_notifications_sound_v1"

  private const val DEFAULT_PUSH_SOUND_RES_NAME = "app_notification_sound"

  fun ensure(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(DEFAULT_PUSH_CHANNEL_ID) != null) return

    val soundUri = customSoundUri(context)
    val soundAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channel = NotificationChannel(
      DEFAULT_PUSH_CHANNEL_ID,
      "VNSEEA notifications",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "VNSEEA message and activity notifications"
      lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      enableVibration(true)
      if (soundUri != null) {
        setSound(soundUri, soundAttributes)
      }
    }

    manager.createNotificationChannel(channel)
  }

  private fun customSoundUri(context: Context): Uri? {
    val resourceId = context.resources.getIdentifier(
      DEFAULT_PUSH_SOUND_RES_NAME,
      "raw",
      context.packageName,
    )
    if (resourceId == 0) return null

    return Uri.parse("android.resource://${context.packageName}/$resourceId")
  }
}
