const mockPost = jest.fn();

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    get: jest.fn(),
    multipart: jest.fn(),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { createAdsRepository } from '../ApiAdsRepository';

const ad = {
  id: 42,
  name: 'VNSEEA',
  url: 'https://vnseea.example',
  headline: 'Realtime campaign',
  description: 'Campaign description',
  location: 'Vietnam',
  audience: '233',
  gender: 'all',
  bidding: 'clicks',
  ad_media: 'https://cdn.example/ad.jpg',
  appears: 'entire',
  page_id: 0,
  user_id: 1,
  budget: '100000',
  spent: '700',
  views: '30',
  clicks: 3,
  posted: 20,
  start: '2026-07-01',
  end: '2026-07-31',
  status: '1',
};

describe('ApiAdsRepository realtime statistics snapshot', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('loads campaign totals and aggregates duplicate daily rows in one request', async () => {
    mockPost.mockResolvedValueOnce({
      api_status: 200,
      data: {
        ad,
        server_time: 1785226200123,
        clicks: [
          { DateOnly: '2026-07-28', ADClicks: '1', Spend: '100' },
          { DateOnly: '2026-07-28', ADClicks: '2', Spend: '200' },
        ],
        views: [
          { DateOnly: '2026-07-27', ADviews: '10', Spend: '0' },
          { DateOnly: '2026-07-28', ADviews: '20', Spend: '400' },
        ],
      },
    });

    const snapshot = await createAdsRepository().getAdStatsSnapshot(42);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('ads', {
      type: 'fetch_ad_stats',
      ad_id: 42,
    });
    expect(snapshot.ad).toEqual(ad);
    expect(snapshot.fetchedAt).toBe(1785226200123);
    expect(snapshot.dailyStats).toEqual([
      {
        date: '2026-07-27',
        views: 10,
        clicks: 0,
        spent: 0,
      },
      {
        date: '2026-07-28',
        views: 20,
        clicks: 3,
        spent: 700,
      },
    ]);
  });

  it('rejects invalid snapshots so the screen can preserve stale data and retry', async () => {
    mockPost.mockResolvedValueOnce({ api_status: 200, data: {} });

    await expect(createAdsRepository().getAdStatsSnapshot(42)).rejects.toThrow(
      'Không tìm thấy dữ liệu chiến dịch quảng cáo.',
    );
  });
});
