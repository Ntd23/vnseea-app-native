// Description: Loads referral reward data from the WoWonder affiliate settings API.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { AffiliatesRepository } from '../../domain/repositories/AffiliatesRepository';
import type {
  AffiliateOverview,
  AffiliateReferralUser,
  AffiliateRequirement,
} from '../../domain/types/wallet.types';

type BackendAffiliateReferral = {
  id?: number | string;
  name?: string;
  username?: string;
  avatar?: string;
  joined?: string;
  verified?: boolean | number | string;
  profile_complete?: boolean | number | string;
  reward_eligible?: boolean | number | string;
  progress_percent?: number | string;
  reward_paid?: boolean | number | string;
  status?: string;
};

type BackendAffiliateOverview = {
  api_status?: number | string;
  errors?: { error_text?: string };
  message?: string;
  referral_link?: string;
  reward_amount?: number | string;
  wallet_reward_amount?: number | string;
  available_reward_amount?: number | string;
  currency?: string;
  currency_symbol?: string;
  wallet_currency?: string;
  wallet_currency_symbol?: string;
  required_qualified_referrals?: number | string;
  qualified_referrals?: number | string;
  progress_percent?: number | string;
  profile_complete?: boolean | number | string;
  verified?: boolean | number | string;
  eligible_for_payout?: boolean | number | string;
  referrals?: BackendAffiliateReferral[];
};

type BackendCurrentUserCurrencyResponse = {
  api_status?: number | string;
  user_data?: {
    points_config?: {
      display_currency?: string;
      display_currency_symbol?: string;
      display_exchange_rate?: number | string;
      wallet_currency?: string;
      currency_symbol?: string;
      wallet_exchange_rate?: number | string;
    };
  };
};

type DisplayCurrencyConfig = {
  currency: string;
  symbol: string;
  exchangeRate: number;
};

function apiSucceeded(status: unknown) {
  return status === 200 || status === '200';
}

function toNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeCurrency(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function shouldConvertCurrency(
  sourceCurrency: string,
  displayCurrency: DisplayCurrencyConfig | null,
) {
  if (!displayCurrency || displayCurrency.exchangeRate <= 0) return false;
  if (!sourceCurrency) return false;
  return (
    normalizeCurrency(sourceCurrency) !==
    normalizeCurrency(displayCurrency.currency)
  );
}

function convertAmount(amount: number, shouldConvert: boolean, rate: number) {
  return shouldConvert ? amount * rate : amount;
}

function mapReferral(raw: BackendAffiliateReferral): AffiliateReferralUser {
  return {
    id: Math.trunc(toNumber(raw.id)),
    name: String(raw.name || raw.username || ''),
    username: String(raw.username || ''),
    avatar: String(raw.avatar || ''),
    joined: String(raw.joined || ''),
    verified: toBoolean(raw.verified),
    profileComplete: toBoolean(raw.profile_complete),
    qualified: toBoolean(raw.reward_eligible),
    rewardPaid: toBoolean(raw.reward_paid),
    progressPercent: toNumber(raw.progress_percent),
    status: String(raw.status || 'pending'),
  };
}

function buildRequirements(response: BackendAffiliateOverview) {
  const profileComplete = toBoolean(response.profile_complete);
  const verified = toBoolean(response.verified);
  const qualifiedUsers = toNumber(response.qualified_referrals);
  const requiredQualifiedReferrals = Math.max(
    1,
    toNumber(response.required_qualified_referrals),
  );

  return [
    {
      id: 'profile',
      label: 'Bạn đã cập nhật đầy đủ thông tin',
      completed: profileComplete,
    },
    {
      id: 'verified',
      label: 'Tài khoản của bạn đã xác minh',
      completed: verified,
    },
    {
      id: 'milestone',
      label: 'Đạt mốc người giới thiệu đủ điều kiện',
      completed: qualifiedUsers >= requiredQualifiedReferrals,
    },
  ] satisfies AffiliateRequirement[];
}

function mapDisplayCurrency(
  response: BackendCurrentUserCurrencyResponse | null,
): DisplayCurrencyConfig | null {
  const pointsConfig = response?.user_data?.points_config;
  if (!pointsConfig) return null;

  const displayCurrency = normalizeCurrency(
    pointsConfig.display_currency || pointsConfig.wallet_currency,
  );
  const displaySymbol = String(
    pointsConfig.display_currency_symbol ||
      pointsConfig.currency_symbol ||
      displayCurrency,
  );
  const exchangeRate = toNumber(
    pointsConfig.display_exchange_rate || pointsConfig.wallet_exchange_rate,
  );

  if (!displayCurrency) return null;

  return {
    currency: displayCurrency,
    symbol: displaySymbol,
    exchangeRate,
  };
}

async function loadDisplayCurrency() {
  try {
    const response = await apiBridge.post<BackendCurrentUserCurrencyResponse>(
      apiRoutes.auth.me,
    );
    return mapDisplayCurrency(response);
  } catch {
    return null;
  }
}

export function createAffiliatesRepository(): AffiliatesRepository {
  return {
    async getOverview(): Promise<AffiliateOverview> {
      const [response, displayCurrency] = await Promise.all([
        apiBridge.get<BackendAffiliateOverview>(apiRoutes.wallet.affiliates),
        loadDisplayCurrency(),
      ]);

      if (!apiSucceeded(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải dữ liệu giới thiệu.',
        );
      }

      const sourceCurrency = String(
        response.wallet_currency || response.currency || '',
      );
      const sourceSymbol = String(
        response.wallet_currency_symbol ||
          response.currency_symbol ||
          response.wallet_currency ||
          response.currency ||
          '',
      );
      const convertToDisplayCurrency = shouldConvertCurrency(
        sourceCurrency,
        displayCurrency,
      );
      const conversionRate = displayCurrency?.exchangeRate || 1;
      const rawEarningPerUser = toNumber(
        response.wallet_reward_amount ?? response.reward_amount,
      );
      const qualifiedUsers = toNumber(response.qualified_referrals);
      const rawAvailableReward = toNumber(
        response.available_reward_amount ?? rawEarningPerUser * qualifiedUsers,
      );
      const earningPerUser = convertAmount(
        rawEarningPerUser,
        convertToDisplayCurrency,
        conversionRate,
      );
      const availableReward = convertAmount(
        rawAvailableReward,
        convertToDisplayCurrency,
        conversionRate,
      );
      const requiredQualifiedReferrals = Math.max(
        1,
        toNumber(response.required_qualified_referrals),
      );

      return {
        referralLink: String(response.referral_link || ''),
        earningPerUser,
        availableReward,
        currency: convertToDisplayCurrency
          ? displayCurrency?.currency || sourceCurrency
          : sourceCurrency,
        currencySymbol: convertToDisplayCurrency
          ? displayCurrency?.symbol || sourceSymbol
          : sourceSymbol,
        qualifiedUsers,
        requiredQualifiedReferrals,
        progressPercent: toNumber(response.progress_percent),
        profileComplete: toBoolean(response.profile_complete),
        verified: toBoolean(response.verified),
        eligibleForPayout: toBoolean(response.eligible_for_payout),
        requirements: buildRequirements(response),
        referredUsers: (response.referrals || []).map(mapReferral),
      };
    },
  };
}
