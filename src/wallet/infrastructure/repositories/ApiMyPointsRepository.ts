// Description: Loads member points data from the same PHP endpoints used by the Nuxt settings panel.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';
import type { MyPointsRepository } from '../../domain/repositories/MyPointsRepository';
import type {
  PointHistoryItem,
  PointsExchangeResult,
  UserPoints,
} from '../../domain/types/wallet.types';

type BackendCurrentUserResponse = {
  api_status?: number | string;
  errors?: { error_text?: string };
  user_data?: {
    points?: number | string;
    wallet?: number | string;
    points_config?: {
      dollar_to_point_cost?: number | string;
      ads_currency?: string;
      currency_symbol?: string;
      point_base_currency?: string;
      wallet_currency?: string;
      wallet_exchange_rate?: number | string;
      display_currency?: string;
      display_currency_symbol?: string;
      display_exchange_rate?: number | string;
    };
  };
};

type BackendWalletTransaction = {
  id?: number | string;
  kind?: string;
  notes?: string;
  points?: number | string;
  point_action?: string;
  point_type?: string;
  transaction_dt?: string;
};

type BackendWalletOverview = {
  api_status?: number | string;
  transactions?: BackendWalletTransaction[];
};

type BackendPointsExchangeResponse = {
  api_status?: number | string;
  success?: boolean;
  message?: string;
  exchanged_points?: number | string;
  amount?: number | string;
  points?: number | string;
  wallet?: number | string;
  errors?: { error_text?: string };
};

type PointsCurrencyConfig = {
  pointBaseCurrency: string;
  walletCurrency: string;
  walletCurrencySymbol: string;
  walletExchangeRate: number;
  displayCurrency: string;
  displayCurrencySymbol: string;
  displayExchangeRate: number;
};

const fallbackExchangeStep = 1000;

function apiSucceeded(status: unknown) {
  return status === 200 || status === '200';
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCurrency(value: unknown, fallback: string) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return normalized || fallback;
}

function mapCurrencyConfig(
  user: BackendCurrentUserResponse['user_data'],
): PointsCurrencyConfig {
  const config = user?.points_config || {};
  const walletCurrency = normalizeCurrency(
    config.wallet_currency || config.ads_currency,
    'USD',
  );
  const displayCurrency = normalizeCurrency(config.display_currency, 'VNSEEA');
  const walletExchangeRate = Math.max(toNumber(config.wallet_exchange_rate), 1);
  const displayExchangeRate = toNumber(config.display_exchange_rate);

  return {
    pointBaseCurrency: normalizeCurrency(config.point_base_currency, 'USD'),
    walletCurrency,
    walletCurrencySymbol: String(
      config.currency_symbol || walletCurrency || '',
    ),
    walletExchangeRate,
    displayCurrency,
    displayCurrencySymbol: String(
      config.display_currency_symbol || displayCurrency,
    ),
    displayExchangeRate:
      displayExchangeRate > 1
        ? displayExchangeRate
        : walletCurrency === 'VND' && walletExchangeRate > 1
        ? walletExchangeRate
        : 0,
  };
}

function convertForDisplay(
  amount: number,
  sourceCurrency: string,
  config: PointsCurrencyConfig,
) {
  const source = normalizeCurrency(sourceCurrency, config.displayCurrency);
  const target = config.displayCurrency;
  if (source === target) return amount;
  if (source === 'USD' && target === 'VND' && config.displayExchangeRate > 0) {
    return amount * config.displayExchangeRate;
  }
  if (source === 'VND' && target === 'USD' && config.displayExchangeRate > 0) {
    return amount / config.displayExchangeRate;
  }
  if (
    source === config.walletCurrency &&
    target === 'USD' &&
    config.walletExchangeRate > 0
  ) {
    return amount / config.walletExchangeRate;
  }
  if (
    source === 'USD' &&
    target === config.walletCurrency &&
    config.walletExchangeRate > 0
  ) {
    return amount * config.walletExchangeRate;
  }
  return amount;
}

function formatDisplayMoney(
  amount: number,
  sourceCurrency: string,
  config: PointsCurrencyConfig,
) {
  return formatCurrency(
    convertForDisplay(amount, sourceCurrency, config),
    config.displayCurrency,
    config.displayCurrencySymbol,
  );
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('vi-VN');
}

