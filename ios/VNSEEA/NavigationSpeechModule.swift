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
