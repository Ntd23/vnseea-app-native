// Description: Cross-platform JS bridge for TextToSpeech navigation prompts (Android & iOS).
import { NativeModules } from 'react-native';

type NavigationSpeechNativeModule = {
  speak(text: string): Promise<boolean>;
  stop(): void;
};

function getNavigationSpeechModule() {
  return NativeModules.VnseeaNavigationSpeech as
    | NavigationSpeechNativeModule
    | undefined;
}

export function speakNavigationInstruction(text: string | undefined) {
  const cleanText = String(text || '').trim();
  const speechModule = getNavigationSpeechModule();
  if (!cleanText) return;
  if (!speechModule) {
    console.warn('[NavigationSpeech] native module missing. Rebuild app.');
    return;
  }
  speechModule
    .speak(cleanText)
    .then(didSpeak => {
      if (!didSpeak) {
        console.warn('[NavigationSpeech] TTS did not accept speech text.');
      }
    })
    .catch(error => {
      console.warn('[NavigationSpeech] speak failed:', error);
    });
}

export function stopNavigationSpeech() {
  getNavigationSpeechModule()?.stop();
}
