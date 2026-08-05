import type { JobsItem } from '../../../domain/types/jobs.types';
import {
  formatJobSalaryAmount,
  formatJobSalaryRange,
} from '../jobSalary';

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

describe('job salary formatting', () => {
  it('formats a VND range without exposing the numeric currency id', () => {
    const job = createJob({
      minimum: 10_000_000,
      maximum: 15_000_000,
      currency: '11',
      currency_code: 'VND',
      currency_symbol: '₫',
      salary_date: 'per_month',
    });

    expect(formatJobSalaryRange(job, 'vi')).toBe(
      '10.000.000 - 15.000.000 VND / Theo tháng',
    );
  });

  it('formats a USD range with the symbol and English separators', () => {
    const job = createJob({
      minimum: 1_000,
      maximum: 2_000,
      currency: '0',
      currency_code: 'USD',
      currency_symbol: '$',
      salary_date: 'per_month',
    });

    expect(formatJobSalaryRange(job, 'en')).toBe(
      '$1,000 - $2,000 / Per month',
    );
  });

  it('does not display an unresolved numeric currency id', () => {
    const job = createJob({
      minimum: 500,
      currency: '11',
      salary_date: 'per_day',
    });

    expect(formatJobSalaryRange(job, 'en')).toBe('From 500 / Per day');
  });

  it('formats individual salary values for the detail screen', () => {
    const job = createJob({
      currency_code: 'VND',
      currency_symbol: 'đ',
      salary_date: 'per_year',
    });

    expect(formatJobSalaryAmount(job, 120_000_000, 'vi')).toBe(
      '120.000.000 VND / Theo năm',
    );
  });

  it('returns the localized negotiable label when no salary is set', () => {
    expect(formatJobSalaryRange(createJob(), 'vi')).toBe('Thương lượng');
    expect(formatJobSalaryRange(createJob(), 'en')).toBe('Negotiable');
  });
});
