import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type { JobsItem } from '../../domain/types/jobs.types';

const SALARY_PERIODS: Record<AppLanguage, Record<string, string>> = {
  vi: {
    per_hour: 'Theo giờ',
    per_day: 'Theo ngày',
    per_week: 'Theo tuần',
    per_month: 'Theo tháng',
    per_year: 'Theo năm',
  },
  en: {
    per_hour: 'Per hour',
    per_day: 'Per day',
    per_week: 'Per week',
    per_month: 'Per month',
    per_year: 'Per year',
  },
};

function finiteSalary(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function cleanCurrencyValue(value?: string): string {
  const normalized = value?.trim() || '';
  return /^\d+$/.test(normalized) ? '' : normalized;
}

function resolveCurrency(job: JobsItem) {
  const rawCode = cleanCurrencyValue(job.currency_code).toUpperCase();
  const rawCurrency = cleanCurrencyValue(job.currency).toUpperCase();
  const rawSymbol = cleanCurrencyValue(job.currency_symbol);
  const code =
    rawCode ||
    (/^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : '') ||
    (rawSymbol === '₫' || rawSymbol === 'đ' ? 'VND' : '') ||
    (rawSymbol === '$' ? 'USD' : '');
  const symbol = rawSymbol || (code === 'USD' ? '$' : code === 'VND' ? '₫' : '');

  return { code, symbol };
}

function localeFor(language: AppLanguage): string {
  return language === 'vi' ? 'vi-VN' : 'en-US';
}

function formatNumber(value: number, language: AppLanguage): string {
  return value.toLocaleString(localeFor(language), {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatMoney(
  job: JobsItem,
  value: number,
  language: AppLanguage,
): string {
  const amount = formatNumber(value, language);
  const { code, symbol } = resolveCurrency(job);

  if (code === 'VND' || symbol === '₫' || symbol === 'đ') {
    return `${amount} VND`;
  }
  if (symbol === '$') {
    return `$${amount}`;
  }
  if (symbol) {
    return `${amount} ${symbol}`;
  }
  if (code) {
    return `${amount} ${code}`;
  }
  return amount;
}

function formatMoneyRange(
  job: JobsItem,
  minimum: number,
  maximum: number,
  language: AppLanguage,
): string {
  const min = formatNumber(minimum, language);
  const max = formatNumber(maximum, language);
  const { code, symbol } = resolveCurrency(job);

  if (code === 'VND' || symbol === '₫' || symbol === 'đ') {
    return `${min} - ${max} VND`;
  }
  if (symbol === '$') {
    return `$${min} - $${max}`;
  }
  if (symbol) {
    return `${min} - ${max} ${symbol}`;
  }
  if (code) {
    return `${min} - ${max} ${code}`;
  }
  return `${min} - ${max}`;
}

export function getJobSalaryPeriod(
  job: JobsItem,
  language: AppLanguage,
): string {
  const key = job.salary_date?.trim() || '';
  if (key && SALARY_PERIODS[language][key]) {
    return SALARY_PERIODS[language][key];
  }
  return job.salary_date_label?.trim() || key;
}

function withSalaryPeriod(
  value: string,
  job: JobsItem,
  language: AppLanguage,
): string {
  const period = getJobSalaryPeriod(job, language);
  return period ? `${value} / ${period}` : value;
}

export function formatJobSalaryAmount(
  job: JobsItem,
  value: number,
  language: AppLanguage,
): string {
  const amount = finiteSalary(value);
  if (!amount) {
    return language === 'vi' ? 'Thương lượng' : 'Negotiable';
  }
  return withSalaryPeriod(formatMoney(job, amount, language), job, language);
}

export function formatJobSalaryRange(
  job: JobsItem,
  language: AppLanguage,
): string {
  const minimum = finiteSalary(job.minimum);
  const maximum = finiteSalary(job.maximum);
  if (!minimum && !maximum) {
    return language === 'vi' ? 'Thương lượng' : 'Negotiable';
  }

  if (minimum && maximum) {
    return withSalaryPeriod(
      formatMoneyRange(job, minimum, maximum, language),
      job,
      language,
    );
  }

  const amount = formatMoney(job, minimum || maximum, language);
  const value = minimum
    ? `${language === 'vi' ? 'Từ' : 'From'} ${amount}`
    : amount;
  return withSalaryPeriod(value, job, language);
}
