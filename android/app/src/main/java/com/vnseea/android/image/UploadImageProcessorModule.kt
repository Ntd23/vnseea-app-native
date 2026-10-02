// Description: Downscales picked images before upload with bounded memory and upright EXIF orientation.
package com.vnseea.android.image

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

class UploadImageProcessorModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val executor = Executors.newFixedThreadPool(2)
  private val didCleanOutputs = AtomicBoolean(false)

  override fun getName(): String = "VnseeaUploadImageProcessor"

  @ReactMethod
  fun prepare(uriValue: String, options: ReadableMap, promise: Promise) {
    executor.execute {
      try {
        promise.resolve(prepareImage(uriValue, options))
      } catch (error: Throwable) {
        promise.reject("upload_image_prepare_failed", "Could not prepare the image for upload.", error)
      }
    }
  }

  override fun invalidate() {
    executor.shutdownNow()
    super.invalidate()
  }

  private fun prepareImage(uriValue: String, options: ReadableMap) =
    Arguments.createMap().apply {
      val maxDimension = readInt(options, "maxDimension", 2048).coerceAtLeast(320)
      val quality =
        (readDouble(options, "quality", 0.8) * 100).roundToInt().coerceIn(10, 100)
      val passthroughMaxBytes = readDouble(options, "passthroughMaxBytes", 0.0).toLong()

      val sourceUri = Uri.parse(uriValue)
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      openInput(sourceUri).use { input -> BitmapFactory.decodeStream(input, null, bounds) }
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        throw IllegalArgumentException("Selected image has invalid dimensions.")
      }

      val orientation = readExifOrientation(sourceUri)
      val swapsAxes = swapsAxes(orientation)
      val orientedWidth = if (swapsAxes) bounds.outHeight else bounds.outWidth
      val orientedHeight = if (swapsAxes) bounds.outWidth else bounds.outHeight
      val mimeType = bounds.outMimeType?.lowercase() ?: "image/jpeg"
      val isJpeg = mimeType == "image/jpeg"
      val isPng = mimeType == "image/png"
      val fileSize = readFileSize(sourceUri)

      // Small JPEG/PNG files are already cheap to upload; re-encoding them
      // would only cost time and quality.
      if (
        max(orientedWidth, orientedHeight) <= maxDimension &&
          (isJpeg || isPng) &&
          fileSize in 1..passthroughMaxBytes
      ) {
        putString("uri", uriValue)
        putDouble("width", orientedWidth.toDouble())
        putDouble("height", orientedHeight.toDouble())
        putString("fileName", sourceUri.lastPathSegment ?: "image.jpg")
        putString("type", mimeType)
        putDouble("fileSize", fileSize.toDouble())
        putBoolean("transformed", false)
        return@apply
      }

      val bitmap =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          decodeWithImageDecoder(sourceUri, maxDimension)
        } else {
          decodeWithBitmapFactory(sourceUri, maxDimension, orientation)
        }

      try {
        val keepsTransparency = isPng && bitmap.hasAlpha()
        val extension = if (keepsTransparency) "png" else "jpg"
        val outputFile = createOutputFile(extension)
        FileOutputStream(outputFile).use { output ->
          val format =
            if (keepsTransparency) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
          if (!bitmap.compress(format, quality, output)) {
            throw IllegalStateException("Could not encode the upload image.")
          }
        }

        putString("uri", Uri.fromFile(outputFile).toString())
        putDouble("width", bitmap.width.toDouble())
        putDouble("height", bitmap.height.toDouble())
        putString("fileName", outputFile.name)
        putString("type", if (keepsTransparency) "image/png" else "image/jpeg")
        putDouble("fileSize", outputFile.length().toDouble())
        putBoolean("transformed", true)
      } finally {
        bitmap.recycle()
      }
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

  private fun decodeWithBitmapFactory(uri: Uri, maxDimension: Int, orientation: Int): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    openInput(uri).use { input -> BitmapFactory.decodeStream(input, null, bounds) }

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

    val oriented = applyExifOrientation(decoded, orientation)
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

  private fun swapsAxes(orientation: Int) =
    orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
      orientation == ExifInterface.ORIENTATION_ROTATE_270 ||
      orientation == ExifInterface.ORIENTATION_TRANSPOSE ||
      orientation == ExifInterface.ORIENTATION_TRANSVERSE

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

  private fun readFileSize(uri: Uri): Long {
    if (uri.scheme == "file" || uri.scheme.isNullOrBlank()) {
      return resolveFile(uri).length()
    }
    return runCatching {
        reactContext.contentResolver
          .query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)
          ?.use { cursor ->
            if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else 0L
          } ?: 0L
      }
      .getOrDefault(0L)
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

  private fun createOutputFile(extension: String): File {
    val directory = File(reactContext.cacheDir, OUTPUT_DIRECTORY_NAME)
    if (!directory.exists() && !directory.mkdirs()) {
      throw IllegalStateException("Could not create the upload image cache.")
    }
    if (didCleanOutputs.compareAndSet(false, true)) {
      val expiry = System.currentTimeMillis() - OUTPUT_MAX_AGE_MS
      directory
        .listFiles()
        ?.filter { file -> file.lastModified() < expiry }
        ?.forEach { file -> runCatching { file.delete() } }
    }
    return File(directory, "${UUID.randomUUID()}.$extension")
  }

  private fun readInt(options: ReadableMap, key: String, fallback: Int): Int =
    if (options.hasKey(key) && !options.isNull(key)) options.getDouble(key).roundToInt() else fallback

  private fun readDouble(options: ReadableMap, key: String, fallback: Double): Double =
    if (options.hasKey(key) && !options.isNull(key)) options.getDouble(key) else fallback

  companion object {
    private const val OUTPUT_DIRECTORY_NAME = "vnseea_upload_images"
    private const val OUTPUT_MAX_AGE_MS = 24L * 60L * 60L * 1000L
  }
}
