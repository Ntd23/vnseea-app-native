describe('location access recovery', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  function loadForPlatform(platform: 'ios' | 'android') {
    const openSettings = jest.fn().mockResolvedValue(undefined);
    const sendIntent = jest.fn().mockResolvedValue(undefined);
    const alert = jest.fn();
    jest.doMock('react-native', () => ({
      Alert: { alert },
      Linking: { openSettings, sendIntent },
      Platform: { OS: platform },
    }));
    const module = require('../locationAccessRecovery');
    return { ...module, alert, openSettings, sendIntent };
  }

  it('offers App Settings when permission is denied', () => {
    const { getLocationAccessRecovery, LocationAccessError } =
      loadForPlatform('ios');

    expect(
      getLocationAccessRecovery(
        new LocationAccessError('permission_denied', 'denied'),
      ),
    ).toMatchObject({
      kind: 'permission_denied',
      primaryAction: 'open_app_settings',
    });
  });

  it('offers Android location settings when providers are disabled', async () => {
    const {
      presentLocationAccessRecovery,
      LocationAccessError,
      alert,
      sendIntent,
    } = loadForPlatform('android');

    presentLocationAccessRecovery(
      new LocationAccessError('services_disabled', 'disabled'),
    );
    const buttons = alert.mock.calls[0][2];
    await buttons[1].onPress();

    expect(sendIntent).toHaveBeenCalledWith(
      'android.settings.LOCATION_SOURCE_SETTINGS',
    );
  });

  it('uses retry without opening settings for a timeout', () => {
    const { getLocationAccessRecovery, LocationAccessError } =
      loadForPlatform('android');

    expect(
      getLocationAccessRecovery(new LocationAccessError('timeout', 'slow')),
    ).toMatchObject({ kind: 'timeout', primaryAction: 'retry' });
  });
});
