// Description: Shows a native Android list dialog for React Native system action sheets.
package com.vnseea.android.ui

import android.app.AlertDialog
import android.content.res.Configuration
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil
import java.util.concurrent.atomic.AtomicBoolean

class SystemActionSheetModule(
  private val appContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(appContext) {
  override fun getName() = "VnseeaSystemActionSheet"

  @ReactMethod
  fun show(
    title: String?,
    labels: ReadableArray,
    destructiveIndexes: ReadableArray,
    cancelLabel: String?,
    promise: Promise,
  ) {
    val activity = appContext.currentActivity
    if (activity == null || activity.isFinishing) {
      promise.resolve(CANCELLED)
      return
    }

    val destructive = (0 until destructiveIndexes.size())
      .map { destructiveIndexes.getInt(it) }
      .toSet()
    val items = Array<CharSequence>(labels.size()) { index ->
      val label = labels.getString(index).orEmpty()
      if (index in destructive) {
        SpannableString(label).apply {
          setSpan(ForegroundColorSpan(DESTRUCTIVE_COLOR), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
      } else {
        label
      }
    }
    // Item taps, the cancel button, back presses and dismissals can all fire for
    // one dialog; the promise must settle exactly once.
    val settled = AtomicBoolean(false)
    val settle = { index: Int ->
      if (settled.compareAndSet(false, true)) promise.resolve(index)
    }

    UiThreadUtil.runOnUiThread {
      val isNightMode = (activity.resources.configuration.uiMode and
        Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
      val theme = if (isNightMode) {
        android.R.style.Theme_DeviceDefault_Dialog_Alert
      } else {
        android.R.style.Theme_DeviceDefault_Light_Dialog_Alert
      }
      val builder = AlertDialog.Builder(activity, theme)
        .setItems(items) { _, which -> settle(which) }
        .setNegativeButton(cancelLabel.orEmpty()) { _, _ -> settle(CANCELLED) }
        .setOnCancelListener { settle(CANCELLED) }
        .setOnDismissListener { settle(CANCELLED) }
      if (!title.isNullOrBlank()) {
        builder.setTitle(title)
      }
      try {
        builder.show()
      } catch (_: Throwable) {
        settle(CANCELLED)
      }
    }
  }

  companion object {
    private const val CANCELLED = -1
    private val DESTRUCTIVE_COLOR = Color.rgb(220, 38, 38)
  }
}
