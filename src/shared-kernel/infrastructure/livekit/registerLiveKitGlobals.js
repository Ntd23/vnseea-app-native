// Description: Registers LiveKit globals with VNSEEA-specific iOS audio diagnostics.
const { Platform } = require('react-native');
const {
  AudioDeviceModule,
  registerGlobals,
  setupIOSAudioManagement,
} = require('@livekit/react-native');

const CALL_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';

let cleanupIOSAudioManagement = null;
let iosVoiceCallAudioActive = false;

const VOICE_CALL_APPLE_AUDIO_CONFIGURATION = {
  audioCategory: 'playAndRecord',
  audioCategoryOptions: ['allowBluetooth', 'defaultToSpeaker', 'mixWithOthers'],
  audioMode: 'voiceChat',
};

function logLiveKitAudioDebug(event, data = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(CALL_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(CALL_DEBUG_PREFIX, event, data);
  }
}

function getAppleAudioConfigurationForAudioState(state) {
  if (iosVoiceCallAudioActive) {
    return getVoiceCallAppleAudioConfiguration();
  }

  if (state.isRecordingEnabled) {
    return {
      audioCategory: 'playAndRecord',
      audioCategoryOptions: ['allowBluetooth', 'mixWithOthers'],
      audioMode: state.preferSpeakerOutput ? 'videoChat' : 'voiceChat',
    };
  }

  if (state.isPlayoutEnabled) {
    return {
      audioCategory: 'playback',
      audioCategoryOptions: ['mixWithOthers'],
      audioMode: 'spokenAudio',
    };
  }

  return {
    audioCategory: 'soloAmbient',
    audioCategoryOptions: [],
    audioMode: 'default',
  };
}

function getVoiceCallAppleAudioConfiguration() {
  return {
    ...VOICE_CALL_APPLE_AUDIO_CONFIGURATION,
    audioCategoryOptions: [
      ...VOICE_CALL_APPLE_AUDIO_CONFIGURATION.audioCategoryOptions,
    ],
  };
}

function setIosVoiceCallAudioActive(active) {
  const nextActive = Boolean(active);
  if (iosVoiceCallAudioActive === nextActive) return;
  iosVoiceCallAudioActive = nextActive;
  logLiveKitAudioDebug('ios_voice_call_audio_active_changed', {
    active: iosVoiceCallAudioActive,
  });
}

function isIosVoiceCallAudioActive() {
  return iosVoiceCallAudioActive;
}

function readIosAudioDeviceStateField(errors, field, reader) {
  try {
    return reader();
  } catch (error) {
    errors.push({
      field,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
    });
    return undefined;
  }
}

function getIosAudioDeviceState() {
  if (Platform.OS !== 'ios') {
    return {
      platform: Platform.OS,
    };
  }

  const errors = [];
  const state = {
    platform: Platform.OS,
    engineAvailability: readIosAudioDeviceStateField(
      errors,
      'engineAvailability',
      () => AudioDeviceModule.getEngineAvailability(),
    ),
    isRecordingAlwaysPreparedMode: readIosAudioDeviceStateField(
      errors,
      'isRecordingAlwaysPreparedMode',
      () => AudioDeviceModule.isRecordingAlwaysPreparedMode(),
    ),
    isRecording: readIosAudioDeviceStateField(errors, 'isRecording', () =>
      AudioDeviceModule.isRecording(),
    ),
    isPlaying: readIosAudioDeviceStateField(errors, 'isPlaying', () =>
      AudioDeviceModule.isPlaying(),
    ),
    isEngineRunning: readIosAudioDeviceStateField(
      errors,
      'isEngineRunning',
      () => AudioDeviceModule.isEngineRunning(),
    ),
    isMicrophoneMuted: readIosAudioDeviceStateField(
      errors,
      'isMicrophoneMuted',
      () => AudioDeviceModule.isMicrophoneMuted(),
    ),
    isVoiceProcessingEnabled: readIosAudioDeviceStateField(
      errors,
      'isVoiceProcessingEnabled',
      () => AudioDeviceModule.isVoiceProcessingEnabled(),
    ),
    isVoiceProcessingBypassed: readIosAudioDeviceStateField(
      errors,
      'isVoiceProcessingBypassed',
      () => AudioDeviceModule.isVoiceProcessingBypassed(),
    ),
    isVoiceProcessingAGCEnabled: readIosAudioDeviceStateField(
      errors,
      'isVoiceProcessingAGCEnabled',
      () => AudioDeviceModule.isVoiceProcessingAGCEnabled(),
    ),
    muteMode: readIosAudioDeviceStateField(errors, 'muteMode', () =>
      AudioDeviceModule.getMuteMode(),
    ),
  };

  if (errors.length > 0) {
    logLiveKitAudioDebug('ios_audio_device_state_error', {
      errors,
    });
    return {
      ...state,
      errors,
    };
  }

  return state;
}

function setupVnseeaIOSAudioManagement(preferSpeakerOutput = true) {
  if (Platform.OS !== 'ios') {
    logLiveKitAudioDebug('ios_audio_management_skipped', {
      platform: Platform.OS,
    });
    return () => {};
  }

  if (cleanupIOSAudioManagement) {
    cleanupIOSAudioManagement();
  }

  cleanupIOSAudioManagement = setupIOSAudioManagement(
    true,
    getAppleAudioConfigurationForAudioState,
  );

  logLiveKitAudioDebug('ios_audio_management_registered', {
    preferSpeakerOutput,
    managedBy: 'setupIOSAudioManagement',
  });

  return cleanupIOSAudioManagement;
}

function registerLiveKitGlobalsForVnseea() {
  registerGlobals({ autoConfigureAudioSession: false });
  cleanupIOSAudioManagement = setupVnseeaIOSAudioManagement();
}

module.exports = {
  getIosAudioDeviceState,
  getVoiceCallAppleAudioConfiguration,
  isIosVoiceCallAudioActive,
  registerLiveKitGlobalsForVnseea,
  setIosVoiceCallAudioActive,
};
