jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    post: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: {
    getSession: jest.fn(() => ({ userId: 'viewer-1' })),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/languageStorage', () => ({
  languageStorage: {
    getLanguage: jest.fn(() => 'vi'),
  },
}));

jest.mock('../../../../user/infrastructure/repositories/ApiUserRepository', () => ({
  createUserRepository: jest.fn(() => ({
    getUserProfile: jest.fn().mockResolvedValue({
      profile: { id: 'viewer-1' },
      followers: [],
      following: [],
      likedPages: [],
      joinedGroups: [],
      family: [],
    }),
  })),
}));

import { createUserRepository } from '../../../../user/infrastructure/repositories/ApiUserRepository';
import { createProfileRepository } from '../ApiProfileRepository';

describe('ApiProfileRepository profile loading options', () => {
  it('does not fetch full connection lists on the fast profile path', async () => {
    const getUserProfile = (createUserRepository as jest.Mock).mock
      .results[0].value.getUserProfile as jest.Mock;

    await createProfileRepository().loadProfile({ includeFriends: false });

    expect(getUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'viewer-1',
        fetch: expect.objectContaining({
          userData: true,
          followers: false,
          following: false,
        }),
      }),
    );
  });
});
