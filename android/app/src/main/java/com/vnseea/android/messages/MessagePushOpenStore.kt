// Description: Persists Android custom message-notification taps until React Native can route them.
package com.vnseea.android.messages

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

object MessagePushOpenStore {
  const val EVENT_NAME = "vnseeaMessagePushOpen"

  private const val PREFS_NAME = "vnseea_message_push_open"
  private const val PAYLOAD_KEY = "pending_payload"

  fun capture(context: Context, intent: Intent?): Boolean {
    if (
      intent?.getBooleanExtra(
        MessageQuickReplyActions.EXTRA_OPEN_MESSAGE_THREAD,
        false,
      ) != true
    ) {
      return false
    }

    val conversationType = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE)
      ?.trim()
      ?.lowercase()
      .orEmpty()
    val targetId = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_TARGET_ID)
      ?.trim()
      .orEmpty()
    if (conversationType !in setOf("user", "page", "group") || targetId.isBlank()) {
      return false
    }

    val messageId = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_MESSAGE_ID)
      ?.trim()
      .orEmpty()
    val messageType = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_MESSAGE_TYPE)
      ?.trim()
      .orEmpty()
    val recipientId = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_RECIPIENT_ID)
      ?.trim()
      .orEmpty()
    val senderName = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_SENDER_NAME)
      ?.trim()
      .orEmpty()
    val senderAvatar = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_SENDER_AVATAR)
      ?.trim()
      .orEmpty()
    val preview = intent
      .getStringExtra(MessageQuickReplyActions.EXTRA_MESSAGE_PREVIEW)
      ?.trim()
      .orEmpty()

    val additionalData = JSONObject()
      .put("push_kind", "message")
      .put("payload_kind", "message")
      .put("notification_type", "message")
      .put("type", conversationType)
      .put("conversation_type", conversationType)
      .put("message_id", messageId)
      .put("message_type", messageType)
      .put("recipient_id", recipientId)
      .put("sender_name", senderName)
      .put("sender_avatar", senderAvatar)
      .put(
        when (conversationType) {
          "group" -> "group_id"
          "page" -> "page_id"
          else -> "user_id"
        },
        targetId,
      )
    val notificationId = if (messageId.isNotBlank()) {
      "message:$messageId"
    } else {
      "message:$conversationType:$targetId:${System.currentTimeMillis()}"
    }
    val payload = JSONObject()
      .put("notificationId", notificationId)
      .put("title", senderName)
      .put("body", preview)
      .put("openedAt", System.currentTimeMillis())
      .put("additionalData", additionalData)

    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(PAYLOAD_KEY, payload.toString())
      .apply()
    intent.removeExtra(MessageQuickReplyActions.EXTRA_OPEN_MESSAGE_THREAD)
    return true
  }

  fun consume(context: Context): String? {
    val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val payload = preferences.getString(PAYLOAD_KEY, null)
    if (payload != null) {
      preferences.edit().remove(PAYLOAD_KEY).apply()
    }
    return payload
  }

  fun notifyReactContext(reactContext: ReactContext?) {
    if (reactContext?.hasActiveReactInstance() != true) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, null)
  }
}
