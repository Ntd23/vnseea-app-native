describe('getCurrentDeviceLocation performance behavior', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  function mockAndroidLocation(
    getCurrentLocation: jest.Mock,
    check = jest.fn().mockResolvedValue(true),
  ) {
    const requestMultiple = jest.fn().mockResolvedValue({
      'android.permission.ACCESS_FINE_LOCATION': 'granted',
      'android.permission.ACCESS_COARSE_LOCATION': 'granted',
    });

    jest.doMock('react-native', () => ({
      NativeModules: {
        VnseeaCurrentLocation: { getCurrentLocation },
      },
      Platform: { OS: 'android' },
      PermissionsAndroid: {
        PERMISSIONS: {
          ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
          ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
        },
        RESULTS: { GRANTED: 'granted' },
        check,
        requestMultiple,
      },
    }));

    return { check, requestMultiple };
  }

  it('coalesces concurrent callers into one native request', async () => {
    let resolveLocation!: (value: {
      latitude: number;
      longitude: number;
    }) => void;
    const nativeRequest = new Promise<{
      latitude: number;
      longitude: number;
    }>(resolve => {
      resolveLocation = resolve;
    });
    const getCurrentLocation = jest.fn(() => nativeRequest);
    mockAndroidLocation(getCurrentLocation);

    const { getCurrentDeviceLocation } = require('../currentLocation');
    const first = getCurrentDeviceLocation();
    const second = getCurrentDeviceLocation();

    await new Promise<void>(resolve => setImmediate(() => resolve()));
    expect(getCurrentLocation).toHaveBeenCalledTimes(1);

    resolveLocation({ latitude: 10.77, longitude: 106.69 });
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ latitude: 10.77, longitude: 106.69 }),
      expect.objectContaining({ latitude: 10.77, longitude: 106.69 }),
    ]);
  });

  it('returns the short-lived cache without asking native location again', async () => {
    const getCurrentLocation = jest.fn().mockResolvedValue({
      latitude: 10.77,
      longitude: 106.69,
      timestamp: 1_720_000_000,
    });
    const { check } = mockAndroidLocation(getCurrentLocation);

    const { getCurrentDeviceLocation } = require('../currentLocation');
    const first = await getCurrentDeviceLocation();
    const second = await getCurrentDeviceLocation();

    expect(second).toBe(first);
    expect(second.timestamp).toBe(1_720_000_000_000);
    expect(getCurrentLocation).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed native request', async () => {
    const getCurrentLocation = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ latitude: 10.77, longitude: 106.69 });
    mockAndroidLocation(getCurrentLocation);

    const { getCurrentDeviceLocation } = require('../currentLocation');
    await expect(getCurrentDeviceLocation()).rejects.toThrow('timeout');
    await expect(getCurrentDeviceLocation()).resolves.toEqual(
      expect.objectContaining({ latitude: 10.77, longitude: 106.69 }),
    );
    expect(getCurrentLocation).toHaveBeenCalledTimes(2);
  });

  it('requests fine and coarse permission together and accepts coarse-only access', async () => {
    const getCurrentLocation = jest.fn();
    const check = jest.fn().mockResolvedValue(false);
    const { requestMultiple } = mockAndroidLocation(getCurrentLocation, check);
    requestMultiple.mockResolvedValue({
      'android.permission.ACCESS_FINE_LOCATION': 'denied',
      'android.permission.ACCESS_COARSE_LOCATION': 'granted',
    });

    const { requestAndroidLocationPermission } = require('../currentLocation');

    await expect(requestAndroidLocationPermission()).resolves.toBe(true);
    expect(requestMultiple).toHaveBeenCalledWith([
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ]);
  });

  it('does not prompt again when coarse location is already granted', async () => {
    const getCurrentLocation = jest.fn();
    const check = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { requestMultiple } = mockAndroidLocation(getCurrentLocation, check);

    const { requestAndroidLocationPermission } = require('../currentLocation');

    await expect(requestAndroidLocationPermission()).resolves.toBe(true);
    expect(requestMultiple).not.toHaveBeenCalled();
  });
});
