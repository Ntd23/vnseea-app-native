// Description: Builds Android message notifications with inline reply actions.
package com.vnseea.android.messages

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.app.RemoteInput
import androidx.core.graphics.drawable.IconCompat
import com.vnseea.android.MainActivity
import com.vnseea.android.R
import com.vnseea.android.push.VnseeaNotificationChannels
import com.onesignal.notifications.INotification
import org.json.JSONObject
import java.io.BufferedInputStream
import java.net.HttpURLConnection
import java.net.URL

object MessagePushNotification {
  private const val LOG_TAG = "VnseeaMessagePush"
  private const val SHARED_LOCATION_PREVIEW =
    "\uD83D\uDCCD \u0110\u00E3 chia s\u1EBB m\u1ED9t v\u1ECB tr\u00ED"
  private val MESSAGE_PUSH_KINDS =
    setOf("message", "chat", "chat_message", "new_message")

  fun isMessagePush(data: JSONObject?): Boolean {
    if (data == null) return false
    val type = data.optString("type").lowercase()
    val pushKind = data.optString("push_kind").ifBlank {
      data.optString("payload_kind")
    }.trim().lowercase()
    val notificationType = data.optString("notification_type").trim().lowercase()
    val hasConversationTarget = when (type) {
      "group" -> data.optString("group_id").isNotBlank()
      "page" -> data.optString("page_id").isNotBlank()
      "user" -> data.optString("user_id").isNotBlank()
      else -> false
    }

    if (pushKind.isNotBlank()) {
      return pushKind in MESSAGE_PUSH_KINDS && hasConversationTarget
    }
    if (notificationType in MESSAGE_PUSH_KINDS) {
      return hasConversationTarget
    }
    if (data.optString("message_id").isNotBlank()) {
      return hasConversationTarget
    }

    return when (type) {
      "group" -> data.optString("group_id").isNotBlank()
      "page" -> data.optString("page_id").isNotBlank()
      "user" -> data.optString("user_id").isNotBlank()
      else -> false
    }
  }

  fun show(context: Context, notification: INotification) {
    VnseeaNotificationChannels.ensure(context)

    val data = notification.additionalData ?: JSONObject()
    val type = data.optString("type").lowercase()
    val senderName = notification.title?.takeIf { it.isNotBlank() } ?: context.getString(R.string.app_name)
    val preview = formatMessagePreview(notification.body.orEmpty(), data)
    val targetId = when (type) {
      "group" -> data.optString("group_id")
      "page" -> data.optString("page_id")
      else -> data.optString("user_id")
    }.trim()

    if (targetId.isBlank()) {
      Log.w(LOG_TAG, "ignored message push: missing target id type=$type data=$data")
      return
    }

    val notificationId = conversationNotificationId(type, targetId)
    val openIntent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("vnseea_open_message_thread", true)
      putExtra(MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE, type)
      putExtra(MessageQuickReplyActions.EXTRA_TARGET_ID, targetId)
    }
    val contentPendingIntent = PendingIntent.getActivity(
      context,
      notificationId,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val replyRemoteInput = RemoteInput.Builder(MessageQuickReplyActions.EXTRA_REMOTE_INPUT)
      .setLabel(context.getString(R.string.app_name))
      .build()
    val replyIntent = Intent(context, MessageQuickReplyReceiver::class.java).apply {
      action = MessageQuickReplyActions.ACTION_QUICK_REPLY
      putExtra(MessageQuickReplyActions.EXTRA_CONVERSATION_TYPE, type)
      putExtra(MessageQuickReplyActions.EXTRA_TARGET_ID, targetId)
      putExtra(MessageQuickReplyActions.EXTRA_SENDER_NAME, senderName)
      putExtra(MessageQuickReplyActions.EXTRA_MESSAGE_PREVIEW, preview)
      putExtra(MessageQuickReplyActions.EXTRA_NOTIFICATION_ID, notificationId)
    }
    val replyPendingIntent = PendingIntent.getBroadcast(
      context,
      notificationId + 1,
      replyIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )

    val replyAction = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_send,
      "Trả lời",
      replyPendingIntent,
    )
      .addRemoteInput(replyRemoteInput)
      .setAllowGeneratedReplies(true)
      .build()

