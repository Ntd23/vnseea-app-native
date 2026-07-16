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
import androidx.core.app.RemoteInput
import androidx.core.app.Person
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

  fun isMessagePush(data: JSONObject?): Boolean {
    if (data == null) return false
    val type = data.optString("type").lowercase()
    return when (type) {
      "group" -> data.optString("group_id").isNotBlank()
      "page" -> data.optString("page_id").isNotBlank()
      else -> data.optString("user_id").isNotBlank()
    }
  }

  fun show(context: Context, notification: INotification) {
    VnseeaNotificationChannels.ensure(context)

    val data = notification.additionalData ?: JSONObject()
    val type = data.optString("type").lowercase()
    val senderName = notification.title?.takeIf { it.isNotBlank() } ?: context.getString(R.string.app_name)
    val preview = notification.body?.takeIf { it.isNotBlank() }.orEmpty()
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

    val senderPerson = Person.Builder().setName(senderName).build()

    val builder = NotificationCompat.Builder(context, VnseeaNotificationChannels.DEFAULT_PUSH_CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(senderName)
      .setContentText(preview)
      .setStyle(
        NotificationCompat.MessagingStyle(senderPerson)
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

    val largeIconBitmap = loadLargeIcon(notification.largeIcon)
    if (largeIconBitmap != null) {
      builder.setLargeIcon(largeIconBitmap)
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

  private fun loadLargeIcon(url: String?): Bitmap? {
    val normalized = url?.trim().orEmpty()
    if (normalized.isBlank() || !normalized.startsWith("http", ignoreCase = true)) return null
    return try {
      val connection = (URL(normalized).openConnection() as HttpURLConnection).apply {
        connectTimeout = 1_200
        readTimeout = 1_200
        instanceFollowRedirects = true
      }
      connection.connect()
      BufferedInputStream(connection.inputStream).use { input ->
        BitmapFactory.decodeStream(input)
      }
    } catch (error: Throwable) {
      Log.w(LOG_TAG, "large icon load failed: ${error.message}")
      null
    }
  }
}
