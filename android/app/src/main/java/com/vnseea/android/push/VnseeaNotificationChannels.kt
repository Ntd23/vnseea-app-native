// Description: Creates Android notification channels used by OneSignal pushes.
package com.vnseea.android.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat

object VnseeaNotificationChannels {
  const val DEFAULT_PUSH_CHANNEL_ID = "vnseea_notifications_v2"

  // Android freezes a channel's sound once it is created, so channels that played the
  // bundled app sound are deleted and replaced instead of being updated in place.
  private val LEGACY_PUSH_CHANNEL_IDS = listOf("vnseea_notifications_sound_v1")

  fun ensure(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    LEGACY_PUSH_CHANNEL_IDS.forEach { channelId ->
      if (manager.getNotificationChannel(channelId) != null) {
        manager.deleteNotificationChannel(channelId)
      }
    }
    if (manager.getNotificationChannel(DEFAULT_PUSH_CHANNEL_ID) != null) return

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
      setSound(Settings.System.DEFAULT_NOTIFICATION_URI, soundAttributes)
    }

    manager.createNotificationChannel(channel)
  }
}
