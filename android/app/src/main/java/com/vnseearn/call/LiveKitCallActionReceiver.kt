// Description: Handles Android incoming call notification answer and decline actions.
package com.vnseearn.call

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.vnseearn.MainActivity

class LiveKitCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION).orEmpty()
    val apiUrl = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_API_URL)
    val actionToken = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN)
    Log.i("LiveKitCallPush", "notification action received action=$action call_id=${intent.getStringExtra(LiveKitCallNativeActions.EXTRA_CALL_ID).orEmpty()} has_token=${!actionToken.isNullOrBlank()}")
    cancelNotification(context, intent)
    if (action == "answer") {
      LiveKitCallNativeActions.postAction(apiUrl, actionToken, "answer")
      context.startActivity(Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtras(intent)
      })
      return
    }
    if (action == "decline") {
      LiveKitCallNativeActions.postAction(apiUrl, actionToken, "decline")
    }
  }

  private fun cancelNotification(context: Context, intent: Intent) {
    val callId = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_CALL_ID).orEmpty()
    if (callId.isBlank()) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancel(callId.hashCode())
  }
}
