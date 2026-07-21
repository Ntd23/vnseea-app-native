package com.vnseea.android.live

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Log
import android.util.Size
import android.view.Surface
import android.view.TextureView
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import kotlin.math.max

class LiveCameraPreviewView(context: Context) : FrameLayout(context), TextureView.SurfaceTextureListener {
  private val textureView = TextureView(context)
  private var cameraFacing = CameraCharacteristics.LENS_FACING_FRONT
  private var previewEnabled = true
  private var cameraDevice: CameraDevice? = null
  private var captureSession: CameraCaptureSession? = null
  private var cameraThread: HandlerThread? = null
  private var cameraHandler: Handler? = null
  private var previewSize = Size(1280, 720)
  private var lastPreviewStatus: String? = null

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
      emitPreviewStatus("checking")
      startCameraIfReady()
    } else {
      closeCamera()
    }
  }

  override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
    applyPreviewTransform()
    startCameraIfReady()
  }

  override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
    applyPreviewTransform()
    createPreviewSession()
  }

  override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
    closeCamera()
    return true
  }

  override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {
    if (captureSession != null && previewEnabled) {
      emitPreviewStatus("ready")
    }
  }

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
    if (!hasCameraPermission()) {
      emitPreviewStatus("error", "Camera permission is missing")
      return
    }
    if (cameraDevice != null) return

    try {
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = chooseCamera(manager)
      if (cameraId == null) {
        emitPreviewStatus("error", "No camera is available")
        return
      }
      previewSize = choosePreviewSize(manager, cameraId)
      applyPreviewTransform()
      manager.openCamera(cameraId, cameraStateCallback, cameraHandler)
    } catch (error: Exception) {
      Log.e(TAG, "Unable to open live camera preview", error)
      emitPreviewStatus("error", error.message ?: "Unable to open camera")
    }
  }

  private fun restartCamera() {
    closeCamera(emitStopped = false)
    startCameraIfReady()
  }

  private fun closeCamera(emitStopped: Boolean = true) {
    try {
      captureSession?.close()
      captureSession = null
      cameraDevice?.close()
      cameraDevice = null
    } catch (error: Exception) {
      Log.e(TAG, "Unable to close live camera preview", error)
    } finally {
      if (emitStopped) emitPreviewStatus("stopped")
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
      emitPreviewStatus("error", "Camera disconnected")
    }

    override fun onError(camera: CameraDevice, error: Int) {
      camera.close()
      if (cameraDevice == camera) {
        cameraDevice = null
      }
      Log.e(TAG, "Live camera preview error: $error")
      emitPreviewStatus("error", "Camera error: $error")
    }
  }

  private fun createPreviewSession() {
    val camera = cameraDevice ?: return
    val texture = textureView.surfaceTexture ?: return

    try {
      texture.setDefaultBufferSize(previewSize.width, previewSize.height)
      applyPreviewTransform()
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
              emitPreviewStatus("error", error.message ?: "Unable to start camera preview")
            }
          }

          override fun onConfigureFailed(session: CameraCaptureSession) {
            Log.e(TAG, "Live camera preview session configure failed")
            emitPreviewStatus("error", "Camera preview configuration failed")
          }
        },
        cameraHandler,
      )
    } catch (error: Exception) {
      Log.e(TAG, "Unable to create live camera preview session", error)
      emitPreviewStatus("error", error.message ?: "Unable to create camera preview")
    }
  }

  private fun applyPreviewTransform() {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      textureView.post { applyPreviewTransform() }
      return
    }

    val viewWidth = textureView.width.toFloat()
    val viewHeight = textureView.height.toFloat()
    if (viewWidth <= 0f || viewHeight <= 0f) return

    // Camera buffers are landscape. Rotate the dimensions for the portrait view,
    // then scale uniformly until the whole TextureView is covered.
    val portraitView = viewHeight >= viewWidth
    val bufferWidth =
      if (portraitView) previewSize.height.toFloat() else previewSize.width.toFloat()
    val bufferHeight =
      if (portraitView) previewSize.width.toFloat() else previewSize.height.toFloat()
    if (bufferWidth <= 0f || bufferHeight <= 0f) return

    val coverScale = max(viewWidth / bufferWidth, viewHeight / bufferHeight)
    val matrix = Matrix()
    matrix.setScale(
      (bufferWidth * coverScale) / viewWidth,
      (bufferHeight * coverScale) / viewHeight,
      viewWidth / 2f,
      viewHeight / 2f,
    )
    textureView.setTransform(matrix)
  }

  @Suppress("DEPRECATION")
  private fun emitPreviewStatus(status: String, message: String = "") {
    if (lastPreviewStatus == status && status != "error") return
    lastPreviewStatus = status
    post {
      val payload = Arguments.createMap().apply {
        putString("status", status)
        if (message.isNotEmpty()) putString("message", message)
      }
      (context as? ReactContext)
        ?.getJSModule(RCTEventEmitter::class.java)
        ?.receiveEvent(id, "topPreviewStatusChange", payload)
    }
  }

  companion object {
    private const val TAG = "LiveCameraPreview"
  }
}
