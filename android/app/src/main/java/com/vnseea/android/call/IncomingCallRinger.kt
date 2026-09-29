package com.vnseea.android.call

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

object IncomingCallRinger {
  private const val TAG = "LiveKitCallRinger"
  private val vibrationPattern = longArrayOf(0, 700, 350, 700, 1200)
  private val audioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()

  private var activeCallId: String? = null
  private var mutedCallId: String? = null
  private var ringtone: Ringtone? = null
  private var legacyPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null

  @Synchronized
  fun start(context: Context, callId: String) {
    if (callId.isBlank() || activeCallId == callId || mutedCallId == callId) return
    stopCurrent()
    activeCallId = callId

    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (audioManager.ringerMode == AudioManager.RINGER_MODE_SILENT) return

    if (audioManager.ringerMode == AudioManager.RINGER_MODE_NORMAL) {
      try {
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          ringtone = RingtoneManager.getRingtone(context.applicationContext, uri)?.apply {
            audioAttributes = IncomingCallRinger.audioAttributes
            isLooping = true
            play()
          }
        } else {
          val player = MediaPlayer()
          try {
            player.setDataSource(context.applicationContext, uri)
            player.setAudioAttributes(IncomingCallRinger.audioAttributes)
            player.isLooping = true
            player.prepare()
            player.start()
            legacyPlayer = player
          } catch (error: Throwable) {
            player.release()
            throw error
          }
        }
      } catch (error: Throwable) {
        Log.w(TAG, "could not play system ringtone", error)
      }
    }

    val shouldVibrate = audioManager.ringerMode == AudioManager.RINGER_MODE_VIBRATE ||
      audioManager.getVibrateSetting(AudioManager.VIBRATE_TYPE_RINGER) != AudioManager.VIBRATE_SETTING_OFF
    if (!shouldVibrate) return
    try {
      val deviceVibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        (context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
      }
      if (!deviceVibrator.hasVibrator()) return
      vibrator = deviceVibrator
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        deviceVibrator.vibrate(VibrationEffect.createWaveform(vibrationPattern, 0), audioAttributes)
      } else {
        @Suppress("DEPRECATION")
        deviceVibrator.vibrate(vibrationPattern, 0)
      }
    } catch (error: Throwable) {
      Log.w(TAG, "could not vibrate for incoming call", error)
    }
  }

  @Synchronized
  fun mute(callId: String) {
    if (activeCallId != callId) return
    stopCurrent()
    mutedCallId = callId
  }

  @Synchronized
  fun stop(callId: String) {
    if (activeCallId == callId) stopCurrent()
    if (mutedCallId == callId) mutedCallId = null
  }

  private fun stopCurrent() {
    try {
      ringtone?.stop()
    } catch (error: Throwable) {
      Log.w(TAG, "could not stop system ringtone", error)
    }
    try {
      legacyPlayer?.stop()
    } catch (error: Throwable) {
      Log.w(TAG, "could not stop ringtone player", error)
    }
    try {
      legacyPlayer?.release()
    } catch (error: Throwable) {
      Log.w(TAG, "could not release ringtone player", error)
    }
    try {
      vibrator?.cancel()
    } catch (error: Throwable) {
      Log.w(TAG, "could not stop incoming call vibration", error)
    }
    ringtone = null
    legacyPlayer = null
    vibrator = null
    activeCallId = null
  }
}
