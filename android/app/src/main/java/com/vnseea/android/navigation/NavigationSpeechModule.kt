// Description: Provides Android TextToSpeech for in-app map navigation prompts.
package com.vnseea.android.navigation

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
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
    private const val GOOGLE_TTS_ENGINE = "com.google.android.tts"
  }

  private enum class EngineChoice {
    GOOGLE,
    DEFAULT,
  }

  private var engine: TextToSpeech? = null
  private var isReady = false
  private var pendingText: String? = null
  private var pendingPromise: Promise? = null
  private var activeEngineChoice: EngineChoice? = null
  private var preferDefaultEngine = false
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
      ensureEngine()
      if (isReady) {
        doSpeak(cleanText, promise)
      } else {
        pendingText = cleanText
        pendingPromise = promise
      }
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
    val engineChoice = activeEngineChoice ?: EngineChoice.DEFAULT
    isReady = status == TextToSpeech.SUCCESS
    if (!isReady) {
      Log.w(TAG, "TTS engine init failed with status=$status engine=$engineChoice")
      if (engineChoice == EngineChoice.GOOGLE) {
        fallbackToDefaultEngine("Google TTS init failed")
        return
      }
      failPendingSpeech()
      shutdownCurrentEngine()
      return
    }

    Log.d(TAG, "TTS engine initialised OK engine=$engineChoice")

    configureBestLanguage()

    engine?.setSpeechRate(1.05f)
    engine?.setPitch(1.0f)

    // MIUI can mute navigation-guidance usage separately. Route prompts through
    // the media stream so Xiaomi users hear them with normal media volume.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      engine?.setAudioAttributes(speechAudioAttributes())
    }

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
      createEngine(if (preferDefaultEngine) EngineChoice.DEFAULT else EngineChoice.GOOGLE)
    }
  }

  private fun createEngine(choice: EngineChoice) {
    Log.d(TAG, "Creating TTS engine choice=$choice")
    activeEngineChoice = choice
    isReady = false
    try {
      engine = if (choice == EngineChoice.GOOGLE) {
        TextToSpeech(reactContext.applicationContext, this, GOOGLE_TTS_ENGINE)
      } else {
        TextToSpeech(reactContext.applicationContext, this)
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to create TTS engine choice=$choice", e)
      if (choice == EngineChoice.GOOGLE) {
        fallbackToDefaultEngine("Google TTS constructor failed")
        return
      }
      failPendingSpeech()
      shutdownCurrentEngine()
    }
  }

  private fun fallbackToDefaultEngine(reason: String) {
    Log.w(TAG, "$reason, falling back to Android default TTS engine")
    preferDefaultEngine = true
    shutdownCurrentEngine()
    createEngine(EngineChoice.DEFAULT)
  }

  private fun shutdownCurrentEngine() {
    engine?.stop()
    engine?.shutdown()
    engine = null
    isReady = false
    activeEngineChoice = null
  }

  private fun failPendingSpeech() {
    pendingPromise?.resolve(false)
    pendingPromise = null
    pendingText = null
  }

  private fun configureBestLanguage() {
    val tts = engine ?: return
    val candidates = listOf(
      Locale("vi", "VN"),
      Locale("vi"),
      Locale.getDefault(),
      Locale.US,
    )
    val seenLocales = mutableSetOf<String>()
    for (locale in candidates) {
      val key = "${locale.language}-${locale.country}-${locale.variant}"
      if (!seenLocales.add(key)) continue

      val availability = try {
        tts.isLanguageAvailable(locale)
      } catch (e: Exception) {
        Log.w(TAG, "TTS language check failed for $locale", e)
        TextToSpeech.LANG_NOT_SUPPORTED
      }
      if (!isLanguageUsable(availability)) {
        Log.w(TAG, "TTS locale $locale unavailable result=$availability")
        continue
      }

      val result = try {
        tts.setLanguage(locale)
      } catch (e: Exception) {
        Log.w(TAG, "TTS setLanguage failed for $locale", e)
        TextToSpeech.LANG_NOT_SUPPORTED
      }
      if (isLanguageUsable(result)) {
        Log.d(TAG, "TTS locale selected: $locale result=$result")
        return
      }
      Log.w(TAG, "TTS locale $locale rejected result=$result")
    }
    Log.w(TAG, "No preferred TTS locale available; using engine default voice")
  }

  private fun isLanguageUsable(value: Int?): Boolean {
    return value != null && value >= TextToSpeech.LANG_AVAILABLE
  }

  private fun speechAudioAttributes(): AudioAttributes {
    return AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()
  }

  private fun doSpeak(text: String, promise: Promise?) {
    requestAudioFocus()

    val utteranceId = "vnseea_nav_${System.nanoTime()}"
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      val params = Bundle().apply {
        putString(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC.toString())
        putString(TextToSpeech.Engine.KEY_PARAM_VOLUME, "1.0")
      }
      engine?.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
    } else {
      @Suppress("DEPRECATION")
      val params = hashMapOf(
        TextToSpeech.Engine.KEY_PARAM_STREAM to AudioManager.STREAM_MUSIC.toString(),
        TextToSpeech.Engine.KEY_PARAM_VOLUME to "1.0",
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
        .setAudioAttributes(speechAudioAttributes())
        .setAcceptsDelayedFocusGain(false)
        .build()
      val focusResult = am.requestAudioFocus(focusReq)
      if (focusResult != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        Log.w(TAG, "Audio focus not granted result=$focusResult")
      }
      audioFocusRequest = focusReq
    } else {
      @Suppress("DEPRECATION")
      val focusResult = am.requestAudioFocus(
        null,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
      )
      if (focusResult != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        Log.w(TAG, "Audio focus not granted result=$focusResult")
      }
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
