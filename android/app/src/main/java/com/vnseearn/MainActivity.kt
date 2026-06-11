// Description: Hosts the main React Native Android activity and preserves native call intents.
package com.vnseearn

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "VnseeaRn"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    preferHighestRefreshRate()
  }

  override fun onResume() {
    super.onResume()
    preferHighestRefreshRate()
  }

  /**
   * Handle new intents (e.g. from the LiveKit call notification action
   * receiver). Without this override a tapped notification wouldn't
   * bring the existing task to the foreground with the new intent
   * payload, breaking deep-linking into the call screen.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  private fun preferHighestRefreshRate() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return
    }

    val activeDisplay =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          display
        } else {
          @Suppress("DEPRECATION")
          windowManager.defaultDisplay
        } ?: return

    val currentMode = activeDisplay.mode ?: return
    val bestMode =
        activeDisplay.supportedModes
            .filter {
              it.physicalWidth == currentMode.physicalWidth &&
                  it.physicalHeight == currentMode.physicalHeight
            }
            .maxByOrNull { it.refreshRate }
            ?: return

    if (bestMode.modeId == currentMode.modeId) {
      return
    }

    window.attributes =
        window.attributes.apply {
          preferredDisplayModeId = bestMode.modeId
        }
  }
}
