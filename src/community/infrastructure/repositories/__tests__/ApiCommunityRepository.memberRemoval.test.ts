jest.mock(
  '../../../../shared-kernel/infrastructure/api/apiBridge',
  () => ({
    apiBridge: {
      post: jest.fn(),
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/config/env',
  () => ({
    apiConfig: {
      webBaseUrl: 'https://demo.vnseea.vn',
      requestTimeoutMs: 15_000,
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: {
      getSession: jest.fn(() => ({ userId: '42' })),
    },
  }),
);

import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { SELF_GROUP_MEMBER_REMOVAL_MESSAGE } from '../../../../shared-kernel/application/utils/groupMemberRemoval';
import { createCommunityRepository } from '../ApiCommunityRepository';

describe('ApiCommunityRepository member removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects removing the signed-in admin or owner before making an API call', async () => {
    await expect(
      createCommunityRepository().removeGroupMember('group-1', '42'),
    ).rejects.toThrow(SELF_GROUP_MEMBER_REMOVAL_MESSAGE);

    expect(apiBridge.post).not.toHaveBeenCalled();
  });

  it('still allows removing another member', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValueOnce({ api_status: 200 });

    await createCommunityRepository().removeGroupMember('group-1', '43');

    expect(apiBridge.post).toHaveBeenCalledWith('delete_group_member', {
      group_id: 'group-1',
      user_id: '43',
    });
  });
});