    val senderAvatarBitmap = loadRemoteBitmap(
      firstRemoteUrl(
        notification.largeIcon,
        data.optString("sender_avatar"),
        data.optString("avatar"),
        data.optString("profile_picture"),
      ),
    )
    val currentUserIdentity = MessageNotificationIdentityStore.read(context)
    val currentUserName = currentUserIdentity.name.ifBlank {
      context.getString(R.string.app_name)
    }
    val currentUserAvatarBitmap = loadRemoteBitmap(currentUserIdentity.avatarUrl)
    val currentUserPerson = buildPerson(
      name = currentUserName,
      bitmap = currentUserAvatarBitmap,
      key = "vnseea-current-user",
    )
    val senderPerson = buildPerson(
      name = senderName,
      bitmap = senderAvatarBitmap,
      key = "vnseea-sender-$targetId",
    )

    val builder = NotificationCompat.Builder(context, VnseeaNotificationChannels.DEFAULT_PUSH_CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(senderName)
      .setContentText(preview)
      .setStyle(
        NotificationCompat.MessagingStyle(currentUserPerson)
          .setConversationTitle(senderName)
          .addMessage(preview, System.currentTimeMillis(), senderPerson),
      )
      .setContentIntent(contentPendingIntent)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setColor(Color.rgb(79, 70, 229))
      .setAutoCancel(true)
      .setOnlyAlertOnce(true)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .addAction(replyAction)

    if (senderAvatarBitmap != null) {
      builder.setLargeIcon(senderAvatarBitmap)
    }

    try {
      NotificationManagerCompat.from(context).notify(notificationId, builder.build())
      Log.i(LOG_TAG, "posted quick reply notification id=$notificationId type=$type target_id=$targetId")
    } catch (error: Throwable) {
      Log.e(LOG_TAG, "failed to post quick reply notification: ${error.message}", error)
    }
  }

  private fun conversationNotificationId(type: String, targetId: String): Int {
    return ("$type:$targetId").hashCode()
  }

  private fun formatMessagePreview(rawPreview: String, data: JSONObject): String {
    val normalizedPreview = rawPreview.trim()
    return if (isSharedLocationMessage(normalizedPreview, data)) {
      SHARED_LOCATION_PREVIEW
    } else {
      normalizedPreview
    }
  }

  private fun isSharedLocationMessage(rawPreview: String, data: JSONObject): Boolean {
    val explicitMessageTypes = listOf(
      data.optString("message_type"),
      data.optString("media_type"),
      data.optString("type_two"),
      data.optString("notification_type"),
    ).map { it.trim().lowercase() }
    if (explicitMessageTypes.any { it == "map" || it.contains("location") }) {
      return true
    }

    val normalizedUrl = rawPreview
      .replace("&amp;", "&", ignoreCase = true)
      .replace("&#38;", "&", ignoreCase = true)
      .lowercase()
    val hasMapPath = normalizedUrl.contains("/map?") ||
      normalizedUrl.contains("/maps?") ||
      normalizedUrl.contains("vnseea://map?")

    return hasMapPath && normalizedUrl.contains("lat=") && normalizedUrl.contains("lng=")
  }

  private fun buildPerson(name: String, bitmap: Bitmap?, key: String): Person {
    val builder = Person.Builder()
      .setName(name)
      .setKey(key)
    if (bitmap != null) {
      builder.setIcon(IconCompat.createWithBitmap(bitmap))
    }
    return builder.build()
  }

  private fun firstRemoteUrl(vararg candidates: String?): String? {
    return candidates.firstOrNull { candidate ->
      candidate?.trim()?.startsWith("http", ignoreCase = true) == true
    }?.trim()
  }

  private fun loadRemoteBitmap(url: String?): Bitmap? {
    val normalized = url?.trim().orEmpty()
    if (normalized.isBlank() || !normalized.startsWith("http", ignoreCase = true)) return null
    var connection: HttpURLConnection? = null
    return try {
      connection = (URL(normalized).openConnection() as HttpURLConnection).apply {
        connectTimeout = 1_200
        readTimeout = 1_200
        instanceFollowRedirects = true
      }
      connection.connect()
      BufferedInputStream(connection.inputStream).use { input ->
        BitmapFactory.decodeStream(input)
      }
    } catch (error: Throwable) {
      Log.w(LOG_TAG, "notification avatar load failed: ${error.message}")
      null
    } finally {
      connection?.disconnect()
    }
  }
}
