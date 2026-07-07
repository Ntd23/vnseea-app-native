// Wallet API Repository (Infrastructure)

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { WalletRepository, SepayQRResponse, StripeSessionResponse } from '../../domain/repositories/WalletRepository';
import type { WalletOverview, Transaction, TopupMethod, CurrentUser } from '../../domain/types/wallet.types';

interface BackendWalletResponse {
  api_status: number | string;
  balance: number;
  wallet?: number | string;
  points?: number | string;
  withdrawable_balance: number;
  currency: string;
  currency_symbol: string;
  transactions: Array<{
    id: number;
    kind: string;
    notes: string;
    counterparty_id: number;
    counterparty_name: string;
    points: number;
    point_action: string;
    point_type: string;
    amount: number;
    transaction_dt: string;
  }>;
  topup_methods: Array<{
    value: string;
    label: string;
    type: string;
    note?: string;
  }>;
  can_withdraw: boolean;
  current_user: {
    id?: number | string;
    user_id?: number | string;
    name: string;
    username: string;
    avatar: string;
  };
}

function mapTransaction(raw: BackendWalletResponse['transactions'][0]): Transaction {
  return {
    id: raw.id,
    kind: raw.kind,
    notes: raw.notes,
    counterpartyId: raw.counterparty_id,
    counterpartyName: raw.counterparty_name,
    points: raw.points,
    pointAction: raw.point_action,
    pointType: raw.point_type,
    amount: raw.amount,
    transactionDt: raw.transaction_dt,
  };
}

function mapTopupMethod(raw: BackendWalletResponse['topup_methods'][0]): TopupMethod {
  return {
    value: raw.value,
    label: raw.label,
    type: raw.type,
    note: raw.note,
  };
}

function mapCurrentUser(raw: BackendWalletResponse['current_user']): CurrentUser {
  return {
    id: toNumber(raw.id ?? raw.user_id),
    name: raw.name,
    username: raw.username,
    avatar: raw.avatar,
  };
}

function toNumber(value: unknown): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function createWalletRepository(): WalletRepository {
  return {
    async getWalletOverview(): Promise<WalletOverview> {
      const response = await apiBridge.get<BackendWalletResponse>(
        apiRoutes.wallet.overview,
      );

      return {
        balance: toNumber(response.points ?? response.balance),
        withdrawableBalance: response.withdrawable_balance,
        currency: response.currency,
        currencySymbol: response.currency_symbol,
        transactions: response.transactions.map(mapTransaction),
        topupMethods: response.topup_methods.map(mapTopupMethod),
        canWithdraw: response.can_withdraw,
        currentUser: mapCurrentUser(response.current_user),
      };
    },

    async createSepayQR(amount: number): Promise<SepayQRResponse> {
      const response = await apiBridge.post<SepayQRResponse>(
        `${apiRoutes.wallet.sepay}?action=make_qr`,
        { amount },
      );
      return response;
    },

    async checkSepayOrder(orderCode: string): Promise<SepayQRResponse> {
      const response = await apiBridge.get<SepayQRResponse>(
        `${apiRoutes.wallet.sepay}?action=check&order_code=${orderCode}`,
      );
      return response;
    },

    async createStripeSession(amount: number): Promise<StripeSessionResponse> {
      const response = await apiBridge.post<StripeSessionResponse>(
        apiRoutes.wallet.stripe,
        { type: 'createsession', amount },
      );
      return response;
    },
  };
}
