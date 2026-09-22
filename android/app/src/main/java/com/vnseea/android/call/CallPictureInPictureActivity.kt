// Description: Owns Android system PiP so the main app UI is never captured inside the call window.
package com.vnseea.android.call

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Rational
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.oney.WebRTCModule.WebRTCView
import java.lang.ref.WeakReference

class CallPictureInPictureActivity : Activity() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var hasEnteredPictureInPicture = false
  private var isClosingWithoutRestore = false
  private var renderAttempt = 0
  private var localVideoView: WebRTCView? = null
  private var remoteVideoView: WebRTCView? = null
  private lateinit var videoContainer: LinearLayout

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.statusBarColor = Color.BLACK
    window.navigationBarColor = Color.BLACK
    setContentView(buildContentView())
    activeActivity = WeakReference(this)
    renderCurrentConfiguration()
    videoContainer.post { enterSystemPictureInPicture() }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    renderCurrentConfiguration()
    videoContainer.post { enterSystemPictureInPicture() }
  }

  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    if (isInPictureInPictureMode) {
      hasEnteredPictureInPicture = true
      emitEvent(CALL_PIP_MODE_CHANGED_EVENT, active = true)
      return
    }

    if (hasEnteredPictureInPicture && !isClosingWithoutRestore) {
      emitEvent(CALL_PIP_MODE_CHANGED_EVENT, active = false)
      emitEvent(CALL_PIP_RESTORE_REQUESTED_EVENT, active = false)
      finish()
    }
  }

  override fun onDestroy() {
    if (activeActivity.get() === this) {
      activeActivity.clear()
    }
    mainHandler.removeCallbacksAndMessages(null)
    remoteVideoView?.setStreamURL(null)
    localVideoView?.setStreamURL(null)
    remoteVideoView = null
    localVideoView = null
    super.onDestroy()
  }

  fun applyCurrentConfiguration() {
    if (isFinishing || isDestroyed) return
    renderAttempt = 0
    renderCurrentConfiguration()
    updatePictureInPictureParams()
  }

  private fun buildContentView(): View {
    videoContainer = LinearLayout(this).apply {
      gravity = Gravity.CENTER
      orientation = LinearLayout.HORIZONTAL
      setBackgroundColor(Color.BLACK)
      dividerDrawable = null
    }
    return FrameLayout(this).apply {
      setBackgroundColor(Color.BLACK)
      addView(
        videoContainer,
        FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        ),
      )
    }
  }

  private fun renderCurrentConfiguration() {
    val reactContext =
      (application as? ReactApplication)?.reactHost?.currentReactContext
    if (reactContext == null) {
      if (renderAttempt++ < MAX_REACT_CONTEXT_ATTEMPTS) {
        mainHandler.postDelayed({ renderCurrentConfiguration() }, REACT_CONTEXT_RETRY_MS)
      }
      return
    }

    if (remoteVideoView == null || localVideoView == null) {
      videoContainer.removeAllViews()
      remoteVideoView = WebRTCView(reactContext).also { view ->
        view.setObjectFit("cover")
        view.setMirror(false)
        videoContainer.addView(view, equalHalfLayoutParams())
      }
      localVideoView = WebRTCView(reactContext).also { view ->
        view.setObjectFit("cover")
        videoContainer.addView(view, equalHalfLayoutParams())
      }
    }

    val current = sharedConfiguration
    remoteVideoView?.setMirror(false)
    remoteVideoView?.setStreamURL(current.remoteStreamUrl.ifBlank { null })
    localVideoView?.setMirror(current.localMirror)
    localVideoView?.setStreamURL(
      current.localStreamUrl.takeIf { current.localCameraEnabled && it.isNotBlank() },
    )
  }

  private fun equalHalfLayoutParams() = LinearLayout.LayoutParams(
    0,
    ViewGroup.LayoutParams.MATCH_PARENT,
    1f,
  )

  private fun enterSystemPictureInPicture() {
    if (
      Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
      !sharedConfiguration.enabled ||
      isInPictureInPictureMode
    ) {
      return
    }
    runCatching { enterPictureInPictureMode(buildPictureInPictureParams()) }
      .onFailure { finishWithoutRestore() }
  }

  private fun updatePictureInPictureParams() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    runCatching { setPictureInPictureParams(buildPictureInPictureParams()) }
  }

  private fun buildPictureInPictureParams(): PictureInPictureParams {
    val current = sharedConfiguration
    val builder = PictureInPictureParams.Builder().setAspectRatio(
      Rational(
        current.aspectWidth.coerceAtLeast(1),
        current.aspectHeight.coerceAtLeast(1),
      ),
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder
        .setAutoEnterEnabled(current.enabled)
        .setSeamlessResizeEnabled(false)
    }
    return builder.build()
  }

  private fun finishWithoutRestore() {
    isClosingWithoutRestore = true
    if (!isFinishing) finish()
  }

  private fun emitEvent(eventName: String, active: Boolean) {
    val reactContext =
      (application as? ReactApplication)?.reactHost?.currentReactContext ?: return
    val payload = Arguments.createMap().apply {
      putBoolean("active", active)
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  companion object {
    const val CALL_PIP_MODE_CHANGED_EVENT = "VNSEEA_CALL_PIP_MODE_CHANGED"
    const val CALL_PIP_RESTORE_REQUESTED_EVENT = "VNSEEA_CALL_PIP_RESTORE_REQUESTED"

    private const val MAX_REACT_CONTEXT_ATTEMPTS = 30
    private const val REACT_CONTEXT_RETRY_MS = 100L

    private data class ConfigurationState(
      val enabled: Boolean = false,
      val localCameraEnabled: Boolean = false,
      val localMirror: Boolean = false,
      val localStreamUrl: String = "",
      val remoteStreamUrl: String = "",
      val aspectWidth: Int = 3,
      val aspectHeight: Int = 2,
    )

    @Volatile
    private var sharedConfiguration = ConfigurationState()
    private var activeActivity = WeakReference<CallPictureInPictureActivity>(null)

    fun configure(
      enabled: Boolean,
      localCameraEnabled: Boolean,
      localMirror: Boolean,
      localStreamUrl: String,
      remoteStreamUrl: String,
      aspectWidth: Int,
      aspectHeight: Int,
    ): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
      sharedConfiguration = ConfigurationState(
        enabled = enabled,
        localCameraEnabled = localCameraEnabled,
        localMirror = localMirror,
        localStreamUrl = localStreamUrl,
        remoteStreamUrl = remoteStreamUrl,
        aspectWidth = aspectWidth.coerceAtLeast(1),
        aspectHeight = aspectHeight.coerceAtLeast(1),
      )
      val currentActivity = activeActivity.get()
      currentActivity?.runOnUiThread { currentActivity.applyCurrentConfiguration() }
      if (!enabled) closeIfActive()
      return true
    }

    fun setEnabled(enabled: Boolean, aspectWidth: Int, aspectHeight: Int): Boolean {
      val current = sharedConfiguration
      return configure(
        enabled = enabled,
        localCameraEnabled = current.localCameraEnabled,
        localMirror = current.localMirror,
        localStreamUrl = current.localStreamUrl,
        remoteStreamUrl = current.remoteStreamUrl,
        aspectWidth = aspectWidth,
        aspectHeight = aspectHeight,
      )
    }

    fun openForCurrentCall(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !sharedConfiguration.enabled) {
        return false
      }
      val current = activeActivity.get()
      if (current != null && !current.isFinishing && !current.isDestroyed) {
        current.runOnUiThread {
          current.applyCurrentConfiguration()
          current.enterSystemPictureInPicture()
        }
        return true
      }

      val intent = Intent(context, CallPictureInPictureActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (context !is Activity) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      return true
    }

    fun isActive(): Boolean {
      val current = activeActivity.get() ?: return false
      return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        current.isInPictureInPictureMode &&
        !current.isFinishing
    }

    fun closeIfActive(): Boolean {
      sharedConfiguration = sharedConfiguration.copy(enabled = false)
      val current = activeActivity.get() ?: return false
      current.runOnUiThread { current.finishWithoutRestore() }
      return true
    }
  }
}
