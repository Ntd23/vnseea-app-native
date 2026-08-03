// Description: Keeps an established LiveKit call active while the Android app is backgrounded.
package com.vnseea.android.call

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.vnseea.android.MainActivity
import com.vnseea.android.R

class LiveKitCallForegroundService : Service() {
  override fun onCreate() {
    super.onCreate()
    ensureNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val callId = intent?.getStringExtra(EXTRA_CALL_ID).orEmpty()
    val callType = intent?.getStringExtra(EXTRA_CALL_TYPE).orEmpty()
    val title = intent?.getStringExtra(EXTRA_TITLE).orEmpty()
    if (callId.isBlank() || checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      Log.w(TAG, "foreground call service skipped because call id or microphone permission is missing")
      stopSelf()
      return START_NOT_STICKY
    }

    val openAppIntent = Intent(this, MainActivity::class.java).apply {
      this.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val contentIntent = PendingIntent.getActivity(
      this,
      NOTIFICATION_ID,
      openAppIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title.ifBlank { getString(R.string.active_call_notification_title) })
      .setContentText(
        if (callType == "video") {
          getString(R.string.active_video_call_notification_text)
        } else {
          getString(R.string.active_audio_call_notification_text)
        },
      )
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(contentIntent)
      .build()

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        var serviceTypes = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        if (
          callType == "video" &&
          checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        ) {
          serviceTypes = serviceTypes or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
        }
        startForeground(NOTIFICATION_ID, notification, serviceTypes)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      Log.i(TAG, "foreground call service active call_id=$callId type=$callType")
    } catch (error: Throwable) {
      Log.e(TAG, "could not enter foreground for call_id=$callId", error)
      stopSelf()
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  private fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_ID,
        getString(R.string.active_call_channel_name),
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = getString(R.string.active_call_channel_description)
        setSound(null, null)
        enableVibration(false)
      },
    )
  }

  companion object {
    private const val TAG = "LiveKitCallService"
    private const val CHANNEL_ID = "vnseea_active_calls_v1"
    private const val NOTIFICATION_ID = 29041
    private const val ACTION_START = "com.vnseea.android.call.START_FOREGROUND"
    private const val EXTRA_CALL_ID = "call_id"
    private const val EXTRA_CALL_TYPE = "call_type"
    private const val EXTRA_TITLE = "title"

    fun start(context: Context, callId: String, callType: String, title: String): Boolean {
      if (
        callId.isBlank() ||
        context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
      ) {
        return false
      }
      val intent = Intent(context, LiveKitCallForegroundService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_CALL_ID, callId)
        putExtra(EXTRA_CALL_TYPE, callType)
        putExtra(EXTRA_TITLE, title)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      return true
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, LiveKitCallForegroundService::class.java))
    }
  }
}
