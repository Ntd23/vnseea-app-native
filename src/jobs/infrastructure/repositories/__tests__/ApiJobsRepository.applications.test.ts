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

describe('ApiJobsRepository applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits contact, experience and dynamic answers to the job endpoint', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValue({
      api_status: 200,
      application_id: '91',
    });

    await createJobsRepository().applyToJob('17', {
      userName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
      email: 'a@example.com',
      location: 'Hà Nội',
      position: 'Nhân viên kinh doanh',
      workplace: 'VNSEEA',
      experienceDescription: 'Hai năm kinh nghiệm',
      experienceStartDate: '2024-01-01',
      experienceEndDate: '',
      currentlyWork: true,
      answers: { one: 'yes', two: '0' },
    });

    expect(apiBridge.post).toHaveBeenCalledWith(
      'job',
      expect.objectContaining({
        type: 'apply',
        job_id: '17',
        user_name: 'Nguyễn Văn A',
        phone_number: '0901234567',
        where_did_you_work: 'VNSEEA',
        i_currently_work: 'on',
        question_one_answer: 'yes',
        question_two_answer: '0',
      }),
    );
  });

  it('maps applicants and returns a cursor page', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValue({
      api_status: 200,
      data: [
        {
          id: '45',
          user_id: '8',
          user_name: 'Trần B',
          phone_number: '0987654321',
          email: 'b@example.com',
          location: 'TP.HCM',
          position: 'Kỹ sư',
          question_one_answer: 'yes',
          time: '1720000000',
          user_data: {
            user_id: '8',
            name: 'Trần B',
            username: 'tranb',
            avatar: 'https://media.vnseea.vn/avatar.jpg',
          },
        },
      ],
    });

    const result = await createJobsRepository().getJobApplicants('17', {
      limit: 20,
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: '45',
          userId: '8',
          name: 'Trần B',
          username: 'tranb',
          phoneNumber: '0987654321',
          answers: { one: 'yes' },
        }),
      ],
      nextCursor: '45',
      hasMore: false,
    });
  });

  it('preserves backend permission failures when loading applicants', async () => {
    (apiBridge.post as jest.Mock).mockResolvedValue({
      api_status: 403,
      error_code: 'job_applicants_forbidden',
      message: 'You cannot view these applicants.',
    });

    await expect(
      createJobsRepository().getJobApplicants('17'),
    ).rejects.toMatchObject({
      message: 'You cannot view these applicants.',
      code: 'job_applicants_forbidden',
    });
  });
});
