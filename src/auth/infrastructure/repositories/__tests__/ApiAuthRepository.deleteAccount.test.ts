import { apiRoutes } from '../../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { logoutPushUser } from '../../../../shared-kernel/infrastructure/push/oneSignalPush';
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

jest.mock('../../../../messages/infrastructure/realtime/liveKitCallRealtime', () => ({
  connectLiveKitCallRealtime: jest.fn(),
  disconnectLiveKitCallRealtime: jest.fn(),
}));

const post = apiBridge.post as jest.Mock;
const clearSession = sessionStorage.clearSession as jest.Mock;
const disconnectRealtime = disconnectLiveKitCallRealtime as jest.Mock;
const logoutPush = logoutPushUser as jest.Mock;

describe('ApiAuthRepository deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
