// Description: Provides one-shot Android current-location lookup for message sharing.
package com.vnseea.android.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CurrentLocationModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "VnseeaCurrentLocation"

  @ReactMethod
  fun getCurrentLocation(timeoutMs: Double, promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("permission_denied", "Location permission has not been granted.")
      return
    }

    val locationManager =
      reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val providers = enabledProviders(locationManager)
    val lastKnownLocation = bestLastKnownLocation(locationManager, providers)

    if (isFreshEnough(lastKnownLocation)) {
      promise.resolve(locationToMap(lastKnownLocation!!))
      return
    }

    if (providers.isEmpty()) {
      if (lastKnownLocation != null) {
        promise.resolve(locationToMap(lastKnownLocation))
      } else {
        promise.reject("provider_unavailable", "No enabled location provider was found.")
      }
      return
    }

    val handler = Handler(Looper.getMainLooper())
    val timeout = timeoutMs.toLong().coerceIn(3000L, 15000L)
    var resolved = false
    lateinit var listener: LocationListener
    var timeoutRunnable: Runnable? = null

    fun cleanup() {
      timeoutRunnable?.let { handler.removeCallbacks(it) }
      try {
        locationManager.removeUpdates(listener)
      } catch (_: SecurityException) {
        // Permission may be revoked while the request is active.
      } catch (_: IllegalArgumentException) {
        // Listener was not registered on every provider.
      }
    }

    listener = object : LocationListener {
      override fun onLocationChanged(location: Location) {
        if (resolved) return
        resolved = true
        cleanup()
        promise.resolve(locationToMap(location))
      }

      override fun onProviderDisabled(provider: String) = Unit
      override fun onProviderEnabled(provider: String) = Unit
      override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
    }

    timeoutRunnable = Runnable {
      if (resolved) return@Runnable
      resolved = true
      cleanup()
      if (lastKnownLocation != null) {
        promise.resolve(locationToMap(lastKnownLocation))
      } else {
        promise.reject("timeout", "Could not determine the current location in time.")
      }
    }

    try {
      providers.forEach { provider ->
        locationManager.requestLocationUpdates(
          provider,
          0L,
          0f,
          listener,
          Looper.getMainLooper(),
        )
      }
      timeoutRunnable?.let { handler.postDelayed(it, timeout) }
    } catch (error: SecurityException) {
      cleanup()
      promise.reject("permission_denied", error)
    } catch (error: IllegalArgumentException) {
      cleanup()
      promise.reject("provider_unavailable", error)
    }
  }

  private fun hasLocationPermission(): Boolean {
    val fine =
      reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    val coarse =
      reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    return fine || coarse
  }

  private fun enabledProviders(locationManager: LocationManager): List<String> {
    return listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
      .filter { provider ->
        try {
          locationManager.isProviderEnabled(provider)
        } catch (_: Exception) {
          false
        }
      }
  }

  private fun bestLastKnownLocation(
    locationManager: LocationManager,
    providers: List<String>,
  ): Location? {
    return providers
      .mapNotNull { provider ->
        try {
          locationManager.getLastKnownLocation(provider)
        } catch (_: SecurityException) {
          null
        } catch (_: IllegalArgumentException) {
          null
        }
      }
      .maxByOrNull { location -> location.time }
  }

  private fun isFreshEnough(location: Location?): Boolean {
    if (location == null) return false
    val ageMs = System.currentTimeMillis() - location.time
    val accuracy = if (location.hasAccuracy()) location.accuracy else Float.MAX_VALUE
    return ageMs in 0L..90000L && accuracy <= 200f
  }

  private fun locationToMap(location: Location) =
    Arguments.createMap().apply {
      putDouble("latitude", location.latitude)
      putDouble("longitude", location.longitude)
      if (location.hasAccuracy()) {
        putDouble("accuracy", location.accuracy.toDouble())
      }
      putString("provider", location.provider)
      putDouble("timestamp", location.time.toDouble())
    }
}
