// Withdrawal domain types

export type WithdrawalMethodId = 'paypal' | 'bank_transfer' | 'momo';

export interface WithdrawalMethod {
  id: WithdrawalMethodId;
  label: string;
}

export interface WithdrawalForm {
  method: WithdrawalMethod;
  amount: string;
  email: string;
}
