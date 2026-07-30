import { apiRoutes } from '../../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { logoutPushUser } from '../../../../shared-kernel/infrastructure/push/oneSignalPush';
import {
  completeCurrentPushInstallationRelease,
  retryPendingPushDeviceWork,
  stageCurrentPushInstallationRelease,
} from '../../../../shared-kernel/infrastructure/push/pushDeviceRegistration';
import { sessionStorage } from '../../../../shared-kernel/infrastructure/storage/sessionStorage';
import { disconnectLiveKitCallRealtime } from '../../../../messages/infrastructure/realtime/liveKitCallRealtime';
import { createAuthRepository } from '../ApiAuthRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: {
    setSession: jest.fn(),
    setUserProfile: jest.fn(),
    getSession: jest.fn(),
    getAccessToken: jest.fn(),
    clearSession: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/push/oneSignalPush', () => ({
  identifyPushUser: jest.fn(),
  logoutPushUser: jest.fn(),
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/push/pushDeviceRegistration',
  () => ({
    completeCurrentPushInstallationRelease: jest.fn(),
    retryPendingPushDeviceWork: jest.fn(),
    stageCurrentPushInstallationRelease: jest.fn(),
    syncPushDevicesAfterAuthentication: jest.fn(),
  }),
);

jest.mock(
  '../../../../notifications/application/navigation/pushNotificationNavigation',
  () => ({
    flushPendingPushNotificationNavigation: jest.fn(),
  }),
);

jest.mock('../../../../messages/infrastructure/realtime/liveKitCallRealtime', () => ({
  connectLiveKitCallRealtime: jest.fn(),
  disconnectLiveKitCallRealtime: jest.fn(),
}));

const post = apiBridge.post as jest.Mock;
const clearSession = sessionStorage.clearSession as jest.Mock;
const getSession = sessionStorage.getSession as jest.Mock;
const disconnectRealtime = disconnectLiveKitCallRealtime as jest.Mock;
const logoutPush = logoutPushUser as jest.Mock;
const completeRelease =
  completeCurrentPushInstallationRelease as jest.Mock;
const retryPushWork = retryPendingPushDeviceWork as jest.Mock;
const stageRelease = stageCurrentPushInstallationRelease as jest.Mock;

async function flushBackgroundWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('ApiAuthRepository deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    retryPushWork.mockResolvedValue(undefined);
    stageRelease.mockReturnValue({
      installationId: 'installation-1',
      deviceSecret: 'device-secret',
      stagedAt: 1,
    });
  });

  it('cleans local auth state only after backend deletion succeeds', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      message: 'account_deleted',
    });

    await createAuthRepository().deleteAccount('current-password');

    expect(post).toHaveBeenCalledWith(apiRoutes.auth.deleteAccount, {
      password: 'current-password',
    });
    expect(disconnectRealtime).toHaveBeenCalledTimes(1);
    expect(logoutPush).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('keeps the authenticated session when backend rejects deletion', async () => {
    post.mockRejectedValueOnce(new Error('password_mismatch'));

    await expect(
      createAuthRepository().deleteAccount('wrong-password'),
    ).rejects.toThrow('password_mismatch');

    expect(disconnectRealtime).not.toHaveBeenCalled();
    expect(logoutPush).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('keeps a pending installation release when authenticated logout could not release it', async () => {
    getSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });
    post.mockResolvedValueOnce({
      api_status: 200,
      push_release_pending: 1,
    });

    await createAuthRepository().logout();
    await flushBackgroundWork();

    expect(completeRelease).not.toHaveBeenCalled();
    expect(retryPushWork).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('completes local logout without waiting for a stalled backend request', async () => {
    getSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });
    post.mockImplementationOnce(() => new Promise(() => undefined));

    await createAuthRepository().logout();

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(logoutPush).toHaveBeenCalledTimes(1);
    expect(disconnectRealtime).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      apiRoutes.auth.logout,
      expect.objectContaining({
        installation_id: 'installation-1',
        device_secret: 'device-secret',
      }),
      expect.objectContaining({
        params: { access_token: 'access-token' },
      }),
    );
  });

  it('completes installation release only when logout confirms it', async () => {
    getSession.mockReturnValue({
      accessToken: 'access-token',
      userId: '42',
    });
    post.mockResolvedValueOnce({
      api_status: 200,
      push_release_pending: 0,
    });

    await createAuthRepository().logout();
    await flushBackgroundWork();

    expect(completeRelease).toHaveBeenCalledWith(
      expect.objectContaining({ installationId: 'installation-1' }),
    );
  });
});
