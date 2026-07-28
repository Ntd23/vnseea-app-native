// Description: Exposes the lightweight native crop preview view to React Native.
package com.vnseea.android.image

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class ProfileCropImageViewManager : SimpleViewManager<ProfileCropImageView>() {
  override fun getName(): String = "VnseeaProfileCropImageView"

  override fun createViewInstance(reactContext: ThemedReactContext): ProfileCropImageView =
    ProfileCropImageView(reactContext)

  @ReactProp(name = "uri")
  fun setUri(view: ProfileCropImageView, uri: String?) {
    view.setImageUri(uri)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    (super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()).apply {
      put("topLoad", mapOf("registrationName" to "onLoad"))
      put("topError", mapOf("registrationName" to "onError"))
    }

  override fun onDropViewInstance(view: ProfileCropImageView) {
    view.dispose()
    super.onDropViewInstance(view)
  }
}
