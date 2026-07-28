const mockPost = jest.fn();
const mockMultipart = jest.fn();

jest.mock(
  '../../../../shared-kernel/infrastructure/api/apiBridge',
  () => ({
    apiBridge: {
      get: jest.fn(),
      multipart: (...args: unknown[]) => mockMultipart(...args),
      post: (...args: unknown[]) => mockPost(...args),
    },
  }),
);

import { createAdsRepository } from '../ApiAdsRepository';

describe('ApiAdsRepository.updateAd', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockMultipart.mockReset();
  });

  it('submits the complete edit payload while keeping remote media unchanged', async () => {
    mockPost.mockResolvedValueOnce({ api_status: 200 });

    const result = await createAdsRepository().updateAd(42, {
      name: 'VNSEEA',
      website: 'https://vnseea.example',
      headline: 'Connect with VNSEEA',
      description: 'An existing advertisement',
      audienceList: '233',
      location: 'Vietnam',
      gender: 'all',
      bidding: 'clicks',
      appears: 'post',
      media: 'https://cdn.example/ad.jpg',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      budget: 100,
    });

    expect(result).toBe(true);
    expect(mockMultipart).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('ads', {
      type: 'edit',
      ad_id: 42,
      name: 'VNSEEA',
      website: 'https://vnseea.example',
      headline: 'Connect with VNSEEA',
      description: 'An existing advertisement',
      'audience-list': '233',
      location: 'Vietnam',
      gender: 'all',
      bidding: 'clicks',
      appears: 'post',
      start: '2026-07-01',
      end: '2026-07-31',
      budget: 100,
    });
  });
});
