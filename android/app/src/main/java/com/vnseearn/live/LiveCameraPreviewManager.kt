package com.vnseearn.live

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class LiveCameraPreviewManager : SimpleViewManager<LiveCameraPreviewView>() {
  override fun getName(): String = "VnseeaLiveCameraPreview"

  override fun createViewInstance(reactContext: ThemedReactContext): LiveCameraPreviewView {
    return LiveCameraPreviewView(reactContext)
  }

  @ReactProp(name = "cameraFacing")
  fun setCameraFacing(view: LiveCameraPreviewView, value: String?) {
    view.setCameraFacing(value)
  }

  @ReactProp(name = "enabled", defaultBoolean = true)
  fun setEnabled(view: LiveCameraPreviewView, value: Boolean) {
    view.setPreviewEnabled(value)
  }
}
