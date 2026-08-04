// App-owned iOS M4A recorder used by chat and comment voice messages.
import AVFoundation
import Foundation
import React

@objc(VnseeaAudioRecorder)
class VnseeaAudioRecorder: NSObject {
  private var recorder: AVAudioRecorder?
  private var recordingURL: URL?

  static func moduleName() -> String! {
    "VnseeaAudioRecorder"
  }

  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc
  func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let session = AVAudioSession.sharedInstance()
    switch session.recordPermission {
    case .granted:
      resolve(true)
    case .denied:
      resolve(false)
    case .undetermined:
      session.requestRecordPermission { granted in
        resolve(granted)
      }
    @unknown default:
      resolve(false)
    }
  }

  @objc
  func start(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        reject("audio_recorder_unavailable", "The iOS audio recorder is unavailable.", nil)
        return
      }
      guard self.recorder == nil else {
        reject("audio_recorder_busy", "A voice recording is already active.", nil)
        return
      }

      let session = AVAudioSession.sharedInstance()
      guard session.recordPermission == .granted else {
        reject("microphone_permission_denied", "Microphone permission has not been granted.", nil)
        return
      }

      do {
        try session.setCategory(
          .playAndRecord,
          mode: .default,
          options: [.defaultToSpeaker, .allowBluetoothHFP]
        )
        try session.setActive(true)

        let cacheDirectory = try FileManager.default.url(
          for: .cachesDirectory,
          in: .userDomainMask,
          appropriateFor: nil,
          create: true
        )
        let fileURL = cacheDirectory
          .appendingPathComponent("voice-\(UUID().uuidString).m4a")
        try? FileManager.default.removeItem(at: fileURL)

        let settings: [String: Any] = [
          AVFormatIDKey: kAudioFormatMPEG4AAC,
          AVSampleRateKey: 44_100,
          AVNumberOfChannelsKey: 1,
          AVEncoderBitRateKey: 96_000,
          AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        let nextRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
        nextRecorder.isMeteringEnabled = true
        guard nextRecorder.prepareToRecord(), nextRecorder.record() else {
          throw NSError(
            domain: "VnseeaAudioRecorder",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "The recorder could not start."]
          )
        }

        self.recordingURL = fileURL
        self.recorder = nextRecorder
        resolve(fileURL.absoluteString)
      } catch {
        self.cleanupSession(deleteFile: true)
        reject("audio_recorder_start_failed", error.localizedDescription, error)
      }
    }
  }

  @objc
  func stop(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self,
            let activeRecorder = self.recorder,
            let fileURL = self.recordingURL else {
        reject("audio_recorder_not_active", "No voice recording is active.", nil)
        return
      }

      let durationMs = max(0, Int((activeRecorder.currentTime * 1000).rounded()))
      activeRecorder.stop()
      self.recorder = nil
      self.recordingURL = nil
      self.deactivateSession()

      do {
        let values = try fileURL.resourceValues(forKeys: [.fileSizeKey])
        guard (values.fileSize ?? 0) > 0 else {
          try? FileManager.default.removeItem(at: fileURL)
          reject("audio_recorder_empty_file", "The recorded audio file is empty.", nil)
          return
        }
        resolve([
          "uri": fileURL.absoluteString,
          "durationMs": durationMs,
        ])
      } catch {
        try? FileManager.default.removeItem(at: fileURL)
        reject("audio_recorder_file_failed", error.localizedDescription, error)
      }
    }
  }

  @objc
  func cancel(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      self?.cleanupSession(deleteFile: true)
      resolve(nil)
    }
  }

  private func cleanupSession(deleteFile: Bool) {
    recorder?.stop()
    recorder = nil
    if deleteFile, let fileURL = recordingURL {
      try? FileManager.default.removeItem(at: fileURL)
    }
    recordingURL = nil
    deactivateSession()
  }

  private func deactivateSession() {
    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: .notifyOthersOnDeactivation
    )
  }
}
