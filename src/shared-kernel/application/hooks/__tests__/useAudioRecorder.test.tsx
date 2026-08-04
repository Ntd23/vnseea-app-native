import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {
    startRecorder: jest.fn(),
    stopRecorder: jest.fn(),
    removeRecordBackListener: jest.fn(),
    addRecordBackListener: jest.fn(),
  },
  AudioEncoderAndroidType: { AAC: 'aac' },
  AudioSourceAndroidType: { MIC: 'mic' },
  OutputFormatAndroidType: { MPEG_4: 'mpeg4' },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: { fs: { stat: jest.fn() } },
}));

jest.mock('../../utils/microphonePermission', () => ({
  requestMicrophonePermission: jest.fn().mockResolvedValue(true),
}));

import { useAudioRecorder } from '../useAudioRecorder';

const mockSound = jest.requireMock('react-native-nitro-sound').default as {
  startRecorder: jest.Mock;
  stopRecorder: jest.Mock;
};

describe('useAudioRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSound.stopRecorder.mockResolvedValue('file:///tmp/voice.m4a');
  });

  it('deduplicates recorder starts while iOS audio setup is pending', async () => {
    let resolveStart: ((value: string) => void) | undefined;
    mockSound.startRecorder.mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveStart = resolve;
        }),
    );

    let recorder: ReturnType<typeof useAudioRecorder> | undefined;
    function Harness() {
      recorder = useAudioRecorder();
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Harness />);
    });

    let firstStart: Promise<void>;
    let secondStart: Promise<void>;
    await act(async () => {
      firstStart = recorder!.startRecording();
      secondStart = recorder!.startRecording();
      await Promise.resolve();
    });

    expect(mockSound.startRecorder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStart?.('file:///tmp/voice.m4a');
      await Promise.all([firstStart!, secondStart!]);
    });

    await act(async () => {
      renderer!.unmount();
    });
  });
});
