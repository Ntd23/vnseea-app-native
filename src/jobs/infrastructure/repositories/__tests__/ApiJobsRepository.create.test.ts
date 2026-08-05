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
  types: [{ value: 'full_time', label: 'Toàn thời gian' }],
  categories: [{ value: '1', label: 'Công nghệ' }],
  salary_dates: [{ value: 'per_month', label: 'Mỗi tháng' }],
  currencies: [{ value: '11', label: 'VND', symbol: '₫' }],
  question_types: [],
  image_types: [],
  can_create: true,
  owned_pages: [],
};

describe('ApiJobsRepository.createJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiBridge.get as jest.Mock).mockResolvedValue(metadataResponse);
  });

  it('sends the resolved coordinates without requiring an uploaded image', async () => {
    (apiBridge.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      job_id: '17',
      post_id: '81',
      data: {
        id: '81',
        post_id: '81',
        job: {
          id: '17',
          title: 'Kỹ sư',
          location: 'Mỹ Đình, Hà Nội',
          job_type: 'full_time',
          category: '1',
          currency: '11',
          minimum: '10000000',
          maximum: '15000000',
          page_id: '9',
        },
      },
    });

    const result = await createJobsRepository().createJob({
      jobTitle: 'Kỹ sư',
      description: 'Mô tả',
      location: 'Mỹ Đình, Hà Nội',
      lat: '21.0285',
      lng: '105.8542',
      jobType: 'full_time',
      category: '1',
      pageId: '9',
      imageType: 'cover',
    });

    expect(apiBridge.multipart).toHaveBeenCalledWith(
      'job',
      expect.objectContaining({
        lat: '21.0285',
        lng: '105.8542',
        image_type: 'cover',
      }),
    );
    expect(result).toMatchObject({
      job_id: '17',
      post_id: '81',
      data: {
        id: '17',
        post_id: '81',
        title: 'Kỹ sư',
        currency: '11',
        currency_code: 'VND',
        currency_symbol: '₫',
      },
    });
  });

  it('creates a personal job without sending a page id', async () => {
    (apiBridge.multipart as jest.Mock).mockResolvedValue({
      api_status: 200,
      job_id: '18',
      post_id: '82',
      data: {
        id: '82',
        post_id: '82',
        job: {
          id: '18',
          title: 'Nhân viên bán hàng',
          location: 'Hà Nội',
          job_type: 'full_time',
          category: '1',
          page_id: '0',
          user_id: '7',
        },
      },
    });

    await createJobsRepository().createJob({
      jobTitle: 'Nhân viên bán hàng',
      description: 'Mô tả',
      location: 'Hà Nội',
      jobType: 'full_time',
      category: '1',
      imageType: 'cover',
    });

    expect(apiBridge.multipart).toHaveBeenCalledWith(
      'job',
      expect.not.objectContaining({ page_id: expect.anything() }),
    );
  });

  it('preserves the backend error message and code', async () => {
    (apiBridge.multipart as jest.Mock).mockResolvedValue({
      api_status: 422,
      error_code: 'job_upload_failed',
      message: 'Ảnh việc làm không hợp lệ.',
    });

    await expect(
      createJobsRepository().createJob({
        jobTitle: 'Kỹ sư',
        description: 'Mô tả',
        location: 'Hà Nội',
        jobType: 'full_time',
        category: '1',
        pageId: '9',
        imageType: 'upload',
      }),
    ).rejects.toMatchObject({
      message: 'Ảnh việc làm không hợp lệ.',
      code: 'job_upload_failed',
    });
  });
});
