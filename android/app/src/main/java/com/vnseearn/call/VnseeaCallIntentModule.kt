// Description: Exposes pending Android native call intents to React Native.
package com.vnseearn.call

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class VnseeaCallIntentModule(
  private val appContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(appContext) {
  override fun getName() = "VnseeaCallIntent"

  @ReactMethod
  fun getInitialCallAction(promise: Promise) {
    val intent = appContext.currentActivity?.intent
    val extras = intent?.extras
    if (extras == null || extras.getString(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION) != "answer") {
      promise.resolve(null)
      return
    }
    val map: WritableMap = Arguments.createMap()
    for (key in listOf(
      LiveKitCallNativeActions.EXTRA_EVENT_TYPE,
      LiveKitCallNativeActions.EXTRA_CALL_ID,
      LiveKitCallNativeActions.EXTRA_CALL_TYPE,
      LiveKitCallNativeActions.EXTRA_ROOM_NAME,
      LiveKitCallNativeActions.EXTRA_FROM_ID,
      LiveKitCallNativeActions.EXTRA_GROUP_ID,
      LiveKitCallNativeActions.EXTRA_GROUP_NAME,
      LiveKitCallNativeActions.EXTRA_GROUP_AVATAR,
      LiveKitCallNativeActions.EXTRA_CALLER_ID,
      LiveKitCallNativeActions.EXTRA_CALLER_NAME,
      LiveKitCallNativeActions.EXTRA_CALLER_AVATAR,
      LiveKitCallNativeActions.EXTRA_NAME,
      LiveKitCallNativeActions.EXTRA_AVATAR,
      LiveKitCallNativeActions.EXTRA_ACTION_TOKEN,
      LiveKitCallNativeActions.EXTRA_API_URL,
      LiveKitCallNativeActions.EXTRA_RING_MODE,
      LiveKitCallNativeActions.EXTRA_CALL_CONTEXT,
    )) {
      map.putString(key, extras.getString(key).orEmpty())
    }
    intent.removeExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION)
    promise.resolve(map)
  }

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      promise.resolve(true)
      return
    }

    val notificationManager =
      appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    promise.resolve(notificationManager.canUseFullScreenIntent())
  }

  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      promise.resolve(false)
      return
    }

    val activity = appContext.currentActivity
    val packageName = appContext.packageName
    val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
      putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
      data = Uri.parse("package:$packageName")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    try {
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        appContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:$packageName")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      try {
        if (activity != null) {
          activity.startActivity(fallbackIntent)
        } else {
          appContext.startActivity(fallbackIntent)
        }
        promise.resolve(true)
      } catch (fallbackError: Exception) {
        promise.reject("E_OPEN_FULL_SCREEN_SETTINGS", fallbackError)
      }
    }
  }
}
