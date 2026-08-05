import type { JobsItem } from '../../types/jobs.types';
import { isJobOwnedByUser } from '../jobOwnership';

function createJob(overrides: Partial<JobsItem> = {}): JobsItem {
  return {
    id: '17',
    title: 'Ky su',
    description: '',
    location: 'Ha Noi',
    job_type: 'full_time',
    category: '1',
    image: '',
    page_id: '0',
    user_id: '7',
    time: 1,
    ...overrides,
  };
}

describe('isJobOwnedByUser', () => {
  it('treats a personal job creator as the owner', () => {
    expect(isJobOwnedByUser(createJob(), '7')).toBe(true);
  });

  it('does not grant ownership of another personal job', () => {
    expect(isJobOwnedByUser(createJob(), '8')).toBe(false);
  });

  it('keeps backend page ownership for page jobs', () => {
    const job = createJob({
      page_id: '91',
      user_id: '12',
      page: {
        page_id: '91',
        page_title: 'VNSEEA',
        page_name: 'vnseea',
        page_description: '',
        avatar: '',
        cover: '',
        user_id: '12',
        is_page_onwer: true,
      },
    });

    expect(isJobOwnedByUser(job, '7')).toBe(true);
  });

  it('requires an authenticated user id', () => {
    expect(isJobOwnedByUser(createJob(), undefined)).toBe(false);
  });
});
