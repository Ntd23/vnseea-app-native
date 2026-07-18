// Description: Syncs the logged-in user's name and avatar from React Native to Android notifications.
package com.vnseea.android.messages

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MessageNotificationIdentityModule(
  private val appContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(appContext) {
  override fun getName() = "VnseeaMessageNotification"

  @ReactMethod
  fun setCurrentUser(name: String?, avatarUrl: String?) {
    MessageNotificationIdentityStore.write(appContext, name, avatarUrl)
  }

  @ReactMethod
  fun clearCurrentUser() {
    MessageNotificationIdentityStore.clear(appContext)
  }
}
