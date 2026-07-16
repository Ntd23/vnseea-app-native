// Description: Runs the JS quick-reply sender while the app is backgrounded or cold-started.
package com.vnseea.android.messages

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class MessageQuickReplyHeadlessService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val sourceIntent = intent ?: return null
    val replyText = sourceIntent
      .getStringExtra(MessageQuickReplyActions.EXTRA_REMOTE_INPUT)
      ?.trim()
      .orEmpty()
    val targetId = sourceIntent
      .getStringExtra(MessageQuickReplyActions.EXTRA_TARGET_ID)
      ?.trim()
      .orEmpty()

    if (replyText.isBlank() || targetId.isBlank()) return null

    val bundle = Bundle().apply {
      putString(MessageQuickReplyActions.EXTRA_REMOTE_INPUT, replyText)
      putString(
        MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE,
        sourceIntent.getStringExtra(MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE).orEmpty(),
      )
      putString(MessageQuickReplyActions.EXTRA_TARGET_ID, targetId)
      putString(
        MessageQuickReplyActions.EXTRA_SENDER_NAME,
        sourceIntent.getStringExtra(MessageQuickReplyActions.EXTRA_SENDER_NAME).orEmpty(),
      )
      putString(
        MessageQuickReplyActions.EXTRA_MESSAGE_PREVIEW,
        sourceIntent.getStringExtra(MessageQuickReplyActions.EXTRA_MESSAGE_PREVIEW).orEmpty(),
      )
      putInt(
        MessageQuickReplyActions.EXTRA_NOTIFICATION_ID,
        sourceIntent.getIntExtra(MessageQuickReplyActions.EXTRA_NOTIFICATION_ID, 0),
      )
    }

    return HeadlessJsTaskConfig(
      MessageQuickReplyActions.TASK_NAME,
      Arguments.fromBundle(bundle),
      30_000,
      true,
    )
  }
}
