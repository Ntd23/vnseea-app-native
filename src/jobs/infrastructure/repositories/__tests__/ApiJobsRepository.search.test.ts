jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    get: jest.fn(),
    post: jest.fn(),
    multipart: jest.fn(),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/url', () => ({
  normalizeConfiguredUrl: (value?: string) => value ?? '',
}));

import { apiBridge } from '../../../../shared-kernel/infrastructure/api/apiBridge';
import { createJobsRepository } from '../ApiJobsRepository';

const metadataResponse = {
  api_status: 200,
  types: [],
  categories: [],
  salary_dates: [],
  currencies: [],
  question_types: [],
  image_types: [],
  can_create: false,
  owned_pages: [],
};

describe('ApiJobsRepository.searchJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiBridge.get as jest.Mock).mockResolvedValue(metadataResponse);
  });

  it('rejects transport failures instead of reporting a false empty page', async () => {
    (apiBridge.post as jest.Mock).mockRejectedValue(
      new Error('temporary network failure'),
    );

    await expect(createJobsRepository().searchJobs()).rejects.toThrow(
      'temporary network failure',
    );
  });

  it('rejects unsuccessful API responses instead of exhausting pagination', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValue({
      api_status: 500,
      message: 'jobs temporarily unavailable',
      data: [],
    });

    await expect(createJobsRepository().searchJobs()).rejects.toThrow(
      'jobs temporarily unavailable',
    );
  });
});
