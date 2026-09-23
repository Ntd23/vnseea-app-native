// Description: Owns Android system PiP so the main app UI is never captured inside the call window.
package com.vnseea.android.call

import android.app.Activity
import android.app.ActivityOptions
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
import com.vnseea.android.MainActivity
import java.lang.ref.WeakReference

class CallPictureInPictureActivity : Activity() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var hasEnteredPictureInPicture = false
  private var isClosingWithoutRestore = false
  private var renderAttempt = 0
  private var lastRenderKey = ""
  private var localVideoView: WebRTCView? = null
  private val remoteVideoViews = mutableListOf<WebRTCView>()
  private lateinit var videoContainer: LinearLayout

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    markDedicatedPictureInPictureStarted()
    window.statusBarColor = Color.BLACK
    window.navigationBarColor = Color.BLACK
    setContentView(buildContentView())
    activeActivity = WeakReference(this)
    renderCurrentConfiguration()
    videoContainer.post { enterSystemPictureInPicture() }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    markDedicatedPictureInPictureStarted()
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

    if (hasEnteredPictureInPicture && !isClosingWithoutRestore && !isFinishing) {
      pendingDedicatedRestoreRequest = true
      emitEvent(CALL_PIP_MODE_CHANGED_EVENT, active = false)
      launchMainHostForRestore()
      finish()
    }
  }

  private fun launchMainHostForRestore() {
    val restoreIntent = Intent(this, MainActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP,
      )
      putExtra(EXTRA_RESTORE_CALL, true)
    }
    runCatching { startActivity(restoreIntent) }
  }

  override fun onDestroy() {
    if (activeActivity.get() === this) {
      activeActivity.clear()
    }
    mainHandler.removeCallbacksAndMessages(null)
    remoteVideoViews.forEach { it.setStreamURL(null) }
    localVideoView?.setStreamURL(null)
    remoteVideoViews.clear()
    localVideoView = null
    lastRenderKey = ""
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

    val current = sharedConfiguration
    val remoteStreamUrls = current.remoteStreamUrls
      .filter { it.isNotBlank() }
      .distinct()
      .take(MAX_REMOTE_VIDEOS)
    val localStreamUrl = current.localStreamUrl
      .takeIf { current.localCameraEnabled && it.isNotBlank() }
    val renderKey = buildString {
      append(remoteStreamUrls.joinToString("|"))
      append("::")
      append(localStreamUrl.orEmpty())
      append("::")
      append(current.localMirror)
    }
    if (renderKey == lastRenderKey) return
    lastRenderKey = renderKey

    remoteVideoViews.forEach { it.setStreamURL(null) }
    localVideoView?.setStreamURL(null)
    remoteVideoViews.clear()
    localVideoView = null
    videoContainer.removeAllViews()

    val videoViews = mutableListOf<WebRTCView>()
    remoteStreamUrls.forEach { streamUrl ->
      val view = WebRTCView(reactContext).also {
        it.setObjectFit("cover")
        it.setMirror(false)
        it.setStreamURL(streamUrl)
      }
      remoteVideoViews += view
      videoViews += view
    }
    if (localStreamUrl != null) {
      localVideoView = WebRTCView(reactContext).also {
        it.setObjectFit("cover")
        it.setMirror(current.localMirror)
        it.setStreamURL(localStreamUrl)
      }
      videoViews += requireNotNull(localVideoView)
    }
    renderVideoGrid(videoViews)
  }

  private fun renderVideoGrid(videoViews: List<WebRTCView>) {
    videoContainer.orientation = if (videoViews.size <= 2) {
      LinearLayout.HORIZONTAL
    } else {
      LinearLayout.VERTICAL
    }
    if (videoViews.size <= 2) {
      videoViews.forEach { videoContainer.addView(it, equalCellLayoutParams()) }
      return
    }

    videoViews.chunked(2).forEach { rowViews ->
      val row = LinearLayout(this).apply {
        gravity = Gravity.CENTER
        orientation = LinearLayout.HORIZONTAL
        setBackgroundColor(Color.BLACK)
      }
      rowViews.forEach { row.addView(it, equalCellLayoutParams()) }
      if (rowViews.size < GRID_COLUMN_COUNT) {
        addEmptyGridCell(row)
      }
      videoContainer.addView(
        row,
        LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          0,
          1f,
        ),
      )
    }
  }

  private fun addEmptyGridCell(row: LinearLayout) {
    row.addView(
      View(this).apply { setBackgroundColor(Color.BLACK) },
      equalCellLayoutParams(),
    )
  }

  private fun equalCellLayoutParams() = LinearLayout.LayoutParams(
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
    return buildPictureInPictureParamsForConfiguration(sharedConfiguration)
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
      putString("presentation", PIP_PRESENTATION_DEDICATED)
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  companion object {
    const val CALL_PIP_MODE_CHANGED_EVENT = "VNSEEA_CALL_PIP_MODE_CHANGED"
    const val CALL_PIP_RESTORE_REQUESTED_EVENT = "VNSEEA_CALL_PIP_RESTORE_REQUESTED"
    const val EXTRA_RESTORE_CALL = "vnseea_restore_active_call"

    private const val MAX_REACT_CONTEXT_ATTEMPTS = 30
    private const val REACT_CONTEXT_RETRY_MS = 100L
    private const val MAX_REMOTE_VIDEOS = 3
    private const val GRID_COLUMN_COUNT = 2
    private const val DEDICATED_LAUNCH_GUARD_MS = 1_500L
    private const val PIP_PRESENTATION_DEDICATED = "dedicated"

    private data class ConfigurationState(
      val enabled: Boolean = false,
      val localCameraEnabled: Boolean = false,
      val localMirror: Boolean = false,
      val localStreamUrl: String = "",
      val remoteStreamUrls: List<String> = emptyList(),
      val aspectWidth: Int = 3,
      val aspectHeight: Int = 2,
    )

    @Volatile
    private var sharedConfiguration = ConfigurationState()
    private var activeActivity = WeakReference<CallPictureInPictureActivity>(null)
    @Volatile
    private var dedicatedPictureInPictureLaunchPending = false
    @Volatile
    private var pendingDedicatedRestoreRequest = false
    private var mainHostRestoreIntentReceived = false
    private var resumedMainHost = WeakReference<Activity>(null)
    private val dedicatedLaunchHandler = Handler(Looper.getMainLooper())
    private val clearDedicatedLaunchPending = Runnable {
      dedicatedPictureInPictureLaunchPending = false
    }

    private fun buildPictureInPictureParamsForConfiguration(
      current: ConfigurationState,
    ): PictureInPictureParams {
      val builder = PictureInPictureParams.Builder().setAspectRatio(
        Rational(
          current.aspectWidth.coerceAtLeast(1),
          current.aspectHeight.coerceAtLeast(1),
        ),
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        builder
          .setAutoEnterEnabled(false)
          .setSeamlessResizeEnabled(false)
      }
      return builder.build()
    }

    fun configure(
      enabled: Boolean,
      localCameraEnabled: Boolean,
      localMirror: Boolean,
      localStreamUrl: String,
      remoteStreamUrls: List<String>,
      aspectWidth: Int,
      aspectHeight: Int,
    ): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
      sharedConfiguration = ConfigurationState(
        enabled = enabled,
        localCameraEnabled = localCameraEnabled,
        localMirror = localMirror,
        localStreamUrl = localStreamUrl,
        remoteStreamUrls = remoteStreamUrls,
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
        remoteStreamUrls = current.remoteStreamUrls,
        aspectWidth = aspectWidth,
        aspectHeight = aspectHeight,
      )
    }

    fun openForCurrentCall(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !sharedConfiguration.enabled) {
        return false
      }
      if (dedicatedPictureInPictureLaunchPending) return true
      val current = activeActivity.get()
      if (current != null && !current.isFinishing && !current.isDestroyed) {
        current.runOnUiThread {
          current.applyCurrentConfiguration()
          current.enterSystemPictureInPicture()
        }
        return true
      }

      val intent = Intent(context, CallPictureInPictureActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      dedicatedPictureInPictureLaunchPending = true
      dedicatedLaunchHandler.removeCallbacks(clearDedicatedLaunchPending)
      dedicatedLaunchHandler.postDelayed(
        clearDedicatedLaunchPending,
        DEDICATED_LAUNCH_GUARD_MS,
      )
      return runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          val launchOptions = ActivityOptions.makeLaunchIntoPip(
            buildPictureInPictureParamsForConfiguration(sharedConfiguration),
          ).toBundle()
          context.startActivity(intent, launchOptions)
        } else {
          context.startActivity(intent)
        }
        true
      }.getOrElse {
        markDedicatedPictureInPictureStarted()
        false
      }
    }

    fun isDedicatedPictureInPictureLaunchPending() =
      dedicatedPictureInPictureLaunchPending

    private fun markDedicatedPictureInPictureStarted() {
      dedicatedLaunchHandler.removeCallbacks(clearDedicatedLaunchPending)
      dedicatedPictureInPictureLaunchPending = false
      pendingDedicatedRestoreRequest = false
      mainHostRestoreIntentReceived = false
    }

    @Synchronized
    fun consumeDedicatedRestoreRequest(): Boolean {
      val shouldRestore = pendingDedicatedRestoreRequest &&
        mainHostRestoreIntentReceived &&
        resumedMainHost.get() != null
      if (!shouldRestore) return false
      pendingDedicatedRestoreRequest = false
      mainHostRestoreIntentReceived = false
      return shouldRestore
    }

    @Synchronized
    fun markMainHostRestoreIntentReceived() {
      mainHostRestoreIntentReceived = true
      resumedMainHost.get()?.let { activity ->
        emitEvent(
          activity,
          CALL_PIP_RESTORE_REQUESTED_EVENT,
          active = false,
          presentation = PIP_PRESENTATION_DEDICATED,
        )
      }
    }

    fun onMainHostResumed(activity: Activity) {
      resumedMainHost = WeakReference(activity)
      if (!pendingDedicatedRestoreRequest || !mainHostRestoreIntentReceived) return
      emitEvent(
        activity,
        CALL_PIP_RESTORE_REQUESTED_EVENT,
        active = false,
        presentation = PIP_PRESENTATION_DEDICATED,
      )
    }

    fun onMainHostPaused(activity: Activity) {
      if (resumedMainHost.get() === activity) resumedMainHost.clear()
    }

    fun onMainHostDestroyed(activity: Activity) {
      onMainHostPaused(activity)
    }

    private fun emitEvent(
      context: Context,
      eventName: String,
      active: Boolean,
      presentation: String,
    ) {
      val reactContext =
        (context.applicationContext as? ReactApplication)?.reactHost?.currentReactContext
          ?: return
      val payload = Arguments.createMap().apply {
        putBoolean("active", active)
        putString("presentation", presentation)
      }
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, payload)
    }

    fun isActive(): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
      val current = activeActivity.get()
      val dedicatedActivityIsActive = current != null &&
        current.isInPictureInPictureMode &&
        !current.isFinishing
      return dedicatedActivityIsActive
    }

    fun closeIfActive(): Boolean {
      sharedConfiguration = sharedConfiguration.copy(enabled = false)
      pendingDedicatedRestoreRequest = false
      mainHostRestoreIntentReceived = false
      var didClose = false
      activeActivity.get()?.let { current ->
        current.runOnUiThread { current.finishWithoutRestore() }
        didClose = true
      }
      return didClose
    }
  }
}
