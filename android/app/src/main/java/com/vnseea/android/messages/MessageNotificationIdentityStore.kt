// Description: Persists the logged-in user's identity for Android message notifications.
package com.vnseea.android.messages

import android.content.Context

data class MessageNotificationIdentity(
  val name: String,
  val avatarUrl: String,
)

object MessageNotificationIdentityStore {
  private const val PREFERENCES_NAME = "vnseea_message_notification_identity"
  private const val KEY_NAME = "current_user_name"
  private const val KEY_AVATAR_URL = "current_user_avatar_url"

  fun read(context: Context): MessageNotificationIdentity {
    val preferences = context.applicationContext.getSharedPreferences(
      PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    )
    return MessageNotificationIdentity(
      name = preferences.getString(KEY_NAME, null)?.trim().orEmpty(),
      avatarUrl = preferences.getString(KEY_AVATAR_URL, null)?.trim().orEmpty(),
    )
  }

  fun write(context: Context, name: String?, avatarUrl: String?) {
    context.applicationContext.getSharedPreferences(
      PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    ).edit()
      .putString(KEY_NAME, name?.trim().orEmpty())
      .putString(KEY_AVATAR_URL, avatarUrl?.trim().orEmpty())
      .apply()
  }

  fun clear(context: Context) {
    context.applicationContext.getSharedPreferences(
      PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    ).edit().clear().apply()
  }
}
