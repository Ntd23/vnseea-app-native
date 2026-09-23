package com.vnseea.android.call

import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import org.json.JSONObject

class IncomingCallRingingService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var callId: String = ""
  private var expiry: Runnable? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val data = try {
      JSONObject(intent?.getStringExtra(EXTRA_DATA).orEmpty())
    } catch (_: Exception) {
      stopSelf()
      return START_NOT_STICKY
    }
    val incomingCallId = data.optString(LiveKitCallNativeActions.EXTRA_CALL_ID)
    if (incomingCallId.isBlank() || LiveKitCallNativeActions.isIncomingCallHandledRecently(this, incomingCallId)) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (callId.isNotBlank() && callId != incomingCallId) {
      IncomingCallRinger.stop(callId)
    }
    callId = incomingCallId
    currentCallId = incomingCallId
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    try {
      val notification = LiveKitCallNotifier.buildNotification(this, data, manager, includeFullScreen = false)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(incomingCallId.hashCode(), notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE)
      } else {
        startForeground(incomingCallId.hashCode(), notification)
      }
    } catch (error: Throwable) {
      Log.w(TAG, "could not keep incoming call ringing in foreground call_id=$incomingCallId", error)
      stopSelf()
      return START_NOT_STICKY
    }
    IncomingCallRinger.start(this, incomingCallId)
    expiry?.let(handler::removeCallbacks)
    expiry = Runnable { LiveKitCallNativeActions.dismissIncomingCall(this, incomingCallId) }.also {
      handler.postDelayed(it, LiveKitCallNotifier.expiryDelayMs(data))
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    expiry?.let(handler::removeCallbacks)
    expiry = null
    if (LiveKitCallNativeActions.isIncomingCallHandledRecently(this, callId)) {
      IncomingCallRinger.stop(callId)
    }
    if (currentCallId == callId) currentCallId = null
    super.onDestroy()
  }

  companion object {
    private const val TAG = "LiveKitCallPush"
    private const val EXTRA_DATA = "call_data"
    @Volatile private var currentCallId: String? = null

    fun start(context: Context, data: JSONObject) {
      val intent = Intent(context, IncomingCallRingingService::class.java).apply {
        putExtra(EXTRA_DATA, data.toString())
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context, callId: String) {
      if (currentCallId == callId) {
        context.stopService(Intent(context, IncomingCallRingingService::class.java))
      }
    }

    fun isActive(callId: String): Boolean = currentCallId == callId
  }
}
