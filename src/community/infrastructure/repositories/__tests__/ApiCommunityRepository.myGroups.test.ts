// Description: Verifies that the share-target group request tolerates a temporarily slow backend.
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
import { createCommunityRepository } from '../ApiCommunityRepository';

describe('ApiCommunityRepository my groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses a request-specific timeout longer than the global 15 seconds', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValueOnce({
      api_status: 200,
      data: [],
    });

    await createCommunityRepository().getMyGroups({ limit: 20 });

    expect(apiBridge.post).toHaveBeenCalledWith(
      'get-my-groups',
      {
        type: 'my_groups',
        limit: 20,
        offset: undefined,
      },
      {
        timeout: 30_000,
      },
    );
  });
});
