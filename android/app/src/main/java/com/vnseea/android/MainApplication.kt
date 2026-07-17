// Description: Configures the Android React Native application and native LiveKit audio mode.
package com.vnseea.android

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.livekit.reactnative.LiveKitReactNative
import com.livekit.reactnative.audio.AudioType
import com.vnseea.android.audio.WavAudioRecorderPackage
import com.vnseea.android.call.VnseeaCallIntentPackage
import com.vnseea.android.live.LiveCameraPreviewPackage
import com.vnseea.android.location.CurrentLocationPackage
import com.vnseea.android.messages.MessageNotificationIdentityPackage
import com.vnseea.android.navigation.NavigationSpeechPackage
import com.vnseea.android.push.VnseeaNotificationChannels

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages.apply {
        add(WavAudioRecorderPackage())
        add(VnseeaCallIntentPackage())
        add(LiveCameraPreviewPackage())
        add(CurrentLocationPackage())
        add(MessageNotificationIdentityPackage())
        add(NavigationSpeechPackage())
      },
    )
  }

  override fun onCreate() {
    super.onCreate()
    VnseeaNotificationChannels.ensure(this)
    LiveKitReactNative.setup(this, AudioType.CommunicationAudioType())
    loadReactNative(this)
  }
}
