// Wallet Repository Interface

import type { WalletOverview } from '../types/wallet.types';

export interface SepayQRResponse {
  api_status: number;
  data?: {
    payment_id?: number;
    qr_url?: string;
    order_code?: string;
    amount?: number;
    bank_code?: string;
    account_number?: string;
    account_name?: string;
    status?: string;
    paid?: boolean;
    updated_at?: string;
  };
  errors?: {
    error_id?: number;
    error_text?: string;
  };
}

export interface StripeSessionResponse {
  api_status: number;
  sessionId?: string;
  errors?: {
    error_id?: number;
    error_text?: string;
  };
}

export interface WalletRepository {
  getWalletOverview(): Promise<WalletOverview>;
  createSepayQR(amount: number): Promise<SepayQRResponse>;
  checkSepayOrder(orderCode: string): Promise<SepayQRResponse>;
  createStripeSession(amount: number): Promise<StripeSessionResponse>;
}
