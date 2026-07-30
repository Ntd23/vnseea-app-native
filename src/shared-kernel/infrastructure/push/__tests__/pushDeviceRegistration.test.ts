jest.mock('../../api/apiBridge', () => ({
  apiBridge: { post: jest.fn() },
}));

jest.mock('../../storage/sessionStorage', () => ({
  sessionStorage: {
    getSession: jest.fn(),
  },
}));

import { apiRoutes } from '../../../application/constants/route-registry';
import { apiBridge } from '../../api/apiBridge';
import { sessionStorage } from '../../storage/sessionStorage';
import {
  cachePushToken,
  deactivatePushProvider,
  resetPushDeviceRegistrationForTests,
  retryPendingPushDeviceWork,
  stageCurrentPushInstallationRelease,
  syncPushDevicesAfterAuthentication,
} from '../pushDeviceRegistration';
import { pushInstallationStorage } from '../pushInstallationStorage';

const mockPost = apiBridge.post as jest.Mock;
const mockGetSession = sessionStorage.getSession as jest.Mock;

describe('pushDeviceRegistration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPost.mockReset();
    mockPost.mockResolvedValue({ api_status: 200 });
    mockGetSession.mockReset();
    mockGetSession.mockReturnValue(null);
    pushInstallationStorage.clear();
    resetPushDeviceRegistrationForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caches a token before login and claims it after authentication', async () => {
    await cachePushToken({
      provider: 'apns_voip',
      token: 'voip-before-login',
      apnsEnvironment: 'sandbox',
    });
    expect(mockPost).not.toHaveBeenCalled();

    mockGetSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });
    await syncPushDevicesAfterAuthentication();

    expect(mockPost).toHaveBeenCalledWith(
      apiRoutes.push.devices,
      expect.objectContaining({
        action: 'register',
        platform: 'ios',
        provider: 'apns_voip',
        token: 'voip-before-login',
        apns_environment: 'sandbox',
      }),
    );
    expect(pushInstallationStorage.getUnsyncedTokens('42')).toEqual([]);
  });

  it('force-registers an unchanged token after the backend registry was reset', async () => {
    mockGetSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });

    await cachePushToken({
      provider: 'onesignal',
      token: 'subscription-id',
    });
    expect(mockPost).toHaveBeenCalledTimes(1);

    mockPost.mockClear();
    await cachePushToken(
      {
        provider: 'onesignal',
        token: 'subscription-id',
      },
      { forceSync: true },
    );

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      apiRoutes.push.devices,
      expect.objectContaining({
        action: 'register',
        provider: 'onesignal',
        token: 'subscription-id',
      }),
    );
  });

  it('reports a pending sync when the backend rejects token registration', async () => {
    mockGetSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });
    mockPost.mockRejectedValueOnce(new Error('register failed'));

    await expect(
      cachePushToken({
        provider: 'onesignal',
        token: 'subscription-id',
      }),
    ).rejects.toThrow('push_device_registration_pending');

    expect(pushInstallationStorage.getUnsyncedTokens('42')).toEqual([
      expect.objectContaining({
        provider: 'onesignal',
        token: 'subscription-id',
      }),
    ]);
  });

  it('releases pending ownership before claiming tokens for a new user', async () => {
    pushInstallationStorage.cacheToken({
      provider: 'onesignal',
      token: 'subscription-id',
    });
    stageCurrentPushInstallationRelease();
    mockGetSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '99',
    });

    await retryPendingPushDeviceWork();

    expect(mockPost.mock.calls.map(call => call[1].action)).toEqual([
      'release',
      'register',
    ]);
  });

  it('keeps a failed release for a later sessionless retry', async () => {
    const pending = stageCurrentPushInstallationRelease();
    mockPost.mockRejectedValueOnce(new Error('offline'));

    await expect(retryPendingPushDeviceWork()).resolves.toBeUndefined();

    expect(pushInstallationStorage.getPendingRelease()).toEqual(pending);
  });

  it('deactivates only the revoked provider and removes its cached token', async () => {
    mockGetSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });
    pushInstallationStorage.cacheToken({
      provider: 'onesignal',
      token: 'subscription-id',
    });

    await deactivatePushProvider('onesignal');

    expect(mockPost).toHaveBeenCalledWith(
      apiRoutes.push.devices,
      expect.objectContaining({
        action: 'deactivate',
        provider: 'onesignal',
      }),
    );
    expect(pushInstallationStorage.getToken('onesignal')).toBeNull();
  });

  it('does not carry a logged-out provider deactivation into the next account', async () => {
    pushInstallationStorage.cacheToken({
      provider: 'onesignal',
      token: 'subscription-id',
    });

    await deactivatePushProvider('onesignal');

    expect(mockPost).not.toHaveBeenCalled();
    expect(pushInstallationStorage.getToken('onesignal')).toBeNull();
    expect(
      pushInstallationStorage.getPendingProviderDeactivations(),
    ).toEqual([]);
  });
});
