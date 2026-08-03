// Description: Handles Android incoming call notification answer and decline actions.
package com.vnseea.android.call

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.vnseea.android.MainActivity

class LiveKitCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION).orEmpty()
    val apiUrl = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_API_URL)
    val actionToken = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN)
    val clientEndpointId = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_CLIENT_ENDPOINT_ID)
    val callId = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_CALL_ID).orEmpty()
    Log.i("LiveKitCallPush", "notification action received action=$action call_id=$callId has_token=${!actionToken.isNullOrBlank()}")
    if (action == "answer" || action == "decline") {
      LiveKitCallNativeActions.dismissIncomingCall(context, callId)
    }
    if (action == "answer") {
      LiveKitCallNativeActions.postAction(apiUrl, actionToken, "answer", clientEndpointId)
      context.startActivity(Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtras(intent)
      })
      return
    }
    if (action == "decline") {
      LiveKitCallNativeActions.postAction(apiUrl, actionToken, "decline", clientEndpointId)
    }
  }
}
