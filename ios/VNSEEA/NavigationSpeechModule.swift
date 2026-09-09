// Description: iOS native module for Text-to-Speech navigation guidance using AVSpeechSynthesizer.
import AVFoundation
import React

@objc(VnseeaNavigationSpeech)
class NavigationSpeechModule: NSObject, RCTBridgeModule, AVSpeechSynthesizerDelegate {
  private lazy var synthesizer: AVSpeechSynthesizer = {
    let synth = AVSpeechSynthesizer()
    synth.delegate = self
    return synth
  }()

  static func moduleName() -> String! {
    return "VnseeaNavigationSpeech"
  }

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func speak(_ text: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let cleanText = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleanText.isEmpty else {
      resolve(false)
      return
    }

    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        resolve(false)
        return
      }

      // Configure audio session for navigation guidance
      do {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .voicePrompt, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
        try session.setActive(true)
      } catch {
        // Continue even if audio session setup fails
      }

      // Stop any current speech
      if self.synthesizer.isSpeaking {
        self.synthesizer.stopSpeaking(at: .immediate)
      }

      let utterance = AVSpeechUtterance(string: cleanText)
      utterance.voice = AVSpeechSynthesisVoice(language: "vi-VN") ?? AVSpeechSynthesisVoice(language: "vi")
      utterance.rate = AVSpeechUtteranceDefaultSpeechRate
      utterance.pitchMultiplier = 1.0
      utterance.volume = 1.0

      self.synthesizer.speak(utterance)
      resolve(true)
    }
  }

  @objc
  func stop() {
    DispatchQueue.main.async { [weak self] in
      self?.synthesizer.stopSpeaking(at: .immediate)
    }
  }
}

@objc(VnseeaCallProgressTone)
class CallProgressToneModule: NSObject, RCTBridgeModule {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private var activeCallId = ""
  private var activeMode = ""

  static func moduleName() -> String! {
    return "VnseeaCallProgressTone"
  }

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func start(
    _ mode: String,
    callId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self, !callId.isEmpty else {
        resolve(false)
        return
      }
      if self.activeCallId == callId && self.activeMode == mode && self.player.isPlaying {
        resolve(true)
        return
      }

      self.stopPlayback()
      guard let buffer = self.makeToneBuffer(mode: mode) else {
        resolve(false)
        return
      }
      if !self.engine.attachedNodes.contains(self.player) {
        self.engine.attach(self.player)
        self.engine.connect(self.player, to: self.engine.mainMixerNode, format: buffer.format)
      }
      do {
        try self.engine.start()
        self.activeCallId = callId
        self.activeMode = mode
        self.player.scheduleBuffer(buffer, at: nil, options: [.loops])
        self.player.play()
        resolve(true)
      } catch {
        self.stopPlayback()
        reject("E_CALL_PROGRESS_TONE", "Unable to play call progress tone.", error)
      }
    }
  }

  @objc
  func stop(
    _ callId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        resolve(false)
        return
      }
      if callId.isEmpty || self.activeCallId == callId {
        self.stopPlayback()
      }
      resolve(true)
    }
  }

  private func stopPlayback() {
    player.stop()
    engine.stop()
    activeCallId = ""
    activeMode = ""
  }

  private func makeToneBuffer(mode: String) -> AVAudioPCMBuffer? {
    let sampleRate = 44_100.0
    let pattern: (duration: Double, frequency: Double, windows: [(Double, Double)])
    switch mode {
    case "ringing":
      pattern = (2.2, 440, [(0, 0.34), (0.52, 0.86)])
    case "busy":
      pattern = (0.55, 425, [(0, 0.24)])
    default:
      pattern = (3.0, 425, [(0, 0.22)])
    }

    guard
      let format = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: sampleRate,
        channels: 1,
        interleaved: false
      ),
      let buffer = AVAudioPCMBuffer(
        pcmFormat: format,
        frameCapacity: AVAudioFrameCount(pattern.duration * sampleRate)
      ),
      let samples = buffer.floatChannelData?[0]
    else {
      return nil
    }

    buffer.frameLength = buffer.frameCapacity
    for frame in 0..<Int(buffer.frameLength) {
      let time = Double(frame) / sampleRate
      let audible = pattern.windows.contains { time >= $0.0 && time < $0.1 }
      if audible {
        let localTime = pattern.windows.first(where: { time >= $0.0 && time < $0.1 }).map { time - $0.0 } ?? 0
        let edge = min(1.0, min(localTime / 0.012, (pattern.windows.first(where: { time >= $0.0 && time < $0.1 })!.1 - time) / 0.012))
        samples[frame] = Float(sin(2.0 * .pi * pattern.frequency * time) * 0.16 * max(0, edge))
      } else {
        samples[frame] = 0
      }
    }
    return buffer
  }
}
