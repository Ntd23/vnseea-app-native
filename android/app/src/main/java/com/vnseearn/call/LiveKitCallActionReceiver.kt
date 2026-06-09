// Description: Handles Android incoming call notification answer and decline actions.
package com.vnseearn.call

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.vnseearn.MainActivity

class LiveKitCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION).orEmpty()
    val apiUrl = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_API_URL)
    val actionToken = intent.getStringExtra(LiveKitCallNativeActions.EXTRA_ACTION_TOKEN)
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
}
