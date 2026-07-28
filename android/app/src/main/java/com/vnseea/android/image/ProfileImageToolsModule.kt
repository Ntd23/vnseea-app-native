// Description: Creates a memory-bounded local preview for profile image cropping.
package com.vnseea.android.image

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

class ProfileImageToolsModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "VnseeaProfileImageTools"

  @ReactMethod
  fun preparePreview(uriValue: String, requestedMaxDimension: Double, promise: Promise) {
    executor.execute {
      try {
        val maxDimension = requestedMaxDimension.roundToInt().coerceIn(720, 2048)
        clearImageMemory()
        cleanupOldPreviews()

        val sourceUri = Uri.parse(uriValue)
        val bitmap =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            decodeWithImageDecoder(sourceUri, maxDimension)
          } else {
            decodeWithBitmapFactory(sourceUri, maxDimension)
          }

        val outputFile =
          File(
            reactContext.cacheDir,
            "profile_image_preview_${UUID.randomUUID()}.jpg",
          )

        FileOutputStream(outputFile).use { output ->
          if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 90, output)) {
            throw IllegalStateException("Could not encode crop preview.")
          }
        }

        val result =
          Arguments.createMap().apply {
            putString("uri", Uri.fromFile(outputFile).toString())
            putDouble("width", bitmap.width.toDouble())
            putDouble("height", bitmap.height.toDouble())
            putString("fileName", outputFile.name)
            putString("type", "image/jpeg")
          }

        bitmap.recycle()
        promise.resolve(result)
      } catch (error: Throwable) {
        promise.reject("profile_preview_failed", "Could not prepare image preview.", error)
      }
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  private fun clearImageMemory() {
    runCatching { Fresco.getImagePipeline().clearMemoryCaches() }
    System.gc()
  }

  private fun decodeWithImageDecoder(uri: Uri, maxDimension: Int): Bitmap {
    val source =
      if (uri.scheme == "file" || uri.scheme.isNullOrBlank()) {
        ImageDecoder.createSource(resolveFile(uri))
      } else {
        ImageDecoder.createSource(reactContext.contentResolver, uri)
      }

    return ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
      decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
      decoder.memorySizePolicy = ImageDecoder.MEMORY_POLICY_LOW_RAM

      val sourceWidth = info.size.width
      val sourceHeight = info.size.height
      val largestSide = max(sourceWidth, sourceHeight)
      if (largestSide > maxDimension) {
        val ratio = maxDimension.toFloat() / largestSide.toFloat()
        decoder.setTargetSize(
          (sourceWidth * ratio).roundToInt().coerceAtLeast(1),
          (sourceHeight * ratio).roundToInt().coerceAtLeast(1),
        )
      }
    }
  }

  private fun decodeWithBitmapFactory(uri: Uri, maxDimension: Int): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    openInput(uri).use { input -> BitmapFactory.decodeStream(input, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw IllegalArgumentException("Selected image has invalid dimensions.")
    }

    val sampleSize =
      ceil(max(bounds.outWidth, bounds.outHeight).toDouble() / maxDimension.toDouble())
        .roundToInt()
        .coerceAtLeast(1)
    val options =
      BitmapFactory.Options().apply {
        inSampleSize = sampleSize
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
    val decoded =
      openInput(uri).use { input -> BitmapFactory.decodeStream(input, null, options) }
        ?: throw IllegalArgumentException("Selected image could not be decoded.")

    val oriented = applyExifOrientation(decoded, readExifOrientation(uri))
    val largestSide = max(oriented.width, oriented.height)
    if (largestSide <= maxDimension) {
      return oriented
    }

    val ratio = maxDimension.toFloat() / largestSide.toFloat()
    val scaled =
      Bitmap.createScaledBitmap(
        oriented,
        (oriented.width * ratio).roundToInt().coerceAtLeast(1),
        (oriented.height * ratio).roundToInt().coerceAtLeast(1),
        true,
      )
    if (scaled !== oriented) {
      oriented.recycle()
    }
    return scaled
  }

  private fun readExifOrientation(uri: Uri): Int =
    runCatching {
        openInput(uri).use { input ->
          ExifInterface(input).getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL,
          )
        }
      }
      .getOrDefault(ExifInterface.ORIENTATION_NORMAL)

  private fun applyExifOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.setScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.setRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.setRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
      else -> return bitmap
    }

    val oriented =
      Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (oriented !== bitmap) {
      bitmap.recycle()
    }
    return oriented
  }

  private fun openInput(uri: Uri): InputStream {
    return if (uri.scheme == "file" || uri.scheme.isNullOrBlank()) {
      FileInputStream(resolveFile(uri))
    } else {
      reactContext.contentResolver.openInputStream(uri)
        ?: throw IllegalArgumentException("Selected image is not readable.")
    }
  }

  private fun resolveFile(uri: Uri): File {
    val path = uri.path ?: uri.toString().removePrefix("file://")
    return File(path)
  }

  private fun cleanupOldPreviews() {
    val expiry = System.currentTimeMillis() - PREVIEW_MAX_AGE_MS
    reactContext.cacheDir
      .listFiles { file -> file.name.startsWith("profile_image_preview_") }
      ?.filter { file -> file.lastModified() < expiry }
      ?.forEach { file -> runCatching { file.delete() } }
  }

  companion object {
    private const val PREVIEW_MAX_AGE_MS = 24L * 60L * 60L * 1000L
  }
}
