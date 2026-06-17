package com.vnseea.android.audio

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile

class WavAudioRecorderModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private const val SAMPLE_RATE = 44_100
    private const val CHANNELS = 1
    private const val BITS_PER_SAMPLE = 16
  }

  @Volatile
  private var isRecording = false
  private var audioRecord: AudioRecord? = null
  private var recordingThread: Thread? = null
  private var recordingStream: FileOutputStream? = null
  private var outputFile: File? = null

  override fun getName() = "WavAudioRecorder"

  @ReactMethod
  @Synchronized
  fun start(promise: Promise) {
    if (isRecording) {
      promise.reject("E_ALREADY_RECORDING", "Recorder is already running.")
      return
    }
    if (
      reactApplicationContext.checkSelfPermission(Manifest.permission.RECORD_AUDIO) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("E_PERMISSION", "Microphone permission is required.")
      return
    }

    try {
      val minBufferSize = AudioRecord.getMinBufferSize(
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
      )
      if (minBufferSize <= 0) {
        throw IllegalStateException("Unable to determine recorder buffer size.")
      }

      val recorder = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        minBufferSize * 2,
      )
      if (recorder.state != AudioRecord.STATE_INITIALIZED) {
        recorder.release()
        throw IllegalStateException("Unable to initialize WAV recorder.")
      }

      val file = File(
        reactApplicationContext.cacheDir,
        "voice-${System.currentTimeMillis()}.wav",
      )
      val stream = FileOutputStream(file)
      stream.write(ByteArray(44))

      audioRecord = recorder
      recordingStream = stream
      outputFile = file
      recorder.startRecording()
      isRecording = true
      recordingThread = Thread {
        val buffer = ByteArray(minBufferSize)
        try {
          while (isRecording) {
            val bytesRead = recorder.read(buffer, 0, buffer.size)
            if (bytesRead > 0) {
              stream.write(buffer, 0, bytesRead)
            }
          }
        } finally {
          stream.flush()
          stream.close()
        }
      }.apply {
        name = "VnseeaWavRecorder"
        start()
      }

      promise.resolve(Uri.fromFile(file).toString())
    } catch (error: Exception) {
      val failedFile = outputFile
      releaseRecorder()
      failedFile?.delete()
      promise.reject("E_START_RECORDING", error.message, error)
    }
  }

  @ReactMethod
  @Synchronized
  fun stop(promise: Promise) {
    val file = outputFile
    if (!isRecording || file == null) {
      promise.reject("E_NOT_RECORDING", "Recorder is not running.")
      return
    }

    try {
      stopAndFinalize(file)
      promise.resolve(Uri.fromFile(file).toString())
    } catch (error: Exception) {
      promise.reject("E_STOP_RECORDING", error.message, error)
    }
  }

  @ReactMethod
  @Synchronized
  fun cancel(promise: Promise) {
    val file = outputFile
    try {
      if (isRecording && file != null) {
        stopAndFinalize(file)
      } else {
        releaseRecorder()
      }
      file?.delete()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_CANCEL_RECORDING", error.message, error)
    }
  }

  @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
  override fun onCatalystInstanceDestroy() {
    if (isRecording) {
      try {
        val file = outputFile
        if (file != null) stopAndFinalize(file)
      } catch (_: Exception) {
        releaseRecorder()
      }
    }
    super.onCatalystInstanceDestroy()
  }

  private fun stopAndFinalize(file: File) {
    isRecording = false
    try {
      audioRecord?.stop()
    } catch (_: IllegalStateException) {
      // Recorder may already be stopped by Android during teardown.
    }
    recordingThread?.join(2_000)
    releaseRecorder()
    writeWavHeader(file)
  }

  private fun releaseRecorder() {
    isRecording = false
    recordingThread = null
    try {
      audioRecord?.release()
    } catch (_: Exception) {
      // Release is best effort during teardown.
    }
    audioRecord = null
    try {
      recordingStream?.close()
    } catch (_: Exception) {
      // Stream may already be closed by the writer thread.
    }
    recordingStream = null
    outputFile = null
  }

  private fun writeWavHeader(file: File) {
    val audioLength = (file.length() - 44).coerceAtLeast(0)
    val byteRate = SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE / 8
    RandomAccessFile(file, "rw").use { wav ->
      wav.seek(0)
      wav.writeBytes("RIFF")
      writeLittleEndian(wav, audioLength + 36, 4)
      wav.writeBytes("WAVE")
      wav.writeBytes("fmt ")
      writeLittleEndian(wav, 16, 4)
      writeLittleEndian(wav, 1, 2)
      writeLittleEndian(wav, CHANNELS.toLong(), 2)
      writeLittleEndian(wav, SAMPLE_RATE.toLong(), 4)
      writeLittleEndian(wav, byteRate.toLong(), 4)
      writeLittleEndian(wav, (CHANNELS * BITS_PER_SAMPLE / 8).toLong(), 2)
      writeLittleEndian(wav, BITS_PER_SAMPLE.toLong(), 2)
      wav.writeBytes("data")
      writeLittleEndian(wav, audioLength, 4)
    }
  }

  private fun writeLittleEndian(file: RandomAccessFile, value: Long, bytes: Int) {
    repeat(bytes) { offset ->
      file.write((value shr (8 * offset) and 0xff).toInt())
    }
  }
}
