// Description: Provides Android TextToSpeech for in-app map navigation prompts.
package com.vnseea.android.navigation

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.Locale

class NavigationSpeechModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

  companion object {
    private const val TAG = "VnseeaNavSpeech"
  }

  private var engine: TextToSpeech? = null
  private var isReady = false
  private var pendingText: String? = null
  private var pendingPromise: Promise? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var audioManager: AudioManager? =
    reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
  private var audioFocusRequest: AudioFocusRequest? = null

  override fun getName(): String = "VnseeaNavigationSpeech"

  @ReactMethod
  fun speak(text: String, promise: Promise) {
    val cleanText = text.trim()
    if (cleanText.isEmpty()) {
      promise.resolve(false)
      return
    }

    mainHandler.post {
      pendingText = cleanText
      pendingPromise = promise
      ensureEngine()
      if (isReady) {
        doSpeak(cleanText, promise)
      }
      // else: onInit will pick up pendingText/pendingPromise
    }
  }

  @ReactMethod
  fun stop() {
    mainHandler.post {
      pendingText = null
      pendingPromise = null
      engine?.stop()
      abandonAudioFocus()
    }
  }

  override fun onInit(status: Int) {
    isReady = status == TextToSpeech.SUCCESS
    if (!isReady) {
      Log.w(TAG, "TTS engine init failed with status=$status")
      pendingPromise?.resolve(false)
      pendingPromise = null
      pendingText = null
      return
    }

    Log.d(TAG, "TTS engine initialised OK")

    // Try Vietnamese, fall back to device default
    val vietnamese = Locale("vi", "VN")
    val langResult = engine?.setLanguage(vietnamese)
    if (langResult == TextToSpeech.LANG_MISSING_DATA ||
        langResult == TextToSpeech.LANG_NOT_SUPPORTED
    ) {
      Log.w(TAG, "vi-VN not available (result=$langResult), using device default")
      engine?.language = Locale.getDefault()
    }

    engine?.setSpeechRate(1.05f)
    engine?.setPitch(1.0f)

    // Set audio attributes for navigation guidance
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      engine?.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build(),
      )
    }

    // Add utterance progress listener for debugging
    engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String?) {
        Log.d(TAG, "TTS utterance started: $utteranceId")
      }
      override fun onDone(utteranceId: String?) {
        Log.d(TAG, "TTS utterance done: $utteranceId")
        abandonAudioFocus()
      }
      @Deprecated("Deprecated in Java")
      override fun onError(utteranceId: String?) {
        Log.w(TAG, "TTS utterance error: $utteranceId")
        abandonAudioFocus()
      }
      override fun onError(utteranceId: String?, errorCode: Int) {
        Log.w(TAG, "TTS utterance error: $utteranceId code=$errorCode")
        abandonAudioFocus()
      }
    })

    // Speak any pending text
    val text = pendingText
    val promise = pendingPromise
    pendingText = null
    pendingPromise = null
    if (text != null) {
      doSpeak(text, promise)
    }
  }

  override fun initialize() {
    super.initialize()
    mainHandler.post {
      ensureEngine()
    }
  }

  override fun invalidate() {
    mainHandler.post {
      engine?.stop()
      engine?.shutdown()
      engine = null
      isReady = false
      abandonAudioFocus()
    }
    super.invalidate()
  }

  private fun ensureEngine() {
    if (engine == null) {
      Log.d(TAG, "Creating TTS engine...")
      try {
        // Try Google TTS first for high-quality Vietnamese voice
        engine = TextToSpeech(reactContext.applicationContext, this, "com.google.android.tts")
      } catch (e: Exception) {
        Log.w(TAG, "Failed to initialize with Google TTS, falling back to default engine", e)
        engine = TextToSpeech(reactContext.applicationContext, this)
      }
    }
  }

  private fun doSpeak(text: String, promise: Promise?) {
    requestAudioFocus()

    val utteranceId = "vnseea_nav_${System.nanoTime()}"
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    } else {
      @Suppress("DEPRECATION")
      val params = hashMapOf(
        TextToSpeech.Engine.KEY_PARAM_STREAM to AudioManager.STREAM_MUSIC.toString(),
        TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID to utteranceId,
      )
      @Suppress("DEPRECATION")
      engine?.speak(text, TextToSpeech.QUEUE_FLUSH, params)
    }

    val success = result == TextToSpeech.SUCCESS
    if (!success) {
      Log.w(TAG, "TTS speak() returned error result=$result for text=\"$text\"")
      abandonAudioFocus()
    } else {
      Log.d(TAG, "TTS speak() queued OK: \"$text\"")
    }
    promise?.resolve(success)
  }

  private fun requestAudioFocus() {
    val am = audioManager ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val focusReq = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setAcceptsDelayedFocusGain(false)
        .build()
      am.requestAudioFocus(focusReq)
      audioFocusRequest = focusReq
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(
        null,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
      )
    }
  }

  private fun abandonAudioFocus() {
    val am = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
      audioFocusRequest = null
    } else {
      @Suppress("DEPRECATION")
      am.abandonAudioFocus(null)
    }
  }
}