function formatDate(value: string) {
  if (!value) return 'Vừa xong';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function pointTypeLabel(transaction: BackendWalletTransaction) {
  const type = String(transaction.point_type || transaction.notes || '').trim();
  if (type === 'reaction') return 'reaction';
  if (type === 'comment') return 'bình luận';
  if (type === 'post') return 'bài viết';
  if (type === 'blog') return 'blog';
  return type || 'hoạt động';
}

function pointHistoryTitle(
  transaction: BackendWalletTransaction,
  points: number,
) {
  const kind = String(transaction.kind || '').toUpperCase();
  if (kind === 'POINTS_EXCHANGE' || kind === 'POINTS_DEDUCT') {
    return `Trừ ${formatNumber(points)} điểm`;
  }
  return `Nhận ${formatNumber(points)} điểm từ ${pointTypeLabel(transaction)}`;
}

function mapPointHistory(
  transaction: BackendWalletTransaction,
): PointHistoryItem | null {
  const kind = String(transaction.kind || '').toUpperCase();
  if (!['POINTS_EXCHANGE', 'POINTS_EARNED', 'POINTS_DEDUCT'].includes(kind)) {
    return null;
  }

  const points = Math.abs(Math.trunc(toNumber(transaction.points)));
  const signedPoints =
    kind === 'POINTS_EXCHANGE' || kind === 'POINTS_DEDUCT' ? -points : points;

  return {
    id: `wallet-${transaction.id || Math.random()}`,
    title: pointHistoryTitle(transaction, points),
    meta: formatDate(String(transaction.transaction_dt || '')),
    points: signedPoints,
  };
}

function mapExchangeResult(
  response: BackendPointsExchangeResponse,
): PointsExchangeResult {
  return {
    message: response.message || 'Đổi điểm thành công.',
    exchangedPoints: toNumber(response.exchanged_points),
    amount: toNumber(response.amount),
    points: toNumber(response.points),
    wallet: toNumber(response.wallet),
  };
}

export function createMyPointsRepository(): MyPointsRepository {
  return {
    async getOverview(): Promise<UserPoints> {
      const [userResponse, walletResponse] = await Promise.all([
        apiBridge.post<BackendCurrentUserResponse>(apiRoutes.auth.me),
        apiBridge.get<BackendWalletOverview>(apiRoutes.wallet.overview),
      ]);

      if (!apiSucceeded(userResponse.api_status)) {
        throw new Error(
          userResponse.errors?.error_text ||
            'Không thể tải dữ liệu điểm thành viên.',
        );
      }

      const user = userResponse.user_data;
      const config = mapCurrencyConfig(user);
      const pointsBalance = Math.max(Math.trunc(toNumber(user?.points)), 0);
      const walletBalance = Math.max(toNumber(user?.wallet), 0);
      const exchangeStepPoints =
        Math.trunc(toNumber(user?.points_config?.dollar_to_point_cost)) ||
        fallbackExchangeStep;
      const maxExchangePoints =
        Math.floor(pointsBalance / exchangeStepPoints) * exchangeStepPoints;
      const maxExchangeAmount = maxExchangePoints / exchangeStepPoints;
      const exchangeRateLabel = `${formatNumber(
        exchangeStepPoints,
      )} = ${formatDisplayMoney(1, config.pointBaseCurrency, config)}`;
      const history = (walletResponse.transactions || [])
        .map(mapPointHistory)
        .filter((item): item is PointHistoryItem => Boolean(item))
        .slice(0, 12);

      return {
        pointsBalance,
        walletBalance,
        exchangeStepPoints,
        maxExchangePoints,
        maxExchangeAmount,
        exchangeRateLabel,
        walletCurrency: config.walletCurrency,
        walletCurrencySymbol: config.walletCurrencySymbol,
        displayCurrency: config.displayCurrency,
        displayCurrencySymbol: config.displayCurrencySymbol,
        history,
      };
    },

    async exchangePoints(points: number): Promise<PointsExchangeResult> {
      const response = await apiBridge.post<BackendPointsExchangeResponse>(
        apiRoutes.wallet.pointsExchange,
        { points: String(Math.trunc(points)) },
      );

      if (!apiSucceeded(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể đổi điểm.',
        );
      }

      return mapExchangeResult(response);
    },
  };
}
