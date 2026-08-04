describe('requestCallMediaPermissions', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
    jest.dontMock('@livekit/react-native-webrtc');
  });

  it('requests microphone permission on iOS audio calls', async () => {
    const request = jest.fn().mockResolvedValue(true);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestCallMediaPermissions } = require('../microphonePermission');

    await expect(requestCallMediaPermissions('audio')).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ name: 'microphone' });
  });

  it('requests microphone permission for iOS voice recordings', async () => {
    const request = jest.fn().mockResolvedValue(true);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestMicrophonePermission } = require('../microphonePermission');

    await expect(requestMicrophonePermission()).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ name: 'microphone' });
  });

  it('reports denied microphone permission for iOS voice recordings', async () => {
    const request = jest.fn().mockResolvedValue(false);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestMicrophonePermission } = require('../microphonePermission');

    await expect(requestMicrophonePermission()).resolves.toBe(false);
  });

  it('requests microphone and camera permission on iOS video calls', async () => {
    const request = jest.fn().mockResolvedValue(true);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestCallMediaPermissions } = require('../microphonePermission');

    await expect(requestCallMediaPermissions('video')).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, { name: 'microphone' });
    expect(request).toHaveBeenNthCalledWith(2, { name: 'camera' });
  });

  it('returns false when an iOS media permission is denied', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestCallMediaPermissions } = require('../microphonePermission');

    await expect(requestCallMediaPermissions('video')).resolves.toBe(false);
  });

  it('allows a group video call with microphone permission and camera disabled', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestGroupVideoCallPermissions } = require('../microphonePermission');

    await expect(requestGroupVideoCallPermissions()).resolves.toEqual({
      microphoneGranted: true,
      cameraGranted: false,
    });
  });

  it('can request camera permission again when a group participant enables video', async () => {
    const request = jest.fn().mockResolvedValue(true);

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      PermissionsAndroid: {},
    }));
    jest.doMock('@livekit/react-native-webrtc', () => ({
      permissions: { request },
    }));

    const { requestCameraPermission } = require('../microphonePermission');

    await expect(requestCameraPermission()).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith({ name: 'camera' });
  });
});
