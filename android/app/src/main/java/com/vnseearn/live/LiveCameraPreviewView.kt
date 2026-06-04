package com.vnseearn.live

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.view.Surface
import android.view.TextureView
import android.widget.FrameLayout

class LiveCameraPreviewView(context: Context) : FrameLayout(context), TextureView.SurfaceTextureListener {
  private val textureView = TextureView(context)
  private var cameraFacing = CameraCharacteristics.LENS_FACING_FRONT
  private var previewEnabled = true
  private var cameraDevice: CameraDevice? = null
  private var captureSession: CameraCaptureSession? = null
  private var cameraThread: HandlerThread? = null
  private var cameraHandler: Handler? = null
  private var previewSize = Size(1280, 720)

  init {
    textureView.surfaceTextureListener = this
    addView(
      textureView,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
    )
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    startCameraThread()
    startCameraIfReady()
  }

  override fun onDetachedFromWindow() {
    closeCamera()
    stopCameraThread()
    super.onDetachedFromWindow()
  }

  fun setCameraFacing(value: String?) {
    val nextFacing =
      if (value == "back") CameraCharacteristics.LENS_FACING_BACK
      else CameraCharacteristics.LENS_FACING_FRONT

    if (cameraFacing == nextFacing) return
    cameraFacing = nextFacing
    restartCamera()
  }

  fun setPreviewEnabled(value: Boolean) {
    if (previewEnabled == value) return
    previewEnabled = value
    if (previewEnabled) {
      startCameraIfReady()
    } else {
      closeCamera()
    }
  }

  override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
    startCameraIfReady()
  }

  override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
    createPreviewSession()
  }

  override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
    closeCamera()
    return true
  }

  override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit

  private fun hasCameraPermission(): Boolean {
    return context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
  }

  private fun startCameraThread() {
    if (cameraThread != null) return
    val thread = HandlerThread("VnseeaLiveCameraPreview")
    thread.start()
    cameraThread = thread
    cameraHandler = Handler(thread.looper)
  }

  private fun stopCameraThread() {
    cameraThread?.quitSafely()
    try {
      cameraThread?.join(500)
    } catch (error: InterruptedException) {
      Thread.currentThread().interrupt()
    }
    cameraThread = null
    cameraHandler = null
  }

  @SuppressLint("MissingPermission")
  private fun startCameraIfReady() {
    if (!previewEnabled || !isAttachedToWindow || !textureView.isAvailable) return
    if (!hasCameraPermission() || cameraDevice != null) return

    try {
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = chooseCamera(manager) ?: return
      previewSize = choosePreviewSize(manager, cameraId)
      manager.openCamera(cameraId, cameraStateCallback, cameraHandler)
    } catch (error: Exception) {
      Log.e(TAG, "Unable to open live camera preview", error)
    }
  }

  private fun restartCamera() {
    closeCamera()
    startCameraIfReady()
  }

  private fun closeCamera() {
    try {
      captureSession?.close()
      captureSession = null
      cameraDevice?.close()
      cameraDevice = null
    } catch (error: Exception) {
      Log.e(TAG, "Unable to close live camera preview", error)
    }
  }

  private fun chooseCamera(manager: CameraManager): String? {
    return manager.cameraIdList.firstOrNull { cameraId ->
      val characteristics = manager.getCameraCharacteristics(cameraId)
      characteristics.get(CameraCharacteristics.LENS_FACING) == cameraFacing
    } ?: manager.cameraIdList.firstOrNull()
  }

  private fun choosePreviewSize(manager: CameraManager, cameraId: String): Size {
    val characteristics = manager.getCameraCharacteristics(cameraId)
    val sizes = characteristics
      .get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
      ?.getOutputSizes(SurfaceTexture::class.java)

    return sizes
      ?.filter { size -> size.width <= 1920 && size.height <= 1080 }
      ?.maxByOrNull { size -> size.width * size.height }
      ?: sizes?.firstOrNull()
      ?: Size(1280, 720)
  }

  private val cameraStateCallback = object : CameraDevice.StateCallback() {
    override fun onOpened(camera: CameraDevice) {
      cameraDevice = camera
      createPreviewSession()
    }

    override fun onDisconnected(camera: CameraDevice) {
      camera.close()
      if (cameraDevice == camera) {
        cameraDevice = null
      }
    }

    override fun onError(camera: CameraDevice, error: Int) {
      camera.close()
      if (cameraDevice == camera) {
        cameraDevice = null
      }
      Log.e(TAG, "Live camera preview error: $error")
    }
  }

  private fun createPreviewSession() {
    val camera = cameraDevice ?: return
    val texture = textureView.surfaceTexture ?: return

    try {
      texture.setDefaultBufferSize(previewSize.width, previewSize.height)
      val surface = Surface(texture)
      val requestBuilder = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)
      requestBuilder.addTarget(surface)
      requestBuilder.set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO)

      camera.createCaptureSession(
        listOf(surface),
        object : CameraCaptureSession.StateCallback() {
          override fun onConfigured(session: CameraCaptureSession) {
            if (cameraDevice == null) return
            captureSession = session
            try {
              session.setRepeatingRequest(requestBuilder.build(), null, cameraHandler)
            } catch (error: Exception) {
              Log.e(TAG, "Unable to start live camera repeating request", error)
            }
          }

          override fun onConfigureFailed(session: CameraCaptureSession) {
            Log.e(TAG, "Live camera preview session configure failed")
          }
        },
        cameraHandler,
      )
    } catch (error: Exception) {
      Log.e(TAG, "Unable to create live camera preview session", error)
    }
  }

  companion object {
    private const val TAG = "LiveCameraPreview"
  }
}
