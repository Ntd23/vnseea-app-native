// Description: Exposes pending Android native call intents to React Native.
package com.vnseea.android.call

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

class VnseeaCallIntentModule(
  private val appContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(appContext) {
  private val toneHandler = Handler(Looper.getMainLooper())
  private var progressTonePlayer: AudioTrack? = null
  private var activeToneCallId = ""
  private var activeToneMode = ""

  override fun getName() = "VnseeaCallIntent"

  @ReactMethod
  fun startProgressTone(mode: String?, callId: String?, promise: Promise) {
    val nextCallId = callId.orEmpty()
    val nextMode = mode.orEmpty().ifBlank { "connecting" }
    if (nextCallId.isBlank()) {
      promise.resolve(false)
      return
    }
    toneHandler.post {
      if (
        activeToneCallId == nextCallId &&
        activeToneMode == nextMode &&
        progressTonePlayer?.playState == AudioTrack.PLAYSTATE_PLAYING
      ) {
        promise.resolve(true)
        return@post
      }
      stopProgressToneInternal()
      try {
        val samples = buildProgressToneSamples(nextMode)
        val bufferSize = maxOf(
          samples.size * Short.SIZE_BYTES,
          AudioTrack.getMinBufferSize(
            TONE_SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
          ),
        )
        val player = AudioTrack.Builder()
          .setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
          .setAudioFormat(
            AudioFormat.Builder()
              .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
              .setSampleRate(TONE_SAMPLE_RATE)
              .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
              .build(),
          )
          .setBufferSizeInBytes(bufferSize)
          .setTransferMode(AudioTrack.MODE_STATIC)
          .build()
        val writtenSamples = player.write(samples, 0, samples.size)
        check(writtenSamples == samples.size) {
          "Unable to load caller progress tone samples."
        }
        check(player.setLoopPoints(0, samples.size, -1) == AudioTrack.SUCCESS) {
          "Unable to loop caller progress tone."
        }
        player.setVolume(0.7f)
        player.play()
        progressTonePlayer = player
        activeToneCallId = nextCallId
        activeToneMode = nextMode
        promise.resolve(true)
      } catch (error: Throwable) {
        stopProgressToneInternal()
        promise.reject("E_CALL_PROGRESS_TONE", error)
      }
    }
  }

  @ReactMethod
  fun stopProgressTone(callId: String?, promise: Promise) {
    toneHandler.post {
      if (callId.isNullOrBlank() || callId == activeToneCallId) {
        stopProgressToneInternal()
      }
      promise.resolve(true)
    }
  }

  private fun stopProgressToneInternal() {
    progressTonePlayer?.let { player ->
      runCatching { player.stop() }
      player.release()
    }
    progressTonePlayer = null
    activeToneCallId = ""
    activeToneMode = ""
  }

  private fun buildProgressToneSamples(mode: String): ShortArray {
    val durationSeconds: Double
    val frequency: Double
    val audibleWindows: List<Pair<Double, Double>>
    when (mode) {
      "ringing" -> {
        durationSeconds = 2.2
        frequency = 440.0
        audibleWindows = listOf(0.0 to 0.34, 0.52 to 0.86)
      }
      "busy" -> {
        durationSeconds = 0.55
        frequency = 425.0
        audibleWindows = listOf(0.0 to 0.24)
      }
      else -> {
        durationSeconds = 3.0
        frequency = 425.0
        audibleWindows = listOf(0.0 to 0.22)
      }
    }

    return ShortArray((durationSeconds * TONE_SAMPLE_RATE).roundToInt()) { frame ->
      val time = frame.toDouble() / TONE_SAMPLE_RATE
      val window = audibleWindows.firstOrNull { time >= it.first && time < it.second }
        ?: return@ShortArray 0
      val localTime = time - window.first
      val edge = min(
        1.0,
        min(localTime / TONE_FADE_SECONDS, (window.second - time) / TONE_FADE_SECONDS),
      ).coerceAtLeast(0.0)
      (sin(2.0 * PI * frequency * time) * TONE_AMPLITUDE * edge * Short.MAX_VALUE)
        .roundToInt()
        .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
        .toShort()
    }
  }

  override fun invalidate() {
    stopProgressToneInternal()
    super.invalidate()
  }

  companion object {
    private const val TONE_SAMPLE_RATE = 44_100
    private const val TONE_FADE_SECONDS = 0.012
    private const val TONE_AMPLITUDE = 0.22
  }

  @ReactMethod
  fun getInitialCallAction(promise: Promise) {
    resolveInitialAction("answer", promise)
  }

  @ReactMethod
  fun getInitialMessageAction(promise: Promise) {
    resolveInitialAction("message", promise)
  }

  private fun resolveInitialAction(expectedAction: String, promise: Promise) {
    val intent = appContext.currentActivity?.intent
    val extras = intent?.extras
    if (extras == null || extras.getString(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION) != expectedAction) {
      promise.resolve(null)
      return
    }
    val callId = extras.getString(LiveKitCallNativeActions.EXTRA_CALL_ID).orEmpty()
    if (expectedAction == "answer" || expectedAction == "message") {
      LiveKitCallNativeActions.dismissIncomingCall(appContext, callId)
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
      LiveKitCallNativeActions.EXTRA_CLIENT_ENDPOINT_ID,
      LiveKitCallNativeActions.EXTRA_API_URL,
      LiveKitCallNativeActions.EXTRA_RING_MODE,
      LiveKitCallNativeActions.EXTRA_CALL_CONTEXT,
    )) {
      map.putString(key, extras.getString(key).orEmpty())
    }
    map.putString(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION, expectedAction)
    intent.removeExtra(LiveKitCallNativeActions.EXTRA_NATIVE_ACTION)
    promise.resolve(map)
  }

  @ReactMethod
  fun dismissIncomingCall(callId: String?, promise: Promise) {
    try {
      LiveKitCallNativeActions.dismissIncomingCall(appContext, callId)
      promise.resolve(!callId.isNullOrBlank())
    } catch (error: Exception) {
      promise.reject("E_DISMISS_INCOMING_CALL", error)
    }
  }

  @ReactMethod
  fun startCallForegroundService(
    callId: String?,
    callType: String?,
    title: String?,
    promise: Promise,
  ) {
    try {
      promise.resolve(
        LiveKitCallForegroundService.start(
          appContext,
          callId.orEmpty(),
          callType.orEmpty(),
          title.orEmpty(),
        ),
      )
    } catch (error: Exception) {
      promise.reject("E_START_CALL_FOREGROUND_SERVICE", error)
    }
  }

  @ReactMethod
  fun stopCallForegroundService(promise: Promise) {
    try {
      LiveKitCallForegroundService.stop(appContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_STOP_CALL_FOREGROUND_SERVICE", error)
    }
  }

  @ReactMethod
  fun setVideoCallPictureInPictureEnabled(
    enabled: Boolean,
    aspectWidth: Int,
    aspectHeight: Int,
    promise: Promise,
  ) {
    appContext.runOnUiQueueThread {
      try {
        promise.resolve(
          CallPictureInPictureActivity.setEnabled(
            enabled = enabled,
            aspectWidth = aspectWidth,
            aspectHeight = aspectHeight,
          ),
        )
      } catch (error: Throwable) {
        promise.reject("E_SET_CALL_PIP", error)
      }
    }
  }

  @ReactMethod
  fun configureVideoCallPictureInPicture(
    enabled: Boolean,
    localCameraEnabled: Boolean,
    localMirror: Boolean,
    localStreamUrl: String?,
    remoteStreamUrl: String?,
    aspectWidth: Int,
    aspectHeight: Int,
    promise: Promise,
  ) {
    appContext.runOnUiQueueThread {
      try {
        promise.resolve(
          CallPictureInPictureActivity.configure(
            enabled = enabled,
            localCameraEnabled = localCameraEnabled,
            localMirror = localMirror,
            localStreamUrl = localStreamUrl.orEmpty(),
            remoteStreamUrl = remoteStreamUrl.orEmpty(),
            aspectWidth = aspectWidth,
            aspectHeight = aspectHeight,
          ),
        )
      } catch (error: Throwable) {
        promise.reject("E_CONFIGURE_CALL_PIP", error)
      }
    }
  }

  @ReactMethod
  fun enterVideoCallPictureInPicture(promise: Promise) {
    appContext.runOnUiQueueThread {
      try {
        val context = appContext.currentActivity ?: appContext
        promise.resolve(CallPictureInPictureActivity.openForCurrentCall(context))
      } catch (error: Throwable) {
        promise.reject("E_ENTER_CALL_PIP", error)
      }
    }
  }

  @ReactMethod
  fun isInPictureInPictureMode(promise: Promise) {
    promise.resolve(CallPictureInPictureActivity.isActive())
  }

  @ReactMethod
  fun closeCallPictureInPictureIfActive(promise: Promise) {
    appContext.runOnUiQueueThread {
      try {
        promise.resolve(CallPictureInPictureActivity.closeIfActive())
      } catch (error: Throwable) {
        promise.reject("E_CLOSE_CALL_PIP", error)
      }
    }
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  @ReactMethod
  fun showIncomingCall(callData: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    try {
      val callId = try {
        if (callData.hasKey(LiveKitCallNativeActions.EXTRA_CALL_ID)) {
          callData.getString(LiveKitCallNativeActions.EXTRA_CALL_ID).orEmpty()
        } else {
          ""
        }
      } catch (_: Throwable) {
        ""
      }
      if (LiveKitCallNativeActions.isIncomingCallHandledRecently(appContext, callId)) {
        promise.resolve(false)
        return
      }

      val notificationData = JSONObject()
      val intent = Intent(appContext, IncomingCallActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
        val iterator = callData.keySetIterator()
        while (iterator.hasNextKey()) {
          val key = iterator.nextKey()
          try {
            val value = callData.getString(key).orEmpty()
            putExtra(key, value)
            notificationData.put(key, value)
          } catch (_: Throwable) {
          }
        }
      }
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        LiveKitCallNotifier.show(appContext, notificationData)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_SHOW_INCOMING_CALL", error)
    }
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
