// Description: Shared constants for Android message notification quick replies.
package com.vnseea.android.messages

object MessageQuickReplyActions {
  const val ACTION_QUICK_REPLY = "com.vnseea.android.messages.ACTION_QUICK_REPLY"
  const val TASK_NAME = "VnseeaMessageQuickReply"

  const val EXTRA_REMOTE_INPUT = "vnseea.quick_reply_text"
  const val EXTRA_CONVERSATION_TYPE = "conversationType"
  const val EXTRA_TARGET_ID = "targetId"
  const val EXTRA_SENDER_NAME = "senderName"
  const val EXTRA_MESSAGE_PREVIEW = "messagePreview"
  const val EXTRA_NOTIFICATION_ID = "notificationId"
}
