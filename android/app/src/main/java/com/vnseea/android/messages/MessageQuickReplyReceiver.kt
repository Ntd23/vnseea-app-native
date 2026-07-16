// Description: Receives Android notification inline replies and forwards them to Headless JS.
package com.vnseea.android.messages

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.RemoteInput
import com.facebook.react.HeadlessJsTaskService

class MessageQuickReplyReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != MessageQuickReplyActions.ACTION_QUICK_REPLY) return

    val replyText = RemoteInput
      .getResultsFromIntent(intent)
      ?.getCharSequence(MessageQuickReplyActions.EXTRA_REMOTE_INPUT)
      ?.toString()
      ?.trim()
      .orEmpty()
    val targetId = intent.getStringExtra(MessageQuickReplyActions.EXTRA_TARGET_ID)?.trim().orEmpty()
    val notificationId = intent.getIntExtra(MessageQuickReplyActions.EXTRA_NOTIFICATION_ID, 0)

    if (replyText.isBlank() || targetId.isBlank()) {
      Log.w("VnseeaQuickReply", "ignored empty reply or missing target target_id=$targetId")
      return
    }

    if (notificationId != 0) {
      val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      notificationManager?.cancel(notificationId)
    }

    val serviceIntent = Intent(context, MessageQuickReplyHeadlessService::class.java).apply {
      putExtra(MessageQuickReplyActions.EXTRA_REMOTE_INPUT, replyText)
      putExtra(
        MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE,
        intent.getStringExtra(MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE).orEmpty(),
      )
      putExtra(MessageQuickReplyActions.EXTRA_TARGET_ID, targetId)
      putExtra(
        MessageQuickReplyActions.EXTRA_SENDER_NAME,
        intent.getStringExtra(MessageQuickReplyActions.EXTRA_SENDER_NAME).orEmpty(),
      )
      putExtra(
        MessageQuickReplyActions.EXTRA_MESSAGE_PREVIEW,
        intent.getStringExtra(MessageQuickReplyActions.EXTRA_MESSAGE_PREVIEW).orEmpty(),
      )
      putExtra(MessageQuickReplyActions.EXTRA_NOTIFICATION_ID, notificationId)
    }

    try {
      context.startService(serviceIntent)
      HeadlessJsTaskService.acquireWakeLockNow(context)
      Log.i("VnseeaQuickReply", "started quick reply task target_id=$targetId")
    } catch (error: Throwable) {
      Log.e("VnseeaQuickReply", "failed to start quick reply task: ${error.message}", error)
    }
  }
}
