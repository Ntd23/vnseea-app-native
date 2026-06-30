// Description: Streams Android device heading for in-app map navigation.
package com.vnseea.android.navigation

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.view.Surface
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs

class NavigationHeadingModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), SensorEventListener {
  private val sensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val rotationVectorSensor =
    sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
  private val accelerometerSensor =
    sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
  private val magneticSensor =
    sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
  private val accelerometerValues = FloatArray(3)
  private val magneticValues = FloatArray(3)
  private var hasAccelerometer = false
  private var hasMagnetic = false
  private var isListening = false
  private var lastHeading = Float.NaN
  private var lastEmitTime = 0L

  override fun getName(): String = "VnseeaNavigationHeading"

  @ReactMethod
  fun start() {
    if (isListening) return
    isListening = true
    if (rotationVectorSensor != null) {
      sensorManager.registerListener(
        this,
        rotationVectorSensor,
        SensorManager.SENSOR_DELAY_GAME,
      )
      return
    }

    accelerometerSensor?.let {
      sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
    }
    magneticSensor?.let {
      sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
    }
  }

  @ReactMethod
  fun stop() {
    if (!isListening) return
    sensorManager.unregisterListener(this)
    isListening = false
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  override fun onSensorChanged(event: SensorEvent) {
    when (event.sensor.type) {
      Sensor.TYPE_ROTATION_VECTOR -> {
        val rotationMatrix = FloatArray(9)
        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
        emitHeading(rotationMatrix)
      }
      Sensor.TYPE_ACCELEROMETER -> {
        System.arraycopy(event.values, 0, accelerometerValues, 0, 3)
        hasAccelerometer = true
        emitFallbackHeading()
      }
      Sensor.TYPE_MAGNETIC_FIELD -> {
        System.arraycopy(event.values, 0, magneticValues, 0, 3)
        hasMagnetic = true
        emitFallbackHeading()
      }
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  override fun invalidate() {
    stop()
    super.invalidate()
  }

  private fun emitFallbackHeading() {
    if (!hasAccelerometer || !hasMagnetic) return
    val rotationMatrix = FloatArray(9)
    val inclinationMatrix = FloatArray(9)
    if (
      SensorManager.getRotationMatrix(
        rotationMatrix,
        inclinationMatrix,
        accelerometerValues,
        magneticValues,
      )
    ) {
      emitHeading(rotationMatrix)
    }
  }

  private fun emitHeading(rotationMatrix: FloatArray) {
    val remappedMatrix = FloatArray(9)
    val (axisX, axisY) = displayAxes()
    SensorManager.remapCoordinateSystem(rotationMatrix, axisX, axisY, remappedMatrix)

    val orientation = FloatArray(3)
    SensorManager.getOrientation(remappedMatrix, orientation)
    val heading = ((Math.toDegrees(orientation[0].toDouble()) + 360.0) % 360.0).toFloat()
    val now = System.currentTimeMillis()
    val delta =
      if (lastHeading.isNaN()) 360f
      else abs(((heading - lastHeading + 540f) % 360f) - 180f)

    if (delta < 1.5f && now - lastEmitTime < 180L) return
    lastHeading = heading
    lastEmitTime = now

    val payload = Arguments.createMap().apply {
      putDouble("heading", heading.toDouble())
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, payload)
  }

  @Suppress("DEPRECATION")
  private fun displayAxes(): Pair<Int, Int> {
    val rotation =
      reactContext.currentActivity?.windowManager?.defaultDisplay?.rotation
        ?: Surface.ROTATION_0
    return when (rotation) {
      Surface.ROTATION_90 ->
        SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
      Surface.ROTATION_180 ->
        SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
      Surface.ROTATION_270 ->
        SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
      else ->
        SensorManager.AXIS_X to SensorManager.AXIS_Y
    }
  }

  companion object {
    const val EVENT_NAME = "vnseeaNavigationHeading"
  }
}
