// Description: Forces and verifies the Android communication audio output for calls.
package com.vnseea.android.audio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicLong

/**
 * LiveKit's AudioSwitch selection is asynchronous.  A few Android OEMs (notably
 * Xiaomi/MIUI) can leave the communication stream on the loudspeaker after that
 * selection.  This small bridge applies the requested built-in route directly
 * through AudioManager and returns the route that Android reports afterwards.
 */
class CallAudioRouteModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val audioManager =
    reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val mainHandler = Handler(Looper.getMainLooper())
  private val routeGeneration = AtomicLong(0)

  override fun getName() = "VnseeaCallAudioRoute"

  @ReactMethod
  fun setOutput(output: String, promise: Promise) {
    if (
      output != OUTPUT_EARPIECE &&
      output != OUTPUT_SPEAKER &&
      output != OUTPUT_BLUETOOTH
    ) {
      promise.reject("E_INVALID_AUDIO_OUTPUT", "Unsupported call audio output: $output")
      return
    }

    val requestGeneration = routeGeneration.incrementAndGet()
    setCallRouteActive(true)

    mainHandler.post {
      try {
        if (requestGeneration != routeGeneration.get()) {
          promise.resolve(OUTPUT_SUPERSEDED)
          return@post
        }
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        if (output != OUTPUT_BLUETOOTH) {
          clearExternalRoutes()
        }
        val selectedWithCommunicationDevice = selectCommunicationDevice(output)

        // Android 11 and below do not expose setCommunicationDevice.  The
        // legacy speakerphone flag is still the supported earpiece/speaker
        // switch for those versions.
        if (!selectedWithCommunicationDevice) {
          @Suppress("DEPRECATION")
          if (output == OUTPUT_BLUETOOTH) {
            audioManager.isSpeakerphoneOn = false
            audioManager.startBluetoothSco()
            audioManager.isBluetoothScoOn = true
          } else {
            audioManager.isSpeakerphoneOn = output == OUTPUT_SPEAKER
          }
        }

        // Bluetooth SCO/BLE activation is asynchronous on several OEMs. Do
        // not report a false earpiece result while Android is still switching
        // the communication device.
        waitForOutput(output, promise, requestGeneration)
      } catch (error: Throwable) {
        promise.reject("E_AUDIO_OUTPUT", error.message, error)
      }
    }
  }

  @ReactMethod
  fun cancelPending(promise: Promise) {
    routeGeneration.incrementAndGet()
    promise.resolve(null)
  }

  @ReactMethod
  fun getOutput(promise: Promise) {
    mainHandler.post {
      try {
        promise.resolve(currentOutput())
      } catch (error: Throwable) {
        promise.reject("E_AUDIO_OUTPUT_STATE", error.message, error)
      }
    }
  }

  @ReactMethod
  fun getAvailableOutputs(promise: Promise) {
    mainHandler.post {
      try {
        val outputs = Arguments.createArray()
        val deviceTypes = availableOutputDeviceTypes()

        if (deviceTypes.contains(AudioDeviceInfo.TYPE_BUILTIN_EARPIECE)) {
          outputs.pushString(OUTPUT_EARPIECE)
        }
        if (deviceTypes.contains(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)) {
          outputs.pushString(OUTPUT_SPEAKER)
        }
        if (deviceTypes.any(::isBluetoothCommunicationDevice)) {
          outputs.pushString(OUTPUT_BLUETOOTH)
        }
        if (
          deviceTypes.contains(AudioDeviceInfo.TYPE_WIRED_HEADSET) ||
          deviceTypes.contains(AudioDeviceInfo.TYPE_WIRED_HEADPHONES)
        ) {
          outputs.pushString(OUTPUT_HEADSET)
        }

        promise.resolve(outputs)
      } catch (error: Throwable) {
        promise.reject("E_AUDIO_OUTPUTS", error.message, error)
      }
    }
  }

  @ReactMethod
  fun reset(promise: Promise) {
    routeGeneration.incrementAndGet()
    setCallRouteActive(false)
    mainHandler.post {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          audioManager.clearCommunicationDevice()
        }
        clearExternalRoutes()
        @Suppress("DEPRECATION")
        audioManager.isSpeakerphoneOn = false
        promise.resolve(null)
      } catch (error: Throwable) {
        promise.reject("E_AUDIO_OUTPUT_RESET", error.message, error)
      }
    }
  }

  override fun invalidate() {
    routeGeneration.incrementAndGet()
    setCallRouteActive(false)
    super.invalidate()
  }

  private fun selectCommunicationDevice(output: String): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false

    val targetTypes = when (output) {
      OUTPUT_SPEAKER -> setOf(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)
      OUTPUT_BLUETOOTH -> bluetoothCommunicationDeviceTypes()
      else -> setOf(AudioDeviceInfo.TYPE_BUILTIN_EARPIECE)
    }
    val device = audioManager.availableCommunicationDevices.firstOrNull {
      targetTypes.contains(it.type)
    } ?: return false

    audioManager.clearCommunicationDevice()
    return audioManager.setCommunicationDevice(device)
  }

  private fun currentOutput(): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return when (audioManager.communicationDevice?.type) {
        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> OUTPUT_SPEAKER
        AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> OUTPUT_EARPIECE
        AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
        AudioDeviceInfo.TYPE_BLE_HEADSET,
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> OUTPUT_BLUETOOTH
        AudioDeviceInfo.TYPE_WIRED_HEADSET,
        AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> OUTPUT_HEADSET
        else -> OUTPUT_UNKNOWN
      }
    }

    @Suppress("DEPRECATION")
    return when {
      audioManager.isBluetoothScoOn -> OUTPUT_BLUETOOTH
      audioManager.isSpeakerphoneOn -> OUTPUT_SPEAKER
      else -> OUTPUT_EARPIECE
    }
  }

  private fun waitForOutput(
    expectedOutput: String,
    promise: Promise,
    requestGeneration: Long,
    attempt: Int = 0,
  ) {
    if (requestGeneration != routeGeneration.get()) {
      promise.resolve(OUTPUT_SUPERSEDED)
      return
    }

    val current = currentOutput()
    if (current == expectedOutput) {
      promise.resolve(current)
      return
    }

    if (attempt >= OUTPUT_VERIFY_ATTEMPTS) {
      promise.reject(
        "E_AUDIO_OUTPUT_NOT_APPLIED",
        "Android reported $current after requesting $expectedOutput.",
      )
      return
    }

    mainHandler.postDelayed(
      { waitForOutput(expectedOutput, promise, requestGeneration, attempt + 1) },
      OUTPUT_VERIFY_INTERVAL_MS,
    )
  }

  private fun availableOutputDeviceTypes(): Set<Int> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return audioManager.availableCommunicationDevices.map { it.type }.toSet()
    }
    return audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      .map { it.type }
      .toSet()
  }

  private fun isBluetoothCommunicationDevice(type: Int): Boolean {
    return bluetoothCommunicationDeviceTypes().contains(type)
  }

  private fun bluetoothCommunicationDeviceTypes(): Set<Int> {
    val types = mutableSetOf(AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      types.add(AudioDeviceInfo.TYPE_BLE_HEADSET)
      types.add(AudioDeviceInfo.TYPE_BLE_SPEAKER)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      types.add(AudioDeviceInfo.TYPE_HEARING_AID)
    }
    return types
  }

  @Suppress("DEPRECATION")
  private fun clearExternalRoutes() {
    // The explicit earpiece/speaker buttons must win over a stale Bluetooth
    // SCO route.  This is especially important on MIUI, where SCO can be
    // re-enabled by AudioSwitch after its asynchronous device selection.
    try {
      audioManager.stopBluetoothSco()
    } catch (_: Throwable) {
      // Best effort; some OEMs throw while no SCO session exists.
    }
    try {
      audioManager.isBluetoothScoOn = false
    } catch (_: Throwable) {
      // Best effort for older/OEM audio managers.
    }
  }

  private fun setCallRouteActive(active: Boolean) {
    if (active) {
      System.setProperty(CALL_ROUTE_ACTIVE_PROPERTY, "true")
    } else {
      System.clearProperty(CALL_ROUTE_ACTIVE_PROPERTY)
    }
  }

  private companion object {
    const val CALL_ROUTE_ACTIVE_PROPERTY = "vnseea.call.audio.route.active"
    const val OUTPUT_EARPIECE = "earpiece"
    const val OUTPUT_SPEAKER = "speaker"
    const val OUTPUT_BLUETOOTH = "bluetooth"
    const val OUTPUT_HEADSET = "headset"
    const val OUTPUT_UNKNOWN = "unknown"
    const val OUTPUT_SUPERSEDED = "superseded"
    const val OUTPUT_VERIFY_INTERVAL_MS = 100L
    const val OUTPUT_VERIFY_ATTEMPTS = 25
  }
}
