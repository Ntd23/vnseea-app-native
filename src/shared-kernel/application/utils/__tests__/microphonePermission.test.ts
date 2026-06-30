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
});
