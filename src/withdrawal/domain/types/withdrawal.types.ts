// Description: Defines withdrawal domain models for payout methods, overview data, and payment history.

export type WithdrawalMethodId = 'sepay' | 'paypal' | 'bank';

export interface WithdrawalMethod {
  id: WithdrawalMethodId;
  label: string;
}

export interface WithdrawalHistoryItem {
  id: number;
  amount: number;
  method: string;
  requested: string;
  requestedAt: number;
  status: number;
  transferInfo: string;
}

export interface WithdrawalOverview {
  balance: number;
  walletBalance: number;
  minimumAmount: number;
  currency: string;
  currencySymbol: string;
  methods: WithdrawalMethod[];
  accountValue: string;
  hasPendingRequest: boolean;
  history: WithdrawalHistoryItem[];
}

export interface WithdrawalRequestInput {
  method: WithdrawalMethod;
  amount: number;
  accountValue: string;
}
