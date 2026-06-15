// Wallet domain types

export interface EarningsMenuItem {
  id: string;
  label: string;
  iconKey: string;
  section: 'earnings' | 'referral';
}

export interface PointActivity {
  id: string;
  label: string;
  iconKey: string;
  percentage: number;
  /** Hex color for icon + percentage text */
  color: string;
  /** Light tinted bg for icon chip */
  chipBg: string;
}

export interface PointHistoryItem {
  id: string;
  title: string;
  meta: string;
  points: number;
}

export interface UserPoints {
  pointsBalance: number;
  walletBalance: number;
  exchangeStepPoints: number;
  maxExchangePoints: number;
  maxExchangeAmount: number;
  exchangeRateLabel: string;
  walletCurrency: string;
  walletCurrencySymbol: string;
  displayCurrency: string;
  displayCurrencySymbol: string;
  history: PointHistoryItem[];
}

export interface PointsExchangeResult {
  message: string;
  exchangedPoints: number;
  amount: number;
  points: number;
  wallet: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  /** Initials shown when no avatar. */
  initials: string;
  /** Tailwind bg class for the initials chip */
  chipBg: string;
  /** Tailwind text class for the initials chip */
  chipText: string;
  isInvited: boolean;
}

export interface Transaction {
  id: number;
  kind: string;
  notes: string;
  counterpartyId: number;
  counterpartyName: string;
  points: number;
  pointAction: string;
  pointType: string;
  amount: number;
  transactionDt: string;
}

export interface TopupMethod {
  value: string;
  label: string;
  type: string;
  note?: string;
}

export interface CurrentUser {
  id: number;
  name: string;
  username: string;
  avatar: string;
}

export interface WalletOverview {
  balance: number;
  withdrawableBalance: number;
  currency: string;
  currencySymbol: string;
  transactions: Transaction[];
  topupMethods: TopupMethod[];
  canWithdraw: boolean;
  currentUser: CurrentUser;
}

export interface AffiliateRequirement {
  id: 'profile' | 'verified' | 'milestone';
  label: string;
  completed: boolean;
}

export interface AffiliateReferralUser {
  id: number;
  name: string;
  username: string;
  avatar: string;
  joined: string;
  verified: boolean;
  profileComplete: boolean;
  qualified: boolean;
  rewardPaid: boolean;
  progressPercent: number;
  status: 'paid' | 'qualified' | 'pending' | string;
}

export interface AffiliateOverview {
  referralLink: string;
  earningPerUser: number;
  availableReward: number;
  currency: string;
  currencySymbol: string;
  qualifiedUsers: number;
  requiredQualifiedReferrals: number;
  progressPercent: number;
  profileComplete: boolean;
  verified: boolean;
  eligibleForPayout: boolean;
  requirements: AffiliateRequirement[];
  referredUsers: AffiliateReferralUser[];
}
