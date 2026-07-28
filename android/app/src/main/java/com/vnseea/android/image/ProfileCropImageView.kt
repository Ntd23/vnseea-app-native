// Description: Renders an already downsampled crop preview without going through Fresco.
package com.vnseea.android.image

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.ImageView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.util.concurrent.Executors

class ProfileCropImageView(context: Context) : ImageView(context) {
  private var activeRequest = 0
  private var displayedBitmap: Bitmap? = null

  init {
    scaleType = ScaleType.FIT_XY
    adjustViewBounds = false
  }

  fun setImageUri(uriValue: String?) {
    val request = ++activeRequest
    if (uriValue.isNullOrBlank()) {
      clearBitmap()
      return
    }

    IMAGE_EXECUTOR.execute {
      val decodeResult =
        runCatching {
            val uri = Uri.parse(uriValue)
            openInput(uri).use { input ->
              BitmapFactory.decodeStream(
                input,
                null,
                BitmapFactory.Options().apply {
                  inPreferredConfig = Bitmap.Config.ARGB_8888
                },
              )
            }
          }
      val decoded = decodeResult.getOrNull()

      post {
        if (request != activeRequest) {
          decoded?.recycle()
          return@post
        }

        val previous = displayedBitmap
        displayedBitmap = decoded
        setImageBitmap(decoded)
        if (previous !== decoded) {
          previous?.recycle()
        }

        if (decoded != null) {
          emitEvent("topLoad")
        } else {
          emitEvent(
            "topError",
            decodeResult.exceptionOrNull()?.message
              ?: "Crop preview could not be decoded.",
          )
        }
      }
    }
  }

  fun dispose() {
    activeRequest += 1
    clearBitmap()
  }

  private fun clearBitmap() {
    setImageDrawable(null)
    displayedBitmap?.recycle()
    displayedBitmap = null
  }

  private fun openInput(uri: Uri): InputStream {
    return if (uri.scheme == "file" || uri.scheme.isNullOrBlank()) {
      val path = uri.path ?: uri.toString().removePrefix("file://")
      FileInputStream(File(path))
    } else {
      context.contentResolver.openInputStream(uri)
        ?: throw IllegalArgumentException("Crop preview is not readable.")
    }
  }

  @Suppress("DEPRECATION")
  private fun emitEvent(name: String, message: String? = null) {
    val payload = Arguments.createMap().apply {
      if (!message.isNullOrBlank()) putString("message", message)
    }
    (context as? ReactContext)
      ?.getJSModule(RCTEventEmitter::class.java)
      ?.receiveEvent(id, name, payload)
  }

  companion object {
    private val IMAGE_EXECUTOR = Executors.newSingleThreadExecutor()
  }
}
