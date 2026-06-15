// Description: Implements withdrawal repository calls against the WoWonder API bridge.

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { WithdrawalRepository } from '../../domain/repositories/WithdrawalRepository';
import type {
  SepayBank,
  WithdrawalHistoryItem,
  WithdrawalMethod,
  WithdrawalMethodId,
  WithdrawalOverview,
  WithdrawalRequestInput,
} from '../../domain/types/withdrawal.types';

type BackendMethod = {
  value?: string;
  label?: string;
};

type BackendHistoryItem = {
  id?: number;
  amount?: number;
  method?: string;
  requested?: string;
  requested_at?: number;
  status?: number;
  transfer_info?: string;
};

type BackendWithdrawalOverview = {
  api_status?: number | string;
  errors?: { error_text?: string };
  message?: string;
  balance?: number;
  wallet_balance?: number;
  minimum_amount?: number;
  currency?: string;
  currency_symbol?: string;
  methods?: BackendMethod[];
  paypal_email?: string;
  has_pending_request?: boolean;
  history?: BackendHistoryItem[];
};

type BackendWithdrawalResponse = {
  api_status?: number | string;
  errors?: { error_text?: string };
  message?: string;
};

type SepayBankRecord = {
  code?: string;
  name?: string;
  short_name?: string;
  bin?: string | number;
  supported?: boolean;
};

type SepayBanksResponse = {
  data?: SepayBankRecord[];
};

const SEPAY_BANKS_URL = 'https://qr.sepay.vn/banks.json';

function apiSucceeded(status: unknown) {
  return status === 200 || status === '200';
}

function methodIdFromValue(value: string): WithdrawalMethodId | undefined {
  if (value === 'sepay') return 'sepay';
  if (value === 'paypal' || value === 'p_paypal') return 'paypal';
  if (value === 'bank' || value === 'bank_transfer') return 'bank';
  return undefined;
}

function mapMethod(method: BackendMethod): WithdrawalMethod | undefined {
  const id = methodIdFromValue(String(method.value || '').toLowerCase());
  if (!id) return undefined;

  return {
    id,
    label: id === 'sepay' ? 'SePay' : method.label || id,
  };
}

function mapHistory(item: BackendHistoryItem): WithdrawalHistoryItem {
  return {
    id: Number(item.id || 0),
    amount: Number(item.amount || 0),
    method: String(item.method || ''),
    requested: String(item.requested || ''),
    requestedAt: Number(item.requested_at || 0),
    status: Number(item.status || 0),
    transferInfo: String(item.transfer_info || ''),
  };
}

function mapSepayBank(bank: SepayBankRecord): SepayBank | undefined {
  const code = String(bank.code || '').trim();
  const shortName = String(bank.short_name || '').trim();
  const name = String(bank.name || '').trim();

  if (!code || (!shortName && !name)) {
    return undefined;
  }

  return {
    code,
    name,
    shortName: shortName || name,
    bin: String(bank.bin || '').trim(),
    supported: bank.supported !== false,
  };
}

function preferredMethods(methods: WithdrawalMethod[]) {
  return (
    methods.filter(method => method.id === 'sepay')[0] || {
      id: 'sepay',
      label: 'SePay',
    }
  );
}

export function createWithdrawalRepository(): WithdrawalRepository {
  return {
    async getOverview(): Promise<WithdrawalOverview> {
      const response = await apiBridge.get<BackendWithdrawalOverview>(
        apiRoutes.withdrawal.overview,
      );

      if (!apiSucceeded(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể tải dữ liệu rút tiền.',
        );
      }

      const mappedMethods = (response.methods || [])
        .map(mapMethod)
        .filter((method): method is WithdrawalMethod => Boolean(method));

      return {
        balance: Number(response.balance || 0),
        walletBalance: Number(response.wallet_balance || 0),
        minimumAmount: Number(response.minimum_amount || 0),
        currency: response.currency || 'VND',
        currencySymbol: response.currency_symbol || response.currency || 'VND',
        methods: [preferredMethods(mappedMethods)],
        accountValue: response.paypal_email || '',
        hasPendingRequest: Boolean(response.has_pending_request),
        history: (response.history || []).map(mapHistory),
      };
    },

    async getSepayBanks(): Promise<SepayBank[]> {
      const response = await fetch(SEPAY_BANKS_URL);
      if (!response.ok) {
        throw new Error('Không thể tải danh sách ngân hàng SePay.');
      }

      const data = (await response.json()) as SepayBanksResponse;
      return (data.data || [])
        .map(mapSepayBank)
        .filter((bank): bank is SepayBank => Boolean(bank?.supported))
        .sort((a, b) => a.shortName.localeCompare(b.shortName, 'vi'));
    },

    async requestWithdrawal(input: WithdrawalRequestInput): Promise<string> {
      const payload: Record<string, string> = {
        type: input.method.id,
        withdraw_method: input.method.id,
        amount: String(input.amount),
      };

      if (input.method.id === 'paypal') {
        payload.paypal_email = input.accountValue;
      } else if (input.method.id === 'sepay') {
        payload.bank_code = input.sepayDetails?.bankCode ?? '';
        payload.bank_name = input.sepayDetails?.bankName ?? '';
        payload.account_number = input.sepayDetails?.accountNumber ?? '';
        payload.beneficiary_name = input.sepayDetails?.beneficiaryName ?? '';
      } else {
        payload.transfer_to = input.accountValue;
      }

      console.log('[withdrawal] submitting request', {
        endpoint: apiRoutes.withdrawal.request,
        method: input.method.id,
        amount: input.amount,
        payloadKeys: Object.keys(payload),
        hasAccountValue: Boolean(input.accountValue.trim()),
        hasSepayDetails:
          input.method.id === 'sepay'
            ? Boolean(
                input.sepayDetails?.bankCode.trim() &&
                  input.sepayDetails?.bankName.trim() &&
                  input.sepayDetails?.accountNumber.trim() &&
                  input.sepayDetails?.beneficiaryName.trim(),
              )
            : undefined,
        transport: 'urlencoded',
      });

      const response = await apiBridge.post<BackendWithdrawalResponse>(
        apiRoutes.withdrawal.request,
        payload,
      );

      if (!apiSucceeded(response.api_status)) {
        throw new Error(
          response.errors?.error_text ||
            response.message ||
            'Không thể gửi yêu cầu rút tiền.',
        );
      }

      return response.message || 'Yêu cầu rút tiền đã được gửi.';
    },
  };
}
