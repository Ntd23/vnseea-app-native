import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createMyPointsRepository } from '../ApiMyPointsRepository';

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const get = apiBridge.get as jest.Mock;
const post = apiBridge.post as jest.Mock;

describe('signup points history', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('labels the 500,000 VNSEEA registration reward explicitly', async () => {
    post.mockResolvedValueOnce({
      api_status: 200,
      user_data: {
        points: 500000,
        wallet: 0,
        points_config: { dollar_to_point_cost: 1000 },
      },
    });
    get.mockResolvedValueOnce({
      api_status: 200,
      transactions: [
        {
          id: '10',
          kind: 'POINTS_EARNED',
          notes: 'signup_bonus',
          point_type: 'signup_bonus',
          points: 500000,
          point_action: '+',
          transaction_dt: '2026-07-22 10:00:00',
        },
      ],
    });

    const overview = await createMyPointsRepository().getOverview();

    expect(overview.history[0]).toEqual(
      expect.objectContaining({
        title: 'Thưởng đăng ký',
        points: 500000,
      }),
    );
    expect(overview.walletBalance).toBe(0);
  });
});
