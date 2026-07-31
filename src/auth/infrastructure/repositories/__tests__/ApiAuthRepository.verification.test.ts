import { apiRoutes } from '../../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  identifyPushUser,
  logoutPushUser,
} from '../../../../shared-kernel/infrastructure/push/oneSignalPush';
import {
  stageCurrentPushInstallationRelease,
  syncPushDevicesAfterAuthentication,
} from '../../../../shared-kernel/infrastructure/push/pushDeviceRegistration';
import {
  connectLiveKitCallRealtime,
  disconnectLiveKitCallRealtime,
} from '../../../../messages/infrastructure/realtime/liveKitCallRealtime';
import { flushPendingPushNotificationNavigation } from '../../../../notifications/application/navigation/pushNotificationNavigation';
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
    retryPendingPushDeviceWork: jest.fn().mockResolvedValue(undefined),
    stageCurrentPushInstallationRelease: jest.fn(),
    syncPushDevicesAfterAuthentication: jest.fn().mockResolvedValue(undefined),
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
const setSession = sessionStorage.setSession as jest.Mock;
const identify = identifyPushUser as jest.Mock;
const connectRealtime = connectLiveKitCallRealtime as jest.Mock;
const disconnectRealtime = disconnectLiveKitCallRealtime as jest.Mock;
const syncPushDevices = syncPushDevicesAfterAuthentication as jest.Mock;
const stagePushRelease = stageCurrentPushInstallationRelease as jest.Mock;
const clearSession = sessionStorage.clearSession as jest.Mock;
const logoutPush = logoutPushUser as jest.Mock;
const flushPushNavigation =
  flushPendingPushNotificationNavigation as jest.Mock;

describe('ApiAuthRepository account verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms a six-digit code and initializes the authenticated session', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      access_token: 'verified-token',
      user_id: 42,
      user_platform: 'phone',
    });

    const result = await createAuthRepository().confirmAccount({
      userId: '42',
      code: '123456',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    expect(post).toHaveBeenCalledWith(apiRoutes.auth.confirmAccount, {
      user_id: '42',
      code: '123456',
      timezone: 'Asia/Ho_Chi_Minh',
      device_type: 'phone',
    });
    expect(result).toEqual({
      status: 'authenticated',
      session: {
        accessToken: 'verified-token',
        userId: '42',
        userPlatform: 'phone',
        membershipRequired: false,
      },
    });
    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'verified-token', userId: '42' }),
    );
    expect(identify).toHaveBeenCalledWith('42');
    expect(syncPushDevices).toHaveBeenCalledTimes(1);
    expect(flushPushNavigation).toHaveBeenCalledTimes(1);
    expect(connectRealtime).toHaveBeenCalledTimes(1);
  });

  it('resends the activation code without creating an authenticated session', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      message: 'Activation code resent.',
    });

    await createAuthRepository().resendAccountCode('42');

    expect(post).toHaveBeenCalledWith(apiRoutes.auth.resendActivationCode, {
      user_id: '42',
    });
    expect(setSession).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
    expect(connectRealtime).not.toHaveBeenCalled();
  });

  it('clears the local session when staging push release fails', async () => {
    (sessionStorage.getSession as jest.Mock).mockReturnValue({
      accessToken: 'active-token',
      userId: '42',
    });
    post.mockResolvedValueOnce({ api_status: 200 });
    stagePushRelease.mockImplementationOnce(() => {
      throw new Error(
        'Native crypto module could not be used to get secure random number.',
      );
    });

    await expect(createAuthRepository().logout()).resolves.toBeUndefined();

    expect(disconnectRealtime).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(logoutPush).toHaveBeenCalledTimes(1);
  });
});
